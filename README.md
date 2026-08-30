# cfmbot-service

A Node/Koa service that connects a Madden Companion App / EA account to a Madden league, exports that league's data out over HTTP to one or more destinations, and optionally drives a Discord bot on top of it. This deployment runs as **CFM Stats Madden Exporter**. Forked from [Snallabot](https://github.com/snallabot/snallabot-service), so some internals (package name, code comments, upstream links) still reference that name.

```
Live Deployment: https://export.cfmstats.com (Heroku)
```

## What it does

### Startup ([server.ts](src/server.ts))

A single Koa app mounting six routers in order: export, discord, twitch-notifier, connections, debug, dashboard. Each router owns its own slice of functionality below.

### Connecting a league ([dashboard/routes.ts](src/dashboard/routes.ts), [dashboard/ea_client.ts](src/dashboard/ea_client.ts))

The dashboard pug templates ([dashboard/templates/](src/dashboard/templates/)) walk a user through a one-time setup:

1. **`start.pug`** — user logs into EA, pastes back the resulting (broken) redirect URL.
2. **`persona.pug`** — pick which EA Persona/console to use.
3. **`choose_league.pug`** — pick which Madden league to connect.
4. **`dashboard.pug`** — the connected league's home: export controls, export status, schedule.

On connect, `storeToken()` writes the EA access/refresh token to Firestore (`madden_data27` collection) keyed by league ID, along with a `destinations` map — each entry is a URL flagged for which data types it wants (`leagueInfo`, `rosters`, `weeklyStats`, `extraData`) and whether it fires on `autoUpdate`.

### Exporting data ([dashboard/ea_client.ts](src/dashboard/ea_client.ts) `handleExportTask`, [export/exporter.ts](src/export/exporter.ts))

Pulls league/team/roster/weekly-stat data from EA's Blaze API, then POSTs it to every destination flagged for that data type. Triggered either:
- **Manually** — the dashboard's Export button, or Discord's `/export` command.
- **Automatically** — `ExportContext.AUTO`, currently only wired to the Discord game-channel GG-reaction flow ([discord/notifier.ts](src/discord/notifier.ts), [discord/commands/game_channels.ts](src/discord/commands/game_channels.ts)); destinations must also have `autoUpdate: true` to receive these.

### Receiving exports ([export/routes.ts](src/export/routes.ts))

Exposes `POST /:platform/:leagueId/...` endpoints — what the Madden Companion App (or this service itself, if its own URL is listed as a destination) posts data *to*. Received data is written into [db/madden_db.ts](src/db/madden_db.ts) (`MaddenDB`, Firestore-backed), which powers the Discord bot below.

### Discord bot ([discord/](src/discord))

A full slash-command bot layered on top of `MaddenDB`:

| Area | Commands |
|---|---|
| League data | `teams`, `player`, `standings`, `schedule`, `stats`, `game_stats`, `bracket` |
| Automation | `game_channels`, `broadcasts`, `waitlist`, `sims`, `logger` |
| Setup | `dashboard`, `export`, `league_export`, `player_configuration` |

[discord/notifier.ts](src/discord/notifier.ts) and [discord/discord_utils.ts](src/discord/discord_utils.ts) handle outbound messaging/reactions/channel management via `oceanic.js`.

### Other components

- [connections/routes.ts](src/connections/routes.ts) — connection-management endpoints.
- [twitch-notifier/](src/twitch-notifier/) — Twitch EventSub webhook, posts broadcast messages in Discord when a linked streamer goes live.
- [yt-notifier/](src/yt-notifier/) — checks connected YouTube channels and posts in Discord if a channel's stream title matches a game in that server's league.
- [debug/](src/debug/) — probe/debug endpoints for EA entitlements, endpoints, and full-flow testing.

### EA token refresher ([dashboard/ea_refresher.ts](src/dashboard/ea_refresher.ts))

A standalone script, run on a schedule outside the main service (e.g. a Heroku scheduler job), not an in-app timer. There are two EA tokens: `access_token` (expires after 4 hours) and `refresh_token` (used to mint a new pair). Both eventually expire after ~10 days of inactivity. Each run loops over every connected league, calls `storedTokenClient()` to refresh its EA token, and detects week/game-count changes via a hash comparison (the auto-export-on-advance follow-through is scaffolded but currently commented out).

```sh
npm run build && npm run ea-refresher
```

## Contributing

### Main Service

To run a local version of the bot, you need:
- Node 21 (greater should be okay)
- Discord Application - free to register on [Discord Developer Portal](https://discord.com/developers/applications)

Setup your env file by copying `.base.env` into `.dev.env`:

```sh
cp .base.env .dev.env
```

Then fill in the env file with the required fields. Some will be from your Discord developer portal. `.base.env` has info on each field required and optional.

For production, you will need a similar env setup that is dependent on your deployment.

Then install dependencies and run the dev version:

```sh
npm install
npm run dev
```

This will spin up a Firebase emulator, use local file storage, and make a local version available at `localhost:3000`.

### Other Components

There are 3 other runnable components: EA token refresher (above), YouTube notifier, Twitch notifier.

#### YouTube Notifier

Checks all YouTube channels added to the bot and posts in Discord if that channel is playing a game in that server's league (based on stream titles). Runs every 10 minutes as a cron job.

```sh
npm run build && npm run yt-notifier
```

#### Twitch Notifier

A webhook that hooks into Twitch live events to post broadcasts for users who stream on Twitch. Requires the following environment variables, mostly from your Twitch developer account:

```
TWITCH_CALLBACK_URL: by default this would be /twitch/webhook
TWITCH_CLIENT_ID: from your Twitch developer account
TWITCH_CLIENT_SECRET: from your Twitch developer account
TWITCH_SECRET: a random secret you generate for Twitch, see Twitch EventSub https://dev.twitch.tv/docs/eventsub/handling-webhook-events/
```
