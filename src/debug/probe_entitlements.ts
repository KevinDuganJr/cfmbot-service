// Dumps the raw EA entitlements response for an account, so we can see exactly
// what EA returns (group names, tags, status) instead of guessing why a given
// Madden year isn't showing up as a selectable persona.
//
// Usage:
//   ACCESS_TOKEN=<the "EA Access Token" shown on the Choose EA Account page> \
//   node dist/debug/probe_entitlements.js

const rawAccessToken = process.env.ACCESS_TOKEN
if (!rawAccessToken) {
  throw new Error("Set ACCESS_TOKEN env var to the EA access token from the dashboard (Choose EA Account page)")
}
const accessToken: string = rawAccessToken

async function main() {
  const pidResponse = await fetch(
    `https://accounts.ea.com/connect/tokeninfo?access_token=${accessToken}`,
    {
      headers: {
        "Accept-Charset": "UTF-8",
        "X-Include-Deviceid": "true",
        "User-Agent":
          "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
        "Accept-Encoding": "gzip",
      },
    }
  )
  if (!pidResponse.ok) {
    throw new Error(`Failed to retrieve account info: ${await pidResponse.text()}`)
  }
  const { pid_id: pid } = await pidResponse.json() as { pid_id: string }
  console.log(`pid: ${pid}`)

  const entitlementsResponse = await fetch(
    `https://gateway.ea.com/proxy/identity/pids/${pid}/entitlements/?status=ACTIVE`,
    {
      headers: {
        "User-Agent":
          "Dalvik/2.1.0 (Linux; U; Android 13; sdk_gphone_x86_64 Build/TE1A.220922.031)",
        "Accept-Charset": "UFT-8",
        "X-Expand-Results": "true",
        "Accept-Encoding": "gzip",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
  if (!entitlementsResponse.ok) {
    throw new Error(`Failed to retrieve entitlements: ${await entitlementsResponse.text()}`)
  }
  const entitlementsJson = await entitlementsResponse.json()
  console.log(JSON.stringify(entitlementsJson, null, 2))

  const entitlements = entitlementsJson?.entitlements?.entitlement || []
  console.log(`\n${entitlements.length} active entitlement(s) total`)
  const madden = entitlements.filter((e: any) => typeof e.groupName === "string" && e.groupName.startsWith("MADDEN_"))
  console.log(`\nMADDEN_* entitlements (any tag/status shown here is already ACTIVE):`)
  madden.forEach((e: any) => {
    console.log(`  groupName=${e.groupName} entitlementTag=${e.entitlementTag} status=${e.status} statusReasonCode=${e.statusReasonCode}`)
  })
  if (madden.length === 0) {
    console.log("  (none found)")
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
