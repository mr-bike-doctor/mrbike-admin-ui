import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Stack,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBaseServices,
  fetchAdditionalServices,
} from "../../../redux/slices/serviceSlice";
import AddServiceWizard from "./wizard/AddServiceWizard";
import EditServiceDialog from "./EditServiceDialog";
import Swal from "sweetalert2";

const EMPTY_ARRAY = [];

const pickLatestDate = (current, next) => {
  if (!current) return next || null;
  if (!next) return current;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
};

const ServiceListTab = ({
  serviceType,
  currentPricing,
  allPricing,
  dealerId,
  onSave,
}) => {
  const dispatch = useDispatch();
  const { baseServices, additionalServices } = useSelector(
    (state) => state.service
  );

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [addWizardOpen, setAddWizardOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const masterServices =
    serviceType === "base" ? baseServices : additionalServices;

  // Refetch on mount — a session-long Redux copy misses services created after
  // the first load (see Step1SelectService).
  useEffect(() => {
    if (serviceType === "base") dispatch(fetchBaseServices());
    if (serviceType === "additional") dispatch(fetchAdditionalServices());
  }, [serviceType, dispatch]);

  // Group flat pricing entries by serviceId → one table row per service
  const rows = useMemo(() => {
    const groups = {};
    currentPricing.forEach((entry) => {
      const svcId = String(entry.serviceId);
      if (!groups[svcId]) {
        groups[svcId] = {
          serviceId: svcId,
          entries: [],
          companies: new Set(),
          bikes: new Set(),
          lastUpdated: entry.updatedAt || entry.createdAt || null,
        };
      }
      groups[svcId].entries.push(entry);
      if (entry.companyName) groups[svcId].companies.add(entry.companyName);
      if (entry.variantId) groups[svcId].bikes.add(entry.variantId);
      groups[svcId].lastUpdated = pickLatestDate(
        groups[svcId].lastUpdated,
        entry.updatedAt || entry.createdAt || null
      );
    });

    return Object.values(groups).map((g) => {
      const master = masterServices.find((s) => String(s._id) === g.serviceId);
      return {
        serviceId: g.serviceId,
        serviceName:
          master?.name ||
          g.entries[0]?.serviceName ||
          g.entries[0]?.name ||
          "Unknown Service",
        totalCompanies: g.companies.size,
        totalBikes: g.bikes.size,
        lastUpdated: g.lastUpdated,
        entries: g.entries,
      };
    });
  }, [currentPricing, masterServices]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.serviceName.toLowerCase().includes(q));
  }, [rows, search]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
    setPage(0);
  }, []);

  const handleDelete = useCallback(
    async (row) => {
      const result = await Swal.fire({
        title: "Delete Service?",
        html: `Remove <strong>${row.serviceName}</strong> and all <strong>${row.totalBikes}</strong> bike pricing records for this dealer?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d32f2f",
        cancelButtonColor: "#757575",
        confirmButtonText: "Yes, Delete",
        cancelButtonText: "Cancel",
        borderRadius: "12px",
      });
      if (!result.isConfirmed) return;

      try {
        const newPricing = allPricing.filter(
          (p) =>
            !(
              String(p.serviceId) === row.serviceId && p.type === serviceType
            )
        );
        await onSave(newPricing);
        Swal.fire({
          icon: "success",
          title: "Deleted",
          text: `${row.serviceName} removed.`,
          timer: 1800,
          showConfirmButton: false,
        });
      } catch {
        setSaveError("Failed to delete service. Please try again.");
      }
    },
    [allPricing, serviceType, onSave]
  );

  const handleEdit = useCallback((row) => {
    setEditItem(row);
  }, []);

  const handleEditClose = useCallback(() => {
    setEditItem(null);
  }, []);

  const handleAddClose = useCallback(() => {
    setAddWizardOpen(false);
  }, []);

  const isEmpty = rows.length === 0;
  const noResults = !isEmpty && filtered.length === 0;

  return (
    <Box>
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      {/* ── Toolbar ── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        mb={2}
      >
        <TextField
          size="small"
          placeholder={`Search ${serviceType} services…`}
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: 300 } }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddWizardOpen(true)}
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            textTransform: "none",
            px: 3,
            whiteSpace: "nowrap",
          }}
        >
          Add {serviceType === "base" ? "Base" : "Additional"} Service
        </Button>
      </Stack>

      {/* ── Empty state ── */}
      {isEmpty ? (
        <Paper
          elevation={0}
          sx={{
            border: "2px dashed",
            borderColor: "divider",
            borderRadius: 3,
            p: 6,
            textAlign: "center",
          }}
        >
          <TwoWheelerIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" fontWeight={700} color="text.secondary" mb={1}>
            No {serviceType === "base" ? "Base" : "Additional"} Services Yet
          </Typography>
          <Typography variant="body2" color="text.disabled" mb={3}>
            Configure service pricing by clicking the button above.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddWizardOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
          >
            Add Your First Service
          </Button>
        </Paper>
      ) : (
        /* ── Table ── */
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "grey.50",
                    "& th": { fontWeight: 700, fontSize: "0.8rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 },
                  }}
                >
                  <TableCell>Service Name</TableCell>
                  <TableCell align="center">Companies</TableCell>
                  <TableCell align="center">Bikes</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {noResults ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align="center"
                      sx={{ py: 5, color: "text.disabled" }}
                    >
                      No services match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((row) => (
                    <TableRow
                      key={row.serviceId}
                      hover
                      sx={{ "&:last-child td": { borderBottom: 0 } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {row.serviceName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={row.totalCompanies}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={row.totalBikes}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {row.lastUpdated
                            ? new Date(row.lastUpdated).toLocaleDateString(
                                "en-IN",
                                { day: "2-digit", month: "short", year: "numeric" }
                              )
                            : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={0.5}
                          justifyContent="flex-end"
                        >
                          <Tooltip title="Edit service">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEdit(row)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete service">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(row)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(+e.target.value);
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25]}
            sx={{ borderTop: "1px solid", borderColor: "divider" }}
          />
        </Paper>
      )}

      {/* ── Add Wizard ── */}
      <AddServiceWizard
        open={addWizardOpen}
        onClose={handleAddClose}
        serviceType={serviceType}
        allPricing={allPricing}
        dealerId={dealerId}
        onSave={onSave}
      />

      {/* ── Edit Dialog ── */}
      {editItem && (
        <EditServiceDialog
          open={!!editItem}
          onClose={handleEditClose}
          serviceType={serviceType}
          serviceRow={editItem}
          allPricing={allPricing}
          dealerId={dealerId}
          onSave={onSave}
        />
      )}
    </Box>
  );
};

export default React.memo(ServiceListTab);
