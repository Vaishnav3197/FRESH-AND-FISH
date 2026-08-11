'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
      if (user.role === 'employee') {
        router.replace('/employee/dashboard');
      } else {
        router.replace('/owner/dashboard');
      }
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={50} thickness={4} />
    </Box>
  );
}
