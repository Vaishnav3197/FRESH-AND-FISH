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
  endOfThisMonth
} from '../../utils/date';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Download as ExportIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CATEGORIES = [
  'Ice',
  'Fuel',
  'Transport',
  'Electricity',
  'Salary',
  'Packaging',
  'Miscellaneous'
];

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [reportType, setReportType] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Custom' | 'Category'>('Daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [customFromDate, setCustomFromDate] = useState(formatDate(startOfToday()));
  const [customToDate, setCustomToDate] = useState(formatDate(endOfToday()));
  const [selectedCategory, setSelectedCategory] = useState('Ice');

  useEffect(() => {
    // Load expenses
    const unsubscribe = ExpenseRepository.getExpenses(
      (list) => {
        setAllExpenses(list);
        setLoading(false);
      },
      (err) => {
        setError(`Failed to load expenses: ${err.message}`);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filter logic (exactly replicating ReportsViewModel.kt lines 53-88)
  useEffect(() => {
    let filtered: Expense[] = [];
    const dateObj = new Date(selectedDate);
    // Adjust timezone offsets
    const offsetMs = dateObj.getTimezoneOffset() * 60 * 1000;
    const resolvedDate = new Date(dateObj.getTime() + offsetMs);

    if (reportType === 'Daily') {
      const start = new Date(resolvedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(resolvedDate);
      end.setHours(23, 59, 59, 999);

      filtered = allExpenses.filter((e) => {
        const d = toJSDate(e.date);
        return d >= start && d <= end;
      });
    } else if (reportType === 'Weekly') {
      // Find start of week of selected date (Monday)
      const day = resolvedDate.getDay();
      const diff = resolvedDate.getDate() - day + (day === 0 ? -6 : 1);
      
      const start = new Date(resolvedDate.setDate(diff));
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      filtered = allExpenses.filter((e) => {
        const d = toJSDate(e.date);
        return d >= start && d <= end;
      });
    } else if (reportType === 'Monthly') {
      const start = new Date(resolvedDate.getFullYear(), resolvedDate.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(resolvedDate.getFullYear(), resolvedDate.getMonth() + 1, 0, 23, 59, 59, 999);

      filtered = allExpenses.filter((e) => {
        const d = toJSDate(e.date);
        return d >= start && d <= end;
      });
    } else if (reportType === 'Custom') {
      const partsFrom = customFromDate.split('/');
      const partsTo = customToDate.split('/');
      if (partsFrom.length === 3 && partsTo.length === 3) {
        const start = new Date(+partsFrom[2], +partsFrom[1] - 1, +partsFrom[0], 0, 0, 0);
        const end = new Date(+partsTo[2], +partsTo[1] - 1, +partsTo[0], 23, 59, 59, 999);
        filtered = allExpenses.filter((e) => {
          const d = toJSDate(e.date);
          return d >= start && d <= end;
        });
      }
    } else if (reportType === 'Category') {
      filtered = allExpenses.filter((e) => e.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    setFilteredExpenses(filtered);

    // Re-calculate category breakdowns
    const totals: Record<string, number> = {};
    filtered.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    setCategoryTotals(totals);
  }, [allExpenses, reportType, selectedDate, customFromDate, customToDate, selectedCategory]);

  const totalFiltered = filteredExpenses.sumOf((e) => e.amount);

  // Get active date range label for headers
  const getFilterRangeLabel = (): string => {
    if (reportType === 'Daily') return `Daily: ${formatDate(selectedDate)}`;
    if (reportType === 'Weekly') {
      const dateObj = new Date(selectedDate);
      const day = dateObj.getDay();
      const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(dateObj.setDate(diff));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `Weekly: ${formatDate(start)} to ${formatDate(end)}`;
    }
    if (reportType === 'Monthly') {
      const dateObj = new Date(selectedDate);
      const monthLabel = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      return `Monthly: ${monthLabel}`;
    }
    if (reportType === 'Custom') return `Custom: ${customFromDate} to ${customToDate}`;
    return `Category: ${selectedCategory}`;
  };

  // Export functions (reproducing iText layouts in jsPDF)
  const exportPDF = () => {
    const doc = new jsPDF();
    const dateRangeStr = getFilterRangeLabel();

    // Title
    doc.setFont('courier', 'bold');
    doc.setFontSize(22);
    doc.text('Fresh & Fish', 105, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text('Expense Report', 105, 28, { align: 'center' });

    // Metadata
    doc.setFont('courier', 'normal');
    doc.setFontSize(11);
    doc.text(`Selected Date Range: ${dateRangeStr}`, 14, 40);
    doc.setFont('courier', 'bold');
    doc.text(`Total Expenses: Rs. ${totalFiltered.toFixed(2)}`, 14, 46);
    doc.setFont('courier', 'normal');
    doc.text(`Number of Entries: ${filteredExpenses.length}`, 14, 52);
    doc.text(`Generated At: ${formatDateTime(new Date())}`, 14, 58);

    // Expenses Table
    const tableBody = [...filteredExpenses]
      .sort((a, b) => toJSDate(b.date).getTime() - toJSDate(a.date).getTime())
      .map((e) => [
        formatDate(e.date),
        e.title,
        e.category,
        `Rs. ${e.amount.toFixed(2)}`,
        e.notes || '-'
      ]);

    (doc as any).autoTable({
      startY: 65,
      head: [['Date', 'Expense Title', 'Category', 'Amount', 'Notes']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' },
      styles: { font: 'courier', fontSize: 9 }
    });

    // Category summary breakdown (Matches lines 378-393 in ExportUtil.kt)
    const nextY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.text('Category-wise Summary:', 14, nextY);

    const summaryBody = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => [cat, `Rs. ${total.toFixed(2)}`]);

    (doc as any).autoTable({
      startY: nextY + 4,
      head: [['Category', 'Total Amount']],
      body: summaryBody,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
      styles: { font: 'courier', fontSize: 9 },
      margin: { right: 100 } // Render left-aligned taking up half width
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.text(`Final Total: Rs. ${totalFiltered.toFixed(2)}`, 14, finalY);

    doc.save(`expense_report_${Date.now()}.pdf`);
  };

  const exportCSV = () => {
    let csvContent = 'Date,Title,Category,Amount,Notes\n';
    
    const sorted = [...filteredExpenses].sort((a, b) => 
      toJSDate(b.date).getTime() - toJSDate(a.date).getTime()
    );

    sorted.forEach((e) => {
      const date = formatDate(e.date);
      const title = e.title.replace(/"/g, '""');
      const category = e.category.replace(/"/g, '""');
      const notes = (e.notes || '').replace(/"/g, '""');
      csvContent += `"${date}","${title}","${category}",${e.amount},"${notes}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout allowedRoles={['owner']}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link underline="hover" color="inherit" href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
            Dashboard
          </Link>
          <Typography color="text.primary">Expense Reports</Typography>
        </Breadcrumbs>

        {/* Header Title bar */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyBetween: 'space-between', alignItems: { sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
              Expense Reports
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Review breakdowns, categories summaries, and download reports.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={exportCSV}
              sx={{ borderRadius: 3, bgcolor: 'background.paper' }}
              disabled={filteredExpenses.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<ExportIcon />}
              onClick={exportPDF}
              sx={{ borderRadius: 3 }}
              disabled={filteredExpenses.length === 0}
            >
              Download PDF
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        {/* Filter Selection Panel */}
        <Paper sx={{ p: 3, borderRadius: 4, mb: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <Grid container spacing={3} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Report Type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              >
                <MenuItem value="Daily">Daily Report</MenuItem>
                <MenuItem value="Weekly">Weekly Report</MenuItem>
                <MenuItem value="Monthly">Monthly Report</MenuItem>
                <MenuItem value="Custom">Custom Date Range</MenuItem>
                <MenuItem value="Category">Category Wise</MenuItem>
              </TextField>
            </Grid>

            {/* Sub fields based on selected report type */}
            {['Daily', 'Weekly', 'Monthly'].includes(reportType) && (
              <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                <TextField
                  fullWidth
                  label={reportType === 'Monthly' ? 'Select Month' : 'Select Date'}
                  type={reportType === 'Monthly' ? 'month' : 'date'}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                />
              </Grid>
            )}

            {reportType === 'Custom' && (
              <>
                <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                  <TextField
                    fullWidth
                    label="From Date (DD/MM/YYYY)"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    placeholder="11/08/2026"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                  <TextField
                    fullWidth
                    label="To Date (DD/MM/YYYY)"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    placeholder="11/08/2026"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                </Grid>
              </>
            )}

            {reportType === 'Category' && (
              <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Category Name"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Report Results */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <Grid container spacing={4}>
            {/* Summary statistics */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Report Statistics</Typography>
                  
                  <Typography variant="body2" color="text.secondary">Filtered Timeframe</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{getFilterRangeLabel()}</Typography>

                  <Typography variant="body2" color="text.secondary">Total Expenditures</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'warning.main', mb: 2 }}>{formatCurrency(totalFiltered)}</Typography>

                  <Typography variant="body2" color="text.secondary">Number of Entries</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{filteredExpenses.length} logs</Typography>
                </CardContent>
              </Card>

              {/* Category Breakdown Table */}
              <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Category Breakdowns</Typography>
                  <TableContainer component={Box} sx={{ border: 'none' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ pl: 0 }}>Category</TableCell>
                          <TableCell align="right" sx={{ pr: 0 }}>Total Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(categoryTotals).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} sx={{ py: 2, pl: 0 }} color="text.secondary">No category totals.</TableCell>
                          </TableRow>
                        ) : (
                          Object.entries(categoryTotals)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, total]) => (
                              <TableRow key={cat}>
                                <TableCell sx={{ pl: 0, py: 1.5, fontWeight: 600 }}>{cat}</TableCell>
                                <TableCell align="right" sx={{ pr: 0, py: 1.5, fontWeight: 700 }}>{formatCurrency(total)}</TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Expense logs list */}
            <Grid size={{ xs: 12, md: 8 }}>
              <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Expense Title</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                          <Typography color="text.secondary">No expenditures found within this filter range.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses.map((expense) => (
                        <TableRow key={expense.expenseId} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{formatDate(expense.date)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {expense.title}
                            {expense.notes && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {expense.notes}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={expense.category}
                              size="small"
                              variant="outlined"
                              color="secondary"
                              sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: 'warning.main' }}>
                            {formatCurrency(expense.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        )}
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
