export type SettingsCategory = 'connection' | 'security' | 'local-protection' | 'appearance' | 'advanced';

export type BlocklistCategory = 'ads' | 'trackers' | 'malware';

export type Blocklist = {
  id: string;
  name: string;
  category: BlocklistCategory;
  enabled: boolean;
  ruleCount: number;
  updatedAt: string;
};

export type LocalProtectionState = {
  enabled: boolean;
  blockedAds: number;
  blockedTrackers: number;
  blockedMalware: number;
  lists: Blocklist[];
};
