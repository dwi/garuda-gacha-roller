import * as dotenv from 'dotenv'

dotenv.config()

export async function fetchApi<T>(query: string, variables: { [key: string]: any }, headers?: { [key: string]: any }): Promise<T | null> {
  try {
    const response = await fetch('https://api-gateway.skymavis.com/graphql/axie-marketplace', {
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/json',
        'X-API-Key': process.env.SKIMAVIS_DAPP_KEY || '',
        ...headers
      }),
      body: JSON.stringify({ query, variables })
    })

    const res: T = await response.json()
    return res
  } catch (error) {
    console.log(error)
    return null
  }
}

export async function apiRequest<T>(
  url: string,
  body: BodyInit | null = null,
  headers: Record<string, string> = {},
  method: 'GET' | 'POST' = 'POST',
) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    ...(method === 'GET' ? {} : { body })
  })

  const res: T = await response.json()
  return res
}
