/**
 * @module colorsDark
 * @description Dark theme variant for mobile app.
 *              Extends light theme with dark backgrounds and adjusted contrast.
 * 
 * Usage:
 *   import { colorsDark } from './colorsDark';
 *   const colors = isDarkMode ? colorsDark : colorsLight;
 */

export const colorsDark = {
  // ─── Backgrounds (Dark Theme) ──────────────────────────────────────────────
  bgPrimary:    '#0a0e27',   // very dark (dark blue-black)
  bgSurface:    '#111836',   // slightly lighter surface
  bgSubtle:     '#1a1f3a',   // subtle section bg

  // ─── Brand Identity (Adjusted for dark theme) ──────────────────────────────
  accent:       '#00d4ff',   // bright cyan (stands out on dark)
  accentLight:  'rgba(0, 212, 255, 0.1)',  // teal tint for backgrounds
  accentDark:   '#00a8cc',   // darker shade for pressed state

  // ─── Semantic Status Colors (Adjusted for dark backgrounds) ────────────────
  success:      '#00ff88',   // bright green
  successLight: 'rgba(0, 255, 136, 0.15)',
  warning:      '#ffaa00',   // amber
  warningLight: 'rgba(255, 170, 0, 0.15)',
  danger:       '#ff3366',   // red
  dangerLight:  'rgba(255, 51, 102, 0.15)',
  info:         '#00d4ff',   // cyan
  infoLight:    'rgba(0, 212, 255, 0.15)',

  // ─── Text (Dark Theme) ─────────────────────────────────────────────────────
  textPrimary:   '#f0f1f5',   // very light text
  textSecondary: '#b0b3c1',   // medium light secondary
  textMuted:     '#7a7d8f',   // muted text for hints
  textInverse:   '#0a0e27',   // text on light backgrounds (dark)

  // ─── Borders ────────────────────────────────────────────────────────────────
  border:      '#2a2f4a',    // darker border
  borderFocus: '#00d4ff',    // bright cyan for focus

  // ─── Check-in Button States ────────────────────────────────────────────────
  checkInGreen: '#00ff88',   // bright green
  checkOutRed:  '#ff3366',   // bright red
  cooldownGrey: '#7a7d8f',   // muted grey
  capGrey:      '#6a6d7f',   // cap reached button text

  // ─── Misc ──────────────────────────────────────────────────────────────────
  transparent:  'transparent',
  overlay:      'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  white:        '#ffffff',
  black:        '#000000',

  // ─── Special Dark Theme Colors ─────────────────────────────────────────────
  // For enhanced dark theme support
  bgElevated:   '#1f2540',   // elevated elements (modals, cards in focus)
  bgNotch:      '#0f1221',   // notch/header background
};

/**
 * Color scheme selector hook (to be used in screens)
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 * @param {Object} lightColors - Light theme colors
 * @param {Object} darkColors - Dark theme colors
 * @returns {Object} Selected color scheme
 */
export const useThemeColors = (isDarkMode, lightColors, darkColors) => {
  return isDarkMode ? darkColors : lightColors;
};
