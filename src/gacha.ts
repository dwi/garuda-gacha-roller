import { fetchApi } from './utils'

const buyGachaTicketsMsg = `mutation BuyGachaTicketMessage($chests: [GachaChestTpe!]!) {
  buyGachaTicketMessage(chests: $chests) {
    chests {
      amount
      category
    }
    nonce
    slipAmount
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
    console.log(`Failed to buy gacha tickets`, gachaData)
  }
}