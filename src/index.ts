import { createPublicClient, createWalletClient, http, decodeEventLog, getAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ronin } from 'viem/chains'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { Command } from 'commander'
import { formatEther } from 'viem'
import type {
  GachaTicket,
  RandomSeedFulfilledEvent,
  GachaRollRequestedEvent,
  GachaRollFulfilledEvent,
} from './types.ts'
import { CONSTANTS, REWARD_FORMATTERS } from './config.js'

config()

// Load ABIs
const shopAbi = JSON.parse(readFileSync(new URL('../abis/garudashop.json', import.meta.url), 'utf8'))
const vrfAbi = JSON.parse(readFileSync(new URL('../abis/vrf.json', import.meta.url), 'utf8'))

// Environment validation
if (!process.env.PRIVATE_KEY || !process.env.ACCESS_TOKEN) throw new Error('Missing required environment variables')

// Blockchain setup
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)
const publicClient = createPublicClient({ chain: ronin, transport: http() })
const walletClient = createWalletClient({ account, chain: ronin, transport: http() })

const program = new Command()

program
  .name('garuda-gacha-roller')
  .description('CLI tool for rolling Garuda Gacha Lucky Pouches')
  .argument('[amount]', 'number of batches to roll')
  .option('--amount <number>', 'number of batches to roll')
  .option('--premium', 'use premium pouches')
  .option('--verbose', 'show detailed output')
  .option('--delegator <address>', 'address to roll for')

program.parse()

const options = program.opts()

// Validate amount specification
if (options.amount && program.args[0]) {
  console.error('❌ Please specify amount either as an argument or with --amount option, not both')
  process.exit(0)
}

const settings = {
  amount: Number(options.amount || program.args[0] || 1),
  premium: options.premium || false,
  verbose: options.verbose || false,
  delegator: options.delegator || '',
}

// Add validation for amount
if (settings.amount <= 0 || !Number.isInteger(settings.amount)) {
  console.error('❌ Amount must be a positive integer')
  process.exit(0)
}

// Add validation for delegator address
if (settings.delegator && settings.delegator.toLowerCase() === account.address.toLowerCase()) {
  console.error('❌ Delegator address cannot be the same as your wallet address')
  process.exit(0)
}

function decodeEventLogSafely<T>({ abi, data, topics }: { abi: any; data: string; topics: string[] }): T | undefined {
  try {
    return decodeEventLog({
      abi,
      data: data as `0x${string}`,
      topics: topics as [`0x${string}`, ...`0x${string}`[]],
    }) as T
  } catch {
    return undefined
  }
}

async function fetchGachaTickets(): Promise<GachaTicket> {
  const query = `
    mutation BuyGachaTicketMessage($chests: [GachaChestTpe!]!, $delegatorAddress: String) {
      buyGachaTicketMessage(chests: $chests, delegatorAddress: $delegatorAddress) {
        chests { amount category }
        recipient nonce slipAmount slipOwner deadline signature
      }
    }
  `

  const response = await fetch('https://graphql-gateway.axieinfinity.com/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        chests: Array(CONSTANTS.POUCHES_PER_TX).fill(settings.premium ? 'Silver' : 'Bronze'),
        delegatorAddress: settings.delegator || undefined,
      },
    }),
  })

  if (!response.ok) throw new Error(`API request failed: ${response.statusText}`)

  const { data, errors } = await response.json()
  if (errors?.length) throw new Error(errors[0].message)
  if (!data?.buyGachaTicketMessage) throw new Error('Invalid API response')

  return data.buyGachaTicketMessage
}

async function estimateGachaFee(): Promise<bigint> {
  const [estFee, callbackGasLimit] = (await publicClient.readContract({
    address: CONSTANTS.SHOP_ADDRESS,
    abi: shopAbi,
    functionName: 'estimateFee',
    args: [BigInt(CONSTANTS.POUCHES_PER_TX), 20000000000n],
  })) as [bigint, bigint]

  return estFee + callbackGasLimit + CONSTANTS.BASE_FEE
}

