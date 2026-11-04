export const colors = {
  background: '#040812',
  backgroundElevated: '#07111F',
  surface: '#0A1424',
  surfaceStrong: '#0E1C30',
  surfaceSoft: '#122037',
  surfaceRaised: '#14263F',
  border: 'rgba(132, 169, 219, 0.20)',
  borderStrong: 'rgba(212, 175, 106, 0.45)',
  divider: 'rgba(151, 180, 220, 0.12)',
  // Barbershop identity: brass accent. Filled actions use dark text (onPrimary) for AA contrast.
  primary: '#D4AF6A',
  primaryAction: '#D4AF6A',
  primaryPressed: '#B8913F',
  primarySoft: 'rgba(212, 175, 106, 0.14)',
  primaryGlow: '#E3C58A',
  onPrimary: '#1B1305',
  poleRed: '#D6283B',
  poleBlue: '#1C6FE0',
  poleWhite: '#F4F1EA',
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
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  display: {
    fontSize: 40,
    lineHeight: 45,
    fontWeight: '900' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
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
