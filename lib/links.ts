import { TaskLink } from './types';
import { safeUrl } from './security';

export interface ParsedLink {
  id: string;
  url: string;
  label: string;
  domain: string;
  type: 'figma' | 'github' | 'drive' | 'sheets' | 'docs' | 'canva' | 'notion' | 'trello' | 'general';
  color: string;
  bg: string;
  emoji: string;
}

function isDomainMatch(hostname: string, targetDomain: string): boolean {
  const cleanHost = hostname.toLowerCase();
  const cleanTarget = targetDomain.toLowerCase();
  return cleanHost === cleanTarget || cleanHost.endsWith(`.${cleanTarget}`);
}

export function classifyUrl(url: string, title?: string): ParsedLink {
  const trimmed = (url || '').trim();
  const cleanUrl = safeUrl(trimmed);
  let hostname = '';
  let pathname = '';

  if (cleanUrl !== '#') {
    try {
      const parsed = new URL(cleanUrl);
      hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      pathname = parsed.pathname.toLowerCase();
    } catch {
      hostname = '';
    }
  }

  // Figma
  if (isDomainMatch(hostname, 'figma.com')) {
    return {
      id: cleanUrl,
      url: cleanUrl,
      label: title || 'Figma Design',
      domain: 'figma.com',
      type: 'figma',
      color: '#f24e1e',
      bg: 'rgba(242, 78, 30, 0.1)',
      emoji: '🎨',
    };
  }

  // GitHub
  if (isDomainMatch(hostname, 'github.com')) {
    let sublabel = 'GitHub';
    if (pathname.includes('/pull/')) {
      const prNum = pathname.split('/pull/')[1]?.split('/')[0];
      sublabel = prNum ? `GitHub PR #${prNum}` : 'GitHub PR';
    } else if (pathname.includes('/issues/')) {
      const issueNum = pathname.split('/issues/')[1]?.split('/')[0];
      sublabel = issueNum ? `GitHub Issue #${issueNum}` : 'GitHub Issue';
    }
    return {
      id: cleanUrl,
      url: cleanUrl,
      label: title || sublabel,
      domain: 'github.com',
      type: 'github',
      color: '#333333',
      bg: 'rgba(120, 120, 128, 0.12)',
      emoji: '🐙',
    };
  }

  // Google Sheets
  if (hostname === 'docs.google.com' && pathname.includes('/spreadsheets/')) {
    return {
      id: cleanUrl,
      url: cleanUrl,
      label: title || 'Google Sheets',
      domain: 'sheets.google.com',
      type: 'sheets',
      color: '#0f9d58',
      bg: 'rgba(15, 157, 88, 0.1)',
      emoji: '📊',
    };
  }

  // Google Docs
  if (hostname === 'docs.google.com' && pathname.includes('/document/')) {
    return {
      id: cleanUrl,
      url: cleanUrl,
      label: title || 'Google Docs',
      domain: 'docs.google.com',
      type: 'docs',
      color: '#1a73e8',
      bg: 'rgba(26, 115, 232, 0.1)',
      emoji: '📄',
    };
  }

  // Google Drive
  if (hostname === 'drive.google.com' || hostname === 'docs.google.com') {
    return {
      id: cleanUrl,
      url: cleanUrl,
      label: title || 'Google Drive',
      domain: 'drive.google.com',
      type: 'drive',
      color: '#4285f4',
      bg: 'rgba(66, 133, 244, 0.1)',
      emoji: '📁',
    };
  }

  // Canva
  if (isDomainMatch(hostname, 'canva.com')) {
    return {
      id: cleanUrl,
      url: cleanUrl,
      label: title || 'Canva Project',
      domain: 'canva.com',
      type: 'canva',
      color: '#00c4cc',
      bg: 'rgba(0, 196, 204, 0.1)',
      emoji: '✨',
    };
  }

  // Notion
  if (isDomainMatch(hostname, 'notion.so') || isDomainMatch(hostname, 'notion.site')) {
    return {
      id: cleanUrl,
      url: cleanUrl,
      label: title || 'Notion Workspace',
      domain: 'notion.so',
      type: 'notion',
      color: '#111111',
      bg: 'rgba(120, 120, 128, 0.12)',
      emoji: '📝',
    };
  }

  // Trello
  if (isDomainMatch(hostname, 'trello.com')) {
    return {
      id: cleanUrl,
      url: cleanUrl,
      label: title || 'Trello Board',
      domain: 'trello.com',
      type: 'trello',
      color: '#0079bf',
      bg: 'rgba(0, 121, 191, 0.1)',
      emoji: '📋',
    };
  }

  // General Link
  return {
    id: cleanUrl,
    url: cleanUrl,
    label: title || hostname || 'เอกสารแนบ',
    domain: hostname,
    type: 'general',
    color: 'var(--pri)',
    bg: 'var(--pri-l)',
    emoji: '🔗',
  };
}

export function extractAllLinks(detail?: string, explicitLinks?: TaskLink[]): ParsedLink[] {
  const result: ParsedLink[] = [];
  const seenUrls = new Set<string>();

  // 1. Explicit Links
  if (explicitLinks && explicitLinks.length > 0) {
    explicitLinks.forEach(l => {
      const cleaned = safeUrl(l.url);
      if (cleaned !== '#' && !seenUrls.has(cleaned)) {
        seenUrls.add(cleaned);
        result.push(classifyUrl(cleaned, l.title));
      }
    });
  }

  // 2. URLs inside detail text
  if (detail) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = detail.match(urlRegex);
    if (matches) {
      matches.forEach(raw => {
        const cleanRaw = raw.replace(/[)\].,;]+$/, '').trim();
        const cleaned = safeUrl(cleanRaw);
        if (cleaned !== '#' && !seenUrls.has(cleaned)) {
          seenUrls.add(cleaned);
          result.push(classifyUrl(cleaned));
        }
      });
    }
  }

  return result;
}

export function getCleanDetail(detail?: string): string {
  if (!detail) return '';
  // Remove bare standalone URLs from detail so text is pleasant to read
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const cleaned = detail.replace(urlRegex, '').trim();
  return cleaned || detail;
}
