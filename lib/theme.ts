export const theme = {
  colors: {
    primary: '#1A3A5C',      // Blu scuro Premium (brand)
    primaryLight: '#2C5A8B', // Variante più chiara per gradienti
    accent: '#2E86AB',       // Azzurro vivace per le azioni (bottoni)
    accentLight: '#E8F4FA',  // Sfondo azzurro tenue (badge)
    background: '#F3F6FA',   // Sfondo generale grigio/bluastro tenue
    card: '#FFFFFF',         // Sfondo card bianco
    text: '#1A3A5C',         // Testo principale: Blu scuro invece di nero puro
    textSecondary: '#6B7280',// Testo secondario, descrizioni
    textMuted: '#9CA3AF',    // Testo ancora meno evidente
    border: '#E2E8F0',       // Bordi soffici
    success: '#10B981',      // Verde per risposte corrette
    successBg: '#D1FAE5',
    error: '#EF4444',        // Rosso per errori
    errorBg: '#FEE2E2',
    warning: '#F59E0B',      // Arancione (per etichette PRO)
    warningBg: '#FEF3C7',
  },
  gradients: {
    hero: ['#1A3A5C', '#2C5A8B'] as const,
    appBackground: ['#F6F9FD', '#EDF3FA'] as const,
    authHero: ['#0F2E4A', '#1E4F77'] as const,
  },
  typography: {
    fontFamily: undefined, // Setup futuro se serve (es. Inter, Poppins)
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
  },
  shadows: {
    premium: {
      shadowColor: '#1A3A5C',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 5,
    },
    mild: {
      shadowColor: '#1A3A5C',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    }
  },
  borderRadius: {
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  }
};
