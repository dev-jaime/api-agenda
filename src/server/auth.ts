import { Request, Response, NextFunction } from 'express';

// Storing active access tokens in memory (5-minute expiration)
interface ActiveToken {
  token: string;
  expiresAt: number;
}

const activeTokens: ActiveToken[] = [];

// Hardcoded credentials for simulation and LLM validation
export const API_KEY_VALUE = 'agenda_secret_apikey_2026';
export const BASIC_USER = 'admin';
export const BASIC_PASS = 'super_secret_password';
export const CLIENT_ID = 'llm_client_id';
export const CLIENT_SECRET = 'llm_client_secret';

// Helper to generate a Bearer token
export function generateBearerToken(clientId: string, clientSecret: string): { accessToken: string; expiresIn: number } | null {
  if (clientId !== CLIENT_ID || clientSecret !== CLIENT_SECRET) {
    return null;
  }
  
  const token = `bearer_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  const expiresIn = 300; // 5 minutes in seconds
  const expiresAt = Date.now() + expiresIn * 1000;
  
  activeTokens.push({ token, expiresAt });
  
  return {
    accessToken: token,
    expiresIn
  };
}

// 1. API Key Authentication Middleware (X-API-Key Header)
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header('X-API-Key') || req.header('x-api-key');
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing API Key in header. Use "X-API-Key" header.',
      help: `Configure header: "X-API-Key: ${API_KEY_VALUE}"`
    });
  }
  
  if (apiKey !== API_KEY_VALUE) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API Key.',
      help: `The valid API Key is: ${API_KEY_VALUE}`
    });
  }
  
  next();
}

// 2. Basic Authentication Middleware
export function requireBasicAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Basic authentication. Use Authorization header with Basic scheme.',
      help: 'Format: "Authorization: Basic <base64(user:pass)>"'
    });
  }
  
  const base64Credentials = authHeader.substring(6).trim();
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  if (username !== BASIC_USER || password !== BASIC_PASS) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid Basic credentials.',
      help: `Valid credentials are username: "${BASIC_USER}" and password: "${BASIC_PASS}"`
    });
  }
  
  next();
}

// 3. Bearer Token Authentication Middleware
export function requireBearerToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Bearer Token. Use Authorization header with Bearer scheme.',
      help: 'Format: "Authorization: Bearer <access_token>"'
    });
  }
  
  const token = authHeader.substring(7).trim();
  const foundToken = activeTokens.find(t => t.token === token);
  
  if (!foundToken) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Bearer Token not found or invalid.',
      help: 'Generate a new token with POST /api/auth/token using client credentials.'
    });
  }
  
  if (Date.now() > foundToken.expiresAt) {
    // Remove expired token
    const idx = activeTokens.indexOf(foundToken);
    if (idx > -1) activeTokens.splice(idx, 1);
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Bearer Token expired.',
      help: 'Bearer tokens are valid for 5 minutes. Generate a new token with POST /api/auth/token.'
    });
  }
  
  next();
}

// Get debug state of active tokens
export function getActiveTokensList() {
  // Purge expired tokens first
  const now = Date.now();
  const cleanList = activeTokens.filter(t => t.expiresAt > now);
  
  // Update the array in place
  activeTokens.length = 0;
  activeTokens.push(...cleanList);
  
  return activeTokens.map(t => ({
    token: t.token,
    timeLeftSeconds: Math.max(0, Math.round((t.expiresAt - now) / 1000))
  }));
}
