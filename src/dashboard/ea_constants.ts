export const AUTH_SOURCE = 317239
export const REDIRECT_URL = "http://127.0.0.1/success"
export const MACHINE_KEY = "444d362e8e067fe2"

export type GameYear = "25" | "26" | "27"
export const GAME_YEARS: GameYear[] = ["25", "26", "27"]
export type EntitlementYear = "25" | "26"
export const ENTITLEMENT_YEARS: EntitlementYear[] = ["25", "26"]

export const GAME_CONFIG: Record<GameYear, { entitlementYear: EntitlementYear, clientId: string, clientSecret: string, blazeYear: string, componentName: string, label: string }> = {
  "25": { entitlementYear: "25", clientId: "MCA_25_COMP_APP", clientSecret: "wfGAWnrxLroZOwwELYA2ZrAuaycuF2WDb00zOLv48Sb79viJDGlyD6OyK8pM5eIiv_20240731135155", blazeYear: "2025", componentName: "careermode", label: "Madden 25" },
  "26": { entitlementYear: "26", clientId: "MCA_26_COMP_APP", clientSecret: "teJpJ9cSXFqZAuKNW8IuHpy8D4dwWPoVrPoek38iCnrGbrUSfjqnHMBAv8iCVjeSm_20250910175618", blazeYear: "2026", componentName: "careermode", label: "Madden 26" },
  // placeholder: rides on the M26 entitlement/app until MCA_27 releases (Sept 1st), but talks to the M27 blaze servers
  "27": { entitlementYear: "26", clientId: "MCA_26_COMP_APP", clientSecret: "teJpJ9cSXFqZAuKNW8IuHpy8D4dwWPoVrPoek38iCnrGbrUSfjqnHMBAv8iCVjeSm_20250910175618", blazeYear: "2027", componentName: "franchisemode", label: "Madden 27 (early access)" },
}

// which GameYears are reachable from a given EA entitlement generation, e.g. "26" -> ["26","27"]
export const GAME_YEARS_FOR_ENTITLEMENT_YEAR: Record<EntitlementYear, GameYear[]> = ENTITLEMENT_YEARS.reduce((acc, ey) => {
  acc[ey] = GAME_YEARS.filter(gy => GAME_CONFIG[gy].entitlementYear === ey)
  return acc
}, {} as Record<EntitlementYear, GameYear[]>)

// default client used for the initial EA login link (any game year's app can be used to log in)
export const TWO_DIGIT_YEAR: GameYear = "26"
export const CLIENT_ID = GAME_CONFIG[TWO_DIGIT_YEAR].clientId
export const CLIENT_SECRET = GAME_CONFIG[TWO_DIGIT_YEAR].clientSecret
export const YEAR = GAME_CONFIG[TWO_DIGIT_YEAR].blazeYear
export const EA_LOGIN_URL = `https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=${REDIRECT_URL}&client_id=${CLIENT_ID}&machineProfileKey=${MACHINE_KEY}&authentication_source=${AUTH_SOURCE}`

const entitlementsForYear = (a: string) => ({
  xone: `MADDEN_${a}XONE`,
  ps4: `MADDEN_${a}PS4`,
  pc: `MADDEN_${a}PC`,
  ps5: `MADDEN_${a}PS5`,
  xbsx: `MADDEN_${a}XBSX`,
  stadia: `MADDEN_${a}SDA`,
})

export const VALID_ENTITLEMENTS_BY_YEAR: Record<EntitlementYear, Record<string, string>> = {
  "25": entitlementsForYear("25"),
  "26": entitlementsForYear("26"),
}

// every valid madden entitlement group name across all supported entitlement generations
export const VALID_ENTITLEMENTS = ENTITLEMENT_YEARS.flatMap(y => Object.values(VALID_ENTITLEMENTS_BY_YEAR[y]))

// reverse lookup: entitlement group name (e.g. MADDEN_26PS5) -> which entitlement generation it belongs to
export const ENTITLEMENT_TO_ENTITLEMENT_YEAR: Record<string, EntitlementYear> = Object.fromEntries(
  ENTITLEMENT_YEARS.flatMap(y => Object.values(VALID_ENTITLEMENTS_BY_YEAR[y]).map(entitlement => [entitlement, y]))
)

export enum SystemConsole {
  XBOX_ONE = "xone",
  PS4 = "ps4",
  PC = "pc",
  PS5 = "ps5",
  XBOX_X = "xbsx",
  STADIA = "stadia"
}

export enum ConsoleOverride {
  NONE = "Default",
  XBOX_ONE = "Xbox One",
  PS4 = "PS4",
  PC = "PC",
  PS5 = "PS5",
  XBOX_X = "XBOX Series X",
  STADIA = "Stadia"
}

export const ALL_CONSOLES = Object.values(ConsoleOverride)

const entitlementToSystemForYear = (a: string) => ({
  [`MADDEN_${a}XONE`]: SystemConsole.XBOX_ONE,
  [`MADDEN_${a}PS4`]: SystemConsole.PS4,
  [`MADDEN_${a}PC`]: SystemConsole.PC,
  [`MADDEN_${a}PS5`]: SystemConsole.PS5,
  [`MADDEN_${a}XBSX`]: SystemConsole.XBOX_X,
  [`MADDEN_${a}SDA`]: SystemConsole.STADIA,
})
export const ENTITLEMENT_TO_SYSTEM: { [key: string]: SystemConsole } = Object.assign(
  {}, ...ENTITLEMENT_YEARS.map(y => entitlementToSystemForYear(y))
)

const entitlementToNamespaceForYear = (a: string) => ({
  [`MADDEN_${a}XONE`]: "xbox",
  [`MADDEN_${a}PS4`]: "ps3",
  [`MADDEN_${a}PC`]: "cem_ea_id",
  [`MADDEN_${a}PS5`]: "ps3",
  [`MADDEN_${a}XBSX`]: "xbox",
  [`MADDEN_${a}SDA`]: "stadia",
})
export const ENTITLEMENT_TO_VALID_NAMESPACE: { [key: string]: Namespace } = Object.assign(
  {}, ...ENTITLEMENT_YEARS.map(y => entitlementToNamespaceForYear(y))
)

const consoleOverrideToEntitlementForYear = (a: string) => ({
  [ConsoleOverride.XBOX_ONE]: `MADDEN_${a}XONE`,
  [ConsoleOverride.PS4]: `MADDEN_${a}PS4`,
  [ConsoleOverride.PC]: `MADDEN_${a}PC`,
  [ConsoleOverride.PS5]: `MADDEN_${a}PS5`,
  [ConsoleOverride.XBOX_X]: `MADDEN_${a}XBSX`,
  [ConsoleOverride.STADIA]: `MADDEN_${a}SDA`,
})
// console override entitlement depends on the persona's EA entitlement generation, not the chosen GameYear
export const CONSOLE_OVERRIDE_TO_ENTITLEMENT_BY_YEAR: Record<EntitlementYear, { [key: string]: string }> = {
  "25": consoleOverrideToEntitlementForYear("25"),
  "26": consoleOverrideToEntitlementForYear("26"),
}

export const CONSOLE_OVERRIDE_TO_VALID_NAMESPACE: { [key: string]: Namespace } = {
  [ConsoleOverride.XBOX_ONE]: "xbox",
  [ConsoleOverride.PS4]: "ps3",
  [ConsoleOverride.PC]: "cem_ea_id",
  [ConsoleOverride.PS5]: "ps3",
  [ConsoleOverride.XBOX_X]: "xbox",
  [ConsoleOverride.STADIA]: "stadia",
}

export const SYSTEM_MAP = (a: string) => ({
  xone: `MADDEN_${a}_XONE_BLZ_SERVER`,
  ps4: `MADDEN_${a}_PS4_BLZ_SERVER`,
  pc: `MADDEN_${a}_PC_BLZ_SERVER`,
  ps5: `MADDEN_${a}_PS5_BLZ_SERVER`,
  xbsx: `MADDEN_${a}_XBSX_BLZ_SERVER`,
  stadia: `MADDEN_${a}_SDA_BLZ_SERVER`,
})

