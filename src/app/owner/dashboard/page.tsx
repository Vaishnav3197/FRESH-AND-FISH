'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { CustomerRepository } from '../../../repositories/CustomerRepository';
import { CreditRepository } from '../../../repositories/CreditRepository';
import { ExpenseRepository } from '../../../repositories/ExpenseRepository';
import DashboardLayout from '../../../components/common/DashboardLayout';
import CustomerList from '../../../features/customers/CustomerList';
import { Customer, Credit, Expense, TopCustomerItem, RecentActivityItem } from '../../../types';
import { formatCurrency } from '../../../utils/currency';
import {
  formatDate,
  formatDateTime,
  toJSDate,
  startOfToday,
  endOfToday,
  startOfThisWeek,
  endOfThisWeek,
  startOfThisMonth,
  endOfThisMonth,
  isToday,
  isThisWeek,
  isThisMonth
} from '../../../utils/date';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  TextField,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Autocomplete,
  Tooltip,
  IconButton,
  Divider
} from '@mui/material';
import {
  PersonAdd as AddCustomerIcon,
  AddCard as AddCreditIcon,
  ReceiptLong as ExpenseIcon,
  ChevronRight as ArrowIcon,
  MergeType as MergeIcon
} from '@mui/icons-material';

const namesMatch = (name1: string, name2: string): boolean => {
  const n1 = name1.trim().replace(/\s+/g, ' ').toLowerCase();
  const n2 = name2.trim().replace(/\s+/g, ' ').toLowerCase();
  return n1 === n2;
};

