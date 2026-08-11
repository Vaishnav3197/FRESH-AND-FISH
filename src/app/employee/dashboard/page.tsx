'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { CustomerRepository } from '../../../repositories/CustomerRepository';
import { CreditRepository } from '../../../repositories/CreditRepository';
import DashboardLayout from '../../../components/common/DashboardLayout';
import CustomerList from '../../../features/customers/CustomerList';
import { Customer, Credit } from '../../../types';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  PersonAdd as AddCustomerIcon,
  AddCard as AddCreditIcon
} from '@mui/icons-material';

function EmployeeDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (tabParam === 'customers') {
      setActiveTab(1);
    } else if (tabParam === 'credits') {
      setActiveTab(0);
    } else if (!tabParam) {
      setActiveTab(0);
    }
  }, [tabParam]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Customer Dialog
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  useEffect(() => {
    // Subscribe to customer list
    const unsubscribeCustomers = CustomerRepository.getCustomers(
      (list) => {
        setCustomers(list);
      },
      (err) => console.error(err)
    );

    // Subscribe to credit list
    const unsubscribeCredits = CreditRepository.getCredits(
      (list) => {
        setCredits(list);
        setLoading(false);
      },
      (err) => console.error(err)
    );

    return () => {
      unsubscribeCustomers();
      unsubscribeCredits();
    };
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      alert('Customer name is required');
      return;
    }

    setDialogSubmitting(true);
    try {
      await CustomerRepository.addCustomer({
        name: custName.trim(),
        phone: custPhone.trim() || null,
        totalDue: 0,
        addedBy: 'Employee'
      });
      setAddCustOpen(false);
      setCustName('');
      setCustPhone('');
    } catch (err) {
      console.error(err);
      alert('Failed to create customer profile');
    } finally {
      setDialogSubmitting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['employee']}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
              Welcome back, {user?.name}!
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Logged in as Shop Employee. You can log credits and create customer profiles.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<AddCustomerIcon />}
              onClick={() => setAddCustOpen(true)}
              sx={{ borderRadius: 3, bgcolor: 'background.paper', py: { xs: 1, sm: 1.5 } }}
            >
              Add Customer
            </Button>
            <Button
              variant="contained"
              startIcon={<AddCreditIcon />}
              onClick={() => router.push('/credits/new')}
              sx={{ borderRadius: 3, py: { xs: 1, sm: 1.5 } }}
            >
              Add Credit
            </Button>
          </Box>
        </Box>

        {/* Tab Controls */}
        <Paper sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Recent Credit Log" sx={{ py: 2, fontWeight: 700 }} />
            <Tab label="Customers Directory" sx={{ py: 2, fontWeight: 700 }} />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : activeTab === 0 ? (
          /* Recent Credit List */
          isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {credits.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                  <Typography color="text.secondary">No credits logged yet.</Typography>
                </Paper>
              ) : (
                credits.slice(0, 50).map((credit) => (
                  <Card 
                    key={credit.id} 
                    onClick={() => {
                      if (credit.customerId) {
                        router.push(`/customers/${credit.customerId}`);
                      }
                    }}
                    sx={{ 
                      borderRadius: 4, 
                      cursor: 'pointer',
                      borderLeft: '4px solid',
                      borderLeftColor: credit.status === 'received' ? 'success.main' : 'error.main',
                      boxShadow: 'none',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ minWidth: 0, mr: 1 }}>
                          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                            {credit.customerName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(credit.purchaseDate)}
                          </Typography>
                        </Box>
                        <Chip
                          label={credit.status.toUpperCase()}
                          size="small"
                          color={credit.status === 'received' ? 'success' : 'error'}
                          sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                        />
                      </Box>

                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 2, mt: 1 }}>
                        {credit.items}
                      </Typography>

                      <Divider sx={{ mb: 1.5 }} />

                      <Grid container spacing={1}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                            Amount
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {formatCurrency(credit.amount)}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                            Paid
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                            {formatCurrency(credit.paidAmount)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Items Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {credits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No credits logged yet.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    credits.slice(0, 50).map((credit) => (
                      <TableRow
                        key={credit.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (credit.customerId) {
                            router.push(`/customers/${credit.customerId}`);
                          }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>{formatDate(credit.purchaseDate)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{credit.customerName}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{credit.items}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(credit.amount)}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>{formatCurrency(credit.paidAmount)}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={credit.status.toUpperCase()}
                            size="small"
                            color={credit.status === 'received' ? 'success' : 'error'}
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : (
          /* Customers Directory */
          <CustomerList
            customers={customers}
            onCustomerClick={(id) => router.push(`/customers/${id}`)}
            isOwner={false}
          />
        )}

        {/* Add Customer Dialog */}
        <Dialog open={addCustOpen} onClose={() => setAddCustOpen(false)} maxWidth="xs" fullWidth>
          <Box component="form" onSubmit={handleCreateCustomer}>
            <DialogTitle sx={{ fontWeight: 800 }}>Add Customer Profile</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="normal"
                label="Customer Name"
                type="text"
                fullWidth
                variant="outlined"
                required
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <TextField
                margin="normal"
                label="Phone Number (Optional)"
                type="tel"
                fullWidth
                variant="outlined"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setAddCustOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={dialogSubmitting}>
                {dialogSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}

export default function EmployeeDashboard() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}>
      <EmployeeDashboardContent />
    </Suspense>
  );
}
