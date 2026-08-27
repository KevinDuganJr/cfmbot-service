if (!process.env.DEPLOYMENT_URL) {
  throw new Error(`Missing Deployment URL for bot, for local this would be localhost:PORT`)
}
let deployment = ""
if (process.env.DEPLOYMENT_URL.startsWith("localhost")) {
  deployment = "http://" + process.env.DEPLOYMENT_URL
} else if (!process.env.DEPLOYMENT_URL.startsWith("http")) {
  deployment = "https://" + process.env.DEPLOYMENT_URL
} else {
  deployment = process.env.DEPLOYMENT_URL
}
export const DEPLOYMENT_URL = deployment

let queueConcurrency = 1
if (process.env.QUEUE_CONCURRENCY) {
  queueConcurrency = Number(process.env.QUEUE_CONCURRENCY)
}
export const QUEUE_CONCURRENCY = queueConcurrency

// requires Heroku Dyno Metadata to be enabled (`heroku labs:enable runtime-dyno-metadata -a <app>`)
// falls back to just the release number, or "dev" locally, when that metadata isn't present
function buildVersion(): string {
  const releaseVersion = process.env.HEROKU_RELEASE_VERSION // e.g. "v42"
  const releaseCreatedAt = process.env.HEROKU_RELEASE_CREATED_AT // e.g. "2026-08-27T14:32:00Z"
  const buildNumber = releaseVersion ? releaseVersion.replace(/^v/, "") : undefined
  if (!releaseCreatedAt) {
    return buildNumber ?? "dev"
  }
  const date = new Date(releaseCreatedAt)
  const datePart = `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(date.getUTCDate()).padStart(2, "0")}`
  return buildNumber ? `${datePart}.${buildNumber}` : datePart
}
export const BUILD_VERSION = buildVersion()
