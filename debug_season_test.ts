// One-off test: does EA's weekly export command accept a season/year field to reach
// a prior season's data? Read-only - no writes to madden_data27 destinations or exportedWeeks.
// TEMP FILE - not committed, delete after testing. Uses debugRawWeeklyExport, a temp
// debug export added to src/dashboard/ea_client.ts - also revert that after testing.
//
// Run with (from repo root, PowerShell), pointing at a real service account:
//   $env:SERVICE_ACCOUNT_FILE="path\to\service-account.json"; node -r ts-node/register debug_season_test.ts

import { debugRawWeeklyExport, LeagueData, Stage } from "./src/dashboard/ea_client"

const LEAGUE_ID = 0 // <-- fill in a real leagueId connected in madden_data27, currently on 2027

const WEEK_INDEX = 0 // week 1
const STAGE = Stage.SEASON

const candidateFieldNames = ["seasonIndex", "season", "year", "calendarYear", "seasonYear", "yearIndex"]

async function main() {
  if (!LEAGUE_ID) {
    console.error("Set LEAGUE_ID before running")
    process.exit(1)
  }

  console.log("--- baseline call (no season field) ---")
  const baseline = await debugRawWeeklyExport(LEAGUE_ID, LeagueData.WEEKLY_SCHEDULE, STAGE, WEEK_INDEX)
  console.log(JSON.stringify(baseline, null, 2).slice(0, 2000))

  for (const field of candidateFieldNames) {
    console.log(`\n--- trying field "${field}": 2026 ---`)
    try {
      const res = await debugRawWeeklyExport(LEAGUE_ID, LeagueData.WEEKLY_SCHEDULE, STAGE, WEEK_INDEX, { [field]: 2026 })
      console.log(JSON.stringify(res, null, 2).slice(0, 2000))
    } catch (e) {
      console.error(`field "${field}" errored: ${e}`)
    }
  }
}

main()
  .catch(e => console.error(`Fatal: ${e}`))
  .finally(() => process.exit(0))
