import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import EmergencyRoundedIcon from "@mui/icons-material/EmergencyRounded";
import { assignRsaServiceToDealer, getRsaDealers, getRsaProposals, getRsaServices, reviewRsaProposal, revokeRsaDealerService, setRsaDealerPermission, setRsaDealerServiceStatus } from "../../../../api";

const surface = { border: "1px solid #e7ebf1", borderRadius: 3, boxShadow: "0 2px 8px rgba(20,37,61,.035)", bgcolor: "#fff" };
const idOf = value => String(value?._id || value?.id || value || "");
const unwrap = response => response?.data?.data ?? response?.data ?? [];
const money = value => value === null || value === undefined || value === "" ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;
const statusColor = status => ({ approved: "success", pending: "warning", submitted: "warning", proposed: "warning", acceptance_pending: "info", rejected: "error" }[String(status || "").toLowerCase()] || "default");
const titleCase = value => String(value || "—").replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());

export default function DealerRsaServicesTab({ dealer }) {
  const dealerId = idOf(dealer);
  const [directory, setDirectory] = useState(null);
  const [services, setServices] = useState([]);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [rsaEnabled, setRsaEnabled] = useState(false);
  const [towing, setTowing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dealerResponse, proposalResponse, serviceResponse] = await Promise.all([
        getRsaDealers(), getRsaProposals(), getRsaServices(),
      ]);
      const dealerRows = unwrap(dealerResponse);
      const current = Array.isArray(dealerRows) ? dealerRows.find(item => idOf(item) === dealerId) : null;
      if (!current) throw new Error("RSA dealer settings are not available for this dealer.");
      const proposalRows = unwrap(proposalResponse);
      setDirectory(current);
      setServices(Array.isArray(unwrap(serviceResponse)) ? unwrap(serviceResponse) : []);
      setRows(Array.isArray(proposalRows) ? proposalRows.filter(item => idOf(item.dealerId) === dealerId && !item.revokedAt) : []);
      setCapacity(String(current.capacity ?? current.rsaCapacityLimit ?? 0));
      setRsaEnabled(current.rsaEnabled === true);
      setTowing((current.capabilities || current.rsaCapabilities || []).includes("towing"));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Could not load RSA services for this dealer.");
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  useEffect(() => { refresh(); }, [refresh]);

  const availableCatalog = useMemo(() => {
    const assigned = new Set(rows.map(item => idOf(item.serviceId)));
    return services.filter(item => !assigned.has(idOf(item)) && `${item.name} ${item.type}`.toLowerCase().includes(search.toLowerCase()));
  }, [rows, search, services]);

  const savePermission = async patch => {
    const next = { rsaEnabled, capacity: Number(capacity), capabilities: towing ? ["towing"] : [] , ...patch };
    if (!Number.isInteger(next.capacity) || next.capacity < 0 || next.capacity > 100) {
      setError("RSA capacity must be a whole number from 0 to 100.");
      return;
    }
    const operation = patch.rsaEnabled === false ? "disable RSA access for" : patch.capabilities?.length === 0 && towing ? "remove towing authorization for" : "update RSA settings for";
    if (!window.confirm(`Are you sure you want to ${operation} ${dealer.shopName || "this dealer"}? This change is audited by the server.`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await setRsaDealerPermission(dealerId, next);
      setNotice("RSA dealer settings updated.");
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Could not update RSA dealer settings.");
    } finally { setSaving(false); }
  };

  const reviewPrice = async row => {
    const state = String(row.priceStatus || row.status || "").toLowerCase();
    const proposalId = idOf(row);
    if (["pending", "submitted", "proposed"].includes(state)) {
      if (row.proposedPrice == null) { setError("The dealer must submit a price before Admin can review this assignment."); return; }
      const choice = window.prompt("Review price: type approve, revise, or reject.");
      if (!choice) return;
      const action = choice.trim().toLowerCase();
      if (!["approve", "revise", "reject"].includes(action)) { setError("Choose approve, revise, or reject."); return; }
      let payload = { action };
      if (action === "approve") payload.price = Number(row.proposedPrice);
      if (action === "revise") {
        const price = window.prompt("Enter the corrected price. Dealer acceptance will be required.", String(row.proposedPrice ?? ""));
        if (price === null || !Number.isFinite(Number(price)) || Number(price) < 0) return;
        const reason = window.prompt("Reason for the corrected price:");
        if (!reason?.trim()) return;
        payload = { action, price: Number(price), reason: reason.trim() };
      }
      if (action === "reject") {
        const reason = window.prompt("Reason for rejection:");
        if (!reason?.trim()) return;
        payload.reason = reason.trim();
      }
      if (!window.confirm(`${titleCase(action)} this RSA price proposal?`)) return;
      setSaving(true); setError(""); setNotice("");
      try {
        await reviewRsaProposal(proposalId, payload);
        setNotice(`Price proposal ${action === "revise" ? "sent for dealer acceptance" : `${action}d`}.`);
        await refresh();
      } catch (e) { setError(e?.response?.data?.message || e?.message || "Price review failed."); }
      finally { setSaving(false); }
      return;
    }
    if (state === "approved") {
      const reason = window.prompt("Reason for revoking this approval:");
      if (!reason?.trim() || !window.confirm("Revoke the approved price? The service will be disabled for new RSA requests.")) return;
      setSaving(true); setError(""); setNotice("");
      try {
        await reviewRsaProposal(proposalId, { action: "revoke", reason: reason.trim() });
        setNotice("Price approval revoked and dealer service disabled.");
        await refresh();
      } catch (e) { setError(e?.response?.data?.message || e?.message || "Approval revocation failed."); }
      finally { setSaving(false); }
    }
  };

  const assignService = async service => {
    if (!window.confirm(`Assign ${service.name} to this dealer? The service starts inactive and requires dealer pricing and Admin approval.`)) return;
    setSaving(true); setError(""); setNotice("");
    try { await assignRsaServiceToDealer(idOf(service), dealerId); setNotice(`${service.name} assigned; dealer pricing is pending.`); await refresh(); return true; }
    catch (e) { setError(e?.response?.data?.message || e?.message || "Could not assign RSA service."); }
    finally { setSaving(false); }
    return false;
  };

  const setServiceActive = async (row, active) => {
    if (!window.confirm(`${active ? "Activate" : "Deactivate"} ${row.serviceId?.name || "this RSA service"}?`)) return;
    setSaving(true); setError(""); setNotice("");
    try { await setRsaDealerServiceStatus(idOf(row), active); setNotice(`RSA service ${active ? "activated" : "deactivated"}.`); await refresh(); }
    catch (e) { setError(e?.response?.data?.message || e?.message || "Could not update RSA service status."); }
    finally { setSaving(false); }
  };

  const removeService = async row => {
    if (!window.confirm(`Remove ${row.serviceId?.name || "this RSA service"} from this dealer? Active requests or reserved offers will block removal.`)) return;
    setSaving(true); setError(""); setNotice("");
    try { await revokeRsaDealerService(idOf(row)); setNotice("RSA service assignment removed."); await refresh(); }
    catch (e) { setError(e?.response?.data?.message || e?.message || "Could not remove RSA service."); }
    finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ p: 5, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>;

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#14253d">Roadside Assistance Services</Typography>
          <Typography variant="body2" color="text.secondary">Manage this dealer’s separate RSA access, capability and approved service prices.</Typography>
        </Box>
        <Button onClick={refresh} startIcon={<RefreshRoundedIcon />} variant="outlined">Refresh</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...surface, p: 2.25, height: "100%" }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><EmergencyRoundedIcon color="warning" /><Typography fontWeight={800}>RSA Program</Typography></Stack>
            <Chip size="small" color={rsaEnabled ? "success" : "default"} label={rsaEnabled ? "Enabled" : "Disabled"} />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button size="small" variant={rsaEnabled ? "outlined" : "contained"} disabled={saving || rsaEnabled} onClick={() => savePermission({ rsaEnabled: true })}>Enable</Button>
              <Button size="small" color="error" variant="outlined" disabled={saving || !rsaEnabled} onClick={() => savePermission({ rsaEnabled: false })}>Disable</Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...surface, p: 2.25, height: "100%" }}>
            <Typography fontWeight={800} sx={{ mb: 1.25 }}>Towing Authorization</Typography>
            <Chip size="small" color={towing ? "success" : "default"} label={towing ? "Authorized" : "Not authorized"} />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button size="small" variant="outlined" disabled={saving || towing} onClick={() => { setTowing(true); savePermission({ capabilities: ["towing"] }); }}>Authorize towing</Button>
              <Button size="small" color="warning" disabled={saving || !towing} onClick={() => { setTowing(false); savePermission({ capabilities: [] }); }}>Revoke</Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...surface, p: 2.25, height: "100%" }}>
            <Typography fontWeight={800} sx={{ mb: 1.25 }}>RSA Capacity</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField size="small" label="Capacity" type="number" value={capacity} onChange={event => setCapacity(event.target.value)} inputProps={{ min: 0, max: 100, step: 1 }} sx={{ maxWidth: 150 }} />
              <Button variant="contained" size="small" disabled={saving || String(directory?.capacity ?? directory?.rsaCapacityLimit ?? 0) === capacity} onClick={() => savePermission({})}>Save</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Reserved {directory?.reserved ?? directory?.rsaCapacityReserved ?? 0} · Available {directory?.availableCapacity ?? directory?.rsaAvailableCapacity ?? 0}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ ...surface, overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ p: 2 }}>
          <Box><Typography variant="h6" fontWeight={800}>Assigned RSA Services</Typography><Typography variant="body2" color="text.secondary">Price approval controls whether the dealer service can become eligible.</Typography></Box>
          <Button variant="contained" disabled={saving} onClick={() => setAssignOpen(true)} title="Choose an Admin-created RSA catalog service">Assign Service</Button>
        </Stack>
        <Divider />
        {rows.length === 0 ? <Box sx={{ p: 4, textAlign: "center" }}><Typography fontWeight={700}>No RSA services assigned</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Assignment is unavailable until the backend exposes an Admin dealer-service assignment endpoint.</Typography></Box> : (
          <TableContainer sx={{ width: "100%" }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Service</TableCell><TableCell>Type</TableCell><TableCell>Proposed price</TableCell><TableCell>Approved price</TableCell><TableCell>Approval</TableCell><TableCell>Dealer status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
              <TableBody>{rows.map(row => {
                const catalog = services.find(item => idOf(item) === idOf(row.serviceId)) || (typeof row.serviceId === "object" ? row.serviceId : null);
                const status = row.priceStatus || row.status;
                return <TableRow key={idOf(row)} hover>
                  <TableCell><Typography fontWeight={700}>{catalog?.name || "RSA service"}</Typography>{catalog?.isActive === false && <Typography variant="caption" color="error">Global catalog inactive</Typography>}</TableCell>
                  <TableCell>{titleCase(catalog?.type)}</TableCell>
                  <TableCell>{money(row.proposedPrice)}</TableCell>
                  <TableCell>{money(row.approvedPrice)}</TableCell>
                  <TableCell><Chip size="small" color={statusColor(status)} label={titleCase(status)} /></TableCell>
                  <TableCell><Chip size="small" color={row.dealerActive ? "success" : "default"} label={row.dealerActive ? "Active" : "Inactive"} /></TableCell>
                  <TableCell align="right"><Stack direction="row" spacing={0.5} justifyContent="flex-end"><Button size="small" onClick={() => reviewPrice(row)} disabled={saving || !["pending", "submitted", "proposed", "approved"].includes(String(status || "").toLowerCase())}>{status === "approved" ? "Review / Revoke" : "Review price"}</Button><Button size="small" disabled={saving || row.dealerActive || status !== "approved"} onClick={() => setServiceActive(row, true)}>Activate</Button><Button size="small" disabled={saving || !row.dealerActive} onClick={() => setServiceActive(row, false)}>Deactivate</Button><Button size="small" color="error" disabled={saving} onClick={() => removeService(row)}>Remove</Button></Stack></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign an RSA Catalog Service</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>Assignment starts inactive with no price. The dealer must submit a price, then Admin approval is required before activation.</Alert>
          <TextField autoFocus fullWidth size="small" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search service name or type" InputProps={{ startAdornment: <SearchRoundedIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} /> }} />
          <Stack spacing={1} sx={{ mt: 2 }}>
            {availableCatalog.map(item => <Paper key={idOf(item)} variant="outlined" sx={{ p: 1.5 }}><Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}><Box><Typography fontWeight={700}>{item.name}</Typography><Typography variant="caption" color="text.secondary">{titleCase(item.type)} · Global catalog {item.isActive ? "active" : "inactive"}{!rsaEnabled ? " · dealer RSA permission disabled" : ""}{(item.requiresTowingCapability || item.type === "towing") && !towing ? " · towing authorization required before activation" : ""}</Typography></Box><Button size="small" variant="outlined" disabled={saving} onClick={async () => { const ok = await assignService(item); if (ok) setAssignOpen(false); }}>Assign</Button></Stack></Paper>)}
            {availableCatalog.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{services.length === 0 ? "No RSA catalog services found." : search ? "No matching unassigned catalog services." : "All RSA catalog services are already assigned."}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setAssignOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <Alert severity="info" sx={{ mt: 2 }}>
        New assignments start inactive with pending pricing. Activation requires an approved price, active global catalog, Admin-approved dealer and required RSA capability.
      </Alert>
    </Box>
  );
}
