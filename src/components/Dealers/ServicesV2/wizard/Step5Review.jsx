import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Stack,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import BusinessIcon from "@mui/icons-material/Business";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import FilterListIcon from "@mui/icons-material/FilterList";

const StatCard = ({ icon, value, label, color }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      textAlign: "center",
      bgcolor: `${color}.50`,
      border: "1px solid",
      borderColor: `${color}.100`,
      borderRadius: 2,
    }}
  >
    <Box sx={{ color: `${color}.main`, mb: 0.5 }}>{icon}</Box>
    <Typography variant="h5" fontWeight={800} color={`${color}.dark`}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary" fontWeight={600}>
      {label}
    </Typography>
  </Paper>
);

const Step5Review = ({ state, serviceType }) => {
  // Only include bikes in selected CC ranges — exactly what will be saved
  const bikesToSave = useMemo(
    () =>
      state.selectedBikes.filter((b) =>
        state.selectedCCRanges.includes(Number(b.cc || b.engine_cc || 0))
      ),
    [state.selectedBikes, state.selectedCCRanges]
  );

  const excludedCount = state.selectedBikes.length - bikesToSave.length;

  const { companies, avgPrice, minPrice, maxPrice } = useMemo(() => {
    const names = new Set(
      bikesToSave.map((b) => b.company_name).filter(Boolean)
    );
    const prices = bikesToSave
      .map((b) => Number(state.pricing[b._id] || 0))
      .filter((p) => p > 0);
    const total = prices.reduce((s, p) => s + p, 0);
    return {
      companies: Array.from(names),
      avgPrice: prices.length ? Math.round(total / prices.length) : 0,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    };
  }, [bikesToSave, state.pricing]);

  const sortedCCRanges = useMemo(
    () => [...state.selectedCCRanges].sort((a, b) => a - b),
    [state.selectedCCRanges]
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
        <CheckCircleIcon color="success" sx={{ fontSize: 28 }} />
        <Typography variant="subtitle1" fontWeight={800}>
          Ready to Save
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Review your configuration. Click "Save Service" to apply, or go back to
        make changes.
      </Typography>

      {excludedCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>{excludedCount} bike(s)</strong> were excluded because their
          CC range was not selected. Only the <strong>{bikesToSave.length}</strong> bikes
          below will be saved.
        </Alert>
      )}

      {/* Stats row */}
      <Grid container spacing={1.5} mb={3}>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<TwoWheelerIcon />}
            value={bikesToSave.length}
            label="BIKES SAVING"
            color="primary"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<BusinessIcon />}
            value={companies.length}
            label="COMPANIES"
            color="success"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<FilterListIcon />}
            value={sortedCCRanges.length}
            label="CC RANGES"
            color="warning"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<CurrencyRupeeIcon />}
            value={`₹${avgPrice}`}
            label="AVG PRICE"
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        {/* Service chip */}
        <Grid item xs={12} sm={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              height: "100%",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
              sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Service
            </Typography>
            <Box mt={1}>
              <Chip
                label={state.selectedService?.name}
                color={serviceType === "base" ? "primary" : "secondary"}
                sx={{ fontWeight: 700 }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Companies */}
        <Grid item xs={12} sm={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              height: "100%",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
              sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Companies ({companies.length})
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} mt={1}>
              {companies.map((c) => (
                <Chip key={c} label={c} size="small" variant="outlined" />
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* CC Ranges */}
        <Grid item xs={12} sm={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              height: "100%",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
              sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              CC Ranges ({sortedCCRanges.length})
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} mt={1}>
              {sortedCCRanges.map((cc) => (
                <Chip
                  key={cc}
                  label={`${cc} cc`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Price range summary */}
      {minPrice > 0 && (
        <Alert
          severity="info"
          icon={<CurrencyRupeeIcon fontSize="small" />}
          sx={{ mb: 2 }}
        >
          Price range: ₹{minPrice} — ₹{maxPrice} &nbsp;|&nbsp; Average: ₹
          {avgPrice}
        </Alert>
      )}

      {/* Bike price list */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          maxHeight: 220,
          overflow: "auto",
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: "grey.50",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" fontWeight={700}>
            Price Summary — {bikesToSave.length} bike{bikesToSave.length !== 1 ? "s" : ""} will be saved
          </Typography>
        </Box>
        <List dense disablePadding>
          {bikesToSave.map((b, idx) => (
            <React.Fragment key={b._id}>
              <ListItem sx={{ px: 2, py: 0.75 }}>
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          component="span"
                        >
                          {b.variant_name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="span"
                          sx={{ ml: 1 }}
                        >
                          {b.company_name} · {Number(b.cc || b.engine_cc || 0)} cc
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        color="primary.main"
                      >
                        ₹{state.pricing[b._id]}
                      </Typography>
                    </Stack>
                  }
                />
              </ListItem>
              {idx < bikesToSave.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default React.memo(Step5Review);
