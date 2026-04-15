/**
 * @module colors
 * @description Single source of truth for all colors in AttendEase mobile app.
 *              Import this everywhere — never hardcode hex values.
 *              Palette: clean minimal, deep teal accent, calm and trustworthy.
 *              
 *              Updated 2026-04-14: Aligned with unified design tokens.
 *              - Primary: #0d7377 (mobile teal)
 *              - Semantic: #00ff88 (success), #ffaa00 (warning), #ff3366 (danger), #00d4ff (info)
 */

export const colors = {
  // ─── Backgrounds (Light Theme) ──────────────────────────────────────────────
  bgPrimary:    '#f8f9fa',   // app background
  bgSurface:    '#ffffff',   // card / panel background
  bgSubtle:     '#f1f3f5',   // subtle section bg

  // ─── Brand Identity ─────────────────────────────────────────────────────────
  accent:       '#0d7377',   // deep teal — primary action (mobile signature)
  accentLight:  '#e8f4f4',   // teal tint for backgrounds
  accentDark:   '#0a5d60',   // pressed / active state

  // ─── Semantic Status Colors (Unified across platforms) ────────────────────
  // Changed from platform-specific to unified tokens for brand consistency
  success:      '#00ff88',   // green - completed, present (unified)
  successLight: '#e8f5e9',   // light green background
  warning:      '#ffaa00',   // amber - caution, half-day (unified)
  warningLight: '#fff8e1',   // light amber background
  danger:       '#ff3366',   // red - error, absent (unified)
  dangerLight:  '#ffebee',   // light red background
  info:         '#00d4ff',   // cyan - information, on-leave (unified)
  infoLight:    '#e3f2fd',   // light cyan background

  // ─── Text (Light Theme) ─────────────────────────────────────────────────────
  textPrimary:   '#111827',  // headings, important text
  textSecondary: '#6b7280',  // labels, descriptions
  textMuted:     '#9ca3af',  // timestamps, hints
  textInverse:   '#ffffff',  // text on dark backgrounds

  // ─── Borders ────────────────────────────────────────────────────────────────
  border:      '#e5e7eb',
  borderFocus: '#0d7377',

  // ─── Check-in Button States (Using unified semantic colors) ────────────────
  checkInGreen: '#00ff88',   // check-in button (unified success)
  checkOutRed:  '#ff3366',   // check-out button (unified danger)
  cooldownGrey: '#6b7280',   // cooldown button text
  capGrey:      '#9ca3af',   // cap reached button text

  // ─── Dark Theme Support (Future Enhancement) ────────────────────────────────
  // To be implemented in Phase 3
  // dark: {
  //   bgPrimary:    '#080810',
  //   bgSurface:    '#0f0f1a',
  //   textPrimary:  '#e8e8f0',
  //   textSecondary: '#6b6b8a',
  //   border:       '#1e1e35',
  // },

  // ─── Misc ───────────────────────────────────────────────────────────────────
  transparent:  'transparent',
  overlay:      'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  white:        '#ffffff',
  black:        '#000000',
};
