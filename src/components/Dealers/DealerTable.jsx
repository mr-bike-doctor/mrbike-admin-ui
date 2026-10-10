import React, { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import { useDownloadExcel } from "react-export-table-to-excel";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateDealerStatus, deleteDealer } from "../../api";
import { notifyDealerStatusChanged } from "../../redux/dealerNotify";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Avatar,
  TablePagination,
  TextField,
  InputAdornment,
  TableSortLabel,
  Stack,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Verified as VerifiedIcon,
  PendingActions as PendingIcon,
  Cancel as CancelIcon,
  Analytics as AnalyticsIcon,
  Block as BlockIcon,
  LockOpen as LockOpenIcon,
  PowerSettingsNew as PowerIcon,
  TwoWheeler as TwoWheelerIcon,
  LocalShipping as DropIcon,
  CalendarToday as CalendarIcon,
  DeleteForever as DeleteForeverIcon,
} from "@mui/icons-material";

// Tab ids map 1:1 to the `stage` query of GET /dealer/admin/dealers.
const FILTER_TABS = [
  { id: "all",            label: "All" },
  { id: "new",            label: "New Signups" },
  { id: "waiting_review", label: "Waiting Review" },
  { id: "reverification", label: "Re-verification" },
  { id: "approved",       label: "Existing (Approved)" },
  { id: "active",         label: "Active" },
  { id: "inactive",       label: "Inactive" },
  { id: "rejected",       label: "Rejected" },
  { id: "blocked",        label: "Blocked" },
];

const TABLE_HEADERS = [
  { id: "id",        label: "#",           sortable: false },
  { id: "shopName",  label: "Shop Details", sortable: true },
  { id: "ownerName", label: "Owner",        sortable: true },
  { id: "contact",   label: "Contact Info", sortable: false },
  { id: "city",      label: "Location",     sortable: true },
  { id: "services",  label: "Services",     sortable: false },
  { id: "status",    label: "Status",       sortable: false },
  { id: "cancelRate",label: "Perf.",        sortable: false },
  { id: "createdAt", label: "Created",      sortable: true },
  { id: "actions",   label: "Actions",      sortable: false },
];

