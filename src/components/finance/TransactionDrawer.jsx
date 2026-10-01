import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Divider, Drawer, Grid, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { Close, Refresh } from "@mui/icons-material";
import { fetchFinanceTransactionDetails } from "../../services/financeService";
import { fmtCurrency, fmtDateTime, getBookingDisplayId, naFallback, TXN_LABELS } from "../../utils/financeHelpers";
import FinanceStatusBadge from "./FinanceStatusBadge";
import FinanceDetailItem from "./FinanceDetailItem";

const SectionPaper = ({ title, icon, action, children }) => (
  <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", border: "1px solid #f1f5f9", mb: 2.5 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        {icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Stack>
      {action}
    </Stack>
    <Divider sx={{ mb: 1.5 }} />
    {children}
  </Paper>
);

// Right-side drawer for a single transaction, in the DetailItem-section style
// established by PaymentDetailsDrawer.jsx. Every field defensively falls back
// through FinanceDetailItem's "N/A" handling — refund/gateway fields are
// legitimately null for most transactions and must never render blank.
const TransactionDrawer = ({ open, transactionId, fallbackData, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!transactionId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchFinanceTransactionDetails(transactionId);
      const source = fallbackData?.source || {};
      const populatedBooking =
        (typeof res?.booking_id === "object" && res.booking_id) ||
        (typeof source?.booking_id === "object" && source.booking_id) ||
        {};

      // The detail endpoint currently returns a compact transaction for some
      // cash settlements. Retain the enriched values already returned by the
      // list endpoint so opening the drawer does not replace them with N/A.
      setData({
        ...source,
        ...fallbackData,
        ...res,
        booking: { ...populatedBooking, ...(source.booking || {}), ...(res?.booking || {}) },
        dealer: { ...(source.dealer || {}), ...(res?.dealer || {}) },
        customer: { ...(source.customer || {}), ...(res?.customer || {}) },
      });
    } catch (e) {
      setError(e?.message || "Failed to load transaction details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && transactionId) {
      setData(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transactionId, fallbackData]);

  const booking = data?.booking || {};
  const dealer = data?.dealer || {};
  const customer = data?.customer || data?.user || {};
  const gateway = data?.gatewayResponse || data?.gateway_response || {};
  const refund = data?.refund || data?.refundDetails || null;

  const timelineEvents = data
    ? [
        { label: "Created", value: data.createdAt },
        { label: "Payment Confirmed", value: data.paidAt || data.payment_confirmed_at },
        { label: "Settled", value: data.settledAt },
        { label: "Refunded", value: refund?.refundedAt },
        { label: "Last Updated", value: data.updatedAt },
      ].filter((e) => e.value)
    : [];

  const type = data?.type || data?.transactionType;
  const isDeposit = (data?.transactionType || data?.transaction_type || type || "").toLowerCase() === "deposit";
  const breakdown = data?.amountBreakdown || {};

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 480 }, display: "flex", flexDirection: "column" } }}>
      <Box sx={{ height: 4, bgcolor: "#2563eb", flexShrink: 0 }} />
      <Box sx={{ p: 2.5, borderBottom: "1px solid #f1f5f9", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700 }}>TRANSACTION DETAILS</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }} noWrap>
            {TXN_LABELS[type] || type || `#${transactionId}`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close transaction drawer">
          <Close />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography sx={{ color: "#ef4444", mb: 2 }}>{error}</Typography>
            <Tooltip title="Retry">
              <IconButton onClick={load} sx={{ bgcolor: "white", border: "1px solid #f1f5f9" }}>
                <Refresh sx={{ fontSize: 18, color: "#64748b" }} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : !data ? (
          <Typography variant="body2" sx={{ color: "#94a3b8", textAlign: "center", py: 6 }}>
            No transaction data available.
          </Typography>
        ) : (
          <>
            <SectionPaper title="Payment Status" action={<FinanceStatusBadge status={data.status} />}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FinanceDetailItem label="Transaction ID" value={data.transactionId || data._id} copyable />
                </Grid>
                <Grid item xs={6}>
                  <FinanceDetailItem label="Transaction Type" value={TXN_LABELS[type] || type} />
                </Grid>
                <Grid item xs={6}>
                  <FinanceDetailItem label="Payment Method" value={data.paymentMethod || data.payment_method} />
                </Grid>
                <Grid item xs={6}>
                  <FinanceDetailItem label="Created Date" value={fmtDateTime(data.createdAt)} />
                </Grid>
              </Grid>
            </SectionPaper>

            <SectionPaper title="Booking Details">
              <FinanceDetailItem label="Booking ID" value={getBookingDisplayId(data)} copyable />
              <FinanceDetailItem label="Service" value={booking.serviceName || booking.service} />
            </SectionPaper>

            <SectionPaper title="Dealer Details">
              <FinanceDetailItem label="Dealer Name" value={dealer.name || dealer.shopName || data.dealerName} />
              <FinanceDetailItem label="Shop Name" value={dealer.shopName} />
              <FinanceDetailItem label="Phone" value={dealer.phone} />
            </SectionPaper>

            <SectionPaper title="Customer Details">
              <FinanceDetailItem label="Name" value={customer.name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || data.customerName} />
              <FinanceDetailItem label="Phone" value={customer.phone} />
              <FinanceDetailItem label="Email" value={customer.email} copyable />
            </SectionPaper>

            <SectionPaper title="Amount Breakdown">
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FinanceDetailItem label="Amount" value={fmtCurrency(data.amount)} />
                </Grid>
                <Grid item xs={6}>
                  <FinanceDetailItem label="Commission" value={data.commission != null ? fmtCurrency(data.commission) : null} />
                </Grid>
                <Grid item xs={6}>
                  <FinanceDetailItem label="Tax" value={data.tax != null ? fmtCurrency(data.tax) : null} />
                </Grid>
                <Grid item xs={6}>
                  <FinanceDetailItem label="Net Payable" value={data.netAmount != null ? fmtCurrency(data.netAmount) : null} />
                </Grid>
              </Grid>
            </SectionPaper>

            {isDeposit && (
              <SectionPaper title="Deposit Details">
                <FinanceDetailItem label="Reference" value={data.orderId || data.reference} copyable />
                <FinanceDetailItem label="Balance Before" value={breakdown.preBalance != null ? fmtCurrency(breakdown.preBalance) : null} />
                <FinanceDetailItem label="Balance After" value={breakdown.postBalance != null ? fmtCurrency(breakdown.postBalance) : null} />
                <FinanceDetailItem label="Reason" value={data.note || data.reason} />
              </SectionPaper>
            )}

            <SectionPaper title="Gateway Response">
              <FinanceDetailItem label="Gateway Order ID" value={(gateway.cf_payment_id || gateway.paymentId || gateway.transaction_id) ? (gateway.orderId || gateway.cf_order_id || data.orderId) : null} copyable />
              <FinanceDetailItem label="Gateway Payment ID" value={gateway.paymentId || gateway.cf_payment_id || gateway.transaction_id} copyable />
              <FinanceDetailItem label="Gateway Status" value={gateway.status || gateway.txStatus} />
              <FinanceDetailItem label="Gateway Message" value={gateway.message} />
            </SectionPaper>

            <SectionPaper title="Refund Status" action={<FinanceStatusBadge status={refund?.status || "N/A"} />}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FinanceDetailItem label="Refund Amount" value={refund?.amount != null ? fmtCurrency(refund.amount) : null} />
                </Grid>
                <Grid item xs={6}>
                  <FinanceDetailItem label="Refund Date" value={refund?.refundedAt ? fmtDateTime(refund.refundedAt) : null} />
                </Grid>
                <Grid item xs={12}>
                  <FinanceDetailItem label="Refund Reason" value={refund?.reason} />
                </Grid>
              </Grid>
            </SectionPaper>

            <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", border: "1px solid #f1f5f9" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Timeline</Typography>
              <Divider sx={{ mb: 1.5 }} />
              {timelineEvents.length === 0 ? (
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>{naFallback(null)}</Typography>
              ) : (
                <Stack spacing={1.25}>
                  {timelineEvents.map((e) => (
                    <Stack key={e.label} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ color: "#374151", fontWeight: 500 }}>{e.label}</Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>{fmtDateTime(e.value)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default TransactionDrawer;
