import type { BlockCategory, RuleSource } from './FilterRule';

export type FilterDecision = 'allow' | 'block' | 'observe';

export interface FilterDecisionResult {
  decision: FilterDecision;
  category?: BlockCategory;
  source?: RuleSource;
  rule?: string;
  listId?: string;
  suspicionScore?: number;
}

export const ALLOW_DECISION: FilterDecisionResult = Object.freeze({
  decision: 'allow',
});