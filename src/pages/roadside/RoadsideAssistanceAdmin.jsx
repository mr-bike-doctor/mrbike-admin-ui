import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, FormControlLabel,
  IconButton, Menu, MenuItem, Paper, Snackbar, Stack, Switch, Tab, Tabs, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmergencyRoundedIcon from "@mui/icons-material/EmergencyRounded";
import HandymanRoundedIcon from "@mui/icons-material/HandymanRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TwoWheelerRoundedIcon from "@mui/icons-material/TwoWheelerRounded";
import { useNavigate } from "react-router-dom";
import { assignRsaRequest, assignRsaServiceToDealer, assignRsaTowingProvider, createRsaArea, createRsaService, getRsaAreas, getRsaDealers, getRsaProposals, getRsaRequestAudit, getRsaRequests, getRsaServiceDealers, getRsaServices, reviewRsaProposal, revokeRsaDealerService, searchRsaDealerDirectory, setRsaDealerPermission, setRsaDealerServicePrice, setRsaDealerServiceStatus, updateRsaArea, updateRsaService } from "../../api";

const NAVY = "#14253d";
const BLUE = "#2463eb";
const surface = { border: "1px solid #e7ebf1", borderRadius: 3, boxShadow: "0 2px 8px rgba(20,37,61,.035)", bgcolor: "#fff" };
const unwrap = response => response?.data?.data ?? response?.data ?? [];
const rsaServiceCatalog = [
  { type: "repair", name: "Bike Not Starting", description: "Engine won’t start or starting issues", icon: "bike" },
  { type: "puncture", name: "Puncture Repair", description: "Flat tyre or slow pressure", icon: "wheel" },
  { type: "battery", name: "Battery / Electrical", description: "Battery dead or electrical faults", icon: "battery" },
  { type: "towing", name: "Towing Required", description: "Need to tow your bike to a garage", icon: "towing" },
  { type: "fuel", name: "Fuel Assistance", description: "Out of fuel or wrong fuel", icon: "fuel" },
  { type: "other", name: "Other Breakdown", description: "Any other roadside issue", icon: "repair" },
];
const emptyService = { ...rsaServiceCatalog[0], isActive: false };
const serviceTypes = rsaServiceCatalog.map(({ type, name }) => ({ type, name }));
const readable = value => rsaServiceCatalog.find(item => item.type === value)?.name || value || "—";
const idOf = value => value?._id || value?.id || value || "";
const displayName = dealer => dealer?.shopName || dealer?.name || dealer?.businessName || "—";
const dateLabel = value => value ? new Date(value).toLocaleString() : "—";

export default function RoadsideAssistanceAdmin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [services, setServices] = useState([]), [areas, setAreas] = useState([]), [dealers, setDealers] = useState([]), [proposals, setProposals] = useState([]), [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [serviceDrawer, setServiceDrawer] = useState(false), [editingService, setEditingService] = useState(null), [service, setService] = useState(emptyService), [serviceError, setServiceError] = useState("");
  const [areaDrawer, setAreaDrawer] = useState(false), [editingArea, setEditingArea] = useState(null), [area, setArea] = useState({ name: "", mode: "radius", latitude: "", longitude: "", radiusKm: "5", boundary: "" });
  const [dealerDrawer, setDealerDrawer] = useState(false), [dealer, setDealer] = useState({ id: "", capacity: "0", towing: false, enabled: false });
  const [requestDrawer, setRequestDrawer] = useState(null), [requestAudit, setRequestAudit] = useState([]), [auditBusy, setAuditBusy] = useState(false);
  const [proposalFilter, setProposalFilter] = useState("pending"), [requestFilter, setRequestFilter] = useState("all"), [dealerSearch, setDealerSearch] = useState("");
  const [reviewDialog, setReviewDialog] = useState(null);
  const [directPriceDialog, setDirectPriceDialog] = useState(null);
  const [assignmentActionMenu, setAssignmentActionMenu] = useState(null);
  const [manageService, setManageService] = useState(null), [assignmentPage, setAssignmentPage] = useState(1), [assignmentQuery, setAssignmentQuery] = useState(""), [assignmentApproval, setAssignmentApproval] = useState(""), [assignmentActive, setAssignmentActive] = useState(""), [assignmentData, setAssignmentData] = useState(null), [assignmentBusy, setAssignmentBusy] = useState(false), [pickerOpen, setPickerOpen] = useState(false), [pickerQuery, setPickerQuery] = useState(""), [pickerRows, setPickerRows] = useState([]), [pickerBusy, setPickerBusy] = useState(false);
  const [assignmentQueryDebounced, setAssignmentQueryDebounced] = useState("");

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setBusy(true);
    setError("");
    try {
      const [s, a, d, p, r] = await Promise.all([getRsaServices(), getRsaAreas(), getRsaDealers(), getRsaProposals(), getRsaRequests()]);
      setServices(Array.isArray(unwrap(s)) ? unwrap(s) : []);
      setAreas(Array.isArray(unwrap(a)) ? unwrap(a) : []);
      setDealers(Array.isArray(unwrap(d)) ? unwrap(d) : []);
      setProposals(Array.isArray(unwrap(p)) ? unwrap(p) : []);
      setRequests(Array.isArray(unwrap(r)) ? unwrap(r) : []);
    } catch (e) { setError(e?.message || "Could not load roadside assistance data."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const timer = setTimeout(() => setAssignmentQueryDebounced(assignmentQuery), 300); return () => clearTimeout(timer); }, [assignmentQuery]);
  const loadAssignments = useCallback(async (service = manageService, page = assignmentPage, search = assignmentQueryDebounced, approval = assignmentApproval, active = assignmentActive) => {
    if (!service) return;
    setAssignmentBusy(true);
    try { const response = await getRsaServiceDealers(idOf(service), { page, limit: 25, search, approval, active }); setAssignmentData(unwrap(response)); }
    catch (e) { setError(e?.response?.data?.message || e?.message || "Could not load assigned dealers."); }
    finally { setAssignmentBusy(false); }
  }, [manageService, assignmentPage, assignmentQueryDebounced, assignmentApproval, assignmentActive]);
  useEffect(() => { if (manageService) loadAssignments(manageService, assignmentPage, assignmentQueryDebounced, assignmentApproval, assignmentActive); }, [manageService, assignmentPage, assignmentQueryDebounced, assignmentApproval, assignmentActive, loadAssignments]);
  useEffect(() => {
    if (!pickerOpen || pickerQuery.trim().length < 2) { setPickerRows([]); return undefined; }
    let cancelled = false;
    const timer = setTimeout(async () => { setPickerBusy(true); try { const result = unwrap(await searchRsaDealerDirectory({ search: pickerQuery.trim(), serviceId: idOf(manageService), limit: 25 })); if (!cancelled) setPickerRows(result.rows || []); } catch (e) { if (!cancelled) setError(e?.response?.data?.message || e?.message || "Dealer search failed."); } finally { if (!cancelled) setPickerBusy(false); } }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pickerOpen, pickerQuery, manageService]);
  useEffect(() => {
    if (tab !== 4) return undefined;
    const timer = setInterval(() => refresh(true), 15000);
    return () => clearInterval(timer);
  }, [tab, refresh]);
  const run = async (action, successMessage = "Changes saved.") => {
    setError("");
    try { await action(); await refresh(true); setNotice(successMessage); return true; }
    catch (e) { setError(e?.message || "That action could not be completed."); return false; }
  };

  const pendingCount = proposals.filter(item => ["pending", "submitted", "proposed"].includes(String(item.priceStatus || item.status).toLowerCase())).length;
  const activeRequests = requests.filter(item => !["completed", "cancelled", "rejected"].includes(String(item.status).toLowerCase())).length;
  const activeServices = services.filter(item => item.isActive).length;
  const shownProposals = proposals.filter(item => proposalFilter === "all" ? true : String(item.priceStatus || item.status).toLowerCase() === proposalFilter);
  const shownRequests = requests.filter(item => requestFilter === "all" || String(item.status).toLowerCase().replaceAll(" ", "_") === requestFilter);
  const searchableDealers = useMemo(() => dealers.filter(item => `${displayName(item)} ${item.ownerName || ""} ${item.phone || ""} ${item.city || ""} ${idOf(item)}`.toLowerCase().includes(dealerSearch.toLowerCase())), [dealers, dealerSearch]);
  const activeRsaDealers = dealers.filter(item => item.rsaEnabled && item.rsaOnline && item.online && item.active && item.adminApproved).length;

  const openCreateService = () => { setEditingService(null); setService({ ...emptyService }); setServiceError(""); setServiceDrawer(true); };
  const selectServiceType = type => {
    const preset = rsaServiceCatalog.find(item => item.type === type);
    setService(current => ({ ...current, ...(preset || {}), isActive: current.isActive }));
  };
  const openEditService = item => { setEditingService(item); setService({ name: item.name || "", description: item.description || "", icon: item.icon || "wrench", type: item.type || "repair", isActive: !!item.isActive }); setServiceError(""); setServiceDrawer(true); };
  const saveService = async event => {
    event.preventDefault();
    if (!service.name.trim()) { setServiceError("Enter a service name."); return; }
    const payload = { ...service, name: service.name.trim(), description: service.description.trim(), requiresTowingCapability: service.type === "towing" || !!editingService?.requiresTowingCapability };
    const ok = await run(() => editingService ? updateRsaService(idOf(editingService), payload) : createRsaService({ ...payload, isActive: false }), editingService ? "Service updated." : "Service created as inactive.");
    if (ok) setServiceDrawer(false);
  };
  const openArea = item => { setEditingArea(item || null); setArea(item ? { name: item.name || "", mode: "polygon", latitude: "", longitude: "", radiusKm: "5", boundary: JSON.stringify(item.boundary, null, 2) } : { name: "", mode: "radius", latitude: "", longitude: "", radiusKm: "5", boundary: "" }); setAreaDrawer(true); };
  const saveArea = async event => {
    event.preventDefault();
    let boundary;
    if (area.mode === "radius") {
      const latitude = Number(area.latitude), longitude = Number(area.longitude), radiusKm = Number(area.radiusKm);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(radiusKm) || radiusKm < 0.1 || radiusKm > 100) { setError("Enter a valid center location and radius from 0.1 to 100 km."); return; }
      boundary = radiusPolygon(latitude, longitude, radiusKm);
    } else {
      try { boundary = JSON.parse(area.boundary); } catch { setError("Check the GeoJSON syntax and try again."); return; }
    }
    const geometry = boundary?.type === "Feature" ? boundary.geometry : boundary;
    const coords = geometry?.coordinates;
    if (!["Polygon", "MultiPolygon"].includes(geometry?.type) || !Array.isArray(coords) || !coords.length) { setError("Use a GeoJSON Polygon or MultiPolygon with coordinates."); return; }
    const ok = await run(() => editingArea ? updateRsaArea(idOf(editingArea), { name: area.name, boundary }) : createRsaArea({ name: area.name, boundary }), editingArea ? "Coverage area updated." : "Coverage area created inactive.");
    if (ok) setAreaDrawer(false);
  };
  const review = async (row, action) => {
    if (action === "approve" && row.proposedPrice == null) { setError("The dealer must submit a price before Admin can approve this assignment."); return; }
    setReviewDialog({ row, action, price: String(row.proposedPrice ?? ""), reason: "", error: "" });
  };
  const submitReview = async event => {
    event.preventDefault();
    if (!reviewDialog) return;
    const { row, action, price: rawPrice, reason: rawReason } = reviewDialog;
    const reason = rawReason.trim();
    if ((action === "reject" || action === "revise") && !reason) {
      setReviewDialog(current => ({ ...current, error: action === "reject" ? "Enter a reason for rejecting this proposal." : "Add a note for the dealer." }));
      return;
    }
    const price = Number(rawPrice);
    if (action !== "reject" && (!Number.isFinite(price) || price < 0)) {
      setReviewDialog(current => ({ ...current, error: "Enter a valid price greater than or equal to ₹0." }));
      return;
    }
    const payload = action === "reject" ? { action, reason } : { action, price, ...(action === "revise" ? { reason } : {}) };
    const success = action === "approve" ? "Price proposal approved." : action === "reject" ? "Price proposal rejected." : "Revised price sent to the dealer for acceptance.";
    if (await run(() => reviewRsaProposal(idOf(row), payload), success)) setReviewDialog(null);
  };
  const openDirectPriceDialog = ({ dealer, row = null }) => setDirectPriceDialog({ dealer, row, price: "", error: "" });
  const submitDirectPrice = async event => {
    event.preventDefault();
    if (!directPriceDialog) return;
    const price = Number(directPriceDialog.price);
    if (!Number.isFinite(price) || price < 0 || price > 100000) {
      setDirectPriceDialog(current => ({ ...current, error: "Enter a valid price from ₹0 to ₹1,00,000." }));
      return;
    }
    const { row, dealer } = directPriceDialog;
    const action = row
      ? () => setRsaDealerServicePrice(idOf(row), price)
      : () => assignRsaServiceToDealer(idOf(manageService), dealer.id, price);
    const success = await run(action, "RSA service directly approved and enabled for the dealer.");
    if (success) {
      setDirectPriceDialog(null);
      setPickerOpen(false);
      loadAssignments();
    }
  };
  const saveDealer = async event => {
    event.preventDefault();
    if (!dealer.id.trim() || Number(dealer.capacity) < 0) { setError("Enter a dealer ID and valid capacity."); return; }
    const ok = await run(() => setRsaDealerPermission(dealer.id.trim(), { rsaEnabled: dealer.enabled, capacity: Number(dealer.capacity), capabilities: dealer.towing ? ["towing"] : [] }), "Dealer access updated.");
    if (ok) setDealerDrawer(false);
  };
  const openRequest = async item => {
    setRequestDrawer(item); setRequestAudit([]); setAuditBusy(true);
    try { setRequestAudit(unwrap(await getRsaRequestAudit(idOf(item)))); } catch { setRequestAudit([]); }
    finally { setAuditBusy(false); }
  };
  const assignRequest = async item => {
    if (String(item.status).toLowerCase() !== "searching") return;
    const dealerId = window.prompt("Enter the dealer ID to offer this request to:");
    if (!dealerId?.trim()) return;
    if (window.confirm(`Offer request ${idOf(item)} to dealer ${dealerId.trim()}?`)) await run(() => assignRsaRequest(idOf(item), dealerId.trim()), "Request offered to dealer.");
  };
  const assignTowingProvider = async item => {
    if (String(item.status).toLowerCase() !== "inspection") return;
    const dealerId = window.prompt("Enter the ID of an active dealer with Admin-approved RSA towing capability:");
    if (!dealerId?.trim()) return;
    await run(() => assignRsaTowingProvider(idOf(item), dealerId.trim()), "Towing provider reassigned.");
  };

  return <Box sx={{ minHeight: "100%", bgcolor: "#f6f8fb", p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1680, mx: "auto" }}>
    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
      <Box><Typography variant="h4" sx={{ color: NAVY, fontWeight: 750, letterSpacing: "-.035em", fontSize: { xs: 26, md: 32 } }}>Roadside Assistance</Typography><Typography sx={{ mt: .5, color: "#65748b" }}>Manage emergency services, partners and requests.</Typography></Box>
      <Button onClick={openCreateService} variant="contained" startIcon={<AddRoundedIcon />} sx={{ bgcolor: BLUE, borderRadius: 2, px: 2.25, py: 1.2, textTransform: "none", fontWeight: 700, boxShadow: "none", alignSelf: { xs: "stretch", sm: "auto" } }}>Add RSA Service</Button>
    </Stack>
    {error && <Alert severity="error" onClose={() => setError("")} action={<Button color="inherit" size="small" onClick={() => refresh()}>Retry</Button>} sx={{ mb: 2 }}>{error}</Alert>}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", lg: "repeat(4,minmax(0,1fr))" }, gap: 1.5, mb: 2 }}>
      <Metric icon={<HandymanRoundedIcon />} label="Total RSA services" value={busy ? "—" : services.length} hint={`${activeServices} active`} />
      <Metric icon={<TwoWheelerRoundedIcon />} label="RSA online dealers" value={busy ? "—" : activeRsaDealers} hint="Program enabled and currently available" />
      <Metric icon={<CheckCircleOutlineRoundedIcon />} label="Pending price approvals" value={busy ? "—" : pendingCount} hint="Awaiting review" />
      <Metric icon={<EmergencyRoundedIcon />} label="Active RSA requests" value={busy ? "—" : activeRequests} hint="Open requests" accent />
    </Box>
    <Alert icon={<EmergencyRoundedIcon />} severity="warning" sx={{ mb: 2, border: "1px solid #f6dfb3", bgcolor: "#fffaf0", color: "#80520e", borderRadius: 2.5, alignItems: "center" }}><b>RSA requests are currently disabled.</b> The backend feature flag controls request availability.</Alert>
    {!busy && services.length === 0 && areas.length === 0 && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>Setup is incomplete. Add your first RSA service, configure a coverage area, then grant access to eligible dealers.</Alert>}
    <Paper sx={{ ...surface, mb: 2, overflow: "hidden" }}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Roadside assistance sections" sx={{ px: { xs: 1, md: 2 }, minHeight: 58, "& .MuiTab-root": { minHeight: 58, textTransform: "none", fontWeight: 650, color: "#68778c", px: { xs: 1.5, md: 2.5 } }, "& .Mui-selected": { color: `${BLUE} !important` }, "& .MuiTabs-indicator": { height: 3, borderRadius: 3 } }}>
        {["Overview", "Services", "Price Approvals", "Coverage & Dealers", "Requests"].map((label, index) => <Tab key={label} label={label} />)}
      </Tabs>
    </Paper>
    {busy ? <LoadingState /> : <>
      {tab === 0 && <Overview services={services} proposals={proposals} areas={areas} requests={requests} onTab={setTab} />}
      {tab === 1 && <Services services={services} onAdd={openCreateService} onEdit={openEditService} onManage={item => { setManageService(item); setAssignmentPage(1); }} onToggle={item => { const next = !item.isActive; if (window.confirm(`${next ? "Enable" : "Disable"} ${item.name}?`)) run(() => updateRsaService(idOf(item), { isActive: next }), `Service ${next ? "enabled" : "disabled"}.`); }} />}
      {tab === 2 && <Approvals rows={shownProposals} filter={proposalFilter} setFilter={setProposalFilter} onReview={review} />}
      {tab === 3 && <Coverage areas={areas} dealers={searchableDealers} search={dealerSearch} setSearch={setDealerSearch} onAddArea={() => openArea()} onEditArea={openArea} onToggleArea={item => { const next = !item.isActive; if (window.confirm(`${next ? "Enable" : "Disable"} coverage area ${item.name}?`)) run(() => updateRsaArea(idOf(item), { isActive: next }), "Coverage status updated."); }} onAddDealer={() => { setDealer({ id: "", capacity: "0", towing: false, enabled: false }); setDealerDrawer(true); }} onEditDealer={item => { setDealer({ id: idOf(item), capacity: String(item.capacity ?? 0), towing: !!item.capabilities?.includes("towing"), enabled: !!item.rsaEnabled }); setDealerDrawer(true); }} />}
      {tab === 4 && <Requests rows={shownRequests} filter={requestFilter} setFilter={setRequestFilter} onOpen={openRequest} onAssign={assignRequest} />}
    </>}
    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}><Button startIcon={<RefreshRoundedIcon />} onClick={() => refresh()} disabled={busy} sx={{ textTransform: "none" }}>Refresh data</Button></Stack>

    <Drawer anchor="right" open={!!manageService} onClose={() => { setManageService(null); setAssignmentData(null); }} PaperProps={{ sx: { ...drawerPaper, width: { xs: "100%", md: "min(1100px, 88vw)" }, maxWidth: "100%" } }}>
      {manageService && <><DrawerHeader title={`Manage Dealers — ${manageService.name}`} onClose={() => { setManageService(null); setAssignmentData(null); }} />
        <Box sx={{ p: { xs: 2, md: 3 }, overflow: "auto", flex: 1 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5} sx={{ mb: 2 }}><Box><Stack direction="row" spacing={1} alignItems="center"><Status value={manageService.isActive ? "active" : "inactive"} /><Typography variant="body2" color="text.secondary">Global catalog status</Typography></Stack><Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>Assigned {assignmentData?.summary?.total ?? "—"} · Approved {assignmentData?.summary?.approved ?? "—"} · Active {assignmentData?.summary?.active ?? "—"} · Pending {assignmentData?.summary?.pending ?? "—"}</Typography></Box><Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setPickerQuery(""); setPickerOpen(true); }} sx={{ textTransform: "none", alignSelf: { xs: "stretch", sm: "center" } }}>Assign Dealer</Button></Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}><TextField size="small" fullWidth value={assignmentQuery} onChange={e => { setAssignmentQuery(e.target.value); setAssignmentPage(1); }} placeholder="Search Dealer ID, name, shop or phone" /><TextField size="small" select label="Approval" value={assignmentApproval} onChange={e => { setAssignmentApproval(e.target.value); setAssignmentPage(1); }} sx={{ minWidth: 160 }}><MenuItem value="">All approvals</MenuItem>{["pending", "approved", "rejected", "acceptance_pending"].map(x => <MenuItem key={x} value={x}>{readableStatus(x)}</MenuItem>)}</TextField><TextField size="small" select label="Service" value={assignmentActive} onChange={e => { setAssignmentActive(e.target.value); setAssignmentPage(1); }} sx={{ minWidth: 140 }}><MenuItem value="">All statuses</MenuItem><MenuItem value="true">Active</MenuItem><MenuItem value="false">Inactive</MenuItem></TextField></Stack>
          {assignmentBusy ? <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}><CircularProgress /></Box> : assignmentData?.rows?.length ? <TableContainer sx={{ border: "1px solid #e7ebf1", borderRadius: 2, overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 820, tableLayout: "fixed", "& .MuiTableCell-root": { px: 1.5, py: 1.4, borderColor: "#edf0f4" }, "& .MuiTableHead-root .MuiTableCell-root": { bgcolor: "#f8faff", color: "#68778c", fontSize: 11, fontWeight: 750, letterSpacing: ".035em", textTransform: "uppercase", whiteSpace: "nowrap" } }}>
              <TableHead><TableRow>
                <TableCell sx={{ width: 100 }}>Dealer ID</TableCell><TableCell sx={{ width: 190 }}>Dealer / Shop</TableCell><TableCell sx={{ width: 145 }}>Price proposal</TableCell><TableCell sx={{ width: 155 }}>Approval</TableCell><TableCell sx={{ width: 105 }}>Service</TableCell><TableCell sx={{ width: 140 }}>RSA access</TableCell><TableCell align="right" sx={{ width: 64 }}>Actions</TableCell>
              </TableRow></TableHead>
              <TableBody>{assignmentData.rows.map(row => <TableRow key={idOf(row)} hover>
                <TableCell><Typography variant="body2" fontWeight={650} sx={{ overflowWrap: "anywhere" }}>{row.dealer?.dealerCode || row.dealer?.id || "—"}</Typography></TableCell>
                <TableCell><Typography variant="body2" fontWeight={700} color={NAVY}>{row.dealer?.name || "—"}</Typography><Typography variant="caption" color="text.secondary" noWrap>{row.dealer?.shopName || "—"}</Typography></TableCell>
                <TableCell><Typography variant="body2" fontWeight={650}>Proposed {money(row.proposedPrice)}</Typography><Typography variant="caption" color="text.secondary">Approved {money(row.approvedPrice)}</Typography></TableCell>
                <TableCell><Chip size="small" label={readableStatus(row.priceStatus)} color={statusColorFor(row.priceStatus)} sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} /></TableCell>
                <TableCell><Chip size="small" label={row.dealerActive ? "Active" : "Inactive"} color={row.dealerActive ? "success" : "default"} variant={row.dealerActive ? "filled" : "outlined"} /></TableCell>
                <TableCell><Stack spacing={0.4}><Typography variant="caption" color={row.dealer?.rsaEnabled ? "success.main" : "text.secondary"}>Access {row.dealer?.rsaEnabled ? "enabled" : "disabled"}</Typography><Typography variant="caption" color={row.dealer?.rsaOnline ? "success.main" : "text.secondary"}>{row.dealer?.rsaOnline ? "Online" : "Offline"}</Typography></Stack></TableCell>
                <TableCell align="right"><IconButton size="small" aria-label={`Actions for ${row.dealer?.name || "dealer"}`} onClick={event => setAssignmentActionMenu({ anchorEl: event.currentTarget, row })}><MoreVertRoundedIcon /></IconButton></TableCell>
              </TableRow>)}</TableBody>
            </Table>
            <Menu anchorEl={assignmentActionMenu?.anchorEl} open={Boolean(assignmentActionMenu)} onClose={() => setAssignmentActionMenu(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
              {assignmentActionMenu && <>
                <MenuItem onClick={() => { const row = assignmentActionMenu.row; setAssignmentActionMenu(null); setManageService(null); navigate(`/view-dealer/${row.dealer?.id}`); }}>View dealer</MenuItem>
                <MenuItem onClick={() => { const row = assignmentActionMenu.row; setAssignmentActionMenu(null); setManageService(null); setTab(2); setProposalFilter(row.priceStatus || "all"); }}>View approval</MenuItem>
                <MenuItem onClick={() => { const row = assignmentActionMenu.row; setAssignmentActionMenu(null); openDirectPriceDialog({ dealer: row.dealer, row }); }}>Set price & enable now</MenuItem>
                {assignmentActionMenu.row.dealerActive ? <MenuItem disabled={!assignmentActionMenu.row.dealerActive} onClick={async () => { const row = assignmentActionMenu.row; setAssignmentActionMenu(null); if (window.confirm(`Deactivate ${manageService.name} for this dealer?`)) { const ok = await run(() => setRsaDealerServiceStatus(idOf(row), false), "Dealer service deactivated."); if (ok) loadAssignments(); } }}>Deactivate service</MenuItem> : <MenuItem disabled={assignmentActionMenu.row.priceStatus !== "approved"} onClick={async () => { const row = assignmentActionMenu.row; setAssignmentActionMenu(null); if (window.confirm(`Activate ${manageService.name} for ${row.dealer?.name || row.dealer?.dealerCode}?`)) { const ok = await run(() => setRsaDealerServiceStatus(idOf(row), true), "Dealer service activated."); if (ok) loadAssignments(); } }}>Activate service</MenuItem>}
                <MenuItem sx={{ color: "error.main" }} onClick={async () => { const row = assignmentActionMenu.row; setAssignmentActionMenu(null); if (window.confirm(`Remove ${manageService.name} from ${row.dealer?.name || row.dealer?.dealerCode}? Active requests or reserved offers will block removal.`)) { const ok = await run(() => revokeRsaDealerService(idOf(row)), "Service assignment removed."); if (ok) loadAssignments(); } }}>Remove assignment</MenuItem>
              </>}
            </Menu>
          </TableContainer> : <Empty title="No dealers assigned" text="Assign a dealer to start the RSA pricing approval flow." />}
          {assignmentData?.pages > 1 && <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={1} sx={{ mt: 1.5 }}><Typography variant="body2">Page {assignmentData.page} of {assignmentData.pages}</Typography><Button disabled={assignmentPage <= 1} onClick={() => setAssignmentPage(p => p - 1)}>Previous</Button><Button disabled={assignmentPage >= assignmentData.pages} onClick={() => setAssignmentPage(p => p + 1)}>Next</Button></Stack>}
        </Box>
      </>}
    </Drawer>
    <Drawer anchor="right" open={pickerOpen} onClose={() => setPickerOpen(false)} PaperProps={{ sx: { ...drawerPaper, width: { xs: "100%", sm: 520 }, maxWidth: "100%" } }}><DrawerHeader title="Assign RSA Service" onClose={() => setPickerOpen(false)} /><Box sx={{ p: 2.5 }}><Alert severity="info" sx={{ mb: 2 }}>Set the service price as Admin to approve and enable it directly. The dealer does not need to submit or accept a price. RSA access and towing eligibility are still checked.</Alert><TextField autoFocus fullWidth value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} placeholder="Search Dealer ID, name, shop or phone" helperText="Enter at least 2 characters." />{pickerBusy ? <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box> : <Stack spacing={1} sx={{ mt: 2 }}>{pickerRows.map(row => <Paper key={row.id} sx={{ ...surface, p: 1.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Box><Typography fontWeight={700}>{row.name || row.shopName} · {row.dealerCode || row.id}</Typography><Typography variant="caption" color="text.secondary">{row.shopName || "Shop unavailable"} · {row.verified ? "Verified" : "Unverified"} · RSA {row.rsaEnabled ? "enabled" : "disabled"}</Typography>{!row.rsaEnabled && <Typography variant="caption" display="block" color="warning.main">RSA permission is required before activation.</Typography>}{(manageService?.requiresTowingCapability || manageService?.type === "towing") && !row.towingAuthorized && <Typography variant="caption" display="block" color="warning.main">Towing authorization is required before activation.</Typography>}</Box><Button size="small" disabled={row.alreadyAssigned || !row.rsaEnabled || !row.adminApproved || !row.active || ((manageService?.requiresTowingCapability || manageService?.type === "towing") && !row.towingAuthorized)} onClick={() => openDirectPriceDialog({ dealer: row })}>{row.alreadyAssigned ? "Assigned" : "Assign & enable"}</Button></Stack></Paper>)}{pickerQuery.length >= 2 && !pickerBusy && !pickerRows.length && <Typography color="text.secondary" sx={{ p: 2 }}>No matching dealers.</Typography>}</Stack>}</Box></Drawer>

    <Drawer anchor="right" open={serviceDrawer} onClose={() => setServiceDrawer(false)} PaperProps={{ sx: drawerPaper }}><DrawerHeader title={editingService ? "Edit RSA service" : "Add RSA service"} onClose={() => setServiceDrawer(false)} /><Box component="form" onSubmit={saveService} sx={drawerBody}><Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>Set up a service customers can request. New services start inactive.</Typography>{serviceError && <Alert severity="error" sx={{ mb: 2 }}>{serviceError}</Alert>}<Stack spacing={2}><TextField label="Service name" required fullWidth value={service.name} onChange={e => setService({ ...service, name: e.target.value })} helperText="Use a short name customers will recognize." /><TextField label="Description" fullWidth multiline minRows={3} value={service.description} onChange={e => setService({ ...service, description: e.target.value })} /><TextField select label="Service type" fullWidth value={service.type} onChange={e => selectServiceType(e.target.value)}>{serviceTypes.map(({ type, name }) => <MenuItem key={type} value={type}>{name}</MenuItem>)}</TextField><Box><Typography variant="subtitle2" sx={{ mb: 1 }}>Service icon</Typography><Stack direction="row" gap={1} flexWrap="wrap">{["wrench", "bike", "location", "emergency"].map((icon, index) => <Button key={icon} onClick={() => setService({ ...service, icon })} variant={service.icon === icon ? "contained" : "outlined"} startIcon={[<BuildRoundedIcon key="w" />, <TwoWheelerRoundedIcon key="b" />, <LocationOnRoundedIcon key="l" />, <EmergencyRoundedIcon key="e" />][index]} sx={{ textTransform: "none" }}>{["Repair", "Bike", "Location", "Emergency"][index]}</Button>)}</Stack></Box><FormControlLabel control={<Switch checked={!!service.isActive} onChange={e => setService({ ...service, isActive: e.target.checked })} />} label="Service is active" /><Typography variant="caption" color="text.secondary">Keep this off until coverage, dealer access and pricing are ready.</Typography></Stack><DrawerActions onCancel={() => setServiceDrawer(false)} submit={editingService ? "Save changes" : "Create Service"} /></Box></Drawer>
    <Drawer anchor="right" open={areaDrawer} onClose={() => setAreaDrawer(false)} PaperProps={{ sx: drawerPaper }}><DrawerHeader title={editingArea ? "Edit coverage area" : "Add coverage area"} onClose={() => setAreaDrawer(false)} /><Box component="form" onSubmit={saveArea} sx={drawerBody}><Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>New areas stay inactive until you enable them after review.</Typography><Stack spacing={2}><TextField label="Area name" required value={area.name} onChange={e => setArea({ ...area, name: e.target.value })} /><TextField select label="Coverage boundary" value={area.mode} onChange={e => setArea({ ...area, mode: e.target.value })}><MenuItem value="radius">Radius around a location</MenuItem><MenuItem value="polygon">Advanced GeoJSON polygon</MenuItem></TextField>{area.mode === "radius" ? <><TextField label="Center latitude" type="number" inputProps={{ step: "any", min: -90, max: 90 }} required value={area.latitude} onChange={e => setArea({ ...area, latitude: e.target.value })} /><TextField label="Center longitude" type="number" inputProps={{ step: "any", min: -180, max: 180 }} required value={area.longitude} onChange={e => setArea({ ...area, longitude: e.target.value })} /><TextField label="Service radius (km)" type="number" inputProps={{ step: "any", min: 0.1, max: 100 }} required value={area.radiusKm} onChange={e => setArea({ ...area, radiusKm: e.target.value })} helperText="A circular geographic boundary is created from these coordinates." /></> : <><TextField label="GeoJSON boundary" required multiline minRows={10} value={area.boundary} onChange={e => setArea({ ...area, boundary: e.target.value })} helperText="Use a Polygon or MultiPolygon with longitude, latitude coordinates." /><Button variant="text" onClick={() => { try { setArea({ ...area, boundary: JSON.stringify(JSON.parse(area.boundary), null, 2) }); } catch { setError("Enter valid JSON before formatting."); } }} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Format GeoJSON</Button></>}</Stack><DrawerActions onCancel={() => setAreaDrawer(false)} submit={editingArea ? "Save area" : "Create area"} /></Box></Drawer>
    <Drawer anchor="right" open={dealerDrawer} onClose={() => setDealerDrawer(false)} PaperProps={{ sx: drawerPaper }}><DrawerHeader title="Dealer RSA access" onClose={() => setDealerDrawer(false)} /><Box component="form" onSubmit={saveDealer} sx={drawerBody}><Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>Choose a dealer and set access, capacity and towing capability. Requests still require Admin approval and eligible service pricing.</Typography><Stack spacing={2}><TextField select label="Dealer" required value={dealer.id} onChange={e => { const selected = dealers.find(item => idOf(item) === e.target.value); setDealer({ ...dealer, id: e.target.value, capacity: String(selected?.capacity ?? 0), towing: !!selected?.capabilities?.includes("towing"), enabled: !!selected?.rsaEnabled }); }}>{searchableDealers.map(item => <MenuItem key={idOf(item)} value={idOf(item)}>{displayName(item)}{item.city ? ` · ${item.city}` : ""}{item.phone ? ` · ${item.phone}` : ""}</MenuItem>)}</TextField><TextField label="Request capacity" type="number" inputProps={{ min: 0, max: 100, step: 1 }} required value={dealer.capacity} onChange={e => setDealer({ ...dealer, capacity: e.target.value })} helperText="Maximum active RSA jobs this dealer can handle." /><FormControlLabel control={<Switch checked={dealer.enabled} onChange={e => setDealer({ ...dealer, enabled: e.target.checked })} />} label="RSA program access" /><FormControlLabel control={<Switch checked={dealer.towing} onChange={e => setDealer({ ...dealer, towing: e.target.checked })} />} label="Towing authorized" /></Stack><DrawerActions onCancel={() => setDealerDrawer(false)} submit="Save dealer access" /></Box></Drawer>
    <Drawer anchor="right" open={!!requestDrawer} onClose={() => setRequestDrawer(null)} PaperProps={{ sx: drawerPaper }}><DrawerHeader title="RSA request details" onClose={() => setRequestDrawer(null)} />{requestDrawer && <Box sx={drawerBody}><RequestDetails item={requestDrawer} audit={requestAudit} auditBusy={auditBusy} onAssign={() => assignRequest(requestDrawer)} onAssignTowing={() => assignTowingProvider(requestDrawer)} /></Box>}</Drawer>
    <Dialog open={!!reviewDialog} onClose={() => setReviewDialog(null)} fullWidth maxWidth="xs" aria-labelledby="rsa-review-title">
      {reviewDialog && <Box component="form" onSubmit={submitReview}>
        <DialogTitle id="rsa-review-title" sx={{ color: NAVY, fontWeight: 750 }}>
          {reviewDialog.action === "approve" ? "Approve proposed price" : reviewDialog.action === "reject" ? "Reject price proposal" : "Suggest a different price"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {displayName(reviewDialog.row.dealerId)} · {reviewDialog.row.serviceId?.name || "RSA service"} · Dealer proposed {money(reviewDialog.row.proposedPrice)}.
          </Typography>
          {reviewDialog.action !== "reject" && <TextField autoFocus required fullWidth label={reviewDialog.action === "approve" ? "Approved price (₹)" : "Suggested price (₹)"} type="number" inputProps={{ min: 0, step: "any" }} value={reviewDialog.price} onChange={event => setReviewDialog(current => ({ ...current, price: event.target.value, error: "" }))} sx={{ mb: 2 }} />}
          {reviewDialog.action !== "approve" && <TextField autoFocus={reviewDialog.action === "reject"} required fullWidth multiline minRows={3} label={reviewDialog.action === "reject" ? "Reason for rejection" : "Note for the dealer"} helperText={reviewDialog.action === "revise" ? "The dealer must accept this suggestion before their price changes." : undefined} value={reviewDialog.reason} onChange={event => setReviewDialog(current => ({ ...current, reason: event.target.value, error: "" }))} />}
          {reviewDialog.error && <Alert severity="error" sx={{ mt: 2 }}>{reviewDialog.error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setReviewDialog(null)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button type="submit" variant="contained" color={reviewDialog.action === "reject" ? "error" : "primary"} sx={{ textTransform: "none" }}>
            {reviewDialog.action === "approve" ? "Approve price" : reviewDialog.action === "reject" ? "Reject proposal" : "Send suggestion"}
          </Button>
        </DialogActions>
      </Box>}
    </Dialog>
    <Dialog open={!!directPriceDialog} onClose={() => setDirectPriceDialog(null)} fullWidth maxWidth="xs" aria-labelledby="rsa-direct-price-title">
      {directPriceDialog && <Box component="form" onSubmit={submitDirectPrice}>
        <DialogTitle id="rsa-direct-price-title" sx={{ color: NAVY, fontWeight: 750 }}>Assign service directly</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {manageService?.name} · {displayName(directPriceDialog.dealer)}. Enter the customer price; Admin approval enables the service without dealer acceptance.
          </Typography>
          <TextField autoFocus required fullWidth label="Approved service price (₹)" type="number" inputProps={{ min: 0, max: 100000, step: "any" }} value={directPriceDialog.price} onChange={event => setDirectPriceDialog(current => ({ ...current, price: event.target.value, error: "" }))} />
          {directPriceDialog.error && <Alert severity="error" sx={{ mt: 2 }}>{directPriceDialog.error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDirectPriceDialog(null)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button type="submit" variant="contained" sx={{ textTransform: "none" }}>Approve & enable</Button>
        </DialogActions>
      </Box>}
    </Dialog>
    <Snackbar open={!!notice} autoHideDuration={3500} onClose={() => setNotice("")} message={notice} />
  </Box>;
}

const drawerPaper = { width: { xs: "100%", sm: 480 }, maxWidth: "100vw", display: "flex" };
const drawerBody = { p: { xs: 2.5, sm: 3 }, overflowY: "auto", flex: 1 };
function Metric({ icon, label, value, hint, accent }) { return <Paper sx={{ ...surface, p: { xs: 1.5, sm: 2 }, minWidth: 0 }}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Typography sx={{ color: "#718096", fontWeight: 650, fontSize: { xs: 11, sm: 12 }, lineHeight: 1.3 }}>{label}</Typography><Avatar sx={{ width: 34, height: 34, bgcolor: accent ? "#fff1e8" : "#edf3ff", color: accent ? "#e87527" : BLUE }}>{icon}</Avatar></Stack><Typography sx={{ mt: 1, color: NAVY, fontWeight: 750, fontSize: { xs: 23, sm: 28 } }}>{value}</Typography><Typography variant="caption" color="text.secondary" noWrap>{hint}</Typography></Paper>; }
function LoadingState() { return <Paper sx={{ ...surface, p: 5, textAlign: "center" }}><CircularProgress size={28} /><Typography color="text.secondary" sx={{ mt: 1.5 }}>Loading roadside assistance data…</Typography></Paper>; }
function SectionHeading({ title, description, action }) { return <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1.5} sx={{ mb: 2 }}><Box><Typography variant="h6" sx={{ color: NAVY, fontWeight: 720 }}>{title}</Typography>{description && <Typography variant="body2" color="text.secondary">{description}</Typography>}</Box>{action}</Stack>; }
function Empty({ title, text }) { return <Box sx={{ p: { xs: 4, md: 6 }, textAlign: "center" }}><Avatar sx={{ mx: "auto", mb: 1.5, bgcolor: "#edf3ff", color: BLUE }}><EmergencyRoundedIcon /></Avatar><Typography fontWeight={700} color={NAVY}>{title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{text}</Typography></Box>; }
function DrawerHeader({ title, onClose }) { return <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2.5, borderBottom: "1px solid #e8edf3" }}><Typography variant="h6" fontWeight={750} color={NAVY}>{title}</Typography><IconButton aria-label="Close drawer" onClick={onClose}><CloseRoundedIcon /></IconButton></Stack>; }
function DrawerActions({ onCancel, submit }) { return <Stack direction="row" justifyContent="flex-end" gap={1.25} sx={{ pt: 3, mt: 3, borderTop: "1px solid #e8edf3" }}><Button onClick={onCancel} sx={{ textTransform: "none", color: "#5e6c80" }}>Cancel</Button><Button type="submit" variant="contained" sx={{ bgcolor: BLUE, textTransform: "none", fontWeight: 700, px: 2.2 }}>{submit}</Button></Stack>; }
function Overview({ services, proposals, areas, requests, onTab }) { const todo = [services.length === 0 && ["Add your first RSA service", 1], proposals.some(item => String(item.priceStatus || item.status).toLowerCase() === "pending") && ["Review dealer price proposals", 2], areas.length === 0 && ["Configure a coverage area", 3]].filter(Boolean); return <><SectionHeading title="RSA overview" description="A quick view of service setup and current activity." /><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}><Paper sx={{ ...surface, p: 2.5 }}><Typography fontWeight={700} color={NAVY} sx={{ mb: 1.5 }}>Setup checklist</Typography>{todo.length ? todo.map(([label, index]) => <Stack key={label} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.25, borderTop: "1px solid #eff2f6" }}><Typography variant="body2">{label}</Typography><Button onClick={() => onTab(index)} size="small" sx={{ textTransform: "none" }}>Open</Button></Stack>) : <Typography variant="body2" color="text.secondary">Core setup is in place. Keep service coverage, pricing and dealer access current.</Typography>}</Paper><Paper sx={{ ...surface, p: 2.5 }}><Typography fontWeight={700} color={NAVY} sx={{ mb: 1.5 }}>Recent RSA activity</Typography>{requests.slice(0, 4).length ? requests.slice(0, 4).map(item => <Stack key={idOf(item)} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.1, borderTop: "1px solid #eff2f6", gap: 1 }}><Box minWidth={0}><Typography variant="body2" fontWeight={650} noWrap>{item.service?.name || `Request ${idOf(item)}`}</Typography><Typography variant="caption" color="text.secondary">{dateLabel(item.createdAt)}</Typography></Box><Status value={item.status} /></Stack>) : <Typography variant="body2" color="text.secondary">No RSA requests yet.</Typography>}</Paper><Paper sx={{ ...surface, p: 2.5, gridColumn: { md: "1 / -1" }}}><Typography fontWeight={700} color={NAVY} sx={{ mb: 1.5 }}>Services snapshot</Typography>{services.length ? <Stack direction="row" flexWrap="wrap" gap={1}>{services.slice(0, 8).map(item => <Chip key={idOf(item)} icon={<BuildRoundedIcon />} label={`${item.name} · ${item.isActive ? "Active" : "Inactive"}`} variant="outlined" />)}</Stack> : <Typography variant="body2" color="text.secondary">No services yet. Create your first roadside service to start setup.</Typography>}</Paper></Box></>; }
function ServiceIcon({ name }) { return ({ bike: <TwoWheelerRoundedIcon />, location: <LocationOnRoundedIcon />, emergency: <EmergencyRoundedIcon /> }[name] || <BuildRoundedIcon />); }
function Services({ services, onAdd, onEdit, onToggle, onManage }) { return <><SectionHeading title="Service catalog" description="Manage the emergency services offered through RSA." action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onAdd} sx={{ bgcolor: BLUE, textTransform: "none" }}>Add Service</Button>} /><Paper sx={{ ...surface, overflow: "hidden" }}>{services.length ? <TableContainer sx={{ overflowX: "auto" }}><Table sx={{ minWidth: 880 }}><TableHead><TableRow sx={{ bgcolor: "#f8faff" }}>{["Service", "Service type", "Status", "Assigned dealers", "Approved + active", "Actions"].map(text => <TableCell key={text} sx={headCell}>{text}</TableCell>)}</TableRow></TableHead><TableBody>{services.map(item => <TableRow key={idOf(item)} hover><TableCell><Stack direction="row" alignItems="center" gap={1.5}><Avatar sx={{ bgcolor: "#edf3ff", color: BLUE }}><ServiceIcon name={item.icon} /></Avatar><Box><Typography fontWeight={700} color={NAVY}>{item.name}</Typography><Typography variant="caption" color="text.secondary">{item.description || "No description"}</Typography></Box></Stack></TableCell><TableCell>{readable(item.type)}</TableCell><TableCell><Status value={item.isActive ? "active" : "inactive"} /></TableCell><TableCell>{item.assignmentCounts?.assigned ?? 0}</TableCell><TableCell>{item.assignmentCounts?.approvedActive ?? 0}</TableCell><TableCell><Stack direction="row" alignItems="center" gap={.5}><Button size="small" onClick={() => onManage(item)} sx={{ textTransform: "none" }}>Manage Dealers</Button><Button size="small" startIcon={<EditRoundedIcon />} onClick={() => onEdit(item)} sx={{ textTransform: "none" }}>Edit</Button><Switch size="small" checked={!!item.isActive} onChange={() => onToggle(item)} inputProps={{ "aria-label": `${item.isActive ? "Disable" : "Enable"} ${item.name}` }} /></Stack></TableCell></TableRow>)}</TableBody></Table></TableContainer> : <Empty title="No RSA services yet" text="Create your first roadside service." />}</Paper></>; }
const statusColorFor = value => ({ approved: "success", pending: "warning", acceptance_pending: "info", revision_requested: "info", rejected: "error" }[String(value || "").toLowerCase()] || "default");
const money = value => value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;
const headCell = { color: "#68778c", fontSize: 11, fontWeight: 750, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" };
function Approvals({ rows, filter, setFilter, onReview }) { return <><SectionHeading title="Price approvals" description="Review proposed service prices and dealer responses." action={<TextField select size="small" value={filter} onChange={event => setFilter(event.target.value)} sx={{ minWidth: 170 }} aria-label="Filter proposals">{["pending", "approved", "rejected", "all"].map(item => <MenuItem key={item} value={item}>{item === "all" ? "All proposals" : `${item[0].toUpperCase()}${item.slice(1)}`}</MenuItem>)}</TextField>} /><Paper sx={{ ...surface, overflow: "hidden" }}>{rows.length ? <TableContainer sx={{ overflowX: "auto" }}><Table sx={{ minWidth: 780 }}><TableHead><TableRow sx={{ bgcolor: "#f8faff" }}>{["Dealer", "RSA service", "Current approved", "Proposed", "Status", "Actions"].map(text => <TableCell key={text} sx={headCell}>{text}</TableCell>)}</TableRow></TableHead><TableBody>{rows.map(row => { const pending = ["pending", "submitted", "proposed"].includes(String(row.priceStatus || row.status).toLowerCase()); return <TableRow key={idOf(row)} hover><TableCell>{displayName(row.dealerId)}</TableCell><TableCell>{row.serviceId?.name || "—"}</TableCell><TableCell>{row.approvedPrice == null ? "—" : `₹${row.approvedPrice}`}</TableCell><TableCell sx={{ fontWeight: 750, color: NAVY }}>₹{row.proposedPrice ?? "—"}</TableCell><TableCell><Status value={row.priceStatus || row.status} /></TableCell><TableCell>{pending ? <Stack direction="row" gap={.5}><Button size="small" onClick={() => onReview(row, "approve")} sx={{ textTransform: "none" }}>Approve</Button><Button size="small" onClick={() => onReview(row, "revise")} sx={{ textTransform: "none" }}>Suggest price</Button><Button size="small" color="error" onClick={() => onReview(row, "reject")} sx={{ textTransform: "none" }}>Reject</Button></Stack> : row.reviewReason || "—"}</TableCell></TableRow>; })}</TableBody></Table></TableContainer> : <Empty title={filter === "pending" ? "You're all caught up. No price approvals pending." : "No price proposals found."} text={filter === "pending" ? "New dealer proposals will appear here for review." : "Try another status filter."} />}</Paper></>; }
function Coverage({ areas, dealers, search, setSearch, onAddArea, onEditArea, onToggleArea, onAddDealer, onEditDealer }) { return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 2 }}><Box><SectionHeading title="Coverage areas" description="Define where RSA service is available." action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onAddArea} sx={{ bgcolor: BLUE, textTransform: "none" }}>Add area</Button>} /><Paper sx={{ ...surface, overflow: "hidden" }}>{areas.length ? areas.map(item => <Stack key={idOf(item)} direction="row" alignItems="center" gap={1.5} sx={{ p: 2, borderBottom: "1px solid #eff2f6" }}><Avatar sx={{ bgcolor: "#fff3e9", color: "#e87527" }}><LocationOnRoundedIcon /></Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={700} color={NAVY}>{item.name}</Typography></Box><Status value={item.isActive ? "active" : "inactive"} /><Button size="small" onClick={() => onEditArea(item)} sx={{ textTransform: "none" }}>Edit</Button><Switch size="small" checked={!!item.isActive} onChange={() => onToggleArea(item)} inputProps={{ "aria-label": `${item.isActive ? "Disable" : "Enable"} ${item.name}` }} /></Stack>) : <Empty title="No RSA service areas configured." text="Add a coverage area to define where assistance is available." />}</Paper><Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>Coverage uses validated geographic boundaries. Each area stays inactive until an administrator enables it.</Alert></Box><Box><SectionHeading title="Dealer access" description="Permission is managed per dealer; no dealer is enabled automatically." action={<Button variant="outlined" onClick={onAddDealer} sx={{ textTransform: "none" }}>Set dealer access</Button>} /><Paper sx={{ ...surface, overflow: "hidden" }}><Box sx={{ p: 1.5 }}><TextField fullWidth size="small" placeholder="Search all dealers by shop, owner, phone or city" value={search} onChange={event => setSearch(event.target.value)} InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: "#8694a8" }} /> }} /></Box>{dealers.length ? <TableContainer sx={{ overflowX: "auto" }}><Table size="small" sx={{ minWidth: 530 }}><TableHead><TableRow sx={{ bgcolor: "#f8faff" }}>{["Dealer", "RSA enabled", "Towing", "Capacity", "Actions"].map(text => <TableCell key={text} sx={headCell}>{text}</TableCell>)}</TableRow></TableHead><TableBody>{dealers.map(item => <TableRow key={idOf(item)}><TableCell>{displayName(item)}</TableCell><TableCell><Status value={item.rsaEnabled ? "active" : "inactive"} /></TableCell><TableCell>{item.capabilities?.includes("towing") ? "Approved" : "—"}</TableCell><TableCell>{item.capacity ?? "—"}</TableCell><TableCell><Button size="small" onClick={() => onEditDealer(item)} sx={{ textTransform: "none" }}>Edit</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer> : <Empty title="No dealers match this search" text="Clear the search or check the dealer directory." />}</Paper></Box></Box>; }
function Requests({ rows, filter, setFilter, onOpen, onAssign }) { const filters = ["all", "searching", "assigned", "in_progress", "completed", "cancelled"]; return <><SectionHeading title="RSA requests" description="Monitor customer assistance requests and dispatch status." action={<TextField select size="small" value={filter} onChange={event => setFilter(event.target.value)} sx={{ minWidth: 160 }} aria-label="Filter requests">{filters.map(item => <MenuItem key={item} value={item}>{item === "all" ? "All requests" : readableStatus(item)}</MenuItem>)}</TextField>} /><Paper sx={{ ...surface, overflow: "hidden" }}>{rows.length ? <TableContainer sx={{ overflowX: "auto" }}><Table sx={{ minWidth: 1040 }}><TableHead><TableRow sx={{ bgcolor: "#f8faff" }}>{["Request ID", "Customer", "Problem", "Dealer", "Location", "Status", "Created at", "Actions"].map(text => <TableCell key={text} sx={headCell}>{text}</TableCell>)}</TableRow></TableHead><TableBody>{rows.map(item => <TableRow key={idOf(item)} hover sx={{ cursor: "pointer" }} onClick={() => onOpen(item)}><TableCell>{String(idOf(item)).slice(-8)}</TableCell><TableCell>{item.customer?.name || item.customerId?.name || "Customer"}</TableCell><TableCell>{item.service?.name || item.problem || "—"}</TableCell><TableCell>{item.assignedDealerId ? (displayName(item.assignedDealerId) !== "—" ? displayName(item.assignedDealerId) : String(idOf(item.assignedDealerId)).slice(-8)) : "Unassigned"}</TableCell><TableCell>{item.location ? `${item.location.latitude ?? "—"}, ${item.location.longitude ?? "—"}` : "—"}</TableCell><TableCell><Status value={item.status} /></TableCell><TableCell>{dateLabel(item.createdAt)}</TableCell><TableCell onClick={event => event.stopPropagation()}><Button size="small" onClick={() => onOpen(item)} sx={{ textTransform: "none" }}>Details</Button>{String(item.status).toLowerCase() === "searching" && <Button size="small" onClick={() => onAssign(item)} sx={{ textTransform: "none" }}>Assign</Button>}</TableCell></TableRow>)}</TableBody></Table></TableContainer> : <Empty title="No RSA requests found" text="Requests will appear here when the backend feature is enabled." />}</Paper></>; }
function readableStatus(value) { return String(value || "unknown").replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase()); }
function Status({ value }) { const label = readableStatus(value); const lower = String(value || "").toLowerCase(); const color = ["active", "approved", "completed", "assigned"].includes(lower) ? "success" : ["pending", "searching", "in progress", "in_progress", "proposed"].includes(lower) ? "warning" : ["rejected", "cancelled", "inactive", "disabled"].includes(lower) ? "default" : "info"; return <Chip size="small" label={label} color={color} variant={color === "default" ? "outlined" : "filled"} sx={{ textTransform: "capitalize", fontWeight: 650, height: 25 }} />; }
function RequestDetails({ item, audit, auditBusy, onAssign, onAssignTowing }) { const location = item.location || {}; const gps = item.providerLocation; return <Stack spacing={2}><Box><Typography variant="h6" color={NAVY} fontWeight={750}>{item.service?.name || `Request ${idOf(item)}`}</Typography><Status value={item.status} /></Box><DetailGroup title="Customer and bike"><Detail label="Customer" value={item.customer?.name || item.customerId?.name || item.customerId || "—"} /><Detail label="Bike" value={[item.bike?.name, item.bike?.model].filter(Boolean).join(" ") || "—"} /><Detail label="Created" value={dateLabel(item.createdAt)} /></DetailGroup><DetailGroup title="Breakdown location"><Detail label="Coordinates" value={location.latitude != null ? `${location.latitude}, ${location.longitude}` : "—"} /><Detail label="Problem" value={item.problem || item.description || "—"} /></DetailGroup><DetailGroup title="Dealer and dispatch"><Detail label="Assigned dealer" value={displayName(item.assignedDealerId) !== "—" ? displayName(item.assignedDealerId) : item.assignedDealerId || "Unassigned"} /><Detail label="Dispatch mode" value={item.dispatchMode || "—"} />{String(item.status).toLowerCase() === "searching" && <Button variant="outlined" onClick={onAssign} sx={{ mt: 1, textTransform: "none" }}>Offer to dealer</Button>}</DetailGroup><DetailGroup title="Inspection and payment"><Detail label="Estimate" value={item.estimateAmount == null ? "—" : `₹${item.estimateAmount}`} /><Detail label="Estimate status" value={item.estimateStatus || "—"} /><Detail label="Customer approval" value={item.customerApproval || "—"} /><Detail label="Payment" value={item.paymentStatus || "—"} /><Detail label="Payment amount" value={item.paymentAmount == null ? "—" : `₹${item.paymentAmount}`} /></DetailGroup><DetailGroup title="GPS freshness"><Detail label="Last provider location" value={gps?.capturedAt ? dateLabel(gps.capturedAt) : "No provider GPS update"} /><Detail label="Accuracy" value={gps?.accuracy != null ? `±${gps.accuracy} m` : "—"} /></DetailGroup><DetailGroup title="Towing proposal"><Detail label="Proposal status" value={item.towingProposal?.status || "Not proposed"} /><Detail label="Reason" value={item.towingProposal?.reason || "—"} /><Detail label="Bike condition" value={item.towingProposal?.bikeCondition || "—"} /><Detail label="Destination" value={item.towingDestination?.label || "—"} /><Detail label="Destination coordinates" value={item.towingDestination ? `${item.towingDestination.latitude}, ${item.towingDestination.longitude}` : "—"} /><Detail label="Route distance" value={item.towingProposal?.distanceKm == null ? "—" : `${item.towingProposal.distanceKm} km`} />{Array.isArray(item.estimateLines) && item.estimateLines.map((line, index) => <Detail key={`${line.description}-${index}`} label={line.description} value={`₹${line.amount}`} />)}{String(item.status).toLowerCase() === "inspection" && <Button variant="outlined" onClick={onAssignTowing} sx={{ mt: 1, textTransform: "none" }}>Reassign to towing provider</Button>}</DetailGroup><DetailGroup title="Towing handover"><Detail label="Status" value={item.handoverVerifiedAt ? "Verified" : "Not recorded"} /></DetailGroup><DetailGroup title="Admin audit history">{auditBusy ? <CircularProgress size={18} /> : audit.length ? audit.map(row => <Typography key={idOf(row)} variant="body2" color="text.secondary">{dateLabel(row.createdAt)} · {row.actorRole || "Admin"} · {row.action}</Typography>) : <Typography variant="body2" color="text.secondary">No audit records available.</Typography>}</DetailGroup></Stack>; }
function DetailGroup({ title, children }) { return <Box sx={{ p: 2, border: "1px solid #e8edf3", borderRadius: 2 }}><Typography variant="subtitle2" fontWeight={750} color={NAVY} sx={{ mb: 1 }}>{title}</Typography>{children}</Box>; }
function Detail({ label, value }) { return <Stack direction="row" justifyContent="space-between" gap={2} sx={{ py: .45 }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" textAlign="right" sx={{ overflowWrap: "anywhere" }}>{String(value)}</Typography></Stack>; }

function radiusPolygon(latitude, longitude, radiusKm) {
  const earthRadiusKm = 6371.0088;
  const angularDistance = radiusKm / earthRadiusKm;
  const latitudeRadians = latitude * Math.PI / 180;
  const longitudeRadians = longitude * Math.PI / 180;
  const ring = Array.from({ length: 49 }, (_, index) => {
    const bearing = 2 * Math.PI * (index % 48) / 48;
    const pointLatitude = Math.asin(Math.sin(latitudeRadians) * Math.cos(angularDistance) + Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearing));
    const pointLongitude = longitudeRadians + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitudeRadians), Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(pointLatitude));
    return [pointLongitude * 180 / Math.PI, pointLatitude * 180 / Math.PI];
  });
  return { type: "Polygon", coordinates: [ring] };
}
