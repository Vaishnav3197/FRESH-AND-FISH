'use client';

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import RouteGuard from '../../components/common/RouteGuard';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  SetMeal as FishIcon
} from '@mui/icons-material';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      // RouteGuard will handle the redirect automatically
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Incorrect email or password.');
      setSubmitting(false);
    }
  };

  return (
    <RouteGuard guestOnly>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: (theme) => 
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #070f2b 0%, #1b1a55 50%, #070f2b 100%)'
              : 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={6}
            className="slide-up glass-panel"
            sx={{
              p: { xs: 4, md: 5 },
              borderRadius: 4,
              border: (theme) => 
                theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.05)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
              textAlign: 'center',
            }}
          >
            {/* App Branding */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                mb: 2,
                boxShadow: (theme) => `0 4px 20px ${theme.palette.primary.main}44`,
              }}
            >
              <FishIcon sx={{ fontSize: 36 }} />
            </Box>

            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
              Fresh & Fish
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
              Fish Shop Credit Ledger Manager
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left', borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                  }
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                  }
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={submitting}
                sx={{
                  mt: 4,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 3,
                  fontSize: '1rem',
                }}
              >
                {submitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Sign In / Register'
                )}
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              Demo users:<br />
              <b>owner@fishshop.com</b> (Owner Role)<br />
              <b>employee@fishshop.com</b> (Employee Role)
            </Typography>
          </Paper>
        </Container>
      </Box>
    </RouteGuard>
  );
}
