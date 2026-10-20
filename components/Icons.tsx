import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  strokeWidth?: number;
}

const baseProps = (
  size = 18,
  strokeWidth = 2,
  className = '',
  style?: React.CSSProperties,
  color?: string
) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color || 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  style: { verticalAlign: 'middle', flexShrink: 0, ...style },
  'aria-hidden': true,
});

// ---------- Navigation & Tabs ----------

export function CalendarIcon({ size = 18, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <circle cx="8" cy="14" r="1" fill="currentColor" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
      <circle cx="8" cy="18" r="1" fill="currentColor" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

export function KanbanIcon({ size = 18, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" />
      <rect x="17" y="4" width="5" height="13" rx="1.5" />
    </svg>
  );
}

export function ColumnsIcon({ size = 18, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  );
}

export function UmbrellaIcon({ size = 18, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M12 2v20" />
      <path d="M17.5 17a4.5 4.5 0 0 1-5.5 4.4" />
      <path d="M3.2 13a9 9 0 0 1 17.6 0Z" />
      <path d="M12 2a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

export function ChartBarIcon({ size = 18, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M3 3v18h18" />
      <rect x="7" y="10" width="3" height="8" rx="1" />
      <rect x="13" y="6" width="3" height="12" rx="1" />
      <rect x="18" y="12" width="3" height="6" rx="1" />
    </svg>
  );
}

export function SpreadsheetIcon({ size = 18, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 9v12" />
    </svg>
  );
}

export function SettingsIcon({ size = 18, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ---------- App Brand & Identity ----------

export function BoltIcon({ size = 18, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

export function BuildingIcon({ size = 18, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

export function SearchIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function SunIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function MoonIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function ClipboardIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

export function ClipboardCheckIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

export function CopyIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function LogOutIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function UserIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

export function UsersIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ---------- Actions & Controls ----------

export function PlusIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function PlusCircleIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function TrashIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function EditIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function CloseIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function CheckIcon({ size = 16, strokeWidth = 2.5, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ClockIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function RefreshCwIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

export function CloudIcon({ size = 18, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}

export function CloudUploadIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

export function CloudDownloadIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m8 17 4 4 4-4" />
    </svg>
  );
}

export function DownloadIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function UploadIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function BellIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function BellOffIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
      <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function FilterIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronUpIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function FlagIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

export function FileTextIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

export function StickyNoteIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
      <path d="M15 3v6h6" />
    </svg>
  );
}

export function PalmTreeIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h11Z" />
      <path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-9" />
      <path d="M5.8 15.5c1.5 1.5 3.5 2.5 6.2 2.5 1.7 0 3-.5 4-1" />
      <path d="M11 22V8" />
    </svg>
  );
}

export function BeachIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="m14 10 7.5 7.5" />
      <path d="m9.5 14.5 4-4" />
      <path d="m5 19 4.5-4.5" />
      <path d="M17.5 6.5A4.5 4.5 0 0 0 11 13l4.5 4.5A4.5 4.5 0 0 0 22 11" />
      <circle cx="6" cy="6" r="3" />
      <path d="M3 21h18" />
    </svg>
  );
}

export function RepeatIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export function SparklesIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

export function LinkIcon({ size = 16, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function TagIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}

export function MessageSquareIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function HistoryIcon({ size = 14, strokeWidth = 2, className, style, color }: IconProps) {
  return (
    <svg {...baseProps(size, strokeWidth, className, style, color)}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

