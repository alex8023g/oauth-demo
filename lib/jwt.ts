import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  picture?: string;
  type?: 'access' | 'refresh';
}

const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || '';
if (!REFRESH_TOKEN_SECRET) {
  throw new Error('REFRESH_TOKEN_SECRET is not defined in environment variables');
}
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // Long-lived refresh token
// const ACCESS_TOKEN_EXPIRES_IN = '1m'; // Short-lived access token
// const REFRESH_TOKEN_EXPIRES_IN = '2m'; // Long-lived refresh token

export function signToken(payload: JWTPayload): string {
  return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function signRefreshToken(payload: JWTPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (decoded.type !== 'access') {
      return null;
    }
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as JWTPayload;
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT decoding failed:', error);
    return null;
  }
}