export const NAMESPACES = {
  xbox: "XBOX",
  ps3: "PSN",
  cem_ea_id: "EA Account",
  stadia: "Stadia",
}

const blazeServiceForYear = (a: string) => ({
  xone: `madden-${a}-xone`,
  ps4: `madden-${a}-ps4`,
  pc: `madden-${a}-pc`,
  ps5: `madden-${a}-ps5`,
  xbsx: `madden-${a}-xbsx`,
  stadia: `madden-${a}-stadia`,
})
export const BLAZE_SERVICE_BY_YEAR: Record<GameYear, { [key in SystemConsole]: string }> = {
  "25": blazeServiceForYear(GAME_CONFIG["25"].blazeYear),
  "26": blazeServiceForYear(GAME_CONFIG["26"].blazeYear),
  "27": blazeServiceForYear(GAME_CONFIG["27"].blazeYear),
}
export const BLAZE_SERVICE = BLAZE_SERVICE_BY_YEAR[TWO_DIGIT_YEAR]

export const BLAZE_SERVICE_TO_PATH = ((a: string) => ({
  [`madden-${a}-xone-gen4`]: "xone",
  [`madden-${a}-ps4-gen4`]: "ps4",
  [`madden-${a}-pc-gen5`]: "pc",
  [`madden-${a}-ps5-gen5`]: "ps5",
  [`madden-${a}-xbsx-gen5`]: "xbsx",
  [`madden-${a}-stadia-gen5`]: "stadia",
}))(YEAR)

const blazeProductNameForYear = (a: string) => ({
  xone: `madden-${a}-xone-mca`,
  ps4: `madden-${a}-ps4-mca`,
  pc: `madden-${a}-pc-mca`,
  ps5: `madden-${a}-ps5-mca`,
  xbsx: `madden-${a}-xbsx-mca`,
  stadia: `madden-${a}-stadia-mca`,
})
export const BLAZE_PRODUCT_NAME_BY_YEAR: Record<GameYear, { [key in SystemConsole]: string }> = {
  "25": blazeProductNameForYear(GAME_CONFIG["25"].blazeYear),
  "26": blazeProductNameForYear(GAME_CONFIG["26"].blazeYear),
  "27": blazeProductNameForYear(GAME_CONFIG["27"].blazeYear),
}
export const BLAZE_PRODUCT_NAME = BLAZE_PRODUCT_NAME_BY_YEAR[TWO_DIGIT_YEAR]

/*
  I want to document the response types from EA. Some of these should be more narrowly defined, but I do not know what all the enumerations are. I welcome in the future if we find more values that we change these to be narrower so we can safely rely on the values better
*/
export type AccountToken = { access_token: string; expires_in: number; id_token: null; refresh_token: string; token_type: "Bearer" }
export type TokenInfo = { client_id: "MCA_25_COMP_APP"; expires_in: number; persona_id: null; pid_id: string; pid_type: "NUCLEUS"; scope: string; user_id: string }
export type Entitlement = { entitlementId: number; entitlementSource: string; entitlementTag: string; entitlementType: string; grantDate: string; groupName: string; isConsumable: boolean; lastModifiedDate: string; originPermissions: number; pidUri: string; productCatalog: string; productId: string; projectId: string; status: string; statusReasonCode: string; terminationDate: string; useCount: number; version: number }
export type Entitlements = { entitlements: { entitlement: Array<Entitlement> } }
export type Namespace = "xbox" | "ps3" | "cem_ea_id" | "stadia"
export type Persona = { dateCreated: string; displayName: string; isVisible: boolean; lastAuthenticated: string; name: string; namespaceName: Namespace; personaId: number; pidId: number; showPersona: string; status: string; statusReasonCode: string }
export type Personas = { personas: { persona: Array<Persona> } }
export type BlazeAuthenticatedResponse = {
  isAnonymous: boolean,
  isOfLegalContactAge: boolean,
  isUnderage: boolean,
  userLoginInfo: {
    accountId: number,
    blazeId: number,
    geoIpSucceeded: boolean,
    isFirstConsoleLogin: boolean,
    isFirstLogin: boolean,
    lastLoginDateTime: number,
    personaDetails: {
      displayName: string,
      extId: number,
      lastAuthenticated: number,
      personaId: number,
      status: string
    },
    platformInfo: {
      clientPlatform: string,
      eaIds: {
        nucleusAccountId: number,
        originPersonaId: number,
        originPersonaName: string;
      },
      externalIds: {
        psnAccountId: number,
        steamAccountId: number,
        switchId: string,
        xblAccountId: number;
      }
    },
    previousAnonymousAccountId: number,
    sessionKey: string
  }
}

export type GetMyLeaguesResponse = {
  responseInfo: {
    tdfid: number;
    tdfclass: string;
    value: {
      leagues: League[];
      message: string;
      success: boolean;
    }
  }
}

export type League = {
  lastAdvancedTimeSecs: number;
  calendarYear: number;
  numMembers: number;
  commish: Commish;
  creationTime: number;
  currentWeekCompleted: boolean;
  userFullName: string;
  userPosition: string;
  userTeamId: number;
  importedLeagueId: number;
  isImportable: boolean;
  isNextGameHome: boolean;
  isUsingUgc: boolean;
  joinsEnabled: boolean;
  leagueId: number;
  leagueName: string;
  nextOpponentTeamId: number;
  rosterId: number;
  settings: LeagueSettings;
  seasonSort: number;
  seasonText: string;
  secsSinceLastAdvancedTime: number;
  teamLogos: string;
  teams: string;
  userPlayerClass: string;
  userTeamLogoId: number;
  userTeamName: string;
}

export type Commish = {
  persona: string;
  userId: number;
}

export type LeagueSettings = {
  crossplayEnabled: boolean;
  legendsEnabled: boolean;
  leagueType: string;
  maxMembers: number;
  acceleratedClockEnabled: boolean;
  isPublic: boolean;
  quarterLength: number;
  skillLevel: string;
  leagueModeType: string;
}
export enum Stage {
  UNKNOWN = -1,
  PRESEASON = 0,
  SEASON = 1
}

export const exportOptions = {
  "Current Week": {
    stage: Stage.UNKNOWN,
    week: 100,
  },
  "Preseason Week 1": {
    stage: Stage.PRESEASON,
    week: 1,
  },
  "Preseason Week 2": {
    stage: Stage.PRESEASON,
    week: 2,
  },
  "Preseason Week 3": {
    stage: Stage.PRESEASON,
    week: 3,
  },
  "Preseason Week 4": {
    stage: Stage.PRESEASON,
    week: 4,
  },
  "Regular Season Week 1": {
    stage: Stage.SEASON,
    week: 1,
  },
  "Regular Season Week 2": {
    stage: Stage.SEASON,
    week: 2,
  },
  "Regular Season Week 3": {
    stage: Stage.SEASON,
    week: 3,
  },
  "Regular Season Week 4": {
    stage: Stage.SEASON,
    week: 4,
  },
  "Regular Season Week 5": {
    stage: Stage.SEASON,
    week: 5,
  },
  "Regular Season Week 6": {
    stage: Stage.SEASON,
    week: 6,
  },
  "Regular Season Week 7": {
    stage: Stage.SEASON,
    week: 7,
  },
  "Regular Season Week 8": {
    stage: Stage.SEASON,
    week: 8,
  },
  "Regular Season Week 9": {
    stage: Stage.SEASON,
    week: 9,
  },
  "Regular Season Week 10": {
    stage: Stage.SEASON,
    week: 10,
  },
  "Regular Season Week 11": {
    stage: Stage.SEASON,
    week: 11,
  },
  "Regular Season Week 12": {
    stage: Stage.SEASON,
    week: 12,
  },
  "Regular Season Week 13": {
    stage: Stage.SEASON,
    week: 13,
  },
  "Regular Season Week 14": {
    stage: Stage.SEASON,
    week: 14,
  },
  "Regular Season Week 15": {
    stage: Stage.SEASON,
    week: 15,
  },
  "Regular Season Week 16": {
    stage: Stage.SEASON,
    week: 16,
  },
  "Regular Season Week 17": {
    stage: Stage.SEASON,
    week: 17,
  },
  "Regular Season Week 18": {
    stage: Stage.SEASON,
    week: 18,
  },
  "Wildcard Round": {
    stage: Stage.SEASON,
    week: 19,
  },
  "Divisional Round": {
    stage: Stage.SEASON,
    week: 20,
  },

  "Conference Championship Round": {
    stage: Stage.SEASON,
    week: 21,
  },
  Superbowl: {
    stage: Stage.SEASON,
    week: 23,
  },
  "All Weeks": {
    stage: Stage.UNKNOWN,
    week: 101,
  },
}

