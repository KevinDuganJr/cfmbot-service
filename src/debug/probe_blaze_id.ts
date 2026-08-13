import { Agent, fetch } from "undici"
import { constants } from "crypto"

// Brute-force candidate X-BLAZE-ID / productName pairs against EA's real
// Blaze login endpoint to find the working Madden 27 naming convention.
//
// Usage:
//   ACCESS_TOKEN=<eaAccessToken> CONSOLE=ps5 npx ts-node src/debug/probe_blaze_id.ts
//
// ACCESS_TOKEN: the "EA Access Token" shown on the dashboard's connect-league screen.
// CONSOLE: xone | ps4 | pc | ps5 | xbsx | stadia (defaults to ps5)

const accessToken = process.env.ACCESS_TOKEN
if (!accessToken) {
  throw new Error("Set ACCESS_TOKEN env var to the EA access token from the dashboard")
}
const console_ = process.env.CONSOLE || "ps5"

const dispatcher = new Agent({
  connect: {
    rejectUnauthorized: false,
    secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
  },
})

// Each candidate is a [blazeId, productName] pair. blazeId goes in the
// X-BLAZE-ID header, productName goes in the login request body.
function candidates(c: string): Array<[string, string]> {
  return [
    [`madden-2027-${c}`, `madden-2027-${c}-mca`],
    [`madden-27-${c}`, `madden-27-${c}-mca`],
    [`madden-nfl-27-${c}`, `madden-nfl-27-${c}-mca`],
    [`madden-2027-${c}-gen5`, `madden-2027-${c}-mca`],
    [`madden-27-${c}-gen5`, `madden-27-${c}-mca`],
    [`madden-nfl27-${c}`, `madden-nfl27-${c}-mca`],
    [`maddennfl27-${c}`, `maddennfl27-${c}-mca`],
    // control: known-good M26 pair, should succeed every time
    [`madden-2026-${c}`, `madden-2026-${c}-mca`],
  ]
}

async function probe(blazeId: string, productName: string) {
  const headers = {
    "Accept-Charset": "UTF-8",
    "Accept": "application/json",
    "X-BLAZE-ID": blazeId,
    "X-BLAZE-VOID-RESP": "XML",
    "X-Application-Key": "MADDEN-MCA",
    "Content-Type": "application/json",
    "User-Agent":
      "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
  }
  try {
    const res = await fetch(
      `https://wal2.tools.gos.bio-iad.ea.com/wal/authentication/login`,
      {
        dispatcher: dispatcher,
        method: "POST",
        headers: headers,
        body: JSON.stringify({ accessToken, productName }),
      }
    )
    const text = await res.text()
    let ok = false
    try {
      const parsed = JSON.parse(text)
      ok = !!parsed?.userLoginInfo?.sessionKey
    } catch {
      ok = false
    }
    console.log(`${ok ? "SUCCESS" : "fail   "} blazeId=${blazeId.padEnd(30)} productName=${productName.padEnd(30)} -> ${text.slice(0, 150)}`)
    return ok
  } catch (e) {
    console.log(`error   blazeId=${blazeId.padEnd(30)} -> ${e}`)
    return false
  }
}

async function main() {
  for (const [blazeId, productName] of candidates(console_)) {
    await probe(blazeId, productName)
    await new Promise(r => setTimeout(r, 500))
  }
}

main()
