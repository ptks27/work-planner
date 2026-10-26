/**
 * Security Utility Module for Work Planner
 * Comprehensive defensive hardening:
 * - Anti-XSS and safe URL validation
 * - Prototype pollution defense
 * - Safe JSON parsing with payload size limits
 * - Rate limiting / brute-force protection
 * - Secure client-side password hashing (SHA-256 with salt)
 * - HTML sanitization
 */

// 1. Prototype Pollution Defense
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeForPollution<T>(input: T): T {
  if (input === null || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeForPollution(item)) as unknown as T;
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(input as Record<string, any>)) {
    if (DANGEROUS_KEYS.has(key)) {
      continue; // Block dangerous prototype injection keys
    }
    clean[key] = sanitizeForPollution(value);
  }

  return clean as T;
}

// 2. Safe JSON Parsing with Payload Size Limits
export function safeParseJSON<T>(jsonStr: string, fallback: T, maxBytes = 5 * 1024 * 1024): T {
  if (!jsonStr || typeof jsonStr !== 'string') return fallback;
  if (jsonStr.length > maxBytes) {
    console.warn(`[Security] JSON payload rejected: size ${jsonStr.length} exceeds limit ${maxBytes}`);
    return fallback;
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return sanitizeForPollution(parsed) as T;
  } catch (err) {
    console.warn('[Security] JSON parse failed safely:', err);
    return fallback;
  }
}

// 3. Anti-XSS Safe URL Sanitizer
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function safeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();

  // Explicitly disallow dangerous pseudoprotocols regardless of encoding
  const lower = trimmed.toLowerCase().replace(/[\x00-\x1f\s]/g, '');
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:')
  ) {
    return '#';
  }

  try {
    const parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:') ? trimmed : `https://${trimmed}`);
    if (SAFE_PROTOCOLS.has(parsed.protocol)) {
      return parsed.toString();
    }
  } catch {
    // Malformed URL
  }

  return '#';
}

// 4. HTML Sanitization
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[&<>"'/`]/g, char => ESCAPE_MAP[char] || char);
}

// 5. Rate Limiting / Brute-Force & Abuse Defense
interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const memoryRateLimitMap = new Map<string, RateLimitRecord>();

function getStorageRecord(key: string): RateLimitRecord | null {
  if (typeof window === 'undefined') return memoryRateLimitMap.get(key) || null;
  try {
    const raw = sessionStorage.getItem(`_rl_${key}`);
    return raw ? JSON.parse(raw) : (memoryRateLimitMap.get(key) || null);
  } catch {
    return memoryRateLimitMap.get(key) || null;
  }
}

function setStorageRecord(key: string, record: RateLimitRecord) {
  memoryRateLimitMap.set(key, record);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(`_rl_${key}`, JSON.stringify(record));
    } catch {
      // storage unavailable
    }
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60000,
  lockoutMs = 60000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const record = getStorageRecord(key);

  if (!record) {
    return { allowed: true, remaining: maxAttempts };
  }

  // Check if locked
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  // Check if window has expired
  if (now - record.firstAttempt > windowMs) {
    clearRateLimit(key);
    return { allowed: true, remaining: maxAttempts };
  }

  // Check attempt count
  if (record.attempts >= maxAttempts) {
    const lockedUntil = now + lockoutMs;
    setStorageRecord(key, { ...record, lockedUntil });
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil(lockoutMs / 1000) };
  }

  return { allowed: true, remaining: maxAttempts - record.attempts };
}

export function recordFailedAttempt(
  key: string,
  maxAttempts = 5,
  windowMs = 60000,
  lockoutMs = 60000
): { locked: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = getStorageRecord(key);

  if (!record || now - record.firstAttempt > windowMs) {
    setStorageRecord(key, { attempts: 1, firstAttempt: now });
    return { locked: false };
  }

  const attempts = record.attempts + 1;
  if (attempts >= maxAttempts) {
    const lockedUntil = now + lockoutMs;
    setStorageRecord(key, { attempts, firstAttempt: record.firstAttempt, lockedUntil });
    return { locked: true, retryAfterSec: Math.ceil(lockoutMs / 1000) };
  }

  setStorageRecord(key, { ...record, attempts });
  return { locked: false };
}

export function clearRateLimit(key: string): void {
  memoryRateLimitMap.delete(key);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(`_rl_${key}`);
    } catch {
      // ignore
    }
  }
}

// 6. Secure Password Hashing (SHA-256 with Salt via Web Crypto API)
const WORK_PLANNER_SALT = 'wp_sec_salt_2026_v1_';

export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback simple checksum if Web Crypto is unavailable (e.g. testing)
    return `hash_${btoa(unescape(encodeURIComponent(WORK_PLANNER_SALT + password)))}`;
  }

  try {
    const enc = new TextEncoder();
    const data = enc.encode(WORK_PLANNER_SALT + password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return `sha256_${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
  } catch (err) {
    console.warn('[Security] Crypto hash fallback:', err);
    return `hash_${btoa(unescape(encodeURIComponent(WORK_PLANNER_SALT + password)))}`;
  }
}

export async function verifyPassword(inputPassword: string, storedHashOrPlain: string): Promise<boolean> {
  if (!inputPassword && !storedHashOrPlain) return true;
  if (!inputPassword || !storedHashOrPlain) return false;

  // If already hashed
  if (storedHashOrPlain.startsWith('sha256_') || storedHashOrPlain.startsWith('hash_')) {
    const computed = await hashPassword(inputPassword);
    return computed === storedHashOrPlain;
  }

  // Legacy plaintext match (backward compatibility)
  return inputPassword === storedHashOrPlain;
}