async function processGachaResults(reqHash: `0x${string}`, batchNumber: number): Promise<void> {
  return new Promise((resolve) => {
    const unwatch = publicClient.watchContractEvent({
      address: CONSTANTS.VRF_ADDRESS,
      abi: vrfAbi,
      eventName: 'RandomSeedFulfilled',
      onLogs: async (logs) => {
        for (const log of logs) {
          const vrfEvent = decodeEventLogSafely<RandomSeedFulfilledEvent>({
            abi: vrfAbi,
            data: log.data,
            topics: log.topics,
          })

          if (!vrfEvent || vrfEvent.args.requestHash !== reqHash) continue

          const receipt = await publicClient.getTransactionReceipt({
            hash: log.transactionHash as `0x${string}`,
          })

          const shopLogs = receipt.logs.filter((l) => l.address.toLowerCase() === CONSTANTS.SHOP_ADDRESS.toLowerCase())

          const gachaEvent = shopLogs
            .map((l) =>
              decodeEventLogSafely<GachaRollFulfilledEvent>({
                abi: shopAbi,
                data: l.data,
                topics: l.topics,
              }),
            )
            .find((event) => event?.eventName === 'GachaRollFulfilled' && event.args.reqHash === reqHash)

          if (gachaEvent) {
            const rewardRecipient = settings.delegator ? 'Delegator got' : 'You got'

            if (settings.verbose) {
              console.log(`\n🎁 ${rewardRecipient}:`)
              if (gachaEvent.args.pot.cocoAmt > 0n)
                console.log(`   - ${REWARD_FORMATTERS.COCO(gachaEvent.args.pot.cocoAmt)}`)
              if (gachaEvent.args.pot.premiumCocoAmt > 0n)
                console.log(`   - ${REWARD_FORMATTERS.PREMIUM_COCO(gachaEvent.args.pot.premiumCocoAmt)}`)
              if (gachaEvent.args.pot.spiritShellAmt > 0n)
                console.log(`   - ${REWARD_FORMATTERS.SPIRIT_SHELL(gachaEvent.args.pot.spiritShellAmt)}`)

              if (gachaEvent.args.axieRewards.length > 0) {
                console.log(REWARD_FORMATTERS.AXIE(gachaEvent.args.axieRewards))
              }
            } else {
              const rewards = [
                gachaEvent.args.pot.cocoAmt > 0n ? REWARD_FORMATTERS.COCO(gachaEvent.args.pot.cocoAmt) : '',
                gachaEvent.args.pot.premiumCocoAmt > 0n
                  ? REWARD_FORMATTERS.PREMIUM_COCO(gachaEvent.args.pot.premiumCocoAmt)
                  : '',
                gachaEvent.args.pot.spiritShellAmt > 0n
                  ? REWARD_FORMATTERS.SPIRIT_SHELL(gachaEvent.args.pot.spiritShellAmt)
                  : '',
                gachaEvent.args.axieRewards.length > 0 ? REWARD_FORMATTERS.AXIE(gachaEvent.args.axieRewards) : '',
              ]
                .filter(Boolean)
                .join(', ')
              console.log(
                `🎁 ${settings.amount > 1 ? `[${String(batchNumber).padStart(2, '0')}/${String(settings.amount).padStart(2, '0')}] ` : ''}${rewardRecipient}: ${rewards}`,
              )
            }
          } else {
            console.log('❌ No matching GachaRollFulfilled event found in transaction')
          }

          unwatch()
          resolve()
          return
        }
      },
    })

    setTimeout(() => {
      unwatch()
      console.log('❌ Timeout waiting for VRF result')
      resolve()
    }, CONSTANTS.VRF_TIMEOUT)
  })
}

