import { yellow, blueBright, magentaBright, cyanBright } from 'colorette'

export const CONSTANTS = {
  POUCHES_PER_TX: 100,
  SHOP_ADDRESS: '0x3e0674b1ddc84b0cfd9d773bb2ce23fe8f445de3' as const,
  VRF_ADDRESS: '0x16a62a921e7fec5bf867ff5c805b662db757b778' as const,
  COOLDOWN: 60_000, // 60 seconds in ms
  VRF_TIMEOUT: 300_000, // 5 minutes in ms
  BASE_FEE: 100000000000000000n, // 0.1 RON
} as const

export const REWARD_FORMATTERS = {
  COCO: (amount: bigint) => (amount > 0n ? yellow(`${amount}x Coco`) : ''),
  PREMIUM_COCO: (amount: bigint) => (amount > 0n ? blueBright(`${amount}x Premium Coco`) : ''),
  SPIRIT_SHELL: (amount: bigint) => (amount > 0n ? magentaBright(`${amount}x Spirit Shell`) : ''),
  AXIE: (rewards: bigint[]) => (rewards.length > 0 ? cyanBright(`Axie: ${rewards.join(', ')}`) : ''),
} as const
