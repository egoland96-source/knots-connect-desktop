import type { PlanTier, Server, Plan } from '../types/vpn';

export const SERVERS: Server[] = [
  { id: '1', country: 'İzlanda', countryCode: 'IS', city: 'Reykjavik', flag: '🇮🇸', ping: 12, tier: 'free', load: 23 },
  { id: '2', country: 'Almanya', countryCode: 'DE', city: 'Frankfurt', flag: '🇩🇪', ping: 28, tier: 'free', load: 45 },
  { id: '3', country: 'Hollanda', countryCode: 'NL', city: 'Amsterdam', flag: '🇳🇱', ping: 32, tier: 'plus', load: 38 },
  { id: '4', country: 'ABD', countryCode: 'US', city: 'New York', flag: '🇺🇸', ping: 95, tier: 'plus', load: 61 },
  { id: '5', country: 'Japonya', countryCode: 'JP', city: 'Tokyo', flag: '🇯🇵', ping: 140, tier: 'premium', load: 29 },
  { id: '6', country: 'İngiltere', countryCode: 'GB', city: 'Londra', flag: '🇬🇧', ping: 41, tier: 'premium', load: 52 },
  { id: '7', country: 'İsviçre', countryCode: 'CH', city: 'Zürih', flag: '🇨🇭', ping: 35, tier: 'premium', load: 18 },
  { id: '8', country: 'Fransa', countryCode: 'FR', city: 'Paris', flag: '🇫🇷', ping: 39, tier: 'plus', load: 44 },
];

export const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Free',
    price: '0',
    features: ['2 sunucu lokasyonu', 'Sınırlı hız', 'Temel VPN koruması'],
  },
  {
    tier: 'plus',
    name: 'Plus',
    price: '4.99',
    features: ['10+ sunucu lokasyonu', 'Yüksek hız', 'Split Tunnel', 'Reklamsız deneyim'],
    highlighted: false,
  },
  {
    tier: 'premium',
    name: 'Premium / Pro',
    price: '9.99',
    highlighted: true,
    features: [
      '50+ sunucu lokasyonu',
      'Maksimum hız',
      'Split Tunnel + VPN eşzamanlı',
      'Gelişmiş tünel kararlılığı',
      'Paket bütünlüğü koruması',
      'Öncelikli destek',
    ],
  },
];

export function getServers(): Promise<Server[]> {
  return Promise.resolve(SERVERS);
}

export function getPlans(): Promise<Plan[]> {
  return Promise.resolve(PLANS);
}
