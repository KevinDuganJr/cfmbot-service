import { ephemeralClientFromToken, TokenInformation, BlazeError, EAAccountError } from "../dashboard/ea_client"
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URL, AUTH_SOURCE, MACHINE_KEY, AccountToken, SystemConsole, ENTITLEMENT_TO_SYSTEM } from "../dashboard/ea_constants"

// Replicates the full /dashboard/selectLeague flow (routes.ts lines ~168-222)
// end to end, starting from the identity-scoped access token, so we can see
// exactly which stage fails for Madden 27 and get the raw EA response.
//
// Usage:
//   ACCESS_TOKEN=<read-only token from "Choose EA Account"> \
//   PERSONA_ID=<EA Blaze Id / personaId> \
//   NAMESPACE=ps3 \
//   ENTITLEMENT=MADDEN_26PS5 \
//   node dist/debug/probe_full_flow.js

const rawAccessToken = process.env.ACCESS_TOKEN
const rawPersonaId = process.env.PERSONA_ID
const namespace = process.env.NAMESPACE || "ps3"
const entitlement = process.env.ENTITLEMENT || "MADDEN_26PS5"

if (!rawAccessToken || !rawPersonaId) {
  throw new Error("Set ACCESS_TOKEN and PERSONA_ID env vars")
}
const accessToken: string = rawAccessToken
const personaId: string = rawPersonaId

async function main() {
  console.log("Step 1: exchanging identity token for persona-scoped code...")
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
    console.log(`FAILED at step 1: no redirect location. Status: ${locationUrlResponse.status}, body: ${await locationUrlResponse.text()}`)
    return
  }
  const eaCode = new URLSearchParams(locationUrl.replace(REDIRECT_URL, "")).get("code")
  if (!eaCode) {
    console.log(`FAILED at step 1: no code in redirect. Location: ${locationUrl}`)
    return
  }
  console.log("Step 1 OK, got code")

  console.log("Step 2: exchanging code for persona-scoped access token...")
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
    console.log(`FAILED at step 2: ${await newAccessTokenResponse.text()}`)
    return
  }
  const token = await newAccessTokenResponse.json() as AccountToken
  console.log("Step 2 OK, got persona-scoped access token")

  console.log("Step 3: Blaze login + GetMyLeagues...")
  const systemConsole = ENTITLEMENT_TO_SYSTEM[entitlement] || SystemConsole.PS5
  const tokenInfo: TokenInformation = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiry: new Date(Date.now() + token.expires_in * 1000),
    console: systemConsole,
    blazeId: personaId,
  }
  try {
    const client = await ephemeralClientFromToken(tokenInfo)
    const leagues = await client.getLeagues()
    console.log(`SUCCESS: got ${leagues.length} leagues`)
    leagues.forEach(l => console.log(` - ${l.leagueId}: ${l.leagueName}`))
  } catch (e) {
    if (e instanceof BlazeError) {
      console.log(`FAILED at step 3 (BlazeError): ${JSON.stringify(e.error)}`)
    } else if (e instanceof EAAccountError) {
      console.log(`FAILED at step 3 (EAAccountError): ${e.message}`)
    } else {
      console.log(`FAILED at step 3: ${e}`)
    }
  }
}

main()
