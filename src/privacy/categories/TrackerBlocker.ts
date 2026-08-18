import type { FilterRule } from '../engine/FilterRule';
import type { FilterListManager } from '../lists/FilterListManager';
import type { MatchRequest } from '../engine/FilterMatcher';

/**
 * Tracker koruması — analytics, tracking pixel, telemetry, cross-site ve
 * fingerprinting endpoint'lerini engeller. Engellendiğinde trackersBlocked++
 * sayacı artar.
 */
export class TrackerBlocker {
  constructor(private readonly manager: FilterListManager) {}

  matches(domain: string, req?: Partial<MatchRequest>): { rule: FilterRule | null; listId: string | null } {
    return this.manager.matchTypes(domain, ['tracker'], req) ?? { rule: null, listId: null };
  }
}