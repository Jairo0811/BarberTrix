export const colors = {
  background: '#040812',
  backgroundElevated: '#07111F',
  surface: '#0A1424',
  surfaceStrong: '#0E1C30',
  surfaceSoft: '#122037',
  surfaceRaised: '#14263F',
  border: 'rgba(132, 169, 219, 0.20)',
  borderStrong: 'rgba(88, 168, 255, 0.42)',
  divider: 'rgba(151, 180, 220, 0.12)',
  primary: '#1687FF',
  // Darker action surface keeps white button labels at WCAG AA contrast.
  primaryAction: '#0B73E8',
  primaryPressed: '#085DC2',
  primarySoft: 'rgba(22, 135, 255, 0.15)',
  primaryGlow: '#62B1FF',
  text: '#F8FAFD',
  textMuted: '#B6C2D5',
  textSubtle: '#8796AD',
  success: '#58DB91',
  successSoft: 'rgba(88, 219, 145, 0.13)',
  warning: '#FFB84D',
  warningSoft: 'rgba(255, 184, 77, 0.12)',
  danger: '#FF8282',
  dangerSoft: 'rgba(255, 105, 105, 0.11)',
  black: '#000000',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 52,
} as const;

export const radius = {
  sm: 11,
  md: 15,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 999,
} as const;

export const typography = {
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900' as const,
    letterSpacing: 1.8,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900' as const,
    letterSpacing: -0.8,
  },
  display: {
    fontSize: 40,
    lineHeight: 45,
    fontWeight: '900' as const,
    letterSpacing: -1.1,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
  },
} as const;

export const control = {
  minTouch: 48,
  inputHeight: 54,
  buttonHeight: 52,
} as const;