type WeekInfo = {
  gamesPlayedCount: number,
  gamesPlayerStatsCount: number,
  gameTotalCount: number,
  stageIndex: number,
  weekIndex: number,
  weekTitle: string
}

type CareerResponse = {
  flowName: string,
  action: string,
  responseKey: number,
  navigationString: string,
  title: string
}

type CareerRequestInfo = {
  isBlocking: boolean,
  canDismiss: boolean,
  categoryPriorityCutoff: number,
  isConnectionRequired: boolean,
  canSubmitResponse: boolean,
  canUpdateResponse: boolean,
  requestData: any,
  expireTime: number,
  requestId: number,
  issueTime: number,
  isLockedPendingResolution: boolean,
  priority: number,
  isPersistent: boolean,
  isResponseRequired: boolean,
  isResolved: boolean,
  description: string,
  type: string,
  title: string,
  seenByUser: boolean,
  responseList: CareerResponse[],
  style: string
}

type SeasonInfo = {
  isAnnualAwardsPeriodActive: boolean,
  displayWeek: number,
  calendarYear: number,
  superBowlNumber: number,
  isDraftScoutingActive: boolean,
  isDraftActive: boolean,
  isFreeAgentPeriodActive: boolean,
  isFantasyDraftActive: boolean,
  isGoalsPeriodActive: boolean,
  nextSeasonWeek: number,
  nextSeasonWeekType: number,
  offSeasonStage: number,
  offSeasonWeekCount: number,
  postSeasonWeekCount: number,
  isProBowlPlayable: boolean,
  isPracticeSquadPeriodActive: boolean,
  preseasonWeekCount: number,
  isReSignPeriodActive: boolean,
  regularSeasonWeekCount: number,
  isDemandReleasecoachAvailable: boolean,
  isInSeasonFreeAgentsAvailable: boolean
  isLeagueStarted: boolean,
  maxYears: number,
  isDemandReleasePlayerAvailable: boolean,
  seasonWeek: number,
  seasonWeekType: number,
  seasonYear: number,
  weekTitle: string,
  seasonTitle: string,
  isTradingActive: boolean,
  totalSeasonWeekCount: number,
  isWeeklyAwardsPeriodActive: boolean
}

type CareerHubInfo = {
  isLeagueAutoSimming: boolean,
  isLeagueAdvancing: boolean,
  requestInfoList: CareerRequestInfo[],
  seasonInfo: SeasonInfo
}

type ExportSizeEstimateInfo = {
  defensiveStatsPerGameEstimate: number,
  kickingStatsPerGameEstimate: number,
  leagueTotalEstimate: number,
  leagueTeamTotalEstimate: number,
  rosterDataPerPlayerEstimate: number,
  passingStatsPerGameEstimate: number,
  puntingStatsPerGameEstimate: number,
  receivingStatsPerGameEstimate: number,
  rushingStatsPerGameEstimate: number,
  scheduleDataPerGameEstimate: number,
  standingsTotalEstimate: number,
  teamStatsPerGameEstimate: number
}

