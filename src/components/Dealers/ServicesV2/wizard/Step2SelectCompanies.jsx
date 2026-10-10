import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardActionArea,
  Checkbox,
  TextField,
  InputAdornment,
  Button,
  Stack,
  Skeleton,
  Avatar,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useDispatch, useSelector } from "react-redux";
import { fetchCompanies } from "../../../../redux/slices/bikeSlice";

// Memoised single company card — prevents all cards from re-rendering on each toggle
const CompanyCard = React.memo(({ company, isSelected, onToggle }) => (
  <Card
    elevation={0}
    sx={{
      border: "2px solid",
      borderColor: isSelected ? "primary.main" : "divider",
      borderRadius: 2,
      bgcolor: isSelected ? "primary.50" : "background.paper",
      transition: "border-color 0.15s, background-color 0.15s",
      "&:hover": { borderColor: isSelected ? "primary.dark" : "primary.light" },
    }}
  >
    <CardActionArea
      onClick={() => onToggle(company._id)}
      sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}
    >
      <Checkbox
        checked={isSelected}
        disableRipple
        size="small"
        sx={{ p: 0, mr: 0.5 }}
        color="primary"
      />
      <Avatar
        sx={{
          width: 28,
          height: 28,
          bgcolor: isSelected ? "primary.main" : "grey.300",
          fontSize: 12,
          fontWeight: 800,
          transition: "background-color 0.15s",
        }}
      >
        {company.name?.[0]?.toUpperCase()}
      </Avatar>
      <Typography
        variant="body2"
        fontWeight={isSelected ? 700 : 500}
        noWrap
        sx={{ flex: 1 }}
      >
        {company.name}
      </Typography>
    </CardActionArea>
  </Card>
));

const Step2SelectCompanies = ({ state, dispatch: wizardDispatch }) => {
  const reduxDispatch = useDispatch();
  const { companies, loading } = useSelector((s) => s.bike);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (companies.length === 0) reduxDispatch(fetchCompanies());
  }, [companies.length, reduxDispatch]);

  const filtered = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter((c) => c.name?.toLowerCase().includes(q));
  }, [companies, search]);

  const handleToggle = useCallback(
    (id) => {
      const current = state.selectedCompanyIds;
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      wizardDispatch({ type: "SET_COMPANIES", payload: next });
    },
    [state.selectedCompanyIds, wizardDispatch]
  );

  const handleSelectAll = useCallback(() => {
    const visibleIds = filtered.map((c) => c._id);
    wizardDispatch({
      type: "SET_COMPANIES",
      payload: Array.from(new Set([...state.selectedCompanyIds, ...visibleIds])),
    });
  }, [filtered, state.selectedCompanyIds, wizardDispatch]);

  const handleClearVisible = useCallback(() => {
    const visibleIds = new Set(filtered.map((c) => c._id));
    wizardDispatch({
      type: "SET_COMPANIES",
      payload: state.selectedCompanyIds.filter((id) => !visibleIds.has(id)),
    });
  }, [filtered, state.selectedCompanyIds, wizardDispatch]);

  const handleClearAll = useCallback(() => {
    wizardDispatch({ type: "SET_COMPANIES", payload: [] });
  }, [wizardDispatch]);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
        Select Companies
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Choose which bike manufacturers this service applies to. Bikes are
        loaded from selected companies in the next step.
      </Typography>

      {/* Toolbar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        mb={2.5}
      >
        <TextField
          size="small"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, maxWidth: 280 }}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            onClick={handleSelectAll}
            disabled={filtered.length === 0}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Select shown ({filtered.length})
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={search.trim() ? handleClearVisible : handleClearAll}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {search.trim() ? "Deselect shown" : "Clear all"}
          </Button>
          <Chip
            label={`${state.selectedCompanyIds.length} selected`}
            size="small"
            color={state.selectedCompanyIds.length > 0 ? "primary" : "default"}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </Stack>

      {/* Company Grid — responsive: 2 col mobile, 4 tablet, 6 desktop */}
      {loading ? (
        <Grid container spacing={1.5}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Grid item xs={6} sm={3} md={2} key={i}>
              <Skeleton variant="rounded" height={56} />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Typography color="text.disabled" variant="body2">
          No companies found.
        </Typography>
      ) : (
        <Grid container spacing={1.5}>
          {filtered.map((company) => (
            <Grid item xs={6} sm={3} md={2} key={company._id}>
              <CompanyCard
                company={company}
                isSelected={state.selectedCompanyIds.includes(company._id)}
                onToggle={handleToggle}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Step2SelectCompanies;
