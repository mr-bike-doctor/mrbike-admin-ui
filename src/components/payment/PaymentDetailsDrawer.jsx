import React from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Stack,
  Chip,
  Paper,
  Grid,
} from "@mui/material";
import { Close, ContentCopy, Person, Receipt, Payment as PaymentIcon, Info } from "@mui/icons-material";
import {
  getPartyEmail,
  getPartyName,
  getPartyPhone,
  getReferenceId,
  isWalletTopup,
} from "../../utils/paymentDisplay";

const DetailItem = ({ label, value, copyable = false }) => (
  <Box mb={2}>
    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
      {label}
    </Typography>
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Typography variant="body2" fontWeight={500} sx={{ wordBreak: "break-all", flex: 1 }}>
        {value || "N/A"}
      </Typography>
      {copyable && value && (
        <IconButton size="small" onClick={() => navigator.clipboard.writeText(value)} sx={{ mt: -0.5 }}>
          <ContentCopy sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Stack>
  </Box>
);

const PaymentDetailsDrawer = ({ open, onClose, payment }) => {
  if (!payment) return null;
  const walletTopup = isWalletTopup(payment);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 450 }, height: "100%", bgcolor: "#f8fafc" }}>
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: "white", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={700}>Payment Details</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ p: 3, overflowY: "auto", height: "calc(100% - 65px)" }}>
          {/* Status Section */}
          <Paper sx={{ p: 2, borderRadius: "12px", mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle2" fontWeight={700}>Transaction Status</Typography>
              <Chip 
                label={payment.order_status} 
                color={payment.order_status === 'SUCCESS' ? 'success' : 'warning'} 
                size="small" 
                sx={{ fontWeight: 700, borderRadius: "6px" }}
              />
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <DetailItem label="Amount" value={`₹${payment.orderAmount?.toLocaleString('en-IN')}`} />
              </Grid>
              <Grid item xs={6}>
                <DetailItem label="Currency" value={payment.order_currency} />
              </Grid>
            </Grid>
          </Paper>

          {/* Customer/dealer info */}
          <Paper sx={{ p: 2, borderRadius: "12px", mb: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <Person color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>
                {walletTopup ? "Dealer Information" : "Customer Information"}
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <DetailItem label={walletTopup ? "Dealer" : "Name"} value={getPartyName(payment)} />
            <DetailItem label="Email" value={getPartyEmail(payment)} copyable />
            <DetailItem label="Phone" value={getPartyPhone(payment)} />
            {walletTopup && <DetailItem label="Dealer ID" value={getReferenceId(payment)} copyable />}
          </Paper>

          {/* Payment Identifiers */}
          <Paper sx={{ p: 2, borderRadius: "12px", mb: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <Receipt color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>Identifiers</Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <DetailItem label="Order ID" value={payment.orderId} copyable />
            <DetailItem label="Transaction ID" value={payment.transaction_id} copyable />
            {payment.cf_order_id && <DetailItem label="Legacy Gateway Order ID" value={payment.cf_order_id} copyable />}
            {!walletTopup && <DetailItem label="Booking ID" value={getReferenceId(payment)} copyable />}
          </Paper>

          {/* Payment Method Details */}
          <Paper sx={{ p: 2, borderRadius: "12px", mb: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <PaymentIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>Payment Method</Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <DetailItem label="Method" value={payment.payment_method} />
            <DetailItem label="Type" value={payment.payment_type || payment.type} />
            <DetailItem label="Payment By" value={payment.payment_by} />
            {walletTopup && (
              <DetailItem
                label="Wallet Finalization"
                value={payment.wallet_credit_state || (payment.wallet_credited_at ? "CREDITED" : "PENDING")}
              />
            )}
          </Paper>

          {/* Timestamps */}
          <Paper sx={{ p: 2, borderRadius: "12px", mb: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <Info color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>Dates & Times</Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <DetailItem label="Initiated At" value={new Date(payment.createdAt).toLocaleString()} />
            <DetailItem label="Last Updated" value={new Date(payment.updatedAt).toLocaleString()} />
          </Paper>
        </Box>
      </Box>
    </Drawer>
  );
};

export default PaymentDetailsDrawer;
