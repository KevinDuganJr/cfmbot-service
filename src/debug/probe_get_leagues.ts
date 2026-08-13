import { ephemeralClientFromToken, TokenInformation, BlazeError } from "../dashboard/ea_client"
import { SystemConsole } from "../dashboard/ea_constants"

// Exercises the real production code path (retrieveBlazeSession + getLeagues)
// against the currently-deployed YEAR/BLAZE_SERVICE config, to see exactly
// where in the flow Madden 27 league lookup fails.
//
// Usage:
//   ACCESS_TOKEN=<eaAccessToken> CONSOLE=ps5 node dist/debug/probe_get_leagues.js

const rawAccessToken = process.env.ACCESS_TOKEN
if (!rawAccessToken) {
  throw new Error("Set ACCESS_TOKEN env var to the EA access token from the dashboard")
}
const accessToken: string = rawAccessToken
const console_ = (process.env.CONSOLE || "ps5") as SystemConsole

async function main() {
  const token: TokenInformation = {
    accessToken,
    refreshToken: "unused",
    expiry: new Date(Date.now() + 60 * 60 * 1000),
    console: console_,
    blazeId: "0",
  }
  try {
    const client = await ephemeralClientFromToken(token)
    const leagues = await client.getLeagues()
    console.log(`SUCCESS: got ${leagues.length} leagues`)
    leagues.forEach(l => console.log(` - ${l.leagueId}: ${l.leagueName}`))
  } catch (e) {
    if (e instanceof BlazeError) {
      console.log(`BlazeError: ${JSON.stringify(e.error)}`)
    } else {
      console.log(`Error: ${e}`)
    }
  }
}

main()
