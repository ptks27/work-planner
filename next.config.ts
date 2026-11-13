import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' blob:${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://cdn.sheetjs.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  // 1. Content Security Policy (CSP) - Hardening against XSS, injection, data exfiltration
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
  },
  // 2. Clickjacking Protection - Prevent framing inside rogue iframes
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // 3. MIME-Sniffing Protection
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // 4. Referrer Policy - Strict origin protection
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // 5. Cross-Origin Opener Policy - Process isolation against Spectre/tabnabbing
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  // 6. Strict-Transport-Security (HSTS) - Enforces HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // 7. Permissions-Policy - Disable unused dangerous hardware APIs
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()',
  },
  // 8. Legacy XSS filter
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // 9. DNS Prefetch Control
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // Prevents tech stack fingerprinting
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
