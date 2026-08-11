'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerRepository } from '../../../repositories/CustomerRepository';
import { CreditRepository } from '../../../repositories/CreditRepository';
import { AuthRepository } from '../../../repositories/AuthRepository';
import DashboardLayout from '../../../components/common/DashboardLayout';
import { Customer, Credit } from '../../../types';
import { formatCurrency } from '../../../utils/currency';
import { formatDate, formatDateTime, toJSDate } from '../../../utils/date';
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
  CircularProgress,
  Tooltip,
  Paper,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
  Divider,
  Chip,
  Breadcrumbs,
  Link,
  useTheme,
  useMediaQuery,
  CardActionArea
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  AddCard as AddCreditIcon,
  Payments as PayIcon,
  CheckCircle as ReceivedIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as ExportIcon,
  CalendarToday as DateIcon,
  FormatListBulleted as ListIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper function to normalise and compare names (matching Android namesMatch)
const namesMatch = (name1: string, name2: string): boolean => {
  const n1 = name1.trim().replace(/\s+/g, ' ').toLowerCase();
  const n2 = name2.trim().replace(/\s+/g, ' ').toLowerCase();
  return n1 === n2;
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;
  
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [rawCredits, setRawCredits] = useState<Credit[]>([]);
  const [runningBalances, setRunningBalances] = useState<Record<string, number>>({});
  
  const [isOwner, setIsOwner] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Outstanding' | 'Received'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog States
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    // 1. Check user role
    AuthRepository.getCurrentUserProfile().then((profile) => {
      setIsOwner(profile?.role === 'owner');
    });

    let unsubscribeCredits: (() => void) | null = null;

    // 2. Subscribe to Customer details
    const unsubscribeCustomer = CustomerRepository.getCustomer(
      customerId,
      (cust) => {
        if (!cust) {
          setError('Customer profile not found.');
          setLoading(false);
          return;
        }
        setCustomer(cust);
        setError(null);

        // 3. Subscribe to Credits
        if (!unsubscribeCredits) {
          unsubscribeCredits = CreditRepository.getCredits(
            (allCredits) => {
              // Filter credits associated with this customer (by ID or matching name)
              const customerCredits = allCredits.filter((credit) =>
                (credit.customerId && credit.customerId === cust.customerId) ||
                (!credit.customerId && namesMatch(credit.customerName, cust.name))
              );

              setRawCredits(customerCredits);
              setLoading(false);
            },
            (err) => {
              setError(`Failed to load credits: ${err.message}`);
              setLoading(false);
            }
          );
        }
      },
      (err) => {
        setError(`Failed to load customer profile: ${err.message}`);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeCustomer();
      if (unsubscribeCredits) (unsubscribeCredits as () => void)();
    };
  }, [customerId]);

  // Recalculate ledger balances, running balances, and apply filters when rawCredits or filters change
  useEffect(() => {
    if (!customer) return;

    // Sort chronologically (oldest first) to calculate running balance correctly
    const chronologicalCredits = [...rawCredits].sort((a, b) => 
      toJSDate(a.purchaseDate).getTime() - toJSDate(b.purchaseDate).getTime()
    );

    let running = 0;
    const balances: Record<string, number> = {};
    
    chronologicalCredits.forEach((credit) => {
      running += (credit.amount - credit.paidAmount);
      balances[credit.id] = running;
    });

    setRunningBalances(balances);

    // Apply display filters and sort descending (newest first)
    const filtered = chronologicalCredits
      .sort((a, b) => toJSDate(b.purchaseDate).getTime() - toJSDate(a.purchaseDate).getTime())
      .filter((credit) => {
        const matchesStatus =
          statusFilter === 'All' ||
          (statusFilter === 'Outstanding' && credit.status === 'outstanding') ||
          (statusFilter === 'Received' && credit.status === 'received');

        const matchesSearch =
          search.trim() === '' ||
          credit.items.toLowerCase().includes(search.toLowerCase()) ||
          formatDate(credit.purchaseDate).includes(search);

        return matchesStatus && matchesSearch;
      });

    setCredits(filtered);
  }, [rawCredits, search, statusFilter, customer]);

  // Summaries
  const totalCredits = rawCredits.sumOf((c) => c.amount);
  const totalOutstanding = rawCredits.sumOf((c) => c.amount - c.paidAmount);
  const totalPaid = rawCredits.sumOf((c) => c.paidAmount);

  // Operations
  const handleMarkAsReceived = async (credit: Credit) => {
    const outstanding = credit.amount - credit.paidAmount;
    if (outstanding <= 0) return;

    setActionLoading(true);
    try {
      // 1. Settle credit
      await CreditRepository.markAsReceived(credit.id);
      
      // 2. Adjust customer balance
      await CustomerRepository.adjustCustomerDue(customerId, -outstanding);
      
      setSuccessMsg('Credit marked as fully received!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(`Failed to update credit: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPaymentDialog = (credit: Credit) => {
    setSelectedCredit(credit);
    setPaymentAmount((credit.amount - credit.paidAmount).toString());
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedCredit) return;
    const amountVal = parseFloat(paymentAmount);
    const maxPayable = selectedCredit.amount - selectedCredit.paidAmount;

    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }
    if (amountVal > maxPayable) {
      alert(`Cannot pay more than the outstanding amount: ${formatCurrency(maxPayable)}`);
      return;
    }

    setPaymentDialogOpen(false);
    setActionLoading(true);
    try {
      // 1. Record payment
      await CreditRepository.recordPayment(selectedCredit.id, amountVal);

      // 2. Adjust customer balance
      await CustomerRepository.adjustCustomerDue(customerId, -amountVal);

      setSuccessMsg(`Recorded payment of ${formatCurrency(amountVal)} successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(`Failed to record payment: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeleteDialog = (credit: Credit) => {
    setSelectedCredit(credit);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCredit = async () => {
    if (!selectedCredit) return;
    setDeleteDialogOpen(false);
    setActionLoading(true);
    try {
      const outstanding = selectedCredit.status === 'outstanding' 
        ? selectedCredit.amount - selectedCredit.paidAmount 
        : 0;

      // 1. Delete Credit
      await CreditRepository.deleteCredit(selectedCredit.id);

      // 2. Settle customer balance
      if (outstanding > 0) {
        await CustomerRepository.adjustCustomerDue(customerId, -outstanding);
      }

      setSuccessMsg('Credit deleted successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(`Failed to delete credit: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Export functions
  const exportCSV = () => {
    if (!customer) return;
    
    let csvContent = 'Date,Items,Amount,Paid Amount,Status,Running Balance,Notes\n';
    
    // Process chronologically for exports
    const sorted = [...rawCredits].sort((a, b) => 
      toJSDate(b.purchaseDate).getTime() - toJSDate(a.purchaseDate).getTime()
    );

    sorted.forEach((c) => {
      const date = formatDateTime(c.purchaseDate).replace(',', '');
      const items = c.items.replace(/"/g, '""');
      const notes = (c.notes || '').replace(/"/g, '""');
      const runningBal = runningBalances[c.id] || 0;
      csvContent += `"${date}","${items}",${c.amount},${c.paidAmount},"${c.status}",${runningBal},"${notes}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ledger_${customer.name}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (!customer) return;

    const doc = new jsPDF();
    const nowStr = formatDateTime(new Date());

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Fresh & Fish - Customer Credit Ledger', 14, 20);

    // Metadata
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Customer Name: ${customer.name}`, 14, 30);
    doc.text(`Phone Number: ${customer.phone || 'N/A'}`, 14, 35);
    doc.text(`Total Outstanding: Rs. ${totalOutstanding.toFixed(2)}`, 14, 40);
    doc.text(`Report Generated At: ${nowStr}`, 14, 45);

    // Credits data
    const tableBody = [...rawCredits]
      .sort((a, b) => toJSDate(b.purchaseDate).getTime() - toJSDate(a.purchaseDate).getTime())
      .map((c) => [
        formatDate(c.purchaseDate),
        c.items,
        `Rs. ${c.amount.toFixed(2)}`,
        `Rs. ${c.paidAmount.toFixed(2)}`,
        `Rs. ${(c.amount - c.paidAmount).toFixed(2)}`,
        c.status.toUpperCase(),
        `Rs. ${(runningBalances[c.id] || 0).toFixed(2)}`
      ]);

    (doc as any).autoTable({
      startY: 52,
      head: [['Date', 'Items Description', 'Amount', 'Paid', 'Outstanding', 'Status', 'Running Balance']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [26, 54, 93], fontStyle: 'bold' },
      styles: { fontSize: 8.5 }
    });

    doc.save(`ledger_${customer.name}_${Date.now()}.pdf`);
  };

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link underline="hover" color="inherit" href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
            Home
          </Link>
          <Typography color="text.primary">Ledger</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => router.back()} sx={{ bgcolor: 'background.paper' }}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
              {customer?.name || 'Customer Ledger'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {customer?.phone ? `Contact: ${customer.phone}` : 'No Phone Number Registered'}
            </Typography>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{successMsg}</Alert>}

        {/* Summary Widgets */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ opacity: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>
                  Total Credited
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, mt: 1 }}>
                  {formatCurrency(totalCredits)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ bgcolor: 'success.main', color: 'white', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ opacity: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>
                  Total Collected
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, mt: 1 }}>
                  {formatCurrency(totalPaid)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ bgcolor: 'error.main', color: 'white', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ opacity: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>
                  Total Outstanding
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, mt: 1 }}>
                  {formatCurrency(totalOutstanding)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Toolbar & Filters */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyBetween: 'space-between', gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexGrow: 1, gap: 2 }}>
            <TextField
              placeholder="Search items desc or date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
            />
            <TextField
              select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              sx={{ width: 160, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
            >
              <MenuItem value="All">All Status</MenuItem>
              <MenuItem value="Outstanding">Outstanding</MenuItem>
              <MenuItem value="Received">Received</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={exportCSV}
              sx={{ borderRadius: 3, bgcolor: 'background.paper' }}
            >
              CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={exportPDF}
              sx={{ borderRadius: 3, bgcolor: 'background.paper' }}
            >
              PDF
            </Button>
            <Button
              variant="contained"
              startIcon={<AddCreditIcon />}
              onClick={() => router.push(`/credits/new?name=${encodeURIComponent(customer?.name || '')}`)}
              sx={{ borderRadius: 3 }}
            >
              New Credit
            </Button>
          </Box>
        </Box>

        {/* Ledger Table */}
        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Items Description</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Outstanding</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Running Balance</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : credits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No credit history recorded.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                credits.map((credit) => {
                  const outstanding = credit.amount - credit.paidAmount;
                  const isReceived = credit.status === 'received';
                  return (
                    <TableRow key={credit.id} hover>
                      <TableCell sx={{ minWidth: 110 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(credit.purchaseDate)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(credit.purchaseDate).split(' ')[1]}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {credit.items}
                        </Typography>
                        {credit.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Note: {credit.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(credit.amount)}
                      </TableCell>
                      <TableCell align="right" color="success.main">
                        {formatCurrency(credit.paidAmount)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: outstanding > 0 ? 'error.main' : 'text.primary', fontWeight: 600 }}>
                        {formatCurrency(outstanding)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={credit.status.toUpperCase()}
                          size="small"
                          color={isReceived ? 'success' : 'error'}
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(runningBalances[credit.id] || 0)}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          {outstanding > 0 && (
                            <>
                              <Tooltip title="Quick Full Settlement">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleMarkAsReceived(credit)}
                                  disabled={actionLoading}
                                >
                                  <ReceivedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Record Payment">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpenPaymentDialog(credit)}
                                  disabled={actionLoading}
                                >
                                  <PayIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {isOwner && (
                            <>
                              <Tooltip title="Edit Credit">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => router.push(`/credits/${credit.id}/edit`)}
                                  disabled={actionLoading}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Record">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleOpenDeleteDialog(credit)}
                                  disabled={actionLoading}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Record Payment Dialog */}
        <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
          <DialogTitle>Record Payment Collection</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Enter the payment amount collected for <b>{selectedCredit?.items}</b>.
              Max outstanding is <b>{selectedCredit ? formatCurrency(selectedCredit.amount - selectedCredit.paidAmount) : 'Rs. 0'}</b>.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="Collection Amount"
              type="number"
              fullWidth
              variant="outlined"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} variant="contained" color="primary">
              Record Collection
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Credit Entry?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to permanently delete this credit entry of <b>{selectedCredit ? formatCurrency(selectedCredit.amount) : 'Rs. 0'}</b> for items: <b>{selectedCredit?.items}</b>?
              This action will automatically adjust the customer's outstanding balance.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteCredit} variant="contained" color="error">
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
