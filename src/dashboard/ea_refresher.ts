import db from "../db/firebase"
import { FieldValue } from "firebase-admin/firestore"
import { storedTokenClient, exporterForLeague, ExportContext } from "./ea_client"

const MAX_WEEKS_PER_CYCLE = 4

// optional comma-separated allowlist for staged rollout/testing - when set, only these
// league ids get auto exported (all others are still polled but never trigger an export).
// unset means every connected league is eligible, which is the eventual steady state.
const AUTO_EXPORT_LEAGUE_ALLOWLIST = process.env.AUTO_EXPORT_LEAGUE_IDS
  ? new Set(process.env.AUTO_EXPORT_LEAGUE_IDS.split(",").map(id => id.trim()))
  : undefined

async function getLatestLeagues(): Promise<string[]> {
  const collection = db.collection("madden_data27").where("blazeId", "!=", null)
  const docs = await collection.get()
  return docs.docs.map(d => d.id)
}

function weekKey(year: number, stage: number, week: number): string {
  return `${year}-${stage}-${week}`
}

async function getExportedWeeks(leagueId: string): Promise<Set<string>> {
  const doc = await db.collection("madden_data27").doc(leagueId).get()
  const exportedWeeks = doc.data()?.autoExportState?.exportedWeeks as string[] | undefined
  return new Set(exportedWeeks ?? [])
}

async function markWeeksExported(leagueId: string, keys: string[]): Promise<void> {
  await db.collection("madden_data27").doc(leagueId).set({
    autoExportState: {
      exportedWeeks: FieldValue.arrayUnion(...keys),
      lastExportedAt: FieldValue.serverTimestamp()
    }
  }, { merge: true })
}

async function checkLeague(leagueId: string) {
  console.log(`Checking league ${leagueId}`)
  const client = await storedTokenClient(Number(leagueId))
  const leagueInfo = await client.getLeagueInfo(Number(leagueId))

  if (leagueInfo.careerHubInfo.isLeagueAdvancing) {
    console.log(`League ${leagueId} is mid-advance, skipping this cycle`)
    return
  }

  const year = leagueInfo.careerHubInfo.seasonInfo.calendarYear
  // EA keeps reporting preseason weeks as "complete" in availableWeekInfoList forever,
  // but their weekly stats stop being fetchable once the league has moved into the
  // regular season - so preseason is only actually exportable while still in preseason.
  const stillInPreseason = leagueInfo.careerHubInfo.seasonInfo.seasonWeekType === 0
  const allCompleted = (leagueInfo.availableWeekInfoList ?? [])
    .filter(w => w.gameTotalCount > 0 && w.gamesPlayedCount === w.gameTotalCount)
  const exportedWeeks = await getExportedWeeks(leagueId)
  const unreachable = !stillInPreseason
    ? allCompleted.filter(w => w.stageIndex === 0 && !exportedWeeks.has(weekKey(year, w.stageIndex, w.weekIndex)))
    : []
  if (unreachable.length > 0) {
    const unreachableKeys = unreachable.map(w => weekKey(year, w.stageIndex, w.weekIndex))
    console.log(`League ${leagueId} has preseason week(s) no longer exportable (regular season already started), writing them off: ${unreachableKeys.join(", ")}`)
    // no EA export call for these - just close them out so we stop re-evaluating them
    await markWeeksExported(leagueId, unreachableKeys)
  }

  const completedWeeks = allCompleted.filter(w => stillInPreseason || w.stageIndex !== 0)
  if (completedWeeks.length === 0) {
    return
  }

  const newlyCompleted = completedWeeks
    .filter(w => !exportedWeeks.has(weekKey(year, w.stageIndex, w.weekIndex)))
    .sort((a, b) => a.stageIndex - b.stageIndex || a.weekIndex - b.weekIndex)
    .slice(0, MAX_WEEKS_PER_CYCLE)

  if (newlyCompleted.length === 0) {
    return
  }

  const keys = newlyCompleted.map(w => weekKey(year, w.stageIndex, w.weekIndex))

  if (AUTO_EXPORT_LEAGUE_ALLOWLIST && !AUTO_EXPORT_LEAGUE_ALLOWLIST.has(leagueId)) {
    console.log(`League ${leagueId} has newly completed week(s) (${keys.join(", ")}) but is not in AUTO_EXPORT_LEAGUE_IDS, skipping auto export`)
    return
  }

  console.log(`League ${leagueId} has newly completed week(s), auto exporting: ${keys.join(", ")}`)

  const exporter = exporterForLeague(Number(leagueId), ExportContext.AUTO)
  const { waitUntilDone } = exporter.exportSpecificWeeks(
    newlyCompleted.map(w => ({ weekIndex: w.weekIndex, stage: w.stageIndex }))
  )
  // don't block the poll loop on the export finishing - only persist once it actually
  // succeeds, so a failure just gets retried (same weeks are still "not exported") on
  // the next cycle instead of getting silently marked done.
  waitUntilDone
    .then(() => markWeeksExported(leagueId, keys))
    .catch(e => console.error(`Auto export failed for league ${leagueId} (${keys.join(", ")}): ${e}`))
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const SLEEP_MIN = 15
async function runLeagueChecks() {
  while (true) {
    const leagues = await getLatestLeagues()
    for (const leagueId of leagues) {
      // avoid any overloading of EA
      await sleep(12000)
      try {
        await checkLeague(leagueId)
      } catch (e) {
        console.error(`Error checking league ${leagueId}: ${e}`)
      }
    }
    console.log(`Check complete, sleeping for ${SLEEP_MIN} minutes...\n`)
    await fetch("https://hc-ping.com/82b9220a-02cf-4ca1-9385-3c8b9463cff3")
    await sleep(SLEEP_MIN * 60 * 1000)
  }
}

runLeagueChecks()
