import React, { useState, useCallback, useMemo } from "react";
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip,
  FormControl, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography,
} from "@mui/material";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import { groupBikesByCC } from "./utils/ccGrouping";

const PriceInput = React.memo(({ id, value, onChange, width = 140 }) => {
  const isError = value !== undefined && value !== "" && Number(value) <= 0;
  return (
    <TextField
      size="small"
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(id, e.target.value)}
      error={isError}
      helperText={isError ? "Must be > 0" : ""}
      InputProps={{
        startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon sx={{ fontSize: 14, color: "text.secondary" }} /></InputAdornment>,
        inputProps: { min: 1, step: 10 },
      }}
      sx={{ width }}
    />
  );
});

const Step4Pricing = ({ state, dispatch }) => {
  const [bulkPrice, setBulkPrice] = useState("");
  const [ccPriceInputs, setCcPriceInputs] = useState({});
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [ccFilter, setCcFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ruleCompany, setRuleCompany] = useState("all");
  const [ruleCC, setRuleCC] = useState("all");
  const [rulePrice, setRulePrice] = useState("");

  const pricedBikes = useMemo(
    () => state.selectedBikes.filter((bike) =>
      state.selectedCCRanges.includes(Number(bike.cc || bike.engine_cc || 0))
    ),
    [state.selectedBikes, state.selectedCCRanges]
  );
  const ccGroups = useMemo(() => groupBikesByCC(pricedBikes), [pricedBikes]);
  const companies = useMemo(
    () => [...new Set(pricedBikes.map((bike) => bike.company_name).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [pricedBikes]
  );

  const ruleCCOptions = useMemo(
    () =>
      [...new Set(
        pricedBikes
          .filter((bike) => ruleCompany === "all" || bike.company_name === ruleCompany)
          .map((bike) => Number(bike.cc || bike.engine_cc || 0))
          .filter((cc) => cc > 0)
      )].sort((a, b) => a - b),
    [pricedBikes, ruleCompany]
  );

  const scopedBikes = useMemo(
    () =>
      pricedBikes.filter(
        (bike) =>
          (ruleCompany === "all" || bike.company_name === ruleCompany) &&
          (ruleCC === "all" || Number(bike.cc || bike.engine_cc || 0) === Number(ruleCC))
      ),
    [pricedBikes, ruleCompany, ruleCC]
  );

  const filteredBikes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pricedBikes.filter((bike) => {
      const price = state.pricing[bike._id];
      const isFilled = price !== undefined && price !== "" && Number(price) > 0;
      const matchesSearch = !query ||
        bike.variant_name?.toLowerCase().includes(query) ||
        bike.model_name?.toLowerCase().includes(query) ||
        bike.company_name?.toLowerCase().includes(query);
      return matchesSearch &&
        (companyFilter === "all" || bike.company_name === companyFilter) &&
        (ccFilter === "all" || Number(bike.cc || bike.engine_cc || 0) === Number(ccFilter)) &&
        (statusFilter === "all" || (statusFilter === "missing" ? !isFilled : isFilled));
    });
  }, [pricedBikes, state.pricing, search, companyFilter, ccFilter, statusFilter]);

  const { filledCount, isAllValid } = useMemo(() => {
    const filled = pricedBikes.filter((bike) => {
      const price = state.pricing[bike._id];
      return price !== undefined && price !== "" && Number(price) > 0;
    }).length;
    return { filledCount: filled, isAllValid: filled === pricedBikes.length };
  }, [pricedBikes, state.pricing]);

  const applyPrice = useCallback((bikes, price) => {
    if (!price || Number(price) <= 0 || bikes.length === 0) return;
    dispatch({
      type: "SET_PRICES",
      payload: Object.fromEntries(bikes.map((bike) => [bike._id, price])),
    });
  }, [dispatch]);

  const handlePriceChange = useCallback(
    (bikeId, price) => dispatch({ type: "SET_PRICE", bikeId, price }),
    [dispatch]
  );

  const handleCcPriceChange = useCallback((cc, price) => {
    setCcPriceInputs((current) => ({ ...current, [cc]: price }));
    const group = ccGroups.find((item) => item.cc === cc);
    if (group) applyPrice(group.bikes, price);
  }, [ccGroups, applyPrice]);

  const hasActiveFilters = search.trim() || companyFilter !== "all" || ccFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => {
    setSearch(""); setCompanyFilter("all"); setCcFilter("all"); setStatusFilter("all");
  };

  const handleRuleCompanyChange = (value) => {
    setRuleCompany(value);
    setRuleCC("all");
    setCompanyFilter(value);
    setCcFilter("all");
    setSearch("");
    setStatusFilter("all");
  };

  const handleRuleCCChange = (value) => {
    setRuleCC(value);
    setCompanyFilter(ruleCompany);
    setCcFilter(value);
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1} mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Set prices quickly</Typography>
          <Typography variant="body2" color="text.secondary">
            Start with one price for all bikes, then filter and override only where needed.
          </Typography>
        </Box>
        <Chip label={`${filledCount} / ${pricedBikes.length} priced`} color={isAllValid ? "success" : "warning"}
          sx={{ fontWeight: 800, alignSelf: { xs: "flex-start", sm: "center" } }} />
      </Stack>

      <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid", borderColor: "primary.light", bgcolor: "primary.50", borderRadius: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} gap={1.5}>
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={800}>Same price for every selected bike</Typography>
            <Typography variant="caption" color="text.secondary">
              Fills all {pricedBikes.length} bikes in one click. You can still change individual prices below.
            </Typography>
          </Box>
          <PriceInput id="all" value={bulkPrice} onChange={(_, value) => setBulkPrice(value)} width={180} />
          <Button variant="contained" disabled={!bulkPrice || Number(bulkPrice) <= 0}
            onClick={() => applyPrice(pricedBikes, bulkPrice)}
            sx={{ textTransform: "none", fontWeight: 800, minWidth: 150 }}>Apply to all</Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Stack direction={{ xs: "column", lg: "row" }} alignItems={{ lg: "center" }} gap={1.5}>
          <Box sx={{ minWidth: { lg: 255 }, flex: 1 }}>
            <Typography variant="body2" fontWeight={800}>Apply price by company and CC</Typography>
            <Typography variant="caption" color="text.secondary">
              Choose a company, optionally narrow it by CC, then apply one price.
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Bike company</InputLabel>
            <Select
              value={ruleCompany}
              label="Bike company"
              onChange={(event) => handleRuleCompanyChange(event.target.value)}
            >
              <MenuItem value="all">All companies</MenuItem>
              {companies.map((company) => <MenuItem key={company} value={company}>{company}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 145 }}>
            <InputLabel>CC range</InputLabel>
            <Select
              value={ruleCC}
              label="CC range"
              onChange={(event) => handleRuleCCChange(event.target.value)}
            >
              <MenuItem value="all">All CC</MenuItem>
              {ruleCCOptions.map((cc) => <MenuItem key={cc} value={cc}>{cc} cc</MenuItem>)}
            </Select>
          </FormControl>
          <PriceInput id="rule-price" value={rulePrice} onChange={(_, value) => setRulePrice(value)} width={165} />
          <Button
            variant="contained"
            disabled={!rulePrice || Number(rulePrice) <= 0 || scopedBikes.length === 0}
            onClick={() => applyPrice(scopedBikes, rulePrice)}
            sx={{ textTransform: "none", fontWeight: 800, minWidth: 205 }}
          >
            Apply to {scopedBikes.length} bike{scopedBikes.length !== 1 ? "s" : ""}
          </Button>
        </Stack>
        <Alert severity="info" icon={false} sx={{ mt: 1.5, py: 0.25 }}>
          Target: <strong>{ruleCompany === "all" ? "All companies" : ruleCompany}</strong>
          {" · "}<strong>{ruleCC === "all" ? "All CC ranges" : `${ruleCC} cc`}</strong>
          {" · "}{scopedBikes.length} matching bike{scopedBikes.length !== 1 ? "s" : ""}
        </Alert>
      </Paper>

      <Accordion elevation={0} sx={{ mb: 2, border: "1px solid", borderColor: "divider", borderRadius: "8px !important" }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box>
            <Typography variant="body2" fontWeight={800}>Optional: different price by CC</Typography>
            <Typography variant="caption" color="text.secondary">Open only if CC groups need different prices.</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 1 }}>
            {ccGroups.map((group) => (
              <Stack key={group.cc} direction="row" alignItems="center" gap={1}
                sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                <Box sx={{ minWidth: 82 }}>
                  <Typography variant="body2" fontWeight={800}>{group.cc} cc</Typography>
                  <Typography variant="caption" color="text.secondary">{group.bikes.length} bikes</Typography>
                </Box>
                <PriceInput id={group.cc} value={ccPriceInputs[group.cc]} onChange={handleCcPriceChange} width={150} />
              </Stack>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Stack direction={{ xs: "column", lg: "row" }} gap={1} alignItems={{ lg: "center" }}>
          <TextField size="small" placeholder="Search bike, model or company" value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 240, flex: 1 }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Company</InputLabel>
            <Select value={companyFilter} label="Company" onChange={(event) => setCompanyFilter(event.target.value)}>
              <MenuItem value="all">All companies</MenuItem>
              {companies.map((company) => <MenuItem key={company} value={company}>{company}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 125 }}>
            <InputLabel>CC</InputLabel>
            <Select value={ccFilter} label="CC" onChange={(event) => setCcFilter(event.target.value)}>
              <MenuItem value="all">All CC</MenuItem>
              {ccGroups.map((group) => <MenuItem key={group.cc} value={group.cc}>{group.cc} cc</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 135 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(event) => setStatusFilter(event.target.value)}>
              <MenuItem value="all">All prices</MenuItem><MenuItem value="missing">Missing only</MenuItem><MenuItem value="filled">Priced only</MenuItem>
            </Select>
          </FormControl>
          {hasActiveFilters && <Button onClick={clearFilters} color="inherit" sx={{ textTransform: "none" }}>Clear filters</Button>}
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} gap={1} mt={1.5}>
          <Typography variant="body2" fontWeight={700} sx={{ mr: "auto" }}>Showing {filteredBikes.length} of {pricedBikes.length} bikes</Typography>
          <Typography variant="caption" color="text.secondary">Use the main price above:</Typography>
          <Button variant="outlined" disabled={!bulkPrice || Number(bulkPrice) <= 0 || filteredBikes.length === 0}
            onClick={() => applyPrice(filteredBikes, bulkPrice)} sx={{ textTransform: "none", fontWeight: 700 }}>
            Apply ₹{bulkPrice || "—"} to shown ({filteredBikes.length})
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, maxHeight: 390 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow sx={{ "& th": { bgcolor: "grey.50", fontWeight: 800, fontSize: "0.75rem", color: "text.secondary", textTransform: "uppercase" } }}>
            <TableCell>Bike</TableCell><TableCell>Company</TableCell><TableCell>Model</TableCell><TableCell align="center">CC</TableCell><TableCell>Price</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {filteredBikes.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: "text.secondary" }}>No bikes match these filters.</TableCell></TableRow>
            ) : filteredBikes.map((bike) => (
              <TableRow key={bike._id} hover>
                <TableCell><Typography variant="body2" fontWeight={700}>{bike.variant_name}</Typography></TableCell>
                <TableCell>{bike.company_name}</TableCell><TableCell>{bike.model_name || "—"}</TableCell>
                <TableCell align="center"><Chip label={`${Number(bike.cc || bike.engine_cc || 0)} cc`} size="small" variant="outlined" /></TableCell>
                <TableCell><PriceInput id={bike._id} value={state.pricing[bike._id]} onChange={handlePriceChange} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {!isAllValid && <Alert severity="warning" sx={{ mt: 2 }}>{pricedBikes.length - filledCount} bike(s) still need a valid price. Filter by “Missing only” to finish quickly.</Alert>}
      {isAllValid && <Alert severity="success" sx={{ mt: 2 }}>All {pricedBikes.length} bikes are priced and ready to review.</Alert>}
    </Box>
  );
};

export default React.memo(Step4Pricing);
