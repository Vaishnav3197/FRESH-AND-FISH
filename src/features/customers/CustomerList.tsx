'use client';

import React, { useState } from 'react';
import { Customer } from '../../types';
import { formatCurrency } from '../../utils/currency';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  IconButton,
  Grid,
  Avatar,
  Tooltip,
  InputAdornment,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Search as SearchIcon,
  ChevronRight as ArrowIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MergeType as MergeIcon
} from '@mui/icons-material';

interface CustomerListProps {
  customers: Customer[];
  onCustomerClick: (customerId: string) => void;
  onEditClick?: (customer: Customer) => void;
  onDeleteClick?: (customer: Customer) => void;
  onMergeClick?: (customer: Customer) => void;
  isOwner: boolean;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onCustomerClick,
  onEditClick,
  onDeleteClick,
  onMergeClick,
  isOwner,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [search, setSearch] = useState('');

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    (customer.phone && customer.phone.includes(search))
  );

  return (
    <Box>
      {/* Search Input */}
      <TextField
        fullWidth
        placeholder="Search customers by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }
        }}
        sx={{
          mb: 3,
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            bgcolor: 'background.paper',
          },
        }}
      />

      {filteredCustomers.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">No customers found.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredCustomers.map((customer) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={customer.customerId}>
              <Card
                sx={{
                  cursor: 'pointer',
                  position: 'relative',
                  borderLeft: customer.totalDue > 0 ? '4px solid' : '1px solid',
                  borderLeftColor: customer.totalDue > 0 ? 'primary.main' : 'divider',
                  '&:hover': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                  }
                }}
                onClick={() => onCustomerClick(customer.customerId)}
              >
                <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, p: '16px !important' }}>
                  {/* Customer Info row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
                    {/* Avatar */}
                    <Avatar
                      sx={{
                        bgcolor: customer.totalDue > 0 ? 'primary.main' : 'secondary.main',
                        color: customer.totalDue > 0 ? 'primary.contrastText' : 'white',
                        fontWeight: 700,
                        mr: 2,
                      }}
                    >
                      {customer.name.charAt(0).toUpperCase()}
                    </Avatar>

                    {/* Customer details */}
                    <Box sx={{ flexGrow: 1, minWidth: 0, mr: 1 }}>
                      <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                        {customer.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {customer.phone || 'No phone'}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          mt: 0.5,
                          color: customer.totalDue > 0 ? 'error.main' : 'success.main',
                        }}
                      >
                        {customer.totalDue > 0
                          ? `Balance: ${formatCurrency(customer.totalDue)}`
                          : 'No Outstanding'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Added by: {customer.addedBy || 'System'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Actions buttons */}
                  <Box
                    sx={{ display: 'flex', gap: 1, mt: { xs: 1.5, sm: 0 }, justifyContent: { xs: 'flex-end', sm: 'center' }, borderTop: { xs: '1px solid', sm: 'none' }, borderColor: 'divider', pt: { xs: 1, sm: 0 } }}
                    onClick={(e) => e.stopPropagation()} // Prevent card navigation click
                  >
                    {isOwner && onMergeClick && (
                      <Tooltip title="Merge Customer">
                        <IconButton
                          size="medium"
                          color="secondary"
                          onClick={() => onMergeClick(customer)}
                          sx={{ p: 1 }}
                        >
                          <MergeIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {isOwner && onEditClick && (
                      <Tooltip title="Edit Profile">
                        <IconButton
                          size="medium"
                          color="primary"
                          onClick={() => onEditClick(customer)}
                          sx={{ p: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {isOwner && onDeleteClick && (
                      <Tooltip title="Delete Profile">
                        <IconButton
                          size="medium"
                          color="error"
                          onClick={() => onDeleteClick(customer)}
                          sx={{ p: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <IconButton size="medium" disabled sx={{ color: 'text.secondary', p: 1 }}>
                      <ArrowIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
export default CustomerList;