async function purchaseGacha(ticket: GachaTicket, batchNumber: number): Promise<`0x${string}`> {
  const chestsToRoll = Array(CONSTANTS.POUCHES_PER_TX).fill([
    settings.premium ? '1' : '0',
    settings.premium ? '50' : '10',
  ])
  const fee = await estimateGachaFee()

  // Prepare transaction parameters
  const txParams = {
    address: CONSTANTS.SHOP_ADDRESS,
    abi: shopAbi,
    functionName: 'roll',
    args: [
      chestsToRoll,
      getAddress(ticket.recipient),
      getAddress(ticket.slipOwner),
      ticket.nonce,
      ticket.deadline,
      ticket.slipAmount,
      ticket.signature,
    ],
    value: fee,
    account,
  } as const

  // Check for transaction cost and available balance
  try {
    await publicClient.estimateContractGas(txParams)
  } catch (error) {
    const balance = await publicClient.getBalance({ address: account.address })
    console.error(
      `❌ Insufficient funds in ${account.address}! Current balance: ${Number(formatEther(balance)).toFixed(4)} RON`,
    )
    process.exit(0)
  }

  const hash = await walletClient.writeContract({
    chain: ronin,
    ...txParams,
  })

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 30_000, // 30 second timeout
  })

  if (receipt.status === 'success') {
    if (settings.verbose) {
      console.log(`✅ Purchased ${CONSTANTS.POUCHES_PER_TX}${settings.premium ? ' Premium' : ''} Pouches`)
      console.log(`🔗 Transaction: ${hash}`)
    } else {
      console.log(
        `✅ ${settings.amount > 1 ? `[${String(batchNumber).padStart(2, '0')}/${String(settings.amount).padStart(2, '0')}] ` : ''}Purchased ${CONSTANTS.POUCHES_PER_TX}${settings.premium ? ' Premium' : ''} Pouches (${hash})`,
      )
    }
  } else {
    console.error(`❌ Transaction failed! Hash: ${hash}`)
  }

  return hash
}

function parseWaitTime(error: unknown): number | null {
  if (!(error instanceof Error)) return null

  const match = error.message.match(/try again after (\d+) second/)
  if (!match) return null

  return Number(match[1])
}

async function processBatch(batchNumber: number): Promise<void> {
  let startTime = Date.now()

  try {
    if (settings.verbose) console.log(`🎲 Processing batch #${batchNumber}/${settings.amount}...`)

    const ticket = await fetchGachaTickets()
    startTime = Date.now()
    const txHash = await purchaseGacha(ticket, batchNumber)
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    })

    const reqHash = receipt.logs
      .map((log) =>
        decodeEventLogSafely<GachaRollRequestedEvent>({
          abi: shopAbi,
          data: log.data,
          topics: log.topics,
        }),
      )
      .find((event) => event?.eventName === 'GachaRollRequested')?.args.reqHash

    if (reqHash) {
      await processGachaResults(reqHash, batchNumber)

      if (batchNumber === settings.amount) {
        console.log('\n✨ Rolling spree complete!')
        process.exit(0)
      }
    }

    // Handle cooldown for next batch
    if (batchNumber < settings.amount) {
      const elapsed = Date.now() - startTime
      const remainingCooldown = Math.max(0, CONSTANTS.COOLDOWN - elapsed)
      if (remainingCooldown > 0) {
        if (settings.verbose) console.log(`\n⏳ Cooling down for ${(remainingCooldown / 1000).toFixed(1)} seconds...`)
        await new Promise((resolve) => setTimeout(resolve, remainingCooldown))
      }
    }
  } catch (error) {
    const waitTime = parseWaitTime(error)
    if (waitTime) {
      const waitMs = (waitTime + 1) * 1000 // Add 1 second buffer
      console.log(`\n⏳ App.Axie requested wait: ${waitTime + 1} seconds...`)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      return await processBatch(batchNumber) // Retry the same batch
    }

    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(0)
  }
}

async function main() {
  console.log('\n🛒 Garuda Gacha Roller\n')
  console.log(`📦 Buying ${settings.amount}x ${CONSTANTS.POUCHES_PER_TX}${settings.premium ? ' Premium' : ''} Pouches`)
  console.log(`📜 Total slips: ${settings.amount * CONSTANTS.POUCHES_PER_TX * (settings.premium ? 50 : 10)}`)

  if (settings.delegator) console.log(`🤝 Rolling for delegator: ${settings.delegator}`)

  for (let i = 1; i <= settings.amount; i++) await processBatch(i)
}

main().catch(console.error)
