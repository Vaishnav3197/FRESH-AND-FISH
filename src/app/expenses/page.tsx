'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { ExpenseRepository } from '../../repositories/ExpenseRepository';
import DashboardLayout from '../../components/common/DashboardLayout';
import { Expense } from '../../types';
import { formatCurrency } from '../../utils/currency';
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
} from '../../utils/date';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
  CircularProgress,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as ReportsIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { Timestamp } from 'firebase/firestore';

const CATEGORIES = [
  'Ice',
  'Fuel',
  'Transport',
  'Electricity',
  'Salary',
  'Packaging',
  'Miscellaneous'
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [rawExpenses, setRawExpenses] = useState<Expense[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customFromDate, setCustomFromDate] = useState(formatDate(startOfToday()));
  const [customToDate, setCustomToDate] = useState(formatDate(endOfToday()));

  // CRUD Dialogue States
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Ice');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Subscribe to expenses in real-time
    const unsubscribe = ExpenseRepository.getExpenses(
      (list) => {
        setRawExpenses(list);
        setLoading(false);
      },
      (err) => {
        setError(`Failed to load expenses: ${err.message}`);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filter expenses (matching the exact structure in ExpenseViewModel.kt lines 76-101)
  useEffect(() => {
    let fromDate = startOfToday();
    let toDate = endOfToday();

    if (dateFilter === 'week') {
      fromDate = startOfThisWeek();
      toDate = endOfThisWeek();
    } else if (dateFilter === 'month') {
      fromDate = startOfThisMonth();
      toDate = endOfThisMonth();
    } else if (dateFilter === 'custom') {
      const partsFrom = customFromDate.split('/');
      const partsTo = customToDate.split('/');
      if (partsFrom.length === 3 && partsTo.length === 3) {
        fromDate = new Date(+partsFrom[2], +partsFrom[1] - 1, +partsFrom[0], 0, 0, 0);
        toDate = new Date(+partsTo[2], +partsTo[1] - 1, +partsTo[0], 23, 59, 59);
      }
    }

    const filtered = rawExpenses.filter((expense) => {
      // 1. Text Search Filter (Title or Notes)
      const matchesSearch =
        search.trim() === '' ||
        expense.title.toLowerCase().includes(search.toLowerCase()) ||
        (expense.notes || '').toLowerCase().includes(search.toLowerCase());

      // 2. Category Filter
      const matchesCategory =
        selectedCategory === 'All' ||
        expense.category.toLowerCase() === selectedCategory.toLowerCase();

      // 3. Date Filter
      const matchesDate =
        dateFilter === 'all' ||
        (toJSDate(expense.date) >= fromDate && toJSDate(expense.date) <= toDate);

      return matchesSearch && matchesCategory && matchesDate;
    });

    setExpenses(filtered);
  }, [rawExpenses, search, selectedCategory, dateFilter, customFromDate, customToDate]);

  const totalExpenses = expenses.sumOf((e) => e.amount);

  // Operations
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setExpenseTitle('');
    setExpenseCategory('Ice');
    setExpenseAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseNotes('');
    setExpenseModalOpen(true);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseTitle(expense.title);
    setExpenseCategory(expense.category);
    setExpenseAmount(expense.amount.toString());
    
    const dObj = toJSDate(expense.date);
    setExpenseDate(dObj.toISOString().split('T')[0]);
    setExpenseNotes(expense.notes || '');
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!expenseTitle.trim()) return;
    if (!expenseAmount) return;

    const amountVal = parseFloat(expenseAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    setExpenseModalOpen(false);
    setActionLoading(true);

    try {
      const dateObject = new Date(expenseDate);
      const offsetMs = dateObject.getTimezoneOffset() * 60 * 1000;
      const localDate = new Date(dateObject.getTime() + offsetMs);

      if (editingExpense) {
        // Edit Mode
        const updated: Expense = {
          ...editingExpense,
          title: expenseTitle.trim(),
          category: expenseCategory,
          amount: amountVal,
          date: Timestamp.fromDate(localDate),
          notes: expenseNotes.trim() || null,
        };
        await ExpenseRepository.updateExpense(updated);
        setSuccessMsg('Expense updated successfully.');
      } else {
        // Add Mode
        const newExpense: Omit<Expense, 'expenseId' | 'createdAt'> = {
          title: expenseTitle.trim(),
          category: expenseCategory,
          amount: amountVal,
          date: Timestamp.fromDate(localDate),
          notes: expenseNotes.trim() || null,
          createdBy: user?.uid || '',
        };
        await ExpenseRepository.addExpense(newExpense);
        setSuccessMsg('Expense logged successfully.');
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(`Failed to save expense: ${err.message}`);
    } finally {
      setActionLoading(false);
      setEditingExpense(null);
    }
  };

  const handleOpenDeleteModal = (expense: Expense) => {
    setDeletingExpense(expense);
    setDeleteModalOpen(true);
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    setDeleteModalOpen(false);
    setActionLoading(true);

    try {
      await ExpenseRepository.deleteExpense(deletingExpense.expenseId);
      setSuccessMsg('Expense deleted successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(`Failed to delete expense: ${err.message}`);
    } finally {
      setActionLoading(false);
      setDeletingExpense(null);
    }
  };

  return (
    <DashboardLayout allowedRoles={['owner']}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* Header bar */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.03em', fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' } }}>
              Expenses Log
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Record and oversee business expenditures.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<ReportsIcon />}
              onClick={() => router.push('/reports')}
              sx={{ borderRadius: 3, bgcolor: 'background.paper', py: { xs: 1, sm: 1.5 } }}
            >
              Reports Panel
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddModal}
              sx={{ borderRadius: 3, py: { xs: 1, sm: 1.5 } }}
            >
              Add Expense
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{successMsg}</Alert>}

        {/* Summary Card */}
        <Card sx={{ mb: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}>
              Total Filtered Expenses
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mt: 1, color: 'warning.main', fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' } }}>
              {formatCurrency(totalExpenses)}
            </Typography>
          </CardContent>
        </Card>

        {/* Filters Controls */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            placeholder="Search expense title or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 200 }, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
          />

          <TextField
            select
            label="Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{ width: { xs: '100%', sm: 160 }, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
          >
            <MenuItem value="All">All Categories</MenuItem>
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Timeframe"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            sx={{ width: { xs: '100%', sm: 150 }, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
          >
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="all">All Dates</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </TextField>

          {dateFilter === 'custom' && (
            <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', sm: 'auto' }, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="From (DD/MM/YYYY)"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                sx={{ width: { xs: '100%', sm: 170 }, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
              />
              <TextField
                label="To (DD/MM/YYYY)"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                sx={{ width: { xs: '100%', sm: 170 }, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
              />
            </Box>
          )}
        </Box>

        {/* Expenses List */}
        {isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={30} /></Box>
            ) : expenses.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <Typography color="text.secondary">No expense records found matching filters.</Typography>
              </Paper>
            ) : (
              expenses.map((expense) => (
                <Card 
                  key={expense.expenseId} 
                  sx={{ 
                    borderRadius: 4, 
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ minWidth: 0, mr: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {expense.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(expense.date)}
                        </Typography>
                      </Box>
                      <Chip
                        label={expense.category}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                      />
                    </Box>

                    {expense.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem' }}>
                        Note: {expense.notes}
                      </Typography>
                    )}

                    <Divider sx={{ mb: 1.5 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                          Amount
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: 'warning.main' }}>
                          {formatCurrency(expense.amount)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditModal(expense)}
                          disabled={actionLoading}
                          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 0.75 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteModal(expense)}
                          disabled={actionLoading}
                          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 0.75 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
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
                  <TableCell>Category</TableCell>
                  <TableCell>Expense Title</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={30} />
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No expense records found matching filters.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.expenseId} hover>
                      <TableCell sx={{ minWidth: 110, fontWeight: 600 }}>
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.category}
                          size="small"
                          color="secondary"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {expense.title}
                      </TableCell>
                      <TableCell color="text.secondary" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {expense.notes || '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'warning.main' }}>
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="Edit Expense">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEditModal(expense)}
                              disabled={actionLoading}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Expense">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteModal(expense)}
                              disabled={actionLoading}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add/Edit Expense Dialog */}
        <Dialog open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} maxWidth="xs" fullWidth>
          <Box component="form" onSubmit={handleSaveExpense}>
            <DialogTitle sx={{ fontWeight: 800 }}>
              {editingExpense ? 'Modify Expense Entry' : 'Log New Expense'}
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="normal"
                label="Expense Title / Label"
                type="text"
                fullWidth
                required
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <TextField
                select
                margin="normal"
                label="Category"
                fullWidth
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
              <TextField
                margin="normal"
                label="Amount (INR)"
                type="number"
                fullWidth
                required
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <Typography sx={{ mr: 1, fontWeight: 700 }}>₹</Typography>,
                  }
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <TextField
                margin="normal"
                label="Date"
                type="date"
                fullWidth
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <TextField
                margin="normal"
                label="Notes / Comments (Optional)"
                fullWidth
                multiline
                rows={2}
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={actionLoading}>
                Save Expense
              </Button>
            </DialogActions>
          </Box>
        </Dialog>

        {/* Delete Expense Dialog */}
        <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
          <DialogTitle>Delete Expense Entry?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to permanently delete this expense log for <b>{deletingExpense?.title}</b> of <b>{deletingExpense ? formatCurrency(deletingExpense.amount) : 'Rs. 0'}</b>?
              This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteExpense} variant="contained" color="error" disabled={actionLoading}>
              Delete
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
