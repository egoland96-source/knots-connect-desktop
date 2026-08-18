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
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}
