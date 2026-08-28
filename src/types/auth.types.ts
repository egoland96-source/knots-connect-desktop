export type SubscriptionPlan = 'free' | 'basic' | 'premium';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  subscriptionType: SubscriptionPlan;
  subscriptionExpire: string | null;
  isAdmin: boolean;
  subscription?: Subscription;
  /** Zero-knowledge anonymous identity */
  knotsId?: string;
  knotsIdFormatted?: string;
  mnemonic?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: string;
  status: string;
  expiresAt: string;
  paymentProvider: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  hwid?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  hwid?: string;
}

export interface KnotsAuthRequest {
  knotsId: string;
  hwid?: string;
}

export interface KnotsInitResponse {
  success: boolean;
  knotsId: string;
  knotsIdRaw: string;
  knotsIdFormatted?: string;
  mnemonic: string;
  message?: string;
}

export interface KnotsRecoverRequest {
  mnemonic: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}
