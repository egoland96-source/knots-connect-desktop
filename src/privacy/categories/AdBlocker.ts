import type { FilterRule } from '../engine/FilterRule';
import type { FilterListManager } from '../lists/FilterListManager';
import type { MatchRequest } from '../engine/FilterMatcher';

/**
 * Reklam koruması — reklam domainleri, banner/popup kaynakları ve advertising
 * endpoint'lerini engeller. Yalnızca domain/request seviyesinde çalışır,
 * içerik manipülasyonu yapmaz.
 */
export class AdBlocker {
  constructor(private readonly manager: FilterListManager) {}

  matches(domain: string, req?: Partial<MatchRequest>): { rule: FilterRule | null; listId: string | null } {
    return this.manager.matchTypes(domain, ['ads'], req) ?? { rule: null, listId: null };
  }
}