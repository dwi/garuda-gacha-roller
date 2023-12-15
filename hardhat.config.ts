import { HardhatUserConfig, task } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
import * as fs from 'fs/promises'
import * as dotenv from 'dotenv'
import { fetchBuyGacha } from './src/gacha'
import { exchangeToken, generateAccessTokenMessage } from './src/access-token'
import { ethers } from 'ethers'
dotenv.config()

const CHESTS_PER_TX = 100

task('shop', 'Buy pouches')
  .addParam('amount', 'Amount of purchases')
  .addFlag('premium', 'Buy Premium Pouches')
  .setAction(async (taskArgs: { amount: number, premium: boolean }, hre) => {
    const accounts = await hre.ethers.getSigners()
    const signer = accounts[0]
    const address = signer.address.toLowerCase()

    const amount = taskArgs.amount// > 2000 ? 2000 : taskArgs.amount
    const premium = taskArgs.premium

    // get axie contract
    const shopABI = JSON.parse(await fs.readFile('abis/garudashop.json', 'utf8'))
    const shopContract = await new hre.ethers.Contract(
      '0x3e0674b1ddc84b0cfd9d773bb2ce23fe8f445de3',
      shopABI,
      signer
    )

    let results = []
    const accessTokenMessage = await generateAccessTokenMessage(address)
    const accessTokenSignature = await signer.signMessage(accessTokenMessage)
    const { accessToken } = await exchangeToken(accessTokenSignature, accessTokenMessage)

    console.log(`Buying ${amount}x ${CHESTS_PER_TX}${premium ? ' Premium' : ''} Pouches (total ${amount * CHESTS_PER_TX * (premium ? 50 : 10)} slips)`)

    for (let i = 1; i <= amount; i++) {
      results = await fetchBuyGacha(CHESTS_PER_TX, premium, accessToken)

      try {
        const chestsToRoll = Array(CHESTS_PER_TX).fill([premium ? '1' : '0', premium ? '50' : '10'])
        const txRoll = await shopContract.roll(chestsToRoll, results[0].nonce, results[0].deadline, results[0].slipAmount, results[0].signature,
          {
            value: ethers.utils.parseEther((0.0112 * CHESTS_PER_TX).toString()),
            gasLimit: 6000000
          })
        console.log(`#${i}\tPurchased ${results[0].chests.length}${premium ? ' Premium' : ''} Pouches:`, txRoll.hash)
      } catch (e: Error | any) {
        console.log('⭕ Failed to buy')
        e.code && e.info && console.error(`⚠️ ${e.code} (${e.info.error.message})`)
      }

      if (i < amount) {
        await new Promise(resolve => setTimeout(resolve, 60000))
      }
    }
  })

const config: HardhatUserConfig = {
  defaultNetwork: 'ronin',
  networks: {
    ronin: {
      chainId: 2020,
      url: 'https://api.roninchain.com/rpc',
      accounts: [process.env.PRIVATE_KEY as string]
    }
  }
}

export default config
