'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('owner' | 'employee')[];
  guestOnly?: boolean;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  allowedRoles,
  guestOnly = false,
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (guestOnly) {
      if (user) {
        // Logged-in user trying to access guest page (like Login) -> redirect to dashboard
        if (user.role === 'employee') {
          router.replace('/employee/dashboard');
        } else {
          router.replace('/owner/dashboard');
        }
      }
    } else {
      if (!user) {
        // Not logged in -> redirect to login
        router.replace('/login');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Role mismatch (e.g., employee attempting to access owner dashboard)
        if (user.role === 'employee') {
          router.replace('/employee/dashboard');
        } else {
          router.replace('/owner/dashboard');
        }
      }
    }
  }, [user, loading, guestOnly, allowedRoles, router, pathname]);

  if (loading) {
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

  // Guard checks
  if (guestOnly && user) {
    return null; // Will redirect
  }

  if (!guestOnly && !user) {
    return null; // Will redirect
  }

  if (!guestOnly && user && allowedRoles && !allowedRoles.includes(user.role)) {
    return null; // Will redirect
  }

  return <>{children}</>;
};
export default RouteGuard;
