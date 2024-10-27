export interface GachaTicket {
  chests: Array<{ amount: string; category: string }>
  recipient: string
  nonce: string
  slipAmount: string
  slipOwner: string
  deadline: string
  signature: string
}

export interface RandomSeedFulfilledEvent {
  eventName: 'RandomSeedFulfilled'
  args: {
    requestHash: `0x${string}`
    randomSeed: bigint
    callbackResult: boolean
  }
}

export interface GachaRollRequestedEvent {
  eventName: 'GachaRollRequested'
  args: {
    reqHash: `0x${string}`
  }
}

export interface GachaRollFulfilledEvent {
  eventName: 'GachaRollFulfilled'
  args: {
    reqHash: `0x${string}`
    pot: {
      cocoAmt: bigint
      premiumCocoAmt: bigint
      spiritShellAmt: bigint
    }
    axieRewards: bigint[]
  }
}