const STAGE_STYLES = {
  new:            { color: "#0369a1", bgColor: "#f0f9ff", icon: <PendingIcon fontSize="inherit" /> },
  waiting_review: { color: "#d69e2e", bgColor: "#fffaf0", icon: <PendingIcon fontSize="inherit" /> },
  reverification: { color: "#2b6cb0", bgColor: "#ebf8ff", icon: <PendingIcon fontSize="inherit" /> },
  active:         { color: "#38a169", bgColor: "#f0fff4", icon: <VerifiedIcon fontSize="inherit" /> },
  inactive:       { color: "#718096", bgColor: "#f7fafc", icon: <VerifiedIcon fontSize="inherit" /> },
  rejected:       { color: "#e53e3e", bgColor: "#fff5f5", icon: <CancelIcon fontSize="inherit" /> },
  blocked:        { color: "#e53e3e", bgColor: "#fff5f5", icon: <BlockIcon fontSize="inherit" /> },
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Purely presentational: the parent page owns stage/search/sort/page and
// fetches GET /dealer/admin/dealers, which does all filtering server-side.
const DealerTable = ({
  triggerDownloadExcel,
  triggerDownloadPDF,
  rows = [],
  counts = {},
  total = 0,
  stage,
  onStageChange,
  searchInput,
  onSearchChange,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  sortBy,
  order,
  onSort,
  text,
  onDealerDeleted,
  loading: parentLoading,
}) => {
  const tableRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = !user?.role || user?.role?.toLowerCase() === "admin";
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuDealer, setMenuDealer] = useState(null);

  const { onDownload } = useDownloadExcel({
    currentTableRef: tableRef.current,
    filename: `${text}_List`,
    sheet: text,
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`${text} List`, 14, 10);
    doc.autoTable({ html: "#dealer-table-mui", startY: 20, theme: "striped" });
    doc.save(`${text}_List.pdf`);
  };

  useEffect(() => {
    if (triggerDownloadExcel) triggerDownloadExcel.current = onDownload;
    if (triggerDownloadPDF) triggerDownloadPDF.current = exportToPDF;
  }, [onDownload]);

  const handleMenuOpen = (event, dealer) => {
    setAnchorEl(event.currentTarget);
    setMenuDealer(dealer);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuDealer(null);
  };

  const handleMenuActivate = async (dealer) => {
    handleMenuClose();
    const next = !dealer.isActive;
    const label = next ? "Activate" : "Deactivate";
    const result = await Swal.fire({
      title: `${label} Dealer?`,
      text: `This will ${label.toLowerCase()} ${dealer.shopName}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: label,
      confirmButtonColor: next ? "#38a169" : "#e53e3e",
    });
    if (!result.isConfirmed) return;
    try {
      await updateDealerStatus(dealer._id, { isActive: next });
      notifyDealerStatusChanged(dispatch);
      await onDealerDeleted();
      Swal.fire("Done", `Dealer ${label.toLowerCase()}d successfully.`, "success");
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };

  const handleMenuBlock = async (dealer) => {
    handleMenuClose();
    const isCurrentlyBlocked = !!dealer.isBlocked;
    if (!isCurrentlyBlocked) {
      const result = await Swal.fire({
        title: "Block Dealer?",
        text: `Provide a reason for blocking ${dealer.shopName}.`,
        icon: "warning",
        input: "textarea",
        inputPlaceholder: "Enter reason for blocking...",
        showCancelButton: true,
        confirmButtonText: "Block",
        confirmButtonColor: "#e53e3e",
        inputValidator: (v) => (!v?.trim() ? "A reason is required." : undefined),
      });
      if (!result.isConfirmed) return;
      try {
        await updateDealerStatus(dealer._id, { isBlocked: true, blockedReason: result.value.trim() });
        notifyDealerStatusChanged(dispatch);
        await onDealerDeleted();
        Swal.fire("Blocked", `${dealer.shopName} has been blocked.`, "success");
      } catch (e) {
        Swal.fire("Error", e.message, "error");
      }
    } else {
      const result = await Swal.fire({
        title: "Unblock Dealer?",
        text: `This will restore access for ${dealer.shopName}.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Unblock",
        confirmButtonColor: "#38a169",
      });
      if (!result.isConfirmed) return;
      try {
        await updateDealerStatus(dealer._id, { isBlocked: false, blockedReason: "" });
        notifyDealerStatusChanged(dispatch);
        await onDealerDeleted();
        Swal.fire("Unblocked", `${dealer.shopName} has been unblocked.`, "success");
      } catch (e) {
        Swal.fire("Error", e.message, "error");
      }
    }
  };

  const handleMenuDelete = async (dealer) => {
    handleMenuClose();
    const { value: typed } = await Swal.fire({
      title: "Delete Dealer Permanently?",
      html: `<p style="color:#e53e3e;font-weight:600;margin-bottom:12px">This action cannot be undone.</p>
             <p style="margin-bottom:8px">Type <strong>DELETE</strong> to confirm:</p>`,
      input: "text",
      inputPlaceholder: "Type DELETE here",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete Permanently",
      confirmButtonColor: "#e53e3e",
      inputValidator: (value) => {
        if (value !== "DELETE") return 'You must type exactly "DELETE" to confirm.';
      },
    });
    if (typed !== "DELETE") return;
    try {
      await deleteDealer(dealer._id);
      onDealerDeleted();
    } catch (e) {
      Swal.fire("Error", e.message, "error");
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Quick Filter Tabs */}
      <Paper
        elevation={0}
        sx={{ mb: 2, borderRadius: 3, border: "1px solid #edf2f7", overflow: "hidden" }}
      >
        <Tabs
          value={stage}
          onChange={(_, v) => onStageChange(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              minHeight: 48,
              fontSize: "0.875rem",
              color: "#64748b",
            },
            "& .Mui-selected": { color: "#2e83ff" },
            "& .MuiTabs-indicator": { backgroundColor: "#2e83ff" },
          }}
        >
          {FILTER_TABS.map(tab => (
            <Tab
              key={tab.id}
              value={tab.id}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  {tab.label}
                  <Chip
                    label={counts[tab.id] ?? 0}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: stage === tab.id ? "#2e83ff" : "#f1f5f9",
                      color: stage === tab.id ? "white" : "#64748b",
                      "& .MuiChip-label": { px: 0.75 },
                      transition: "all 0.2s",
                    }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Search + Result Count */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search by Shop, Owner, Phone, Email, City or MRBD ID..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ width: { xs: "100%", sm: 460 }, backgroundColor: "white", borderRadius: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
          {total} {total === 1 ? "dealer" : "dealers"} found
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        elevation={3}
        sx={{ borderRadius: 3, overflow: "auto", border: "1px solid #edf2f7" }}
      >
        <Table id="dealer-table-mui" ref={tableRef} sx={{ minWidth: 1100 }}>
          <TableHead sx={{ backgroundColor: "#2e83ff" }}>
            <TableRow>
              {TABLE_HEADERS.map(h => (
                <TableCell
                  key={h.id}
                  sx={{ color: "white", fontWeight: 700, py: 2, whiteSpace: "nowrap" }}
                >
                  {h.sortable ? (
                    <TableSortLabel
                      active={sortBy === h.id}
                      direction={sortBy === h.id ? order : "asc"}
                      onClick={() => onSort(h.id)}
                      sx={{
                        color: "white !important",
                        "&.MuiTableSortLabel-active": { color: "white !important" },
                        "& .MuiTableSortLabel-icon": { color: "white !important" },
                      }}
                    >
                      {h.label}
                    </TableSortLabel>
                  ) : (
                    h.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {parentLoading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading dealers...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    No dealers found matching your criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((dealer, index) => {
                const stageStyle = STAGE_STYLES[dealer.stage] || STAGE_STYLES.new;
                const cancelRate = Number(dealer.bookingStats?.cancelRate || 0).toFixed(1);
                const isHighCancel = parseFloat(cancelRate) > 15;
                const isBlocked = dealer.stage === "blocked";

                return (
                  <TableRow
                    key={dealer._id}
                    hover
                    sx={{
                      "&:hover": { bgcolor: "#f8fafc" },
                      bgcolor: isBlocked ? "#fff8f8" : "inherit",
                    }}
                  >
                    {/* # */}
                    <TableCell sx={{ color: "#94a3b8", fontWeight: 600, fontSize: "0.8rem", width: 48 }}>
                      {page * rowsPerPage + index + 1}
                    </TableCell>

                    {/* Shop Details */}
                    <TableCell sx={{ minWidth: 200 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: "#eef5ff",
                            color: "#2e83ff",
                            fontWeight: 800,
                            width: 44,
                            height: 44,
                            fontSize: "1.1rem",
                            flexShrink: 0,
                            border: "2px solid #dbeafe",
                          }}
                        >
                          {(dealer.shopName || "?").charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: "#1e293b",
                              cursor: "pointer",
                              "&:hover": { color: "#2e83ff" },
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 160,
                            }}
                            onClick={() => navigate(`/view-dealer/${dealer._id}`)}
                          >
                            {dealer.shopName || "N/A"}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "#2e83ff", fontWeight: 600, fontFamily: "monospace" }}
                          >
                            {dealer.dealerId || dealer._id?.slice(-8)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Owner */}
                    <TableCell sx={{ minWidth: 120 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#4a5568" }}>
                        {dealer.ownerName || "N/A"}
                      </Typography>
                    </TableCell>

                    {/* Contact Info */}
                    <TableCell sx={{ minWidth: 180 }}>
                      <Stack spacing={0.5}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <EmailIcon sx={{ fontSize: 13, color: "text.secondary", flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ color: "#4a5568" }}>
                            {dealer.shopEmail || dealer.email || "N/A"}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <PhoneIcon sx={{ fontSize: 13, color: "text.secondary", flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ color: "#4a5568" }}>
                            {dealer.shopContact || dealer.phone || "N/A"}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* Location */}
                    <TableCell sx={{ minWidth: 110 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#2d3748" }}>
                        {dealer.permanentAddress?.city || dealer.city || "N/A"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dealer.permanentAddress?.state || dealer.state || "N/A"}
                      </Typography>
                    </TableCell>

                    {/* Services: Pickup / Drop */}
                    <TableCell sx={{ minWidth: 90 }}>
                      <Stack spacing={0.5}>
                        <Tooltip title={dealer.providesPickup ? "Pickup available" : "Pickup not available"}>
                          <Chip
                            icon={<TwoWheelerIcon sx={{ fontSize: "12px !important" }} />}
                            label="Pickup"
                            size="small"
                            variant={dealer.providesPickup ? "filled" : "outlined"}
                            color={dealer.providesPickup ? "primary" : "default"}
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              opacity: dealer.providesPickup ? 1 : 0.45,
                              "& .MuiChip-label": { px: 0.75 },
                            }}
                          />
                        </Tooltip>
                        <Tooltip title={dealer.providesDrop ? "Drop available" : "Drop not available"}>
                          <Chip
                            icon={<DropIcon sx={{ fontSize: "12px !important" }} />}
                            label="Drop"
                            size="small"
                            variant={dealer.providesDrop ? "filled" : "outlined"}
                            color={dealer.providesDrop ? "secondary" : "default"}
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              opacity: dealer.providesDrop ? 1 : 0.45,
                              "& .MuiChip-label": { px: 0.75 },
                            }}
                          />
                        </Tooltip>
                      </Stack>
                    </TableCell>

                    {/* Stage (computed server-side) */}
                    <TableCell sx={{ minWidth: 120 }}>
                      <Chip
                        icon={stageStyle.icon}
                        label={dealer.stageLabel || dealer.stage}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: stageStyle.color,
                          bgcolor: stageStyle.bgColor,
                          border: `1px solid ${stageStyle.color}44`,
                          borderRadius: 1,
                          "& .MuiChip-label": { px: 0.75 },
                        }}
                      />
                    </TableCell>

                    {/* Performance */}
                    <TableCell sx={{ minWidth: 80 }}>
                      <Tooltip
                        title={
                          isHighCancel
                            ? "High cancellation rate detected!"
                            : `${dealer.bookingStats?.cancelled || 0} of ${dealer.bookingStats?.total || 0} bookings cancelled`
                        }
                      >
                          <Chip
                            label={`${cancelRate}%`}
                            size="small"
                            color={isHighCancel ? "error" : "success"}
                            variant="outlined"
                            icon={<AnalyticsIcon sx={{ fontSize: "14px !important" }} />}
                            sx={{ fontWeight: 700, height: 24 }}
                          />
                      </Tooltip>
                    </TableCell>

                    {/* Created Date */}
                    <TableCell sx={{ minWidth: 110 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <CalendarIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "#4a5568", whiteSpace: "nowrap" }}>
                          {formatDate(dealer.createdAt)}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, dealer)}>
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => onPageChange(p)}
          onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          sx={{ borderTop: "1px solid #edf2f7" }}
        />
      </TableContainer>

      {/* Quick Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 190, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" },
        }}
      >
        <MenuItem
          onClick={() => { handleMenuClose(); navigate(`/view-dealer/${menuDealer?._id}`); }}
        >
          <VisibilityIcon sx={{ mr: 1.5, color: "info.main", fontSize: 18 }} />
          <Typography variant="body2" fontWeight={600}>View Profile</Typography>
        </MenuItem>

        <MenuItem
          onClick={() => { handleMenuClose(); navigate(`/updateDealer/${menuDealer?._id}`); }}
        >
          <EditIcon sx={{ mr: 1.5, color: "primary.main", fontSize: 18 }} />
          <Typography variant="body2" fontWeight={600}>Edit Dealer</Typography>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem onClick={() => menuDealer && handleMenuActivate(menuDealer)}>
          <PowerIcon
            sx={{
              mr: 1.5,
              fontSize: 18,
              color: menuDealer?.isActive ? "error.main" : "success.main",
            }}
          />
          <Typography
            variant="body2"
            fontWeight={600}
            color={menuDealer?.isActive ? "error.main" : "success.main"}
          >
            {menuDealer?.isActive ? "Deactivate" : "Activate"}
          </Typography>
        </MenuItem>

        <MenuItem onClick={() => menuDealer && handleMenuBlock(menuDealer)}>
          {menuDealer?.isBlocked ? (
            <LockOpenIcon sx={{ mr: 1.5, color: "success.main", fontSize: 18 }} />
          ) : (
            <BlockIcon sx={{ mr: 1.5, color: "error.main", fontSize: 18 }} />
          )}
          <Typography
            variant="body2"
            fontWeight={600}
            color={menuDealer?.isBlocked ? "success.main" : "error.main"}
          >
            {menuDealer?.isBlocked ? "Unblock" : "Block"}
          </Typography>
        </MenuItem>

        {isSuperAdmin && [
          <Divider key="delete-divider" sx={{ my: 0.5 }} />,
          <MenuItem
            key="delete-permanently"
            onClick={() => menuDealer && handleMenuDelete(menuDealer)}
            sx={{ bgcolor: "#fff5f5", "&:hover": { bgcolor: "#fed7d7" } }}
          >
            <DeleteForeverIcon sx={{ mr: 1.5, color: "error.main", fontSize: 18 }} />
            <Typography variant="body2" fontWeight={700} color="error.main">
              Delete Permanently
            </Typography>
          </MenuItem>,
        ]}
      </Menu>
    </Box>
  );
};

export default DealerTable;
