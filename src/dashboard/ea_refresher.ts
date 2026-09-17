import db from "../db/firebase"
import NodeCache from "node-cache"
import { storedTokenClient } from "./ea_client"
import { DEPLOYMENT_URL } from "../config"
import { sha1 } from "hash-wasm"

const hash: (a: any) => Promise<string> = (a: any) => {
  return sha1(JSON.stringify(a))
}
const changeCache = new NodeCache()

async function getLatestLeagues(): Promise<string[]> {
  const collection = db.collection("madden_data27").where("blazeId", "!=", null)
  const docs = await collection.get()
  return docs.docs.map(d => d.id)
}

async function checkLeague(leagueId: string) {
  console.log(`Checking league ${leagueId}`)
  const client = await storedTokenClient(Number(leagueId))
  const leagueData = await client.getLeagueInfo(Number(leagueId))
  const leagueHash = {
    currentWeek: leagueData.careerHubInfo.seasonInfo.seasonWeek,
    currentGamesPlayed: leagueData.gameScheduleHubInfo.leagueSchedule.filter(game => game.seasonGameInfo.isGamePlayed).length,
  }
  const newHash = await hash(leagueHash)
  if (newHash !== changeCache.get(leagueId)) {
    console.log(`Detected change in ${leagueId}`)
    // await fetch(`${DEPLOYMENT_URL}/dashboard/league/${leagueId}/export`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       exportOption: "Current Week"
    //     })
    //   }
    // )
    changeCache.set(leagueId, newHash)
  }

  console.log(`League ${leagueId} has newly completed week(s), auto exporting: ${keys.join(", ")}`)

  const exporter = exporterForLeague(Number(leagueId), ExportContext.AUTO)
  const { waitUntilDone } = exporter.exportSpecificWeeks(
    newlyCompleted.map(w => ({ weekIndex: w.weekIndex, stage: w.stageIndex }))
  )
  // this runs once per Scheduler invocation, not inside a long-lived loop, so we have to
  // actually wait for the export to finish before this function (and eventually the whole
  // process) returns - otherwise the one-off dyno could exit mid-export. only persist once
  // it succeeds, so a failure just gets retried (weeks stay "not exported") next run.
  try {
    await waitUntilDone
    await markWeeksExported(leagueId, keys)
  } catch (e) {
    console.error(`Auto export failed for league ${leagueId} (${keys.join(", ")}): ${e}`)
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// invoked by Heroku Scheduler on its own cadence (not a persistent worker dyno) - do one
// pass through every connected league and exit, rather than looping/sleeping forever.
async function runLeagueChecks() {
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
  console.log(`Check complete\n`)
  await fetch("https://hc-ping.com/82b9220a-02cf-4ca1-9385-3c8b9463cff3")
}

runLeagueChecks()
  .catch(e => console.error(`Fatal error in league check pass: ${e}`))
  .finally(() => process.exit(0))
