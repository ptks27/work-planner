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
  if (!trimmed) return '#';

  // Explicitly disallow dangerous pseudoprotocols regardless of control-char/whitespace obfuscation
  const stripped = trimmed.toLowerCase().replace(/[\u0000-\u0020\u007f]/g, '');
  if (
    stripped.startsWith('javascript:') ||
    stripped.startsWith('vbscript:') ||
    stripped.startsWith('data:') ||
    stripped.startsWith('file:') ||
    stripped.startsWith('blob:')
  ) {
    return '#';
  }

  try {
    const candidate =
      /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)
        ? trimmed
        : trimmed.includes('://') || /^[a-z0-9+.-]+:/i.test(trimmed)
          ? trimmed
          : `https://${trimmed}`;
    const parsed = new URL(candidate);
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
    if (!raw) return memoryRateLimitMap.get(key) || null;
    const parsed = safeParseJSON<RateLimitRecord | null>(raw, null);
    if (
      parsed &&
      typeof parsed.attempts === 'number' &&
      typeof parsed.firstAttempt === 'number' &&
      (parsed.lockedUntil === undefined || typeof parsed.lockedUntil === 'number')
    ) {
      return parsed;
    }
    return memoryRateLimitMap.get(key) || null;
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

// 6. Secure Password Hashing (PBKDF2-SHA256 with random per-user salt via Web Crypto API)
const WORK_PLANNER_LEGACY_SALT = 'wp_sec_salt_2026_v1_';
const PBKDF2_ITERATIONS = 100000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function derivePbkdf2Hex(password: string, saltBytes: Uint8Array, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  // Copy into fresh ArrayBuffer so TypeScript BufferSource matches strictly
  const saltCopy = new Uint8Array(saltBytes.length);
  saltCopy.set(saltBytes);
  const derived = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltCopy.buffer, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(derived));
}

async function legacySha256Hash(password: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return '';
  const enc = new TextEncoder();
  const data = enc.encode(WORK_PLANNER_LEGACY_SALT + password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return `sha256_${bytesToHex(new Uint8Array(hashBuffer))}`;
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  if (typeof window === 'undefined' || !window.crypto?.subtle || !window.crypto.getRandomValues) {
    throw new Error('เบราว์เซอร์ไม่รองรับระบบเข้ารหัสความปลอดภัย (Web Crypto API)');
  }

  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);
  const hashHex = await derivePbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2_${PBKDF2_ITERATIONS}_${bytesToHex(salt)}_${hashHex}`;
}

export async function verifyPassword(inputPassword: string, storedHashOrPlain: string): Promise<boolean> {
  if (!inputPassword || !storedHashOrPlain) return false;

  // Modern PBKDF2 format: pbkdf2_<iterations>_<saltHex>_<hashHex>
  if (storedHashOrPlain.startsWith('pbkdf2_')) {
    const parts = storedHashOrPlain.split('_');
    if (parts.length !== 4) return false;
    const iterations = Number(parts[1]);
    const saltBytes = hexToBytes(parts[2]);
    const expectedHex = parts[3];
    if (!iterations || iterations < 10000 || iterations > 2000000 || !saltBytes || !expectedHex) {
      return false;
    }
    try {
      const actualHex = await derivePbkdf2Hex(inputPassword, saltBytes, iterations);
      return timingSafeEqual(actualHex, expectedHex);
    } catch {
      return false;
    }
  }

  // Legacy static-salted SHA-256 format (auto-upgraded on login)
  if (storedHashOrPlain.startsWith('sha256_')) {
    try {
      const computed = await legacySha256Hash(inputPassword);
      return Boolean(computed) && timingSafeEqual(computed, storedHashOrPlain);
    } catch {
      return false;
    }
  }

  // Legacy base64 fallback format (auto-upgraded on login)
  if (storedHashOrPlain.startsWith('hash_')) {
    try {
      const legacy = `hash_${btoa(unescape(encodeURIComponent(WORK_PLANNER_LEGACY_SALT + inputPassword)))}`;
      return timingSafeEqual(legacy, storedHashOrPlain);
    } catch {
      return false;
    }
  }

  // Legacy plaintext match (backward compatibility, auto-upgraded on login)
  return timingSafeEqual(inputPassword, storedHashOrPlain);
}

// 7. Cryptographically Strong Random ID & CSV Formula Injection Neutralization
export function generateSecureId(prefix = '', byteLength = 8): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = bytesToHex(bytes);
  return prefix ? `${prefix}_${hex}` : hex;
}

export function escapeFormulaCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (!str) return '';
  if (/^[\u0000-\u0020]*[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
