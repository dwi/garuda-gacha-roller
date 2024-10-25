import { fetchApi } from './utils'

const buyGachaTicketsMsg = `mutation BuyGachaTicketMessage($chests: [GachaChestTpe!]!, $delegatorAddress: String) {
  buyGachaTicketMessage(chests: $chests, delegatorAddress: $delegatorAddress) {
    chests {
      amount
      category
    }
    recipient
    nonce
    slipAmount
    slipOwner
    deadline
    signature
  }
}
`

export async function fetchBuyGacha(amount: number, premium: boolean, token: string) {
  const variables = {
    chests: Array(amount).fill(premium ? 'Silver' : 'Bronze')
  }
  const headers = {
    Authorization: `Bearer ${token}`
  }

  const gachaData = await fetchApi(buyGachaTicketsMsg, variables, headers)

  if ((gachaData as any)?.data?.buyGachaTicketMessage) {
    return (gachaData as any).data.buyGachaTicketMessage
  } else {
    return gachaData
  }
}