export type PlanTier = 'free' | 'plus' | 'premium';

export interface Server {
  id: string;
  country: string;
  countryCode: string;
  city: string;
  flag: string;
  ping: number;
  tier: PlanTier;
  load: number;
}

export interface Plan {
  tier: PlanTier;
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}
