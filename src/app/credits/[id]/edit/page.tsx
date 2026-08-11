'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../hooks/useAuth';
import { CustomerRepository } from '../../../../repositories/CustomerRepository';
import { CreditRepository } from '../../../../repositories/CreditRepository';
import DashboardLayout from '../../../../components/common/DashboardLayout';
import { Credit } from '../../../../types';
import { formatDate, toJSDate } from '../../../../utils/date';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
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

export default function EditCreditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const creditId = resolvedParams.id;

  const { user } = useAuth();
  const router = useRouter();

  const [credit, setCredit] = useState<Credit | null>(null);
  const [loading, setLoading] = useState(true);

  // Form States
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState('');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(''); // YYYY-MM-DD
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load credit record details
    CreditRepository.getCreditById(creditId)
      .then((record) => {
        setCredit(record);
        setCustomerName(record.customerName);
        setItems(record.items);
        setAmount(record.amount.toString());
        
        const dateObj = toJSDate(record.purchaseDate);
        setPurchaseDate(dateObj.toISOString().split('T')[0]);
        setNotes(record.notes || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Credit record not found or inaccessible.');
        setLoading(false);
      });
  }, [creditId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credit) return;
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
      const dateObject = new Date(purchaseDate);
      const offsetMs = dateObject.getTimezoneOffset() * 60 * 1000;
      const localDate = new Date(dateObject.getTime() + offsetMs);

      const updatedCredit: Credit = {
        ...credit,
        customerName: customerName.trim(),
        items: items.trim(),
        amount: amountVal,
        purchaseDate: Timestamp.fromDate(localDate),
        notes: notes.trim() || null,
        updatedByUserId: user?.uid || '',
      };

      // 1. Save credit changes to database
      await CreditRepository.updateCredit(updatedCredit);

      // 2. Perform delta balance adjustments on customer profile if linked
      if (credit.customerId) {
        const oldOutstanding = credit.status === 'outstanding' 
          ? credit.amount - credit.paidAmount 
          : 0;

        const newOutstanding = credit.status === 'outstanding' 
          ? amountVal - credit.paidAmount 
          : 0;

        const delta = newOutstanding - oldOutstanding;
        
        if (delta !== 0) {
          await CustomerRepository.adjustCustomerDue(credit.customerId, delta);
        }
      }

      router.back();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update credit entry.');
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['owner']}>
      <Box sx={{ maxWidth: 700, mx: 'auto' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link underline="hover" color="inherit" href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
            Dashboard
          </Link>
          <Typography color="text.primary">Edit Credit</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => router.back()} sx={{ bgcolor: 'background.paper' }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            Edit Credit Entry
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <Paper sx={{ p: 4, borderRadius: 4 }}>
            <Box component="form" onSubmit={handleUpdate} noValidate>
              <Grid container spacing={3}>
                {/* Customer name */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    required
                    label="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                </Grid>

                {/* Items description */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    required
                    label="Items Description"
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                </Grid>

                {/* Buttons */}
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
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        )}
      </Box>
    </DashboardLayout>
  );
}
