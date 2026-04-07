export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface UserEmail {
  id: string;
  email: string;
  isActivated: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPhone {
  id: string;
  phone: string;
  isActivated: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  emails: UserEmail[];
  phones: UserPhone[];
}
