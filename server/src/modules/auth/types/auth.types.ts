export interface AccessTokenPayload {
  sub: string;
  sid: string;
  iat?: number;
  exp?: number;
}

export interface PublicAuthUser {
  id: string;
  email: string;
  status: "ACTIVE";
  emailVerified: boolean;
}

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  user: PublicAuthUser;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  user: PublicAuthUser;
}

export interface AuthCommandResult extends AuthResponse {
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface RefreshTokenParts {
  sessionId: string;
  secret: string;
}

export interface AuthRequestMetadata {
  userAgent?: string;
  ipAddress?: string;
}