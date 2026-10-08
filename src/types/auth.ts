export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  role: 'admin' | 'seller' | 'viewer';
  user_metadata?: {
    role?: string;
    full_name?: string;
  };
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  full_name?: string;
  email?: string;
}
