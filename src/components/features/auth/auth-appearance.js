/**
 * Clerk appearance shared by the sign-in and sign-up pages, so the hosted
 * forms use the FactorGrid palette, radius and type.
 */
export const AUTH_APPEARANCE = {
  variables: {
    colorPrimary: '#0369a1',
    colorText: '#0b1322',
    colorTextSecondary: '#5b6b82',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#0b1322',
    borderRadius: '0.625rem',
    fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    card: 'shadow-enterprise-lg ring-1 ring-black/5 rounded-2xl',
    footerActionLink: 'text-primary hover:text-primary/80',
  },
};
