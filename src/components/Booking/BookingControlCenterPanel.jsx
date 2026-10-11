import React, { useCallback, useEffect, useRef, useState } from "react";
import GoogleMapReact from "google-map-react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  addAdminTicketReply,
  assignAdminBookingSupportCase,
  cancelAdminBookingForSupport,
  createAdminBookingSupportCase,
  getAdminBookingAuditHistory,
  getAdminBookingControlCenter,
  getAdminBookingFinancialOverview,
  getAdminBookingSupportAssignees,
  getAdminBookingTracking,
  getTicketById,
  reassignAdminBookingProvider,
  searchAdminBookingProviders,
  updateAdminTicketStatus,
} from "../../api";
import { getGoogleMapsApiKey } from "../../utils/googleMaps";

const Marker = ({ label, color }) => (
  <Box title={label} sx={{ width: 22, height: 22, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", bgcolor: color, border: "2px solid white", boxShadow: 2 }} />
);

const PanelSection = ({ title, children, action }) => (
  <Paper variant="outlined" sx={{ p: 2, height: "100%", borderRadius: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
      <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>{action}
    </Stack>
    {children}
  </Paper>
);

const fmtMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const coordsValid = (point) => point?.latitude != null && point?.longitude != null && point.latitude !== "" && point.longitude !== "" && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude));

export default function BookingControlCenterPanel({ booking, onRefresh }) {
  const bookingId = booking?._id;
  const [permissions, setPermissions] = useState({});
  const [overview, setOverview] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [reason, setReason] = useState("");
  const [providerQuery, setProviderQuery] = useState("");
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [caseSubject, setCaseSubject] = useState("");
  const [caseMessage, setCaseMessage] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [note, setNote] = useState("");
  const [assignees, setAssignees] = useState([]);
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    if (!bookingId) return;
    const sequence = ++loadSequence.current;
    setLoading(true);
    setActionError("");
    try {
      const main = await getAdminBookingControlCenter(bookingId);
      if (sequence !== loadSequence.current) return;
      const data = main?.data || null;
      setOverview(data);
      const grants = data?.permissions || {};
      setPermissions(grants);
      const keys = [];
      if (grants.finance) keys.push(["financial", getAdminBookingFinancialOverview(bookingId)]);
      if (grants.tracking) keys.push(["tracking", getAdminBookingTracking(bookingId)]);
      if (grants.audit) keys.push(["audit", getAdminBookingAuditHistory(bookingId)]);
      const results = await Promise.allSettled(keys.map(([, request]) => request));
      if (sequence !== loadSequence.current) return;
      results.forEach((result, index) => {
        const key = keys[index][0];
        const value = result.status === "fulfilled" ? result.value?.data : null;
        if (key === "financial") setFinancial(value);
        if (key === "tracking") setTracking(value);
        if (key === "audit") setAudit(value || []);
      });
    } catch (error) {
      if (sequence === loadSequence.current) setActionError(error?.message || "Could not load booking support information.");
    } finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setReason(""); setProviders([]); setSelectedProvider(""); setSelectedCase(null); setCaseDetail(null); setPermissions({}); setOverview(null); setFinancial(null); setTracking(null); setAudit([]);
  }, [bookingId]);
  useEffect(() => {
    if (!permissions.complaints) return;
    getAdminBookingSupportAssignees().then((res) => setAssignees(res?.data || [])).catch(() => setAssignees([]));
  }, [permissions.complaints]);

  const runAction = async (action, after = load) => {
    setActionError("");
    try { await action(); await after?.(); await onRefresh?.(); }
    catch (error) { setActionError(error?.message || "Action failed. Refresh and retry."); }
  };

  const searchProviders = () => runAction(async () => {
    const response = await searchAdminBookingProviders(bookingId, providerQuery);
    setProviders(response?.data || []);
    setSelectedProvider("");
    if (!response?.success) throw new Error(response?.message || "Replacement availability could not be confirmed.");
  }, null);

  const reassign = () => {
    if (!reason.trim() || reason.trim().length < 5 || !selectedProvider) return;
    const candidate = providers.find((p) => p._id === selectedProvider);
    const current = overview?.assignment?.current?.name || "Current provider";
    if (!window.confirm(`Reassign ${booking?.bookingId || "this booking"} from ${current} to ${candidate?.name || "the selected garage"}? The reason will be recorded in the audit history.`)) return;
    runAction(() => reassignAdminBookingProvider(bookingId, { providerId: selectedProvider, reason: reason.trim(), expectedUpdatedAt: overview?.booking?.updatedAt }));
  };

  const cancel = () => {
    if (!reason.trim() || reason.trim().length < 5 || !overview?.cancellation?.allowed) return;
    if (!window.confirm("Cancel this pre-handoff booking? Payment, invoice, refund, and wallet records will not be changed.")) return;
    runAction(() => cancelAdminBookingForSupport(bookingId, reason.trim(), overview?.booking?.updatedAt));
  };

  const createCase = (paymentDispute = false) => runAction(async () => {
    const subject = paymentDispute ? "Payment dispute" : caseSubject.trim();
    const message = caseMessage.trim();
    if (!subject || !message) throw new Error("Add a case title and internal case details first.");
    await createAdminBookingSupportCase(bookingId, { subject, message, issueType: paymentDispute ? "PAYMENT_REFUND" : "OTHER_BOOKING_ISSUE", issueLabel: paymentDispute ? "Payment dispute" : "Admin support case", priority: paymentDispute ? "high" : "normal" });
    setCaseSubject(""); setCaseMessage("");
  });

  const openCase = async (item) => {
    setSelectedCase(item._id);
    try { const result = await getTicketById(item._id); setCaseDetail(result?.data || null); }
    catch (error) { setActionError(error?.message || "Could not open this support case."); }
  };

  const replyInternal = () => runAction(async () => {
    if (!note.trim() || !selectedCase) throw new Error("Select a case and enter an internal note.");
    await addAdminTicketReply(selectedCase, note.trim(), true);
    setNote("");
    await openCase({ _id: selectedCase });
  });

  const refreshCaseStatus = (status) => runAction(async () => {
    await updateAdminTicketStatus(selectedCase, status);
    await openCase({ _id: selectedCase });
  });

  const locations = [
    ["Pickup", tracking?.pickup, "#1565c0"], ["Garage", tracking?.garage, "#6a1b9a"],
    ["Delivery", tracking?.drop, "#ef6c00"], ["Provider GPS", tracking?.providerLocation, "#2e7d32"],
  ].filter(([, point]) => coordsValid(point));
  const firstPoint = locations[0]?.[1];

  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={900}>Booking Control Center</Typography>
        {loading && <CircularProgress size={18} />}
      </Stack>
      {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
      {overview && !Object.values(permissions).some(Boolean) && <Alert severity="info" sx={{ mb: 2 }}>Your role has no configured control-center actions. Backend permissions remain authoritative.</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <PanelSection title="Provider & Garage Assignment">
            <Typography variant="body2">Current: <b>{overview?.assignment?.current?.name || "Not available"}</b>{overview?.assignment?.current?.city ? ` · ${overview.assignment.current.city}` : ""}</Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>Stage: {overview?.assignment?.stage || booking?.status}</Typography>
            {permissions.reassign && <>
              {overview?.assignment?.blockedReason && <Alert severity="info" sx={{ mt: 1 }}>{overview.assignment.blockedReason}</Alert>}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
                <TextField size="small" label="Search active garages" value={providerQuery} onChange={(e) => setProviderQuery(e.target.value)} />
                <Button variant="outlined" onClick={searchProviders} disabled={!overview?.assignment?.reassignAllowed}>Search replacements</Button>
              </Stack>
              {providers.map((provider) => <Paper key={provider._id} variant="outlined" sx={{ p: 1, mt: 1, borderColor: selectedProvider === provider._id ? "primary.main" : undefined }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box><Typography fontWeight={700}>{provider.name}</Typography><Typography variant="caption" display="block">{provider.city || "City not listed"} · {provider.distanceKm} km from booking · service radius {provider.serviceRadiusKm} km · {provider.slotsRemaining} slots remaining</Typography><Typography variant="caption" color="success.main">{provider.serviceCompatibility}</Typography></Box>
                  <Button size="small" onClick={() => setSelectedProvider(provider._id)}>{selectedProvider === provider._id ? "Selected" : "Preview"}</Button>
                </Stack>
              </Paper>)}
              {selectedProvider && <>
                <Alert severity="info" sx={{ mt: 1 }}>Preview: {overview?.assignment?.current?.name || "Current garage"} → {providers.find((p) => p._id === selectedProvider)?.name}. Reassignment will notify the customer and both providers.</Alert>
                <TextField fullWidth size="small" label="Mandatory reassignment reason" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mt: 1 }} />
                <Button sx={{ mt: 1 }} variant="contained" onClick={reassign} disabled={reason.trim().length < 5}>Confirm reassignment</Button>
              </>}
            </>}
          </PanelSection>
        </Grid>

        <Grid item xs={12} md={6}>
          <PanelSection title="Controlled Cancellation">
            {overview?.cancellation?.allowed ? <Alert severity="warning">Eligible before operational handoff. This action does not change payment, invoice, refund, or wallet records.</Alert> : <Alert severity="info">{overview?.cancellation?.blockedReason || "Checking cancellation eligibility…"}</Alert>}
            {permissions.cancel && overview?.cancellation?.allowed && <>
              <TextField fullWidth multiline minRows={2} size="small" label="Mandatory cancellation reason" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mt: 1 }} />
              <Button color="error" variant="contained" sx={{ mt: 1 }} disabled={reason.trim().length < 5} onClick={cancel}>Cancel booking</Button>
            </>}
          </PanelSection>
        </Grid>

        {permissions.finance && <Grid item xs={12}>
          <PanelSection title="Payment & Charge Disputes (Read only)">
            {!financial ? <Typography variant="body2" color="text.secondary">Financial overview is unavailable to this role or could not be loaded.</Typography> : <>
              <Grid container spacing={1}>
                {[ ["Booking total", financial.total], ["Paid", financial.paid], ["Outstanding", financial.outstanding] ].map(([label, amount]) => <Grid item xs={12} sm={4} key={label}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={800}>{fmtMoney(amount)}</Typography></Grid>)}
                <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Payment method / status</Typography><Typography fontWeight={700}>{financial.paymentMethod || "Not selected"} · {financial.paymentStatus || "pending"}</Typography></Grid>
                <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Invoice</Typography><Typography fontWeight={700}>{financial.invoice?.bill_number || "Not generated"} · {financial.billStatus}</Typography></Grid>
                <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Verification</Typography><Typography fontWeight={700}>{financial.paymentVerified ? "Verified" : "Not verified"}</Typography></Grid>
              </Grid>
              {financial.payments?.length > 0 && <Stack spacing={0.5} sx={{ mt: 1 }}>{financial.payments.map((payment, idx) => <Typography key={`${payment.create_date}-${idx}`} variant="caption">{payment.payment_type}: {payment.order_status} · {fmtMoney(payment.verified_amount ?? payment.orderAmount)} · ref …{payment.transactionReference || "—"}{payment.refund_status && payment.refund_status !== "NONE" ? ` · refund ${payment.refund_status}` : ""}</Typography>)}</Stack>}
              {financial.invoice && <><Divider sx={{ my: 1 }} /><Typography variant="caption" fontWeight={800}>INVOICE {financial.invoice.bill_number} · {financial.invoice.bill_date ? new Date(financial.invoice.bill_date).toLocaleDateString() : "date unavailable"}</Typography><Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>{[["Subtotal", financial.invoice.subtotal], ["Pickup", financial.invoice.pickup_charges], ["Drop", financial.invoice.drop_charges], ["Towing", financial.invoice.towing_charge], ["Tax", financial.invoice.tax_amount], ["Discount", financial.invoice.discount_amount], ["Platform fee", financial.invoice.platform_fee]].map(([label, value]) => <Chip key={label} size="small" variant="outlined" label={`${label}: ${fmtMoney(value)}`} />)}</Stack></>}
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>Refunds and payment states cannot be edited here.</Typography>
            </>}
          </PanelSection>
        </Grid>}

        {permissions.tracking && <Grid item xs={12}>
          <PanelSection title="Live Booking Tracking">
            {!tracking ? <Typography variant="body2" color="text.secondary">Live tracking is unavailable or no authorized tracking data was returned.</Typography> : <>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>{locations.map(([label, point, color]) => <Chip key={label} title={`${point.latitude}, ${point.longitude}`} label={`${label}: ${point.address || point.name || `${point.latitude}, ${point.longitude}`}`} size="small" sx={{ borderLeft: `4px solid ${color}` }} />)}</Stack>
              <Typography variant="caption" color="text.secondary" display="block">Stage: {tracking.stage?.bookingStatus} · pickup {tracking.stage?.pickupStatus || "—"} · garage {tracking.stage?.garageTransportStatus || "—"} · delivery {tracking.stage?.deliveryTransportStatus || "—"}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">Last GPS update: {tracking.lastGpsUpdateAt ? new Date(tracking.lastGpsUpdateAt).toLocaleString() : "No current provider GPS update"}</Typography>
              {tracking.gpsState?.stale && <Alert severity="warning" sx={{ mt: 1 }}>Provider GPS is stale. This map shows last known location only; no location history or ETA is inferred.</Alert>}
              {firstPoint && <Box sx={{ height: 280, mt: 1, borderRadius: 2, overflow: "hidden" }}><GoogleMapReact bootstrapURLKeys={{ key: getGoogleMapsApiKey() }} center={{ lat: Number(firstPoint.latitude), lng: Number(firstPoint.longitude) }} defaultZoom={11}>{locations.map(([label, point, color]) => <Marker key={label} lat={Number(point.latitude)} lng={Number(point.longitude)} label={label} color={color} />)}</GoogleMapReact></Box>}
              {!firstPoint && <Alert severity="info" sx={{ mt: 1 }}>No verified booking locations are available to map.</Alert>}
            </>}
          </PanelSection>
        </Grid>}

        {permissions.complaints && <Grid item xs={12} md={7}>
          <PanelSection title="Complaints & Support Cases">
            <Stack spacing={1}>
              {(overview?.complaints || []).map((item) => <Paper key={item._id} variant="outlined" sx={{ p: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Button onClick={() => openCase(item)} sx={{ textTransform: "none", justifyContent: "flex-start", textAlign: "left" }}><Box><Typography fontWeight={700}>{item.subject}</Typography><Typography variant="caption">{item.issue_label || item.issue_type} · {item.priority}</Typography></Box></Button>
                  <Chip label={item.status} size="small" />
                </Stack>
              </Paper>)}
              {(overview?.complaints || []).length === 0 && <Typography variant="body2" color="text.secondary">No booking-linked support cases.</Typography>}
              {selectedCase && caseDetail && <Paper variant="outlined" sx={{ p: 1.5, mt: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography fontWeight={800}>{caseDetail.subject}</Typography><FormControl size="small" sx={{ minWidth: 140 }}><TextField select label="Case status" value={caseDetail.status} onChange={(e) => refreshCaseStatus(e.target.value)} size="small">{["Open", "In Progress", "Resolved", "Closed"].map((status) => <MenuItem value={status} key={status}>{status}</MenuItem>)}</TextField></FormControl></Stack>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={0.5} sx={{ maxHeight: 180, overflow: "auto" }}>{(caseDetail.messages || []).map((entry) => <Typography key={entry._id} variant="caption"><b>{entry.internal ? "Internal note" : entry.sender_type}:</b> {entry.message}</Typography>)}</Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}><TextField select size="small" label="Assign to" value={caseDetail.assignee_id?._id || caseDetail.assignee_id || ""} onChange={(e) => runAction(() => assignAdminBookingSupportCase(selectedCase, e.target.value))} sx={{ minWidth: 180 }}>{assignees.map((person) => <MenuItem key={person._id} value={person._id}>{person.name} · {person.role}</MenuItem>)}</TextField><TextField fullWidth size="small" label="Internal note (staff only)" value={note} onChange={(e) => setNote(e.target.value)} /><Button variant="outlined" onClick={replyInternal} disabled={!note.trim()}>Add note</Button></Stack>
              </Paper>}
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={800}>Create support case</Typography>
              <TextField fullWidth size="small" label="Case title" value={caseSubject} onChange={(e) => setCaseSubject(e.target.value)} />
              <TextField fullWidth multiline minRows={2} size="small" label="Internal case details" value={caseMessage} onChange={(e) => setCaseMessage(e.target.value)} />
              <Stack direction="row" spacing={1}><Button variant="contained" onClick={() => createCase(false)} disabled={!caseSubject.trim() || !caseMessage.trim()}>Create case</Button><Button variant="outlined" onClick={() => createCase(true)} disabled={!caseMessage.trim()}>Open payment dispute</Button></Stack>
            </Stack>
          </PanelSection>
        </Grid>}

        {permissions.audit && <Grid item xs={12} md={5}>
          <PanelSection title="Booking Audit History">
            <Stack spacing={1} sx={{ maxHeight: 420, overflowY: "auto" }}>{audit.map((event) => <Paper key={event._id} variant="outlined" sx={{ p: 1 }}><Typography variant="body2" fontWeight={800}>{event.action}</Typography><Typography variant="caption" display="block">{new Date(event.occurredAt).toLocaleString()} · {event.adminRole}</Typography><Typography variant="caption" display="block">Reason: {event.reason}</Typography><Typography variant="caption" display="block" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>Before: {JSON.stringify(event.before || {})} → After: {JSON.stringify(event.after || {})}</Typography></Paper>)}{audit.length === 0 && <Typography variant="body2" color="text.secondary">No audit entries available.</Typography>}</Stack>
          </PanelSection>
        </Grid>}
      </Grid>
    </Box>
  );
}
