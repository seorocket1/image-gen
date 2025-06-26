export interface User {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  websiteUrl?: string;
  brandName?: string;
  credits: number;
  isAnonymous: boolean;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  websiteUrl?: string;
  brandName?: string;
}