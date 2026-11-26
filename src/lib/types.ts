// Hazy shared contracts: one source of truth for the front end, the service worker and Netlify Functions.
// Ported from knowledge/software-architect/examples/contracts.ts (tested). Owner: software-architect.
//
// Rules (typescript-strict skill):
// - Types only plus pure runtime guards. No I/O, no imports, no enums or namespaces, so Node's type
//   stripping and the browser bundle can both load this file unchanged.
// - Validate data at every trust boundary (API responses, request bodies, Blobs reads) with these guards,
//   then pass typed data inward. Never redefine these types elsewhere; import them.
// - Missing upstream values are `null`, never coerced to 0 (Open-Meteo returns nulls).
// - Units: metric internally (mm, km/h, m, °C); the UI converts for display (docs/01 §2.1).
// - Guards check shape and ranges only. Path policy, size caps and secret scanning live in
//   netlify/lib/policy.ts (security-expert); guards accept extra keys.

/* ------------------------------------------------------------------ */
/* Small guard helpers                                                 */
/* ------------------------------------------------------------------ */

type Rec = Record<string, unknown>;

export const isObject = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNonEmptyStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNumOrNull = (v: unknown): v is number | null => v === null || isFiniteNum(v);
const isStrOrNull = (v: unknown): v is string | null => v === null || typeof v === "string";
const isOptStr = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const inRange = (v: unknown, lo: number, hi: number): v is number => isFiniteNum(v) && v >= lo && v <= hi;
const isPctOrNull = (v: unknown): v is number | null => v === null || inRange(v, 0, 100);
const oneOf = <T extends string>(list: readonly T[]) => (v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

/** Every element passes the guard. Use for arrays from APIs and Blobs. */
export const isArrayOf = <T>(v: unknown, guard: (x: unknown) => x is T): v is T[] => Array.isArray(v) && v.every(guard);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // local calendar day, YYYY-MM-DD
const LOCAL_HOUR_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/; // Open-Meteo wall-clock time, no offset
const SHA_RE = /^[0-9a-f]{40}$/;

export const isIsoDate = (v: unknown): v is string => typeof v === "string" && DATE_RE.test(v);
/** ISO 8601 timestamp that Date.parse understands (createdAt, updatedAt, NWS onset/ends). */
export const isTimestamp = (v: unknown): v is string => typeof v === "string" && v.length > 0 && !Number.isNaN(Date.parse(v));
export const isGitSha = (v: unknown): v is string => typeof v === "string" && SHA_RE.test(v);

/* ------------------------------------------------------------------ */
/* Risk levels (docs/01 §3.3, §3.4)                                    */
/* ------------------------------------------------------------------ */

export const THUNDER_LEVELS = ["none", "low", "possible", "likely", "very_likely"] as const;
export type ThunderLevel = (typeof THUNDER_LEVELS)[number];

/** Names mirror NWS Melbourne's "Flood Threat Defined" scale, not its probabilities (heuristic). */
export const FLOOD_LEVELS = ["non_threatening", "very_low", "low", "moderate", "high", "extreme"] as const;
export type FloodLevel = (typeof FLOOD_LEVELS)[number];

export const TIME_BLOCKS = ["morning", "afternoon", "evening", "night"] as const;
export type TimeBlock = (typeof TIME_BLOCKS)[number];

export const isThunderLevel = oneOf(THUNDER_LEVELS);
export const isFloodLevel = oneOf(FLOOD_LEVELS);
export const isTimeBlock = oneOf(TIME_BLOCKS);

/** Scores are integers 0–100 (scoring clamps and rounds). */
export const isScore = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100;

/* ------------------------------------------------------------------ */
/* Place (Open-Meteo Geocoding result or device location)             */
/* ------------------------------------------------------------------ */

export interface Place {
  name: string;
  /** First-level admin area, e.g. "Florida". Geocoding may omit it. */
  admin1?: string;
  /** ISO 3166-1 alpha-2, upper case, e.g. "US". Hazy requests NWS alerts only when this is "US" (ADR 0001). */
  country_code: string;
  lat: number;
  lon: number;
  /** IANA zone from Geocoding, or "auto" for a device location before the first forecast. */
  timezone: string;
  /** True when the marine card applies (coastal heuristic, docs/01 §2.2). Unknown when absent. */
  coastal?: boolean;
}

export function isPlace(v: unknown): v is Place {
  return isObject(v) && isNonEmptyStr(v.name) && isOptStr(v.admin1)
    && isStr(v.country_code) && /^[A-Z]{2}$/.test(v.country_code)
    && inRange(v.lat, -90, 90) && inRange(v.lon, -180, 180)
    && isNonEmptyStr(v.timezone)
    && (v.coastal === undefined || typeof v.coastal === "boolean");
}

/* ------------------------------------------------------------------ */
/* HourPoint: one parsed Open-Meteo hourly row (input to scoring)      */
/* ------------------------------------------------------------------ */

/**
 * Produced by src/lib/api/** from the parallel-array response; consumed by src/lib/scoring.ts.
 * Field names follow knowledge/api-integration-expert/examples/parse-forecast.ts (HourRow), extended.
 */
export interface HourPoint {
  /** "2026-11-25T15:00", wall clock in the place's zone (no offset). */
  localTime: string;
  /** Absolute instant in ms, computed with utc_offset_seconds. */
  utcMs: number;
  /** Local day "YYYY-MM-DD". */
  date: string;
  /** Local hour 0–23. */
  hour: number;
  /** `precipitation`, mm, sum of the PRECEDING hour (so it is also the hourly rate in mm/h). */
  precipitationMm: number | null;
  /** `precipitation_probability`, %. */
  precipProbability: number | null;
  /** `weather_code`, WMO code (95 thunderstorm; 96/99 with hail). */
  weatherCode: number | null;
  /** `cape`, J/kg. */
  cape: number | null;
  /** `lifted_index`; negative means unstable. */
  liftedIndex: number | null;
  /** `convective_inhibition`, J/kg. */
  convectiveInhibition: number | null;
  /** `wind_gusts_10m`, km/h. */
  windGustsKmh: number | null;
  /** `uv_index`. */
  uvIndex: number | null;
  /** `soil_moisture_0_to_1cm`, m³/m³. */
  soilMoisture0to1cm: number | null;
}

const HOUR_NUM_FIELDS = [
  "precipitationMm", "cape", "liftedIndex", "convectiveInhibition", "windGustsKmh", "uvIndex", "soilMoisture0to1cm", "weatherCode",
] as const;

export function isHourPoint(v: unknown): v is HourPoint {
  return isObject(v) && isStr(v.localTime) && LOCAL_HOUR_RE.test(v.localTime)
    && isFiniteNum(v.utcMs) && isIsoDate(v.date)
    && typeof v.hour === "number" && Number.isInteger(v.hour) && v.hour >= 0 && v.hour <= 23
    && isPctOrNull(v.precipProbability)
    && HOUR_NUM_FIELDS.every((k) => isNumOrNull(v[k]));
}

/* ------------------------------------------------------------------ */
/* DayRisk: scoring output per local day (docs/01 §3.6)                */
/* ------------------------------------------------------------------ */

export interface ThunderRisk {
  score: number;
  level: ThunderLevel;
  /** Time block with the highest thunderstorm score (Florida storms are diurnal). */
  peakBlock?: TimeBlock;
  /** Hail codes 96/99 seen (only some models report them). */
  hail: boolean;
  /** 2–3 plain-language drivers, most important first. */
  reasons: string[];
}

export interface FloodRisk {
  score: number;
  level: FloodLevel;
  reasons: string[];
  /** NWS event name when an active NWS alert raised the displayed level, e.g. "Flood Watch". */
  nwsOverride?: string;
}

export interface RainSummary {
  /** Daily `precipitation_sum`, mm. */
  totalMm: number | null;
  /** Highest hourly `precipitation` that day, mm/h. */
  maxRateMmH: number | null;
  /** `precipitation_probability_max`, %. */
  probMax: number | null;
}

/** Present only for coastal places with marine data; producers omit it when both values are null. */
export interface MarineSummary {
  /** Daily `wave_height_max`, m. */
  waveMaxM: number | null;
  /** Daily max `sea_surface_temperature`, °C. */
  sstC: number | null;
}

export interface DayRisk {
  /** Local day "YYYY-MM-DD". */
  date: string;
  thunder: ThunderRisk;
  flood: FloodRisk;
  rain: RainSummary;
  /** `uv_index_max` (informational, not scored). */
  uvMax: number | null;
  /** `wind_gusts_10m_max`, km/h (informational; "Severe ingredients" chip at ≥ 93 km/h). */
  gustMaxKmh: number | null;
  marine?: MarineSummary;
}

/** Alias used by UI code for one day card. Same shape as DayRisk; do not fork it. */
export type DayOutlook = DayRisk;

export function isThunderRisk(v: unknown): v is ThunderRisk {
  return isObject(v) && isScore(v.score) && isThunderLevel(v.level)
    && (v.peakBlock === undefined || isTimeBlock(v.peakBlock))
    && typeof v.hail === "boolean" && isStrArr(v.reasons);
}

export function isFloodRisk(v: unknown): v is FloodRisk {
  return isObject(v) && isScore(v.score) && isFloodLevel(v.level) && isStrArr(v.reasons) && isOptStr(v.nwsOverride);
}

function isRainSummary(v: unknown): v is RainSummary {
  return isObject(v) && isNumOrNull(v.totalMm) && isNumOrNull(v.maxRateMmH) && isPctOrNull(v.probMax)
    && (v.totalMm === null || v.totalMm >= 0) && (v.maxRateMmH === null || v.maxRateMmH >= 0);
}

function isMarineSummary(v: unknown): v is MarineSummary {
  return isObject(v) && isNumOrNull(v.waveMaxM) && isNumOrNull(v.sstC) && !(v.waveMaxM === null && v.sstC === null);
}

export function isDayRisk(v: unknown): v is DayRisk {
  return isObject(v) && isIsoDate(v.date) && isThunderRisk(v.thunder) && isFloodRisk(v.flood)
    && isRainSummary(v.rain) && isNumOrNull(v.uvMax) && isNumOrNull(v.gustMaxKmh)
    && (v.marine === undefined || isMarineSummary(v.marine));
}
export const isDayOutlook = isDayRisk;

/* ------------------------------------------------------------------ */
/* NWS alerts (trimmed by netlify/functions/alerts.mts, ADR 0001)      */
/* ------------------------------------------------------------------ */

/**
 * Trimmed `properties` of one feature from api.weather.gov/alerts/active?point=.
 * severity and urgency are kept as the raw NWS strings (enum values not re-verified here; see ADR 0001).
 * headline, onset and ends may be null upstream; the UI shows "Until further notice" for a null `ends`.
 */
export interface NwsAlert {
  id: string;
  /** e.g. "Flood Watch", "Flash Flood Warning", "Severe Thunderstorm Warning". */
  event: string;
  severity: string;
  urgency: string;
  headline: string | null;
  onset: string | null;
  ends: string | null;
  areaDesc: string;
}

export function isNwsAlert(v: unknown): v is NwsAlert {
  return isObject(v) && isNonEmptyStr(v.id) && isNonEmptyStr(v.event) && isStr(v.severity) && isStr(v.urgency)
    && isStrOrNull(v.headline) && (v.onset === null || isTimestamp(v.onset)) && (v.ends === null || isTimestamp(v.ends))
    && isStr(v.areaDesc);
}

/** Response body of GET /api/alerts: a JSON array of trimmed alerts (empty when none). */
export type AlertsResponse = NwsAlert[];
export const isAlertsResponse = (v: unknown): v is AlertsResponse => isArrayOf(v, isNwsAlert);

/* ------------------------------------------------------------------ */
/* Outlook: everything the main view renders for one place             */
/* ------------------------------------------------------------------ */

/** "not_us": no NWS coverage; "unavailable": /api/alerts failed, so the UI must say alerts could not be checked. */
export const ALERTS_STATUSES = ["ok", "unavailable", "not_us"] as const;
export type AlertsStatus = (typeof ALERTS_STATUSES)[number];
export const isAlertsStatus = oneOf(ALERTS_STATUSES);

export interface Outlook {
  place: Place;
  /** Today first, then the following days, local dates ascending. */
  days: DayRisk[];
  alerts: NwsAlert[];
  alertsStatus: AlertsStatus;
  /** When the forecast was fetched (ISO timestamp); shown as "Updated …". */
  updatedAt: string;
}

export function isOutlook(v: unknown): v is Outlook {
  return isObject(v) && isPlace(v.place) && isArrayOf(v.days, isDayRisk) && isArrayOf(v.alerts, isNwsAlert)
    && isAlertsStatus(v.alertsStatus) && isTimestamp(v.updatedAt);
}

/* ------------------------------------------------------------------ */
/* Agent Console: proposals (ADR 0002, ADR 0003)                       */
/* ------------------------------------------------------------------ */

export const FILE_ACTIONS = ["create", "update", "delete"] as const;
export type FileAction = (typeof FILE_ACTIONS)[number];

/** A delete carries no content; create and update carry the full new file text (UTF-8). */
export type FileChange =
  | { path: string; action: "create" | "update"; content: string }
  | { path: string; action: "delete" };

export function isFileChange(v: unknown): v is FileChange {
  if (!isObject(v) || !isNonEmptyStr(v.path)) return false;
  if (v.action === "delete") return v.content === undefined;
  return (v.action === "create" || v.action === "update") && isStr(v.content);
}

/**
 * pending → approving (CAS claim) → committed
 *                     ↘ pending (commit failed; lastError set)
 * pending → rejected
 * See ADR 0003 for the state machine and the stale-claim rule.
 */
export const PROPOSAL_STATUSES = ["pending", "approving", "committed", "rejected"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export const isProposalStatus = oneOf(PROPOSAL_STATUSES);

export interface Proposal {
  id: string;
  agentId: string;
  /** Head of main when the agent read the files; Approve refuses (409) if touched files changed since. */
  baseSha: string;
  summary: string;
  status: ProposalStatus;
  files: FileChange[];
  createdAt: string;
  /** Set when status becomes approving, committed or rejected. */
  decidedAt?: string;
  /** Set with status committed. */
  commitSha?: string;
  /** Last failed Approve attempt (status back to pending). No secrets, no upstream bodies. */
  lastError?: string;
  /** Background job that created it, if any. */
  jobId?: string;
}

/** Proposals come from Blobs (written by the server) but are re-checked before Approve: never trust stored shape blindly. */
export function isProposal(v: unknown): v is Proposal {
  return isObject(v) && isNonEmptyStr(v.id) && isNonEmptyStr(v.agentId) && isGitSha(v.baseSha)
    && isStr(v.summary) && isProposalStatus(v.status)
    && Array.isArray(v.files) && v.files.length > 0 && v.files.every(isFileChange)
    && isTimestamp(v.createdAt)
    && (v.decidedAt === undefined || isTimestamp(v.decidedAt))
    && (v.commitSha === undefined || isGitSha(v.commitSha))
    && (v.status !== "committed" || isGitSha(v.commitSha))
    && isOptStr(v.lastError) && isOptStr(v.jobId);
}

/* ------------------------------------------------------------------ */
/* Agent Console: background jobs (ADR 0003)                           */
/* ------------------------------------------------------------------ */

export const JOB_STATUSES = ["queued", "running", "paused", "done", "failed", "retrying"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const isJobStatus = oneOf(JOB_STATUSES);

export const JOB_EVENT_KINDS = ["status", "text", "tool", "proposal", "error"] as const;
export type JobEventKind = (typeof JOB_EVENT_KINDS)[number];
export const isJobEventKind = oneOf(JOB_EVENT_KINDS);

/** Compact progress event appended to the job record (keep text short; the list is capped). */
export interface JobEvent {
  /** Epoch ms. */
  t: number;
  kind: JobEventKind;
  text: string;
  /** Set on kind "proposal". */
  proposalId?: string;
}

export interface JobResult {
  summary: string;
  proposalIds: string[];
}

export interface Job {
  id: string;
  agentId: string;
  task: string;
  status: JobStatus;
  /** Invocation count, incremented each time the background function claims the job. */
  attempt: number;
  events: JobEvent[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  /** Set with status done. */
  result?: JobResult;
  /** Set with status failed. Safe message only. */
  error?: string;
}

export function isJobEvent(v: unknown): v is JobEvent {
  return isObject(v) && isFiniteNum(v.t) && isJobEventKind(v.kind) && isStr(v.text) && isOptStr(v.proposalId);
}

function isJobResult(v: unknown): v is JobResult {
  return isObject(v) && isStr(v.summary) && isStrArr(v.proposalIds);
}

export function isJob(v: unknown): v is Job {
  return isObject(v) && isNonEmptyStr(v.id) && isNonEmptyStr(v.agentId) && isStr(v.task) && isJobStatus(v.status)
    && typeof v.attempt === "number" && Number.isInteger(v.attempt) && v.attempt >= 0
    && isArrayOf(v.events, isJobEvent)
    && isTimestamp(v.createdAt) && isTimestamp(v.updatedAt)
    && (v.startedAt === undefined || isTimestamp(v.startedAt))
    && (v.result === undefined || isJobResult(v.result))
    && (v.status !== "done" || v.result !== undefined)
    && isOptStr(v.error);
}

/* ------------------------------------------------------------------ */
/* Agent cards and models (docs/04 §2, docs/agent-brains.md)           */
/* ------------------------------------------------------------------ */

/** Claude Code `model:` aliases Hazy maps. A missing model counts as "inherit". */
export const MODEL_ALIASES = ["opus", "sonnet", "haiku", "fable", "inherit"] as const;
export type ModelAlias = (typeof MODEL_ALIASES)[number];
export const isModelAlias = oneOf(MODEL_ALIASES);

/** Allow-list of API model IDs (docs/04 §2). A full ID in frontmatter passes through only if listed here. */
export const MODEL_IDS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-2"] as const;
export type ModelId = (typeof MODEL_IDS)[number];
export const isModelId = oneOf(MODEL_IDS);

export type ModelAliasMap = Readonly<Record<ModelAlias, ModelId>>;

/** The one alias → ID map (docs/04 §2). Used at build time (agents.json) and by Functions. */
export const MODEL_ALIAS_MAP: ModelAliasMap = {
  opus: "claude-opus-5-5",
  sonnet: "claude-sonnet-5-5",
  haiku: "claude-haiku-5-5",
  fable: "claude-fable-5-2",
  inherit: "claude-opus-5-5",
};

/** Resolve a frontmatter `model:` value. Unknown values return null (the caller refuses the agent). */
export function resolveModelId(model: string | undefined): ModelId | null {
  if (model === undefined || model === "") return MODEL_ALIAS_MAP.inherit;
  if (isModelAlias(model)) return MODEL_ALIAS_MAP[model];
  return isModelId(model) ? model : null;
}

/**
 * Public metadata for one agent, as emitted to agents.json by scripts/build-agents.ts.
 * Never includes the system prompt body.
 */
export interface AgentCard {
  /** Frontmatter `name`, e.g. "software-architect"; also the file name. */
  id: string;
  /** Frontmatter `firstName`, e.g. "Vera". */
  firstName: string;
  /** Frontmatter `model` as written (alias or full ID). */
  model: string;
  /** Resolved API model ID. */
  modelId: ModelId;
  /** Frontmatter `personality`; falls back to `description` when missing. */
  personality: string;
  description: string;
}

export function isAgentCard(v: unknown): v is AgentCard {
  return isObject(v) && isStr(v.id) && /^[a-z0-9-]+$/.test(v.id) && isNonEmptyStr(v.firstName)
    && isNonEmptyStr(v.model) && isModelId(v.modelId) && isStr(v.personality) && isStr(v.description);
}

/* ------------------------------------------------------------------ */
/* Function error body (netlify-functions skill)                       */
/* ------------------------------------------------------------------ */

/** Every /api/* error response body: `{ error, code }`, with the correct HTTP status. */
export interface ApiError {
  error: string;
  code: string;
}

export function isApiError(v: unknown): v is ApiError {
  return isObject(v) && isStr(v.error) && isNonEmptyStr(v.code);
}
