/**
 * Default Firebase Configuration for Work Planner.
 * Loaded from Next.js public environment variables (NEXT_PUBLIC_FIREBASE_*)
 * so no API key or project credential needs to be hardcoded in source control.
 */

export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

function parseJsonConfigEnv(raw?: string): Partial<FirebasePublicConfig> | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Partial<FirebasePublicConfig>;
    }
  } catch {
    // Ignore malformed JSON env var
  }
  return null;
}

const jsonFallback = parseJsonConfigEnv(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);

// Static property access is required for Next.js client bundle env inlining.
const apiKey = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || jsonFallback?.apiKey || '').trim();
const authDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || jsonFallback?.authDomain || '').trim();
const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || jsonFallback?.projectId || '').trim();
const storageBucket = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || jsonFallback?.storageBucket || '').trim();
const messagingSenderId = (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || jsonFallback?.messagingSenderId || '').trim();
const appId = (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || jsonFallback?.appId || '').trim();
const measurementId = (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || jsonFallback?.measurementId || '').trim();

export const HAS_DEFAULT_FIREBASE_CONFIG = Boolean(apiKey && projectId);

export const DEFAULT_FIREBASE_CONFIG_OBJ: FirebasePublicConfig | null = HAS_DEFAULT_FIREBASE_CONFIG
  ? {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      ...(measurementId ? { measurementId } : {}),
    }
  : null;

export const DEFAULT_FIREBASE_CONFIG = DEFAULT_FIREBASE_CONFIG_OBJ
  ? JSON.stringify(DEFAULT_FIREBASE_CONFIG_OBJ, null, 2)
  : '';
