import type { User } from './user';

export interface AuthResponse {
  user: User;
  accessToken: string;
  // refreshToken is sent as an httpOnly cookie — never read by the frontend
}
