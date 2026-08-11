'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAppTheme } from '../../components/common/ThemeRegistry';
import {
  Box,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Breadcrumbs,
  Link,
  IconButton,
  Divider
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Palette as ThemeIcon
} from '@mui/icons-material';

export default function SettingsPage() {
  const router = useRouter();
  const { setThemeMode, selectedThemePreference } = useAppTheme();

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'light' | 'dark' | 'system';
    setThemeMode(value);
  };

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 700, mx: 'auto' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link underline="hover" color="inherit" href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
            Home
          </Link>
          <Typography color="text.primary">Settings</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => router.back()} sx={{ bgcolor: 'background.paper' }}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
              Settings
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Configure your user interface preferences.
            </Typography>
          </Box>
        </Box>

        {/* Appearance Settings Card */}
        <Paper sx={{ p: 4, borderRadius: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <ThemeIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Appearance Theme
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 2 }}>
              Choose theme preference for shop devices:
            </FormLabel>
            <RadioGroup
              aria-label="theme-preference"
              name="theme-preference"
              value={selectedThemePreference}
              onChange={handleThemeChange}
            >
              <FormControlLabel
                value="system"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>System Default</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Matches the active OS setting on your phone, tablet, or PC
                    </Typography>
                  </Box>
                }
                sx={{ mb: 2, alignItems: 'flex-start' }}
              />
              <FormControlLabel
                value="light"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Light Mode</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cool slate grey layouts optimized for standard daylight environments
                    </Typography>
                  </Box>
                }
                sx={{ mb: 2, alignItems: 'flex-start' }}
              />
              <FormControlLabel
                value="dark"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Dark Mode</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Deep navy designs that reduce eye-strain in dim shop lighting
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1, alignItems: 'flex-start' }}
              />
            </RadioGroup>
          </FormControl>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}