type TeamInfo = {
  shortName: string;
  displayName: string;
  presentationId: number;
  teamId: number;
};

type SeasonGameInfo = {
  awayTeamPrimaryColorBlue: number;
  awayTeamPrimaryColorGreen: number;
  awayTeamPrimaryColorRed: number;
  awayCityName: string;
  awayTeamLogoId: number;
  awayLoss: number;
  awayName: string;
  awayTie: number;
  awayWin: number;
  isByeWeek: boolean;
  gameTime: string;
  displayedWeek: string;
  forceWin: number;
  homeLoss: number;
  homeName: string;
  homeTie: number;
  homeWin: number;
  matchup: string;
  isGamePlayed: boolean;
  result: string;
  week: number;
  weekType: number;
  homeTeamPrimaryColorBlue: number;
  homeTeamPrimaryColorGreen: number;
  homeTeamPrimaryColorRed: number;
  homeCityName: string;
  homeTeamLogoId: number;
  awayUserId: number;
  awayUserName: string;
  homeUserId: number;
  homeUserName: string;
  isAwayHuman: boolean;
  isHomeHuman: boolean;
  numberTimesPlayed: number;
  isBoxScoreUnavailable: boolean;
  awayTeam: number;
  homeTeam: number;
};


type LeagueScheduleItem = {
  canForceWin: boolean;
  seasonGameInfo: SeasonGameInfo;
  seasonGameKey: number;
};

type GameScheduleHubInfo = {
  userCanForceWin: boolean;
  leagueSchedule: LeagueScheduleItem[];
  userTeam: number;
};

type PlayerCountInfo = {
  freeAgentCount: number;
  practiceSquadCount: number;
  rosterCount: number;
  totalCount: number;
};

type UserAdminHubInfo = {
  userAdminInfo: {
    canEnableUnlimitedAutoPilot: boolean;
    isMasterUser: boolean;
    isAdmin: boolean;
    isDraftActive: boolean;
    isLeagueStarted: boolean;
    adminLevel: string;
    canAdminsBootAdmins: boolean;
    userId: number;
    canAdminsRemoveAdmins: boolean;
  };
  userInfoMap: {
    [key: string]: {
      defaultRequestActionTimeout: string;
      autoPilot: boolean;
      characterName: string;
      isCoach: boolean;
      isOwner: boolean;
      isOnline: boolean;
      position: number;
      readyToAdvance: boolean;
      teamName: string;
      userName: string;
      isAdmin: boolean;
      showNFLPA: boolean;
      portraitId: number;
      salaryCapPenalty: number;
      teamPrimaryColor: number;
      team: number;
      teamLogoId: number;
      gameInfo: string;
      adminLevel: string;
      userAttribute: number;
      durability: number;
      userId: number;
      intangible: number;
      legacyScore: number;
      overall: number;
      production: number;
      physical: number;
      size: number;
    };
  };
};

export type LeagueResponse = {
  availableWeekInfoList: WeekInfo[],
  careerHubInfo: CareerHubInfo,
  exportSizeEstimateInfo: ExportSizeEstimateInfo,
  gameScheduleHubInfo: GameScheduleHubInfo,
  playerCountInfo: PlayerCountInfo,
  message: string,
  secsSinceLastAdvancedTime: number,
  success: boolean,
  teamIdInfoList: TeamInfo[],
  userAdminHubInfo: UserAdminHubInfo
}


export type BlazeLeagueResponse = {
  responseInfo: {
    tdfid: 3170390244,
    tdfclass: "Blaze::FranchiseMode::MobileCareer::GetLeagueHubResponse",
    value: LeagueResponse
  }
}
export function seasonType(seasonInfo: SeasonInfo) {
  switch (seasonInfo.seasonWeekType) {
    case 0:
      return "Preseason"
    case 1:
      return "Regular Season"
    case 2:
    case 3:
    case 5:
    case 6:
      return "Post Season"
    case 8:
      return "Off Season"
    default:
      return "something else"
  }
}
