import type { NextConfig } from 'next';

const securityHeaders = [
  // 1. Content Security Policy (CSP) - Hardening against XSS, injection, data exfiltration
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://cdn.sheetjs.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com",
      "media-src 'self' data: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
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
  // 5. Strict-Transport-Security (HSTS) - Enforces HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // 6. Permissions-Policy - Disable unused dangerous hardware APIs
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(), usb=()',
  },
  // 7. Legacy XSS filter
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // 8. DNS Prefetch Control
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
