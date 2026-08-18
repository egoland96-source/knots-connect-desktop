import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import axios, { AxiosError, AxiosInstance } from 'axios';
import type { User, AuthResponse, LoginRequest, RegisterRequest, SubscriptionPlan } from '../types/auth.types';

const API_BASE = 'https://vsvpn-api.onrender.com';

interface ApiEnvelope {
  success: boolean;
  message: string | null;
  data: {
    user?: Record<string, unknown>;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  } | Record<string, unknown> | null;
  error: { code: string; message: string } | null;
}

function mapUser(u: Record<string, any>): User {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    createdAt: u.created_at ?? '',
    emailVerified: u.email_verified ?? false,
    subscriptionType: (u.subscription_type as SubscriptionPlan) ?? 'free',
    subscriptionExpire: u.subscription_expire ?? null,
    isAdmin: u.is_admin ?? false,
  };
}

function toAuthResponse(envelope: ApiEnvelope): AuthResponse {
  if (!envelope.success) {
    throw new Error(envelope.error?.message || envelope.message || 'Request failed');
  }
  const data = (envelope.data ?? {}) as { user?: Record<string, any>; access_token?: string; refresh_token?: string };
  return {
    success: true,
    message: envelope.message ?? undefined,
    user: data.user ? mapUser(data.user) : undefined,
    token: data.access_token,
    refreshToken: data.refresh_token,
  };
}

declare global {
  interface Window {
    knotsAuth: {
      getToken: () => Promise<string | null>;
      setToken: (token: string) => Promise<void>;
      removeToken: () => Promise<void>;
      getRefreshToken: () => Promise<string | null>;
      setRefreshToken: (token: string) => Promise<void>;
      removeRefreshToken: () => Promise<void>;
    };
  }
}

function decodeJWT(token: string): { exp: number } | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

interface AuthStoreState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  loadProfile: () => Promise<void>;
  restoreSession: () => Promise<void>;
  guestLogin: () => Promise<void>;
  requestVerification: (email: string) => Promise<string | null>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  changeSubscription: (plan: SubscriptionPlan) => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

interface AuthAPI {
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (userData: RegisterRequest) => Promise<AuthResponse>;
  refreshAccessToken: (refreshToken: string) => Promise<AuthResponse>;
  getProfile: () => Promise<User>;
  requestVerification: (email: string) => Promise<string | null>;
  verifyEmail: (email: string, code: string) => Promise<User>;
  changeSubscription: (plan: SubscriptionPlan) => Promise<User>;
  logout: () => Promise<void>;
}

const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.knotsAuth) {
        return await window.knotsAuth.getToken();
      }
      return null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  },
  async setToken(token: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.knotsAuth) {
        await window.knotsAuth.setToken(token);
      }
    } catch (error) {
      console.error('Failed to set access token:', error);
      throw error;
    }
  },
  async removeToken(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.knotsAuth) {
        await window.knotsAuth.removeToken();
      }
    } catch (error) {
      console.error('Failed to remove access token:', error);
    }
  },
  async getRefreshToken(): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.knotsAuth) {
        return await window.knotsAuth.getRefreshToken();
      }
      return null;
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  },
  async setRefreshToken(token: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.knotsAuth) {
        await window.knotsAuth.setRefreshToken(token);
      }
    } catch (error) {
      console.error('Failed to set refresh token:', error);
      throw error;
    }
  },
  async removeRefreshToken(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.knotsAuth) {
        await window.knotsAuth.removeRefreshToken();
      }
    } catch (error) {
      console.error('Failed to remove refresh token:', error);
    }
  },
};

class AuthHTTPClient implements AuthAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config) => {
        const token = await secureStorage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await secureStorage.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post<ApiEnvelope>(
              `${API_BASE}/api/v1/auth/refresh`,
              { refresh_token: refreshToken }
            );

