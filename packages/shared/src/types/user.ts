export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string;
  oauthProvider?: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string;
}
