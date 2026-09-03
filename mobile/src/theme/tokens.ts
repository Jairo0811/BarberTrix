export const colors = {
  background: '#050912',
  backgroundElevated: '#07101D',
  surface: '#0A1221',
  surfaceStrong: '#0D192B',
  surfaceSoft: '#101A2A',
  border: 'rgba(126, 157, 205, 0.18)',
  borderStrong: 'rgba(88, 168, 255, 0.34)',
  primary: '#1687FF',
  primaryPressed: '#0B73E8',
  primarySoft: 'rgba(22, 135, 255, 0.14)',
  primaryGlow: '#58A8FF',
  text: '#F7F8FB',
  textMuted: '#AEB8CA',
  textSubtle: '#7F8DA3',
  success: '#54D68A',
  successSoft: 'rgba(84, 214, 138, 0.12)',
  warning: '#FFB24A',
  danger: '#FF7A7A',
  dangerSoft: 'rgba(255, 90, 90, 0.10)',
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
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  eyebrow: {
    fontSize: 11,
    fontWeight: '900' as const,
    letterSpacing: 1.8,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900' as const,
    letterSpacing: -0.8,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
  },
} as const;
