import { ephemeralClientFromToken, TokenInformation, BlazeError, EAAccountError, Stage } from "../dashboard/ea_client"
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URL, AUTH_SOURCE, MACHINE_KEY, AccountToken, SystemConsole, ENTITLEMENT_TO_SYSTEM } from "../dashboard/ea_constants"

// Same persona-scoped token exchange as probe_full_flow.ts, but instead of
// stopping at the first failure, tries every franchise endpoint individually
// against a known leagueId, to see which ones EA has actually turned on for
// Madden 27 vs which are still dark.
//
// Usage:
//   ACCESS_TOKEN=<read-only token from "Choose EA Account"> \
//   PERSONA_ID=<EA Blaze Id / personaId> \
//   LEAGUE_ID=<a guess at your M27 franchise's league id> \
//   NAMESPACE=ps3 \
//   ENTITLEMENT=MADDEN_26PS5 \
//   node dist/debug/probe_endpoints.js

const rawAccessToken = process.env.ACCESS_TOKEN
const rawPersonaId = process.env.PERSONA_ID
const rawLeagueId = process.env.LEAGUE_ID
const namespace = process.env.NAMESPACE || "ps3"
const entitlement = process.env.ENTITLEMENT || "MADDEN_26PS5"

if (!rawAccessToken || !rawPersonaId || !rawLeagueId) {
  throw new Error("Set ACCESS_TOKEN, PERSONA_ID, and LEAGUE_ID env vars")
}
const accessToken: string = rawAccessToken
const personaId: string = rawPersonaId
const leagueId: number = Number(rawLeagueId)

async function getPersonaToken(): Promise<AccountToken> {
  const locationUrlResponse = await fetch(`https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=${REDIRECT_URL}&client_id=${CLIENT_ID}&machineProfileKey=${MACHINE_KEY}&authentication_source=${AUTH_SOURCE}&access_token=${accessToken}&persona_id=${personaId}&persona_namespace=${namespace}`, {
    redirect: "manual",
    headers: {
      "Upgrade-Insecure-Requests": "1",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.71 Mobile Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "X-Requested-With": "com.ea.gp.madden19companionapp",
      "Sec-Fetc-Site": "none",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-User": "?1",
      "Sec-Fetch-Dest": "document",
      "Accept-Encoding": "gzip, deflate",
      "Accept-Language": "en-US,en;q=0,9",
    }
  })
  const locationUrl = locationUrlResponse.headers.get("Location")
  if (!locationUrl) {
    throw new Error(`no redirect location. Status: ${locationUrlResponse.status}, body: ${await locationUrlResponse.text()}`)
  }
  const eaCode = new URLSearchParams(locationUrl.replace(REDIRECT_URL, "")).get("code")
  if (!eaCode) {
    throw new Error(`no code in redirect. Location: ${locationUrl}`)
  }
  const newAccessTokenResponse = await fetch(`https://accounts.ea.com/connect/token`, {
    method: "POST",
    headers: {
      "Accept-Charset": "UTF-8",
      "User-Agent":
        "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept-Encoding": "gzip",
    },
    body: `authentication_source=${AUTH_SOURCE}&code=${eaCode}&grant_type=authorization_code&token_format=JWS&release_type=prod&client_secret=${CLIENT_SECRET}&redirect_uri=${REDIRECT_URL}&client_id=${CLIENT_ID}`,
  })
  if (!newAccessTokenResponse.ok) {
    throw new Error(await newAccessTokenResponse.text())
  }
  return await newAccessTokenResponse.json() as AccountToken
}

async function tryCall(name: string, fn: () => Promise<any>) {
  try {
    const result = await fn()
    console.log(`LIVE    ${name}: ${JSON.stringify(result).slice(0, 200)}`)
  } catch (e) {
    if (e instanceof BlazeError) {
      console.log(`dark    ${name}: BlazeError ${JSON.stringify(e.error)}`)
    } else if (e instanceof EAAccountError) {
      console.log(`dark    ${name}: EAAccountError ${e.message}`)
    } else {
      console.log(`dark    ${name}: ${e}`)
    }
  }
}

async function main() {
  console.log("Exchanging for persona-scoped token...")
  const token = await getPersonaToken()
  console.log("Got token, probing endpoints against leagueId=" + leagueId)

  const systemConsole = ENTITLEMENT_TO_SYSTEM[entitlement] || SystemConsole.PS5
  const tokenInfo: TokenInformation = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiry: new Date(Date.now() + token.expires_in * 1000),
    console: systemConsole,
    blazeId: personaId,
  }
  const client = await ephemeralClientFromToken(tokenInfo)

  await tryCall("getLeagues()", () => client.getLeagues())
  await tryCall("getLeagueInfo(leagueId)", () => client.getLeagueInfo(leagueId))
  await tryCall("getTeams(leagueId)", () => client.getTeams(leagueId))
  await tryCall("getStandings(leagueId)", () => client.getStandings(leagueId))
  await tryCall("getSchedules(leagueId, PRESEASON, 1)", () => client.getSchedules(leagueId, Stage.PRESEASON, 1))
  await tryCall("getFreeAgents(leagueId)", () => client.getFreeAgents(leagueId))
}

main()
