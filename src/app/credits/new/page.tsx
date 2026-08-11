'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { CustomerRepository } from '../../../repositories/CustomerRepository';
import { CreditRepository } from '../../../repositories/CreditRepository';
import DashboardLayout from '../../../components/common/DashboardLayout';
import { Customer, Credit } from '../../../types';
import { formatDate } from '../../../utils/date';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Autocomplete,
  Grid,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  IconButton
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { Timestamp } from 'firebase/firestore';

function AddCreditForm() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledName = searchParams.get('name') || '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Form States
  const [customerName, setCustomerName] = useState(prefilledName);
  const [items, setItems] = useState('');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load customers for autocomplete list
    const unsubscribe = CustomerRepository.getCustomers(
      (list) => {
        setCustomers(list);
        setLoadingCustomers(false);
      },
      (err) => {
        console.error(err);
        setLoadingCustomers(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!items.trim()) {
      setError('Items description is required.');
      return;
    }
    if (!amount) {
      setError('Amount is required.');
      return;
    }

    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Resolve matching customer (normalising whitespaces and case)
      const matchingCustomer = customers.find((c) =>
        c.name.trim().replace(/\s+/g, ' ').toLowerCase() === 
        customerName.trim().replace(/\s+/g, ' ').toLowerCase()
      );
      
      const customerId = matchingCustomer?.customerId || '';

      const roleDisplay = user?.role === 'employee' ? 'Employee' : 'Owner';
      const addedByName = user?.name || user?.email?.split('@')[0] || 'Unknown';
      const dateObject = new Date(purchaseDate);
      
      // Handle timezone offset to keep date local
      const offsetMs = dateObject.getTimezoneOffset() * 60 * 1000;
      const localDate = new Date(dateObject.getTime() + offsetMs);

      const newCredit: Omit<Credit, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId,
        customerName: customerName.trim(),
        items: items.trim(),
        amount: amountVal,
        paidAmount: 0.0,
        purchaseDate: Timestamp.fromDate(localDate),
        status: 'outstanding',
        receivedDate: null,
        addedBy: roleDisplay,
        notes: notes.trim() || null,
        paymentMethod: null,
        addedByUserId: user?.uid || '',
        addedByName,
        addedByRole: roleDisplay,
        updatedByUserId: null,
      };

      // 2. Write to Firestore
      const newCreditId = await CreditRepository.addCredit(newCredit);

      // 3. Adjust customer balance (using transaction)
      if (customerId) {
        await CustomerRepository.adjustCustomerDue(customerId, amountVal);
      }

      // Confetti feedback if window is available
      if (typeof window !== 'undefined') {
        const confetti = (await import('canvas-confetti')).default;
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }

      // Redirect back
      if (customerId) {
        router.replace(`/customers/${customerId}`);
      } else {
        router.replace(user?.role === 'employee' ? '/employee/dashboard' : '/owner/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to add credit record.');
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 700, mx: 'auto' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link underline="hover" color="inherit" href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
            Dashboard
          </Link>
          <Typography color="text.primary">New Credit</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => router.back()} sx={{ bgcolor: 'background.paper' }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            New Credit Record
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        <Paper sx={{ p: 4, borderRadius: 4 }}>
          <Box component="form" onSubmit={handleSave} noValidate>
            <Grid container spacing={3}>
              {/* Customer Autocomplete */}
              <Grid size={{ xs: 12 }}>
                {loadingCustomers ? (
                  <CircularProgress size={20} />
                ) : (
                  <Autocomplete
                    freeSolo
                    options={customers.map((c) => c.name)}
                    value={customerName}
                    onInputChange={(event, newValue) => setCustomerName(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Customer Name"
                        required
                        helperText="Type a name to search existing profiles, or type a new name to create an unlinked credit."
                      />
                    )}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                )}
              </Grid>

              {/* Items description */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  required
                  label="Items Description (e.g. Fish type, Quantity)"
                  value={items}
                  onChange={(e) => setItems(e.target.value)}
                  placeholder="e.g. Surmai 2kg, Pomfret 1.5kg"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </Grid>

              {/* Amount */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Amount (INR)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  slotProps={{
                    input: {
                      startAdornment: <Typography sx={{ mr: 1, fontWeight: 700 }}>₹</Typography>,
                    }
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </Grid>

              {/* Purchase Date */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Purchase Date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </Grid>

              {/* Notes */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Notes / Comments (Optional)"
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any extra information about this transaction..."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </Grid>

              {/* Action Buttons */}
              <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => router.back()}
                  sx={{ borderRadius: 3 }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  sx={{ borderRadius: 3 }}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Credit'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}

export default function AddCreditPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}>
      <AddCreditForm />
    </Suspense>
  );
}
