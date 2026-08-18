import type { BlockCategory } from './FilterRule';
import type { FilterDecision } from './FilterDecision';

export type SuspicionScore = 0 | 1 | 2 | 3;

export function scoreToLabel(score: number): string {
  if (score < 30) return 'Normal';
  if (score < 60) return 'Suspicious';
  if (score < 80) return 'Likely tracker';
  return 'Highly suspicious';
}

const TRACKER_MARKERS = [
  'track',
  'tracker',
  'analytics',
  'metrics',
  'telemetry',
  'pixel',
  'beacon',
  'ads',
  'advert',
  'doubleclick',
  'googlesyndication',
  'googletagservices',
  'amazon-adsystem',
  'smartadserver',
  'criteo',
  'taboola',
  'outbrain',
];

const COMMON_SERVICES = [
  'google',
  'googlevideo',
  'googleapis',
  'gstatic',
  'cloudflare',
  'cloudfront',
  'fastly',
  'akamai',
  'cdn',
  'roblox',
  'supabase',
  'github',
  'apple',
  'microsoft',
  'windows',
  'amazon',
  'aws',
  'mozilla',
  'openai',
];

const IP_REGEX = /^\d{1,3}(\.\d{1,3}){3}$/;

interface SuspicionInput {
  domain: string;
  frequency?: number;
  isThirdParty?: boolean;
  resemblesFilterList?: boolean;
  knownGood?: boolean;
}

export function computeSuspicionScore({
  domain,
  frequency = 1,
  isThirdParty = false,
  resemblesFilterList = false,
  knownGood = false,
}: SuspicionInput): number {
  if (knownGood) return 5;
  if (IP_REGEX.test(domain)) return 10;

  const d = domain.toLowerCase();
  let score = 0;

  const markerHits = TRACKER_MARKERS.filter((m) => d.includes(m)).length;
  score += markerHits * 18;

  const hasKnownService = COMMON_SERVICES.some((s) => d.includes(s));
  if (hasKnownService) score -= 25;

  if (isThirdParty) score += 12;
  if (resemblesFilterList) score += 25;
  if (frequency > 50) score += 15;
  else if (frequency > 20) score += 8;

  score = Math.max(0, Math.min(100, Math.round(score)));
  return score;
}

export function suspicionLevel(score: number): SuspicionScore {
  if (score < 30) return 0;
  if (score < 60) return 1;
  if (score < 80) return 2;
  return 3;
}

export const decisionFromScore = (score: number): FilterDecision =>
  score >= 60 ? 'observe' : 'allow';