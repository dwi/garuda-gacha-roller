import { apiRequest } from "./utils";

const AUTH_NONCE_URL = 'https://athena.skymavis.com/v2/public/auth/ronin/fetch-nonce'
const AUTH_LOGIN_URL = 'https://athena.skymavis.com/v2/public/auth/ronin/login'
const AUTH_TOKEN_REFRESH_URL = 'https://athena.skymavis.com/v2/public/auth/token/refresh'

interface IAuthFetchNonceResponse {
  nonce: string;
  issued_at: string;
  not_before: string;
  expiration_time: string;
}

interface IAuthLoginResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  accessTokenExpiresIn: number,
  refreshToken: string;
  userID: string;
  enabled_mfa: boolean;
}

// Taken from https://github.com/SM-Trung-Le/temp-accessToken
export const generateAccessTokenMessage = async (
  address: string,
  domain = `YOUR_DOMAIN_GOES_HERE`,
  uri = "https://YOUR_APP_URI",
  statement = `YOUR_STATEMENT`,
) => {
  const data = await exchangeNonce(address)
  const message = `${domain} wants you to sign in with your Ronin account:\n${address.replace('0x', 'ronin:').toLowerCase()}\n\n${statement}\n\nURI: ${uri}\nVersion: 1\nChain ID: 2020\nNonce: ${data.nonce}\nIssued At: ${data.issued_at}\nExpiration Time: ${data.expiration_time}\nNot Before: ${data.not_before}`
  return message
}

export const exchangeToken = async (signature: string, message: string) => {
  const data = await apiRequest<IAuthLoginResponse>(AUTH_LOGIN_URL, JSON.stringify({ signature, message }))

  if (!data.accessToken) {
    throw new Error('No access token')
  }

  return data
}

export const exchangeNonce = async (address: string) => {
  const headers = {}
  const data = await apiRequest<IAuthFetchNonceResponse>(`${AUTH_NONCE_URL}?address=${address}`, null, headers, "GET")

  if (!data.nonce) {
    throw new Error('No access token')
  }

  return data
}

export const refreshToken = async (refreshToken: string) => {
  const data = await apiRequest<IAuthLoginResponse>(AUTH_TOKEN_REFRESH_URL, JSON.stringify({ refreshToken }))
  const newAccessToken = data.accessToken
  const newRefreshToken = data.refreshToken
  return { newAccessToken, newRefreshToken }
}
