export function getEngineCustomDomains(
  state: { getEngine?: () => any },
  tab: 'blocked' | 'allowed',
): Array<{ domain: string; addedAt: number }> {
  try {
    const engine = state.getEngine?.();
    if (tab === 'blocked') {
      return engine?.customBlacklist?.getAll() ?? [];
    }
    return engine?.whitelist?.getAll() ?? [];
  } catch {
    return [];
  }
}