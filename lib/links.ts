import { TaskLink } from './types';

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

export function classifyUrl(url: string, title?: string): ParsedLink {
  const trimmed = url.trim();
  let hostname = '';
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    hostname = trimmed.toLowerCase();
  }

  // Figma
  if (hostname.includes('figma.com')) {
    return {
      id: trimmed,
      url: trimmed,
      label: title || 'Figma Design',
      domain: 'figma.com',
      type: 'figma',
      color: '#f24e1e',
      bg: 'rgba(242, 78, 30, 0.1)',
      emoji: '🎨',
    };
  }

  // GitHub
  if (hostname.includes('github.com')) {
    let sublabel = 'GitHub';
    if (trimmed.includes('/pull/')) {
      const prNum = trimmed.split('/pull/')[1]?.split('/')[0]?.split('?')[0];
      sublabel = prNum ? `GitHub PR #${prNum}` : 'GitHub PR';
    } else if (trimmed.includes('/issues/')) {
      const issueNum = trimmed.split('/issues/')[1]?.split('/')[0]?.split('?')[0];
      sublabel = issueNum ? `GitHub Issue #${issueNum}` : 'GitHub Issue';
    }
    return {
      id: trimmed,
      url: trimmed,
      label: title || sublabel,
      domain: 'github.com',
      type: 'github',
      color: '#333333',
      bg: 'rgba(120, 120, 128, 0.12)',
      emoji: '🐙',
    };
  }

  // Google Sheets
  if (hostname.includes('docs.google.com') && trimmed.includes('/spreadsheets/')) {
    return {
      id: trimmed,
      url: trimmed,
      label: title || 'Google Sheets',
      domain: 'sheets.google.com',
      type: 'sheets',
      color: '#0f9d58',
      bg: 'rgba(15, 157, 88, 0.1)',
      emoji: '📊',
    };
  }

  // Google Docs
  if (hostname.includes('docs.google.com') && trimmed.includes('/document/')) {
    return {
      id: trimmed,
      url: trimmed,
      label: title || 'Google Docs',
      domain: 'docs.google.com',
      type: 'docs',
      color: '#1a73e8',
      bg: 'rgba(26, 115, 232, 0.1)',
      emoji: '📄',
    };
  }

  // Google Drive
  if (hostname.includes('drive.google.com') || hostname.includes('docs.google.com')) {
    return {
      id: trimmed,
      url: trimmed,
      label: title || 'Google Drive',
      domain: 'drive.google.com',
      type: 'drive',
      color: '#4285f4',
      bg: 'rgba(66, 133, 244, 0.1)',
      emoji: '📁',
    };
  }

  // Canva
  if (hostname.includes('canva.com')) {
    return {
      id: trimmed,
      url: trimmed,
      label: title || 'Canva Project',
      domain: 'canva.com',
      type: 'canva',
      color: '#00c4cc',
      bg: 'rgba(0, 196, 204, 0.1)',
      emoji: '✨',
    };
  }

  // Notion
  if (hostname.includes('notion.so') || hostname.includes('notion.site')) {
    return {
      id: trimmed,
      url: trimmed,
      label: title || 'Notion Workspace',
      domain: 'notion.so',
      type: 'notion',
      color: '#111111',
      bg: 'rgba(120, 120, 128, 0.12)',
      emoji: '📝',
    };
  }

  // Trello
  if (hostname.includes('trello.com')) {
    return {
      id: trimmed,
      url: trimmed,
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
    id: trimmed,
    url: trimmed,
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
      if (l.url && !seenUrls.has(l.url.trim())) {
        seenUrls.add(l.url.trim());
        result.push(classifyUrl(l.url, l.title));
      }
    });
  }

  // 2. URLs inside detail text
  if (detail) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = detail.match(urlRegex);
    if (matches) {
      matches.forEach(raw => {
        const clean = raw.replace(/[)\].,;]+$/, '').trim();
        if (clean && !seenUrls.has(clean)) {
          seenUrls.add(clean);
          result.push(classifyUrl(clean));
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
