import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useDispatch, useSelector } from "react-redux";
import { fetchBikesByCompany } from "../../../../redux/slices/bikeSlice";

const CC_COLUMNS = [
  {
    field: "variant_name",
    headerName: "Bike Name",
    flex: 2,
    sortable: true,
    renderCell: ({ value }) => (
      <Typography variant="body2" fontWeight={600} noWrap>
        {value}
      </Typography>
    ),
  },
  { field: "company_name", headerName: "Company", flex: 1, sortable: true },
  { field: "model_name", headerName: "Model", flex: 1, sortable: true },
  {
    field: "cc",
    headerName: "CC",
    width: 90,
    type: "number",
    sortable: true,
    renderCell: ({ value }) => (
      <Chip label={`${value} cc`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
    ),
  },
];

const Step3SelectBikes = ({ state, dispatch: wizardDispatch }) => {
  const reduxDispatch = useDispatch();
  const { bikes, loading } = useSelector((s) => s.bike);

  const [search, setSearch] = useState("");
  const [ccFilter, setCcFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  // Controlled selection — array of bike id strings
  const [selectionModel, setSelectionModel] = useState(
    () => state.selectedBikes.map((b) => b._id || b.variant_id)
  );

  // Fetch bikes whenever selected companies change
  const prevCompanyIdsRef = useRef(null);
  useEffect(() => {
    const ids = state.selectedCompanyIds;
    if (ids.length === 0) return;
    const key = [...ids].sort().join(",");
    if (prevCompanyIdsRef.current === key) return;
    prevCompanyIdsRef.current = key;
    reduxDispatch(fetchBikesByCompany(ids));
  }, [state.selectedCompanyIds, reduxDispatch]);

  const companyOptions = useMemo(
    () =>
      [...new Set(bikes.map((bike) => bike.company_name).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [bikes]
  );

  const filteredBikes = useMemo(() => {
    let result = bikes;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.variant_name?.toLowerCase().includes(q) ||
          b.model_name?.toLowerCase().includes(q) ||
          b.company_name?.toLowerCase().includes(q)
      );
    }

    if (companyFilter !== "all") {
      result = result.filter((bike) => bike.company_name === companyFilter);
    }

    if (ccFilter.trim()) {
      const cc = Number(ccFilter);
      if (!isNaN(cc) && cc > 0) {
        result = result.filter(
          (b) => Number(b.cc || b.engine_cc || 0) === cc
        );
      }
    }

    // DataGrid requires a unique `id` field — bikes use variant_id, not _id
    return result.map((b) => ({
      ...b,
      id: b._id || b.variant_id,
      cc: Number(b.cc || b.engine_cc || 0),
    }));
  }, [bikes, search, ccFilter, companyFilter]);

  const handleSelectionChange = useCallback(
    (newIds) => {
      setSelectionModel(newIds);
      const selectedMap = new Map(bikes.map((b) => [b._id || b.variant_id, b]));
      const selected = newIds
        .map((id) => selectedMap.get(id))
        .filter(Boolean);
      wizardDispatch({ type: "SET_BIKES", payload: selected });
    },
    [bikes, wizardDispatch]
  );

  const handleSelectAllVisible = useCallback(() => {
    const ids = filteredBikes.map((b) => b.id);
    // Merge with already-selected (outside current filter)
    const merged = Array.from(new Set([...selectionModel, ...ids]));
    setSelectionModel(merged);
    const selectedMap = new Map(bikes.map((b) => [b._id || b.variant_id, b]));
    wizardDispatch({
      type: "SET_BIKES",
      payload: merged.map((id) => selectedMap.get(id)).filter(Boolean),
    });
  }, [filteredBikes, selectionModel, bikes, wizardDispatch]);

  const handleClearAll = useCallback(() => {
    setSelectionModel([]);
    wizardDispatch({ type: "SET_BIKES", payload: [] });
  }, [wizardDispatch]);

  const handleDeselectVisible = useCallback(() => {
    const visibleIds = new Set(filteredBikes.map((bike) => bike.id));
    const remaining = selectionModel.filter((id) => !visibleIds.has(id));
    setSelectionModel(remaining);
    const bikeMap = new Map(bikes.map((bike) => [bike._id || bike.variant_id, bike]));
    wizardDispatch({
      type: "SET_BIKES",
      payload: remaining.map((id) => bikeMap.get(id)).filter(Boolean),
    });
  }, [filteredBikes, selectionModel, bikes, wizardDispatch]);

  const hasFilters = search.trim() || ccFilter.trim() || companyFilter !== "all";

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
        Select Bikes
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Choose the exact variants this service will cover. Bikes with the same
        CC remain separate mappings; use search and CC only to narrow the list.
      </Typography>

      {/* Toolbar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        mb={2}
        flexWrap="wrap"
      >
        <TextField
          size="small"
          placeholder="Search by name, model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 2, minWidth: 180 }}
        />
        <FormControl size="small" sx={{ flex: 1, minWidth: 170, maxWidth: 220 }}>
          <InputLabel>Bike company</InputLabel>
          <Select
            value={companyFilter}
            label="Bike company"
            onChange={(event) => setCompanyFilter(event.target.value)}
          >
            <MenuItem value="all">All companies</MenuItem>
            {companyOptions.map((company) => (
              <MenuItem key={company} value={company}>
                {company}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="CC filter (e.g. 125)"
          value={ccFilter}
          onChange={(e) => setCcFilter(e.target.value)}
          type="number"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FilterListIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, minWidth: 140, maxWidth: 180 }}
        />
        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
          <Button
            size="small"
            onClick={handleSelectAllVisible}
            disabled={filteredBikes.length === 0}
            sx={{ textTransform: "none", fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Select shown ({filteredBikes.length})
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={hasFilters ? handleDeselectVisible : handleClearAll}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {hasFilters ? "Deselect shown" : "Clear all"}
          </Button>
          <Chip
            label={`${selectionModel.length} selected`}
            size="small"
            color={selectionModel.length > 0 ? "primary" : "default"}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </Stack>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <Stack alignItems="center" spacing={1.5}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">
              Loading bikes…
            </Typography>
          </Stack>
        </Box>
      ) : bikes.length === 0 ? (
        <Alert severity="info">
          No bikes loaded yet. Go back and select at least one company.
        </Alert>
      ) : filteredBikes.length === 0 ? (
        <Alert severity="warning">
          No bikes match your search. Try clearing the filters.
        </Alert>
      ) : (
        <Box sx={{ height: 380 }}>
          <DataGrid
            rows={filteredBikes}
            columns={CC_COLUMNS}
            checkboxSelection
            disableRowSelectionOnClick
            // MUI X v8: rowSelectionModel is { type, ids: Set } not string[]
            rowSelectionModel={{ type: "include", ids: new Set(selectionModel) }}
            onRowSelectionModelChange={(newModel) =>
              handleSelectionChange(Array.from(newModel.ids))
            }
            keepNonExistentRowsSelected
            pageSizeOptions={[25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            density="compact"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { bgcolor: "grey.50" },
              "& .MuiDataGrid-row.Mui-selected": {
                bgcolor: "primary.50",
                "&:hover": { bgcolor: "primary.100" },
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default Step3SelectBikes;