            const refreshed = toAuthResponse(response.data);
            if (refreshed.token) {
              await secureStorage.setToken(refreshed.token);
              if (refreshed.refreshToken) {
                await secureStorage.setRefreshToken(refreshed.refreshToken);
              }

              originalRequest.headers.Authorization = `Bearer ${refreshed.token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            await secureStorage.removeToken();
            await secureStorage.removeRefreshToken();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<ApiEnvelope>('/api/v1/auth/login', credentials);
      return toAuthResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.data?.error?.message) {
          throw new Error(axiosError.response.data.error.message);
        }
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
        throw new Error('Login failed');
      }
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<ApiEnvelope>('/api/v1/auth/register', userData);
      return toAuthResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.data?.error?.message) {
          throw new Error(axiosError.response.data.error.message);
        }
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
        throw new Error('Registration failed');
      }
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await axios.post<ApiEnvelope>(
        `${API_BASE}/api/v1/auth/refresh`,
        { refresh_token: refreshToken }
      );
      return toAuthResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.data?.error?.message) {
          throw new Error(axiosError.response.data.error.message);
        }
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
        throw new Error('Token refresh failed');
      }
      throw error;
    }
  }

  async getProfile(): Promise<User> {
    try {
      const response = await this.client.get<ApiEnvelope>('/api/v1/auth/me');
      if (!response.data.success || !response.data.data) {
        throw new Error('Failed to load user profile');
      }
      return mapUser(response.data.data as Record<string, any>);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.data?.error?.message) {
          throw new Error(axiosError.response.data.error.message);
        }
        if (axiosError.response?.status === 404) {
          throw new Error('User not found');
        }
        throw new Error('Failed to load user profile');
      }
      throw error;
    }
  }

  async requestVerification(email: string): Promise<string | null> {
    try {
      const response = await this.client.post<ApiEnvelope>('/api/v1/auth/verify/request', { email });
      if (!response.data.success) {
        throw new Error(response.data.error?.message || response.data.message || 'Failed to send code');
      }
      const data = response.data.data as { code?: string } | null;
      return data?.code ?? null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.data?.error?.message) {
          throw new Error(axiosError.response.data.error.message);
        }
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
      }
      throw error;
    }
  }

  async verifyEmail(email: string, code: string): Promise<User> {
    try {
      const response = await this.client.post<ApiEnvelope>('/api/v1/auth/verify', { email, code });
      if (!response.data.success || !response.data.data) {
        throw new Error('Email verification failed');
      }
      return mapUser(response.data.data as Record<string, any>);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.data?.error?.message) {
          throw new Error(axiosError.response.data.error.message);
        }
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
        throw new Error('Email verification failed');
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post<void>('/api/v1/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
      throw error;
    }
  }

  async changeSubscription(plan: SubscriptionPlan): Promise<User> {
    try {
      const response = await this.client.post<ApiEnvelope>('/api/v1/user/subscription', { plan });
      if (!response.data.success || !response.data.data) {
        throw new Error('Subscription update failed');
      }
      return mapUser(response.data.data as Record<string, any>);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.data?.error?.message) {
          throw new Error(axiosError.response.data.error.message);
        }
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
        throw new Error('Subscription update failed');
      }
      throw error;
    }
  }
}

const authHTTPClient = new AuthHTTPClient();

export const useAuthStore = create<AuthStoreState & AuthActions>()(
  immer((set, get) => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    initialized: false,

    login: async (credentials: LoginRequest) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const response = await authHTTPClient.login(credentials);

        if (response.success && response.token) {
          await secureStorage.setToken(response.token);
          if (response.refreshToken) {
            await secureStorage.setRefreshToken(response.refreshToken);
          }

          set((state) => {
            state.user = response.user ?? null;
            state.accessToken = response.token ?? null;
            state.refreshToken = response.refreshToken ?? null;
            state.isAuthenticated = true;
            state.loading = false;
          });
        } else {
          throw new Error(response.message || 'Login failed');
        }
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Login failed';
          state.loading = false;
        });
        throw error;
      }
    },

    register: async (userData: RegisterRequest) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const response = await authHTTPClient.register(userData);

        if (response.success && response.token) {
          await secureStorage.setToken(response.token);
          if (response.refreshToken) {
            await secureStorage.setRefreshToken(response.refreshToken);
          }

          set((state) => {
            state.user = response.user ?? null;
            state.accessToken = response.token ?? null;
            state.refreshToken = response.refreshToken ?? null;
            state.isAuthenticated = true;
            state.loading = false;
          });
        } else {
          throw new Error(response.message || 'Registration failed');
        }
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Registration failed';
          state.loading = false;
        });
        throw error;
      }
    },

    logout: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        await authHTTPClient.logout();
      } catch (error) {
        console.error('Logout API call failed:', error);
      } finally {
        await secureStorage.removeToken();
        await secureStorage.removeRefreshToken();
        set((state) => {
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
          state.loading = false;
        });
      }
    },

    refreshAccessToken: async () => {
      const currentRefreshToken = await secureStorage.getRefreshToken();

      if (!currentRefreshToken) {
        return false;
      }

      try {
        const response = await authHTTPClient.refreshAccessToken(currentRefreshToken);

        if (response.success && response.token) {
          await secureStorage.setToken(response.token);
          if (response.refreshToken) {
            await secureStorage.setRefreshToken(response.refreshToken);
          }

          set((state) => {
            state.user = response.user ?? state.user;
            state.accessToken = response.token ?? null;
            state.refreshToken = response.refreshToken ?? null;
            state.isAuthenticated = true;
          });

          return true;
        }

        return false;
      } catch (error) {
        console.error('Token refresh failed:', error);
        await secureStorage.removeToken();
        await secureStorage.removeRefreshToken();
        set((state) => {
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
        });
        return false;
      }
    },

    loadProfile: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const profile = await authHTTPClient.getProfile();
        set((state) => {
          state.user = profile;
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to load profile';
          state.loading = false;
        });
      }
    },

    restoreSession: async () => {
      try {
        const storedToken = await secureStorage.getToken();

        if (!storedToken) {
          set((state) => {
            state.initialized = true;
          });
          return;
        }

        const tokenPayload = decodeJWT(storedToken);

        if (storedToken.startsWith('guest_')) {
          set((state) => {
            state.accessToken = storedToken;
            state.isAuthenticated = true;
            state.initialized = true;
          });
          return;
        }

        if (!tokenPayload) {
          const refreshed = await authHTTPClient.refreshAccessToken(
            (await secureStorage.getRefreshToken()) || ''
          );
          if (refreshed.success && refreshed.token) {
            await secureStorage.setToken(refreshed.token);
            if (refreshed.refreshToken) {
              await secureStorage.setRefreshToken(refreshed.refreshToken);
            }
            set((state) => {
              state.accessToken = refreshed.token ?? null;
              state.refreshToken = refreshed.refreshToken ?? null;
              state.isAuthenticated = true;
            });
            const profile = await authHTTPClient.getProfile();
            set((state) => {
              state.user = profile;
              state.initialized = true;
            });
            return;
          }
          throw new Error('Token refresh failed');
        }

        if (!storedToken.startsWith('guest_') && tokenPayload.exp * 1000 < Date.now()) {
          const refreshed = await authHTTPClient.refreshAccessToken(
            (await secureStorage.getRefreshToken()) || ''
          );
          if (refreshed.success && refreshed.token) {
            await secureStorage.setToken(refreshed.token);
            if (refreshed.refreshToken) {
              await secureStorage.setRefreshToken(refreshed.refreshToken);
            }
            set((state) => {
              state.accessToken = refreshed.token ?? null;
              state.refreshToken = refreshed.refreshToken ?? null;
              state.isAuthenticated = true;
            });
            const profile = await authHTTPClient.getProfile();
            set((state) => {
              state.user = profile;
              state.initialized = true;
            });
            return;
          }
          throw new Error('Token refresh failed');
        }

        set((state) => {
          state.accessToken = storedToken;
          state.isAuthenticated = true;
        });

        const profile = await authHTTPClient.getProfile();

        set((state) => {
          state.user = profile;
          state.initialized = true;
        });
      } catch (error) {
        console.error('Failed to restore session:', error);
        await secureStorage.removeToken();
        await secureStorage.removeRefreshToken();
        set((state) => {
          state.initialized = true;
          state.isAuthenticated = false;
        });
      }
    },

    requestVerification: async (email: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const code = await authHTTPClient.requestVerification(email);
        set((state) => {
          state.loading = false;
        });
        return code;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to send verification code';
          state.loading = false;
        });
        throw error;
      }
    },

    verifyEmail: async (email: string, code: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const profile = await authHTTPClient.verifyEmail(email, code);
        set((state) => {
          state.user = profile;
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Email verification failed';
          state.loading = false;
        });
        throw error;
      }
    },

    changeSubscription: async (plan: SubscriptionPlan) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const profile = await authHTTPClient.changeSubscription(plan);
        set((state) => {
          state.user = profile;
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Subscription update failed';
          state.loading = false;
        });
        throw error;
      }
    },

    guestLogin: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        set((state) => {
          state.user = {
            id: 'guest',
            username: 'Guest',
            email: 'guest@local',
            createdAt: new Date().toISOString(),
            emailVerified: false,
            subscriptionType: 'free',
            subscriptionExpire: null,
            isAdmin: false,
          };
          state.accessToken = 'guest_' + Date.now();
          state.isAuthenticated = true;
          state.loading = false;
          state.initialized = true;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Guest login failed';
          state.loading = false;
        });
        throw error;
      }
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    setLoading: (loading: boolean) => {
      set((state) => {
        state.loading = loading;
      });
    },
  }))
);

export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthToken = () => useAuthStore((state) => state.accessToken);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthInitialized = () => useAuthStore((state) => state.initialized);

export const authService = {
  login: (credentials: LoginRequest) => useAuthStore.getState().login(credentials),
  register: (userData: RegisterRequest) => useAuthStore.getState().register(userData),
  logout: () => useAuthStore.getState().logout(),
  loadProfile: () => useAuthStore.getState().loadProfile(),
  refreshAccessToken: () => useAuthStore.getState().refreshAccessToken(),
  restoreSession: () => useAuthStore.getState().restoreSession(),
  guestLogin: () => useAuthStore.getState().guestLogin(),
  changeSubscription: (plan: SubscriptionPlan) => useAuthStore.getState().changeSubscription(plan),
  clearError: () => useAuthStore.getState().clearError(),
};