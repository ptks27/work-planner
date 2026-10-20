---
name: apple-design-system
description: >-
  Apple Design System and Human Interface Guidelines (HIG) for web applications.
  Use when designing, restyling, or building modern, premium, minimalist Apple-like
  user interfaces with SF Pro typography, Cupertino glassmorphism, squircle cards,
  segmented pill controls, and Apple color palettes.
---

# Apple Design System & Web UI Guidelines

A comprehensive design specification for crafting interfaces that emulate the iconic **Apple.com**, **macOS**, and **iOS Human Interface Guidelines (HIG)** aesthetic.

---

## 1. Core Principles

1. **Clarity & Content-First**: Interface elements defer to content. Remove unnecessary borders, heavy shadows, and visual noise.
2. **Deference & Depth**: Use subtle layers, background blurs (`backdrop-filter: blur(20px)`), and gentle elevation rather than dark drop shadows.
3. **Delight in Motion**: Micro-interactions must feel fluid and natural using Apple's signature easing curve: `cubic-bezier(0.16, 1, 0.3, 1)`.
4. **Precision Typography**: Clean, legible typography with tight negative letter-spacing on titles and balanced line heights.

---

## 2. Color Palette & Design Tokens

### Light Mode (Apple Clean)
```css
:root {
  /* Canvas & Surfaces */
  --apple-bg: #f5f5f7;              /* Apple signature light gray canvas */
  --apple-card: #ffffff;            /* Pure white elevated card */
  --apple-subtle: #fbfbfd;          /* Secondary card background */
  --apple-line: rgba(0, 0, 0, 0.08);/* Ultra-fine hairline border */
  --apple-line-strong: rgba(0, 0, 0, 0.14);

  /* Typography */
  --apple-txt: #1d1d1f;             /* Apple Deep Ink (Primary text) */
  --apple-mut: #86868b;             /* Apple Secondary Gray */
  --apple-tertiary: #a1a1a6;        /* Tertiary / Placeholder text */

  /* Accents */
  --apple-blue: #0071e3;            /* Iconic Apple Blue CTA */
  --apple-blue-hover: #0077ed;
  --apple-blue-subtle: rgba(0, 113, 227, 0.08);
  --apple-green: #34c759;           /* Success / Completed */
  --apple-red: #ff3b30;             /* Destructive / Hot */
  --apple-orange: #ff9500;          /* Warning */
  --apple-purple: #af52de;

  /* Glassmorphism */
  --apple-glass-bg: rgba(255, 255, 255, 0.82);
  --apple-glass-border: rgba(0, 0, 0, 0.08);
  --apple-glass-blur: blur(20px) saturate(180%);

  /* Elevation */
  --apple-radius: 18px;             /* Squircle rounded corners */
  --apple-radius-sm: 10px;
  --apple-radius-pill: 999px;
  --apple-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --apple-shadow: 0 4px 20px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  --apple-shadow-hover: 0 12px 32px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
}
```

### Dark Mode (Apple Pro / Space Gray)
```css
[data-theme="dark"] {
  --apple-bg: #000000;              /* True deep black */
  --apple-card: #161617;            /* Elevated surface */
  --apple-subtle: #1d1d1f;          /* Secondary dark surface */
  --apple-line: rgba(255, 255, 255, 0.09);
  --apple-line-strong: rgba(255, 255, 255, 0.16);

  --apple-txt: #f5f5f7;
  --apple-mut: #86868b;
  --apple-tertiary: #6e6e73;

  --apple-blue: #2997ff;            /* Bright Apple Dark Blue */
  --apple-blue-hover: #47a6ff;
  --apple-blue-subtle: rgba(41, 151, 255, 0.15);

  --apple-glass-bg: rgba(22, 22, 23, 0.82);
  --apple-glass-border: rgba(255, 255, 255, 0.1);

  --apple-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  --apple-shadow-hover: 0 12px 32px rgba(0, 0, 0, 0.6);
}
```

---

## 3. Typography Stack

Apple uses **SF Pro** (San Francisco). On the web, use the native system font cascade with Thai fallback:
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
  "Helvetica Neue", "Sukhumvit Set", "Sarabun", sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### Metrics:
- **Hero / Page Titles**: `font-weight: 700; letter-spacing: -0.025em; line-height: 1.15;`
- **Section Headings**: `font-weight: 600; letter-spacing: -0.02em;`
- **Body Text**: `font-weight: 400; font-size: 14px - 15px; letter-spacing: -0.01em; line-height: 1.5;`
- **Captions / Meta**: `font-weight: 500; font-size: 12px; letter-spacing: 0.01em; color: var(--apple-mut);`

---

## 4. Key UI Components

### 4.1 Frosted Glass Navigation (Apple Topbar)
```css
.apple-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--apple-glass-bg);
  backdrop-filter: var(--apple-glass-blur);
  -webkit-backdrop-filter: var(--apple-glass-blur);
  border-bottom: 1px solid var(--apple-glass-border);
}
```

### 4.2 Segmented Control (Cupertino Pill Tabs)
The iconic iOS/macOS segmented control with inset sliding pill:
```css
.apple-segmented {
  display: inline-flex;
  background: rgba(120, 120, 128, 0.08);
  padding: 3px;
  border-radius: 999px;
  gap: 2px;
}
.apple-segmented-item {
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--apple-mut);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.apple-segmented-item.active {
  background: var(--apple-card);
  color: var(--apple-txt);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
}
```

### 4.3 Apple Pill Buttons (CTA)
```css
.apple-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--apple-blue);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.apple-btn-primary:hover {
  background: var(--apple-blue-hover);
  transform: scale(1.02);
}
.apple-btn-primary:active {
  transform: scale(0.98);
}
```

### 4.4 Squircle Cards
```css
.apple-card {
  background: var(--apple-card);
  border: 1px solid var(--apple-line);
  border-radius: var(--apple-radius);
  box-shadow: var(--apple-shadow);
  padding: 22px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.apple-card:hover {
  box-shadow: var(--apple-shadow-hover);
}
```

### 4.5 Smooth Checkbox (iOS Style)
```css
.apple-checkbox {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1.5px solid var(--apple-line-strong);
  background: transparent;
  display: grid;
  place-items: center;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}
.apple-checkbox.checked {
  background: var(--apple-blue);
  border-color: var(--apple-blue);
  color: #fff;
}
```

---

## 5. Animation & Easing
Always use Apple's signature cubic-bezier:
- **Micro-transitions**: `transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);`
- **Modals / Sheets**:
  ```css
  @keyframes appleSheetIn {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  ```
