import React, { useMemo, useCallback, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Chip,
  Alert,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import SearchIcon from "@mui/icons-material/Search";
import { groupBikesByCC } from "./utils/ccGrouping";

const Step4SelectCCRanges = ({ state, dispatch }) => {
  const [search, setSearch] = useState("");
  const validBikes = useMemo(
    () => state.selectedBikes.filter((b) => Number(b.cc || b.engine_cc || 0) > 0),
    [state.selectedBikes]
  );
  const invalidBikes = useMemo(
    () => state.selectedBikes.filter((b) => Number(b.cc || b.engine_cc || 0) <= 0),
    [state.selectedBikes]
  );

  // Group valid bikes by CC value, sorted ascending
  const ccGroups = useMemo(() => groupBikesByCC(validBikes), [validBikes]);

  const filteredGroups = useMemo(() => {
    const query = search.trim();
    return query ? ccGroups.filter((group) => String(group.cc).includes(query)) : ccGroups;
  }, [ccGroups, search]);

  const handleToggleCC = useCallback(
    (cc) => {
      const current = state.selectedCCRanges;
      const updated = current.includes(cc)
        ? current.filter((c) => c !== cc)
        : [...current, cc];
      dispatch({ type: "SET_CC_RANGES", payload: updated });
    },
    [state.selectedCCRanges, dispatch]
  );

  const handleSelectAll = useCallback(() => {
    dispatch({
      type: "SET_CC_RANGES",
      payload: Array.from(new Set([...state.selectedCCRanges, ...filteredGroups.map((group) => group.cc)])),
    });
  }, [filteredGroups, state.selectedCCRanges, dispatch]);

  const handleClearShown = useCallback(() => {
    const shown = new Set(filteredGroups.map((group) => group.cc));
    dispatch({
      type: "SET_CC_RANGES",
      payload: state.selectedCCRanges.filter((cc) => !shown.has(cc)),
    });
  }, [filteredGroups, state.selectedCCRanges, dispatch]);

  const handleClearAll = useCallback(() => {
    dispatch({ type: "SET_CC_RANGES", payload: [] });
  }, [dispatch]);

  const selectedBikeCount = useMemo(
    () =>
      state.selectedCCRanges.reduce((sum, cc) => {
        const group = ccGroups.find((g) => g.cc === cc);
        return sum + (group ? group.bikes.length : 0);
      }, 0),
    [state.selectedCCRanges, ccGroups]
  );

  // All selected bikes have invalid CC — hard block
  if (validBikes.length === 0) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography fontWeight={700} mb={0.5}>
            No valid CC data found
          </Typography>
          All {invalidBikes.length} selected bike(s) have no CC configured.
          Please update bike master data before adding them to a service.
        </Alert>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
        >
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    bgcolor: "grey.50",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    color: "text.secondary",
                    textTransform: "uppercase",
                  },
                }}
              >
                <TableCell>Bike Name</TableCell>
                <TableCell>Company</TableCell>
                <TableCell align="center">CC Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invalidBikes.map((bike) => (
                <TableRow key={bike._id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {bike.variant_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {bike.company_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label="No CC" size="small" color="error" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Typography variant="subtitle1" fontWeight={700}>
          Select CC Ranges
        </Typography>
        <Chip
          label={`${selectedBikeCount} / ${validBikes.length} bikes selected`}
          color={selectedBikeCount > 0 ? "primary" : "default"}
          size="small"
          sx={{ fontWeight: 700 }}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Choose which CC groups proceed to pricing. This filters the exact
        variants selected in the previous step; it does not select every bike
        with that CC automatically.
      </Typography>

      {/* Warn about cc=0 bikes but don't hard-block */}
      {invalidBikes.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>{invalidBikes.length} bike(s)</strong> have no CC configured
          and will be excluded:{" "}
          {invalidBikes.map((b) => b.variant_name).join(", ")}. Please update
          bike master data for these bikes.
        </Alert>
      )}

      {/* CC range selector */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "grey.50",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5} flexWrap="wrap">
          <FilterListIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="body2" fontWeight={700}>
            Available CC Ranges:
          </Typography>
          <Box flex={1} />
          <TextField
            size="small"
            placeholder="Find CC…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>,
            }}
            sx={{ width: 150 }}
          />
          <Button
            size="small"
            onClick={handleSelectAll}
            sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.75rem" }}
          >
            Select shown ({filteredGroups.length})
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={search.trim() ? handleClearShown : handleClearAll}
            sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.75rem" }}
          >
            {search.trim() ? "Deselect shown" : "Clear all"}
          </Button>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={1}>
          {filteredGroups.map(({ cc, bikes }) => {
            const isSelected = state.selectedCCRanges.includes(cc);
            return (
              <Chip
                key={cc}
                label={`${cc} cc — ${bikes.length} bike${bikes.length !== 1 ? "s" : ""}`}
                onClick={() => handleToggleCC(cc)}
                color={isSelected ? "primary" : "default"}
                variant={isSelected ? "filled" : "outlined"}
                icon={
                  isSelected ? (
                    <CheckCircleIcon sx={{ fontSize: "14px !important" }} />
                  ) : undefined
                }
                sx={{ fontWeight: 700, cursor: "pointer" }}
              />
            );
          })}
        </Stack>
      </Paper>

      {/* Preview table of bikes in selected CC ranges */}
      {state.selectedCCRanges.length > 0 ? (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            maxHeight: 240,
            overflow: "auto",
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    bgcolor: "grey.50",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  },
                }}
              >
                <TableCell>Bike Name</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Model</TableCell>
                <TableCell align="center">CC</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {validBikes
                .filter((b) =>
                  state.selectedCCRanges.includes(Number(b.cc || b.engine_cc || 0))
                )
                .map((bike) => (
                  <TableRow
                    key={bike._id}
                    hover
                    sx={{ "&:last-child td": { borderBottom: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {bike.variant_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {bike.company_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {bike.model_name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${Number(bike.cc || bike.engine_cc || 0)} cc`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info" icon={<TwoWheelerIcon fontSize="small" />}>
          Select at least one CC range above to proceed to pricing.
        </Alert>
      )}
    </Box>
  );
};

export default Step4SelectCCRanges;
