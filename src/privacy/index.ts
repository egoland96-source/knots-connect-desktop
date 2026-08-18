export { PrivacyFilterEngine } from './engine/PrivacyFilterEngine';
export type { QueryContext, RequestContext } from './engine/PrivacyFilterEngine';
export type { ObservedEntry } from './engine/PrivacyFilterEngine';
export { FilterMatcher } from './engine/FilterMatcher';
export type { MatchResult, MatchRequest } from './engine/FilterMatcher';
export type { BlockCategory, RuleSource, FilterRule, ResourceType, ThirdParty } from './engine/FilterRule';
export { normalizeDomain, isProbablyDomain, parseRequestUrl } from './engine/FilterRule';
export type { FilterDecision, FilterDecisionResult } from './engine/FilterDecision';
export { ALLOW_DECISION } from './engine/FilterDecision';
export type { PrivacyEvent, FilterEngineStats } from './engine/FilterEngineStats';
export { emptyStats, mergeStats, statsForEvent, BLOCK_ESTIMATED_BYTES, bytesSavedForCategory } from './engine/FilterEngineStats';
export { computeSuspicionScore, suspicionLevel, scoreToLabel } from './engine/SuspicionScore';
export type { SuspicionScore } from './engine/SuspicionScore';

export { FilterListParser, parseAbpRuleToken, parseAbpLine } from './lists/FilterListParser';
export type { ParsedList, AbpRule } from './lists/FilterListParser';
export { FilterListCache } from './lists/FilterListCache';
export type { CacheEntry, PrivacyBridge } from './lists/FilterListCache';
export { FilterListManager } from './lists/FilterListManager';
export type { ManagedFilterList, MatchTypesResult } from './lists/FilterListManager';
export { CosmeticRules, parseCosmeticLine } from './lists/CosmeticRules';
export { DEFAULT_FILTER_LISTS, FILTER_LIST_CATEGORIES } from './lists/FilterListCatalog';
export type { FilterListMeta } from './lists/FilterListCatalog';

export { AdBlocker } from './categories/AdBlocker';
export { TrackerBlocker } from './categories/TrackerBlocker';
export { MalwareBlocker } from './categories/MalwareBlocker';

export { CustomBlacklist } from './custom/CustomBlacklist';
export type { CustomRule } from './custom/CustomBlacklist';
export { Whitelist } from './custom/Whitelist';
export type { WhitelistEntry } from './custom/Whitelist';

export { loadHistory, recordBlock, clearHistory, sliceDays, sumRange, todayKey } from './stats/DataSavedHistory';
export type { DataSavedDay } from './stats/DataSavedHistory';

export { CORE_DPI_DOMAINS, PRO_DPI_DOMAINS, getDpiDomains, dpiDomainCount, proDpiExtraCount } from './dpi/DPIDomains';
export type { DpiPlan } from './dpi/DPIDomains';

export { BenchmarkRunner } from './benchmark/BenchmarkRunner';
export type {
  BenchmarkSample,
  BenchmarkResult,
  BenchmarkSummary,
  BenchmarkLabel,
} from './benchmark/BenchmarkRunner';

export { createPrivacyBridge, createPrivacyEngine, createPrivacyManager, createPrivacyEngineInstance } from './bridge';
export type { PrivacyBridgeInstance } from './bridge';