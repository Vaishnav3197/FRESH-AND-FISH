'use client';

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from './ThemeRegistry';
import { useRouter, usePathname } from 'next/navigation';
import RouteGuard from './RouteGuard';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ReceiptLong as ExpenseIcon,
  BarChart as ReportsIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  SetMeal as FishIcon
} from '@mui/icons-material';

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles?: ('owner' | 'employee')[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, logout } = useAuth();
  const { themeMode, setThemeMode, selectedThemePreference } = useAppTheme();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    router.replace('/login');
  };

  const toggleTheme = () => {
    if (selectedThemePreference === 'system') {
      setThemeMode(themeMode === 'light' ? 'dark' : 'light');
    } else {
      setThemeMode(themeMode === 'light' ? 'dark' : 'light');
    }
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: user?.role === 'employee' ? '/employee/dashboard' : '/owner/dashboard',
      roles: ['owner', 'employee'],
    },
    {
      text: 'Expenses',
      icon: <ExpenseIcon />,
      path: '/expenses',
      roles: ['owner'],
    },
    {
      text: 'Reports',
      icon: <ReportsIcon />,
      path: '/reports',
      roles: ['owner'],
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
      roles: ['owner', 'employee'],
    },
  ];

  const handleNavigate = (path: string) => {
    router.push(path);
    if (isMobile) setDrawerOpen(false);
  };

  const drawerContent = (
    <Box sx={{ width: 260, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Drawer Brand */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64 }}>
        <FishIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Fresh & Fish
        </Typography>
      </Box>
      <Divider />
      
      {/* Navigation List */}
      <List sx={{ flexGrow: 1, px: 1.5, py: 2 }}>
        {menuItems
          .filter((item) => user && item.roles.includes(user.role))
          .map((item) => {
            const isActive = pathname === item.path;
            return (
              <ListItemButton
                key={item.text}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  bgcolor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    bgcolor: isActive ? 'primary.main' : 'action.hover',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={<Typography variant="body1" sx={{ fontWeight: isActive ? 600 : 500 }}>{item.text}</Typography>} />
              </ListItemButton>
            );
          })}
      </List>
      
      {/* Drawer User Info */}
      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'secondary.main', fontWeight: 700 }}>
          {user?.name?.charAt(0) || 'U'}
        </Avatar>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {user?.name || 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {user?.role || 'Role'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <RouteGuard allowedRoles={allowedRoles}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* AppBar header */}
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            boxShadow: 'none',
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isMobile && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={() => setDrawerOpen(true)}
                  sx={{ mr: 1 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <FishIcon color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h6" noWrap sx={{ fontWeight: 800, letterSpacing: '-0.025em' }}>
                Fresh & Fish
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Theme Toggle */}
              <Tooltip title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}>
                <IconButton onClick={toggleTheme} color="inherit" sx={{ mr: 1 }}>
                  {themeMode === 'light' ? <DarkIcon /> : <LightIcon />}
                </IconButton>
              </Tooltip>

              {/* User Avatar Menu trigger */}
              <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.95rem', fontWeight: 600 }}>
                  {user?.name?.charAt(0) || 'U'}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={profileAnchorEl}
                open={Boolean(profileAnchorEl)}
                onClose={handleProfileMenuClose}
                slotProps={{
                  paper: {
                    sx: { mt: 1.5, minWidth: 160, borderRadius: 3 }
                  }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={() => { handleProfileMenuClose(); router.push('/settings'); }}>
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  Settings
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                  Log Out
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Sidebar Navigation */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260, borderRight: 'none' },
            }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              width: 260,
              flexShrink: 0,
              [`& .MuiDrawer-paper`]: { width: 260, boxSizing: 'border-box', borderRight: (theme) => `1px solid ${theme.palette.divider}` },
            }}
          >
            <Toolbar />
            {drawerContent}
          </Drawer>
        )}

        {/* Main Content Area */}
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2.5, md: 4 }, overflow: 'hidden' }}>
          <Toolbar />
          {children}
        </Box>
      </Box>
    </RouteGuard>
  );
};
export default DashboardLayout;
