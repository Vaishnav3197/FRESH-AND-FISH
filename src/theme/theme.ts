import { createTheme, ThemeOptions } from '@mui/material/styles';

const getDesignTokens = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Premium Light Mode (Deep Sea Indigo & Clean Aqua)
          primary: {
            main: '#1a365d', // Deep sea navy
            light: '#2b6cb0',
            dark: '#0f172a',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#0d9488', // Teal accent
            light: '#2dd4bf',
            dark: '#115e59',
          },
          background: {
            default: '#f8fafc', // Very light cool grey-blue
            paper: '#ffffff',
          },
          text: {
            primary: '#0f172a',
            secondary: '#475569',
          },
          divider: '#e2e8f0',
        }
      : {
          // Premium Dark Mode (Glow Cyber Ocean)
          primary: {
            main: '#38bdf8', // Neon blue/cyan
            light: '#7dd3fc',
            dark: '#0369a1',
            contrastText: '#0f172a',
          },
          secondary: {
            main: '#34d399', // Emerald/Mint green
            light: '#6ee7b7',
            dark: '#065f46',
          },
          background: {
            default: '#070f2b', // Ultra dark ocean blue
            paper: '#1b1a55', // Deep indigo card
          },
          text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
          },
          divider: '#31304d',
        }),
  },
  typography: {
    fontFamily: 'var(--font-outfit), "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.015em',
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState, theme }) => ({
          borderRadius: 8,
          padding: '8px 16px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          ...(ownerState.variant === 'contained' && ownerState.color === 'primary' && {
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)'
              : 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
            color: theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff',
            '&:hover': {
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #7dd3fc 0%, #0369a1 100%)'
                : 'linear-gradient(135deg, #1d4ed8 0%, #172554 100%)',
            },
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'secondary' && {
            background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
            color: '#ffffff',
            '&:hover': {
              background: 'linear-gradient(135deg, #6ee7b7 0%, #047857 100%)',
            },
          }),
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: mode === 'light'
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.02)'
            : '0 4px 20px -2px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          backgroundImage: 'none',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: mode === 'light'
              ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
              : '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: mode === 'light' ? '#f1f5f9' : '#0f172a',
          color: mode === 'light' ? '#0f172a' : '#f8fafc',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          backgroundImage: 'none',
        },
      },
    },
  },
});

export const createAppTheme = (mode: 'light' | 'dark') => {
  return createTheme(getDesignTokens(mode));
};