export default function OwnerDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCredits, setAllCredits] = useState<Credit[]>([]);
  const [filteredCredits, setFilteredCredits] = useState<Credit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilterType, setDateFilterType] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customFromDate, setCustomFromDate] = useState(formatDate(startOfToday()));
  const [customToDate, setCustomToDate] = useState(formatDate(endOfToday()));

  // Customer dialogues
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');

  const [editCustOpen, setEditCustOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergePrimary, setMergePrimary] = useState<Customer | null>(null);
  const [mergeSecondary, setMergeSecondary] = useState<Customer | null>(null);

  const [deleteCustOpen, setDeleteCustOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const [actionSubmitting, setActionSubmitting] = useState(false);

  useEffect(() => {
    // 1. Subscribe to Customers
    const unsubscribeCustomers = CustomerRepository.getCustomers(
      (list) => setCustomers(list),
      (err) => console.error(err)
    );

    // 2. Subscribe to Expenses
    const unsubscribeExpenses = ExpenseRepository.getExpenses(
      (list) => setExpenses(list),
      (err) => console.error(err)
    );

    // 3. Subscribe to Credits
    const unsubscribeCredits = CreditRepository.getCredits(
      (list) => {
        setAllCredits(list);
        setLoading(false);
      },
      (err) => console.error(err)
    );

    return () => {
      unsubscribeCustomers();
      unsubscribeExpenses();
      unsubscribeCredits();
    };
  }, []);

  // Filter credits based on active date filter configuration
  useEffect(() => {
    let fromDate = startOfToday();
    let toDate = endOfToday();

    if (dateFilterType === 'week') {
      fromDate = startOfThisWeek();
      toDate = endOfThisWeek();
    } else if (dateFilterType === 'month') {
      fromDate = startOfThisMonth();
      toDate = endOfThisMonth();
    } else if (dateFilterType === 'custom') {
      // Basic fallback if invalid
      const partsFrom = customFromDate.split('/');
      const partsTo = customToDate.split('/');
      if (partsFrom.length === 3 && partsTo.length === 3) {
        fromDate = new Date(+partsFrom[2], +partsFrom[1] - 1, +partsFrom[0], 0, 0, 0);
        toDate = new Date(+partsTo[2], +partsTo[1] - 1, +partsTo[0], 23, 59, 59);
      }
    }

    const filtered = allCredits.filter((credit) => {
      const date = toJSDate(credit.purchaseDate);
      return date >= fromDate && date <= toDate;
    });

    setFilteredCredits(filtered);
  }, [allCredits, dateFilterType, customFromDate, customToDate]);

  // Calculations (Exact parity with OwnerDashboardViewModel calculations)
  const todaySales = allCredits.filter((c) => isToday(c.purchaseDate)).sumOf((c) => c.amount);
  const todayCredit = allCredits.filter((c) => isToday(c.purchaseDate)).sumOf((c) => c.amount - c.paidAmount);
  
  const todayCollection = allCredits.sumOf((credit) => {
    if (credit.receivedDate && isToday(credit.receivedDate)) {
      return credit.amount;
    } else if (isToday(credit.purchaseDate)) {
      return credit.paidAmount;
    }
    return 0;
  });

  const todayExpenses = expenses.filter((e) => isToday(e.date)).sumOf((e) => e.amount);
  const outstandingAmount = allCredits.filter((c) => c.status === 'outstanding').sumOf((c) => c.amount - c.paidAmount);
  const netIncome = todayCollection - todayExpenses;

  // Trend calculations
  const salesThisWeek = allCredits.filter((c) => isThisWeek(c.purchaseDate)).sumOf((c) => c.amount);
  const salesThisMonth = allCredits.filter((c) => isThisMonth(c.purchaseDate)).sumOf((c) => c.amount);
  const expensesThisWeek = expenses.filter((e) => isThisWeek(e.date)).sumOf((e) => e.amount);
  const expensesThisMonth = expenses.filter((e) => isThisMonth(e.date)).sumOf((e) => e.amount);

  // Top Customers list (Ranked by purchases & outstanding)
  const getTopCustomers = () => {
    const customerCreditsMap: Record<string, number> = {};
    allCredits.forEach((c) => {
      if (c.customerId) {
        customerCreditsMap[c.customerId] = (customerCreditsMap[c.customerId] || 0) + c.amount;
      }
    });

    const items: TopCustomerItem[] = customers.map((cust) => ({
      customerName: cust.name,
      totalPurchases: customerCreditsMap[cust.customerId] || 0,
      outstandingAmount: cust.totalDue
    }));

    const byPurchases = [...items].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 5);
    const byOutstanding = [...items].sort((a, b) => b.outstandingAmount - a.outstandingAmount).slice(0, 5);

    return { byPurchases, byOutstanding };
  };

  const { byPurchases, byOutstanding } = getTopCustomers();

  // Aggregate recent activity items
  const getRecentActivities = (): RecentActivityItem[] => {
    const list: RecentActivityItem[] = [];

    allCredits.forEach((c) => {
      list.push({
        title: 'Credit Added',
        description: `Added credit of ${formatCurrency(c.amount)} for ${c.customerName}`,
        timestamp: c.purchaseDate,
        type: 'credit_added'
      });
      if (c.receivedDate) {
        list.push({
          title: 'Payment Received',
          description: `Received payment of ${formatCurrency(c.amount)} from ${c.customerName}`,
          timestamp: c.receivedDate,
          type: 'payment_received'
        });
      }
    });

    expenses.forEach((e) => {
      list.push({
        title: 'Expense Added',
        description: `Added expense '${e.title}': ${formatCurrency(e.amount)}`,
        timestamp: e.date,
        type: 'expense_added'
      });
    });

    customers.forEach((cust) => {
      list.push({
        title: 'New Customer',
        description: `Created profile for ${cust.name}`,
        timestamp: new Date(cust.createdAt),
        type: 'customer_added'
      });
    });

    return list.sort((a, b) => toJSDate(b.timestamp).getTime() - toJSDate(a.timestamp).getTime()).slice(0, 15);
  };

  const recentActivities = getRecentActivities();

  // Operations handlers
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    setActionSubmitting(true);
    try {
      await CustomerRepository.addCustomer({
        name: custName.trim(),
        phone: custPhone.trim() || null,
        totalDue: 0,
        addedBy: 'Owner'
      });
      setAddCustOpen(false);
      setCustName('');
      setCustPhone('');
    } catch (err) {
      alert('Failed to add customer profile.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name.trim()) return;

    setActionSubmitting(true);
    try {
      await CustomerRepository.updateCustomer(editingCustomer);
      setEditCustOpen(false);
      setEditingCustomer(null);
    } catch (err) {
      alert('Failed to update customer profile.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;

    setActionSubmitting(true);
    try {
      // Check transaction history (by customerId or name matches)
      const hasHistory = allCredits.some((c) =>
        c.customerId === deletingCustomer.customerId ||
        (!c.customerId && namesMatch(c.customerName, deletingCustomer.name))
      );

      if (hasHistory) {
        // Soft delete (sets isActive = false)
        await CustomerRepository.updateCustomer({
          ...deletingCustomer,
          isActive: false
        });
        alert(`Customer has transaction history. Soft-deleted successfully.`);
      } else {
        // Permanent delete
        await CustomerRepository.deleteCustomer(deletingCustomer.customerId);
        alert(`Customer profile deleted permanently.`);
      }
      setDeleteCustOpen(false);
      setDeletingCustomer(null);
    } catch (err) {
      alert('Failed to delete customer.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleMergeCustomers = async () => {
    if (!mergePrimary || !mergeSecondary) return;
    if (mergePrimary.customerId === mergeSecondary.customerId) {
      alert('Cannot merge a customer into themselves.');
      return;
    }

    setActionSubmitting(true);
    try {
      // Filter credits to migrate from secondary customer
      const creditsToMigrate = allCredits.filter((c) =>
        c.customerId === mergeSecondary.customerId ||
        (!c.customerId && namesMatch(c.customerName, mergeSecondary.name))
      );

      // Sum up outstanding amounts
      const primaryOutstanding = allCredits
        .filter((c) => c.customerId === mergePrimary.customerId || (!c.customerId && namesMatch(c.customerName, mergePrimary.name)))
        .filter((c) => c.status === 'outstanding')
        .sumOf((c) => c.amount - c.paidAmount);

      const secondaryOutstanding = creditsToMigrate
        .filter((c) => c.status === 'outstanding')
        .sumOf((c) => c.amount - c.paidAmount);

      const updatedPrimaryCustomer: Customer = {
        ...mergePrimary,
        totalDue: primaryOutstanding + secondaryOutstanding
      };

      await CustomerRepository.mergeCustomers(
        updatedPrimaryCustomer,
        mergeSecondary,
        creditsToMigrate
      );

      alert(`Merged successfully! ${creditsToMigrate.length} credit records migrated.`);
      setMergeDialogOpen(false);
      setMergePrimary(null);
      setMergeSecondary(null);
    } catch (err) {
      alert('Failed to merge customer profiles.');
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['owner']}>
      <Box sx={{ maxWidth: 1250, mx: 'auto' }}>
        {/* Header Title bar */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyBetween: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
              Owner Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Overviewing billing ledger, collections, and expense records in real-time.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<AddCustomerIcon />}
              onClick={() => setAddCustOpen(true)}
              sx={{ borderRadius: 3, bgcolor: 'background.paper' }}
            >
              Add Customer
            </Button>
            <Button
              variant="contained"
              startIcon={<AddCreditIcon />}
              onClick={() => router.push('/credits/new')}
              sx={{ borderRadius: 3 }}
            >
              Log Credit
            </Button>
          </Box>
        </Box>

        {/* Counter Panels */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{ borderLeft: '4px solid #3b82f6' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Today's Sales
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>{formatCurrency(todaySales)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{ borderLeft: '4px solid #ef4444' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Today's Credit
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'error.main' }}>{formatCurrency(todayCredit)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{ borderLeft: '4px solid #10b981' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Today's Collection
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'success.main' }}>{formatCurrency(todayCollection)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{ borderLeft: '4px solid #f59e0b' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Today's Expenses
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'warning.main' }}>{formatCurrency(todayExpenses)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{ 
                  background: (theme) => theme.palette.mode === 'dark' 
                    ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' 
                    : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e3a8a',
                  border: 'none'
                }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>
                      Net Income (Today)
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>{formatCurrency(netIncome)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tab view */}
            <Paper sx={{ borderRadius: 4, overflow: 'hidden', mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(e, v) => setActiveTab(v)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
              >
                <Tab label="Credits Ledger" sx={{ py: 2, fontWeight: 700 }} />
                <Tab label="Customers Directory" sx={{ py: 2, fontWeight: 700 }} />
                <Tab label="Analytics & Activity" sx={{ py: 2, fontWeight: 700 }} />
              </Tabs>
            </Paper>

            {/* Tab Panels */}
            {activeTab === 0 && (
              /* Credits Tab */
              <Box>
                {/* Filters Row */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
                  <TextField
                    select
                    label="Time Range"
                    value={dateFilterType}
                    onChange={(e) => setDateFilterType(e.target.value as any)}
                    sx={{ width: 140, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
                  >
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                    <MenuItem value="custom">Custom Range</MenuItem>
                  </TextField>

                  {dateFilterType === 'custom' && (
                    <>
                      <TextField
                        label="From (DD/MM/YYYY)"
                        value={customFromDate}
                        onChange={(e) => setCustomFromDate(e.target.value)}
                        placeholder="11/08/2026"
                        sx={{ width: 180, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
                      />
                      <TextField
                        label="To (DD/MM/YYYY)"
                        value={customToDate}
                        onChange={(e) => setCustomToDate(e.target.value)}
                        placeholder="11/08/2026"
                        sx={{ width: 180, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
                      />
                    </>
                  )}
                </Box>

                <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Items Description</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Paid</TableCell>
                        <TableCell align="right">Outstanding</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredCredits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Typography color="text.secondary">No credit items match selected filters.</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCredits.map((credit) => {
                          const outstanding = credit.amount - credit.paidAmount;
                          return (
                            <TableRow
                              key={credit.id}
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => {
                                if (credit.customerId) router.push(`/customers/${credit.customerId}`);
                              }}
                            >
                              <TableCell sx={{ fontWeight: 600 }}>{formatDate(credit.purchaseDate)}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{credit.customerName}</TableCell>
                              <TableCell sx={{ fontWeight: 500 }}>{credit.items}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(credit.amount)}</TableCell>
                              <TableCell align="right" color="success.main">{formatCurrency(credit.paidAmount)}</TableCell>
                              <TableCell align="right" sx={{ color: outstanding > 0 ? 'error.main' : 'text.primary', fontWeight: 700 }}>
                                {formatCurrency(outstanding)}
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={credit.status.toUpperCase()}
                                  size="small"
                                  color={credit.status === 'received' ? 'success' : 'error'}
                                  sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeTab === 1 && (
              /* Customers Tab */
              <Box>
                <CustomerList
                  customers={customers}
                  onCustomerClick={(id) => router.push(`/customers/${id}`)}
                  onEditClick={(c) => { setEditingCustomer(c); setEditCustOpen(true); }}
                  onDeleteClick={(c) => { setDeletingCustomer(c); setDeleteCustOpen(true); }}
                  onMergeClick={(c) => { setMergePrimary(c); setMergeDialogOpen(true); }}
                  isOwner={true}
                />
              </Box>
            )}

            {activeTab === 2 && (
              /* Analytics Tab */
              <Grid container spacing={4}>
                {/* Highlights widgets */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Summary Overview</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Total Active Customers</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>{customers.length}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Outstanding Accounts</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: 'error.main' }}>
                            {customers.filter((c) => c.totalDue > 0).length}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Sales (This Week)</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>{formatCurrency(salesThisWeek)}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Expenses (This Week)</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>{formatCurrency(expensesThisWeek)}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Sales (This Month)</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>{formatCurrency(salesThisMonth)}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Expenses (This Month)</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>{formatCurrency(expensesThisMonth)}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Total Ledger Outstanding</Typography>
                          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main' }}>
                            {formatCurrency(outstandingAmount)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Top Customers Panel */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Top Outstanding Accounts</Typography>
                      {byOutstanding.map((item, idx) => (
                        <Box key={idx} sx={{ display: 'flex', justifyBetween: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.customerName}</Typography>
                          <Typography variant="body2" color="error.main" sx={{ fontWeight: 700 }}>{formatCurrency(item.outstandingAmount)}</Typography>
                        </Box>
                      ))}

                      <Typography variant="h6" sx={{ fontWeight: 800, mt: 4, mb: 2 }}>Top Buying Customers</Typography>
                      {byPurchases.map((item, idx) => (
                        <Box key={idx} sx={{ display: 'flex', justifyBetween: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.customerName}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(item.totalPurchases)}</Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Recent Activities Log */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Recent Activity Log</Typography>
                      <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
                        {recentActivities.map((act, idx) => (
                          <Box key={idx} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{act.title}</Typography>
                              <Typography variant="caption" color="text.secondary">{formatDate(act.timestamp)}</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>{act.description}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </>
        )}

        {/* Dialogues */}

        {/* Add Customer */}
        <Dialog open={addCustOpen} onClose={() => setAddCustOpen(false)} maxWidth="xs" fullWidth>
          <Box component="form" onSubmit={handleAddCustomer}>
            <DialogTitle sx={{ fontWeight: 800 }}>Create Customer Profile</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="normal"
                label="Customer Name"
                type="text"
                fullWidth
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
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setAddCustOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={actionSubmitting}>
                {actionSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>

        {/* Edit Customer */}
        <Dialog open={editCustOpen} onClose={() => setEditCustOpen(false)} maxWidth="xs" fullWidth>
          {editingCustomer && (
            <Box component="form" onSubmit={handleEditCustomer}>
              <DialogTitle sx={{ fontWeight: 800 }}>Edit Customer Profile</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="normal"
                  label="Customer Name"
                  type="text"
                  fullWidth
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
                <TextField
                  margin="normal"
                  label="Phone Number (Optional)"
                  type="tel"
                  fullWidth
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value || null })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setEditCustOpen(false)}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={actionSubmitting}>
                  {actionSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Save'}
                </Button>
              </DialogActions>
            </Box>
          )}
        </Dialog>

        {/* Delete Customer confirmation */}
        <Dialog open={deleteCustOpen} onClose={() => setDeleteCustOpen(false)}>
          <DialogTitle>Delete Customer Profile?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the profile of <b>{deletingCustomer?.name}</b>?
              <br />
              {deletingCustomer && allCredits.some((c) => c.customerId === deletingCustomer.customerId) ? (
                <span style={{ color: '#ef4444', fontWeight: 600 }}>
                  WARNING: This customer has billing history. S/he will be SOFT-DELETED in database to maintain financial logs.
                </span>
              ) : (
                <span>This profile will be permanently deleted from database.</span>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteCustOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteCustomer} variant="contained" color="error" disabled={actionSubmitting}>
              {actionSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Merge Customers dialog */}
        <Dialog open={mergeDialogOpen} onClose={() => setMergeDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>Merge Customer Records</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Merge a duplicate customer record into a primary profile. This migrates all billing credits, consolidates balances, and soft-deletes the duplicate.
            </DialogContentText>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={customers.filter((c) => c.customerId !== mergePrimary?.customerId)}
                  getOptionLabel={(option) => `${option.name} (${formatCurrency(option.totalDue)})`}
                  value={mergePrimary}
                  onChange={(e, v) => setMergePrimary(v)}
                  renderInput={(params) => <TextField {...params} label="Primary Profile (Saves History)" />}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }} sx={{ textAlign: 'center' }}>
                <MergeIcon sx={{ transform: 'rotate(90deg)', fontSize: 32, color: 'text.secondary' }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={customers.filter((c) => c.customerId !== mergePrimary?.customerId)}
                  getOptionLabel={(option) => `${option.name} (${formatCurrency(option.totalDue)})`}
                  value={mergeSecondary}
                  onChange={(e, v) => setMergeSecondary(v)}
                  renderInput={(params) => <TextField {...params} label="Duplicate Profile (Will Be Merged & Deactivated)" />}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleMergeCustomers}
              variant="contained"
              color="primary"
              disabled={!mergePrimary || !mergeSecondary || actionSubmitting}
            >
              {actionSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Merge Profiles'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}

// Add array helper sumOf
declare global {
  interface Array<T> {
    sumOf(selector: (val: T) => number): number;
  }
}
if (!Array.prototype.sumOf) {
  Array.prototype.sumOf = function (selector) {
    return this.reduce((acc, curr) => acc + selector(curr), 0);
  };
}
