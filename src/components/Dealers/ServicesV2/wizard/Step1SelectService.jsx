import React, { useEffect } from "react";
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  Paper,
  Stack,
  Chip,
  Avatar,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBaseServices,
  fetchAdditionalServices,
} from "../../../../redux/slices/serviceSlice";
import { getImageUrl } from "../../Details/dealerUtils";

const Step1SelectService = ({ state, dispatch: wizardDispatch, serviceType }) => {
  const reduxDispatch = useDispatch();
  const { baseServices, additionalServices, loading } = useSelector(
    (s) => s.service
  );
  const services = serviceType === "base" ? baseServices : additionalServices;

  useEffect(() => {
    if (serviceType === "base" && baseServices.length === 0) {
      reduxDispatch(fetchBaseServices());
    }
    if (serviceType === "additional" && additionalServices.length === 0) {
      reduxDispatch(fetchAdditionalServices());
    }
  }, [serviceType, reduxDispatch, baseServices.length, additionalServices.length]);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
        Which service do you want to configure?
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Select one {serviceType} service type. You can add multiple services
        separately.
      </Typography>

      <Autocomplete
        options={services}
        getOptionLabel={(o) => o.name || ""}
        value={state.selectedService}
        onChange={(_, v) => wizardDispatch({ type: "SET_SERVICE", payload: v })}
        loading={loading}
        noOptionsText={loading ? "Loading…" : "No services found"}
        isOptionEqualToValue={(o, v) => String(o._id) === String(v._id)}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
            },
          },
          listbox: {
            sx: {
              p: 1,
              maxHeight: 420,
              "& .MuiAutocomplete-option": {
                p: 0,
                mb: 0.75,
                borderRadius: 2,
                "&:last-of-type": { mb: 0 },
              },
            },
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={`Search ${serviceType} services…`}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option._id}>
            <Box
              sx={{
                width: "100%",
                minHeight: 64,
                px: 1.5,
                py: 1,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "background.paper",
                transition: "border-color 0.15s, box-shadow 0.15s",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.10)",
                },
              }}
            >
              <Avatar
                src={getImageUrl(option.image || option.imageUrl || option.icon)}
                alt={option.name || "Service"}
                variant="rounded"
                sx={{ width: 46, height: 46, bgcolor: "primary.50", color: "primary.main", fontWeight: 800 }}
              >
                {option.name?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="body2" fontWeight={700}>
                {option.name}
              </Typography>
            </Box>
          </li>
        )}
        sx={{ mb: 3, width: "100%" }}
      />

      {state.selectedService && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            bgcolor: "success.50",
            border: "1px solid",
            borderColor: "success.200",
            borderRadius: 2,
            width: "100%",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CheckCircleIcon color="success" />
            <Box>
              <Typography variant="body2" fontWeight={700} color="success.dark">
                Selected
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {state.selectedService.name}
              </Typography>
            </Box>
            <Chip
              label={serviceType}
              size="small"
              color={serviceType === "base" ? "primary" : "secondary"}
              sx={{ ml: "auto", textTransform: "capitalize", fontWeight: 700 }}
            />
          </Stack>
        </Paper>
      )}

      {services.length > 0 && !state.selectedService && (
        <Typography variant="caption" color="text.disabled" mt={1} display="block">
          {services.length} {serviceType} services available
        </Typography>
      )}
    </Box>
  );
};

export default Step1SelectService;
