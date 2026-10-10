import React, { useReducer, useCallback, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  CircularProgress,
  Divider,
  IconButton,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Step1SelectService from "./Step1SelectService";
import Step2SelectCompanies from "./Step2SelectCompanies";
import Step3SelectBikes from "./Step3SelectBikes";
import Step4SelectCCRanges from "./Step4SelectCCRanges";
import Step4Pricing from "./Step4Pricing";
import Step5Review from "./Step5Review";
import { getApiErrorMessage } from "../../../../utils/apiError";
import Swal from "sweetalert2";

export const STEPS = [
  "Select Service",
  "Select Companies",
  "Select Bikes",
  "Select CC Ranges",
  "Set Prices",
  "Review & Save",
];

const initialState = {
  activeStep: 0,
  selectedService: null,
  selectedCompanyIds: [],
  selectedBikes: [],
  selectedCCRanges: [],
  pricing: {},
  isSaving: false,
};

export const wizardReducer = (state, action) => {
  switch (action.type) {
    case "SET_SERVICE":
      return {
        ...state,
        selectedService: action.payload,
        selectedCompanyIds: [],
        selectedBikes: [],
        selectedCCRanges: [],
        pricing: {},
      };
    case "SET_COMPANIES":
      return {
        ...state,
        selectedCompanyIds: action.payload,
        selectedBikes: [],
        selectedCCRanges: [],
        pricing: {},
      };
    case "SET_BIKES":
      return {
        ...state,
        selectedBikes: action.payload.map((b) => ({
          ...b,
          _id: b._id || b.variant_id,
        })),
        selectedCCRanges: [],
        pricing: {},
      };
    case "SET_CC_RANGES":
      return {
        ...state,
        selectedCCRanges: action.payload,
        pricing: {},
      };
    case "SET_PRICING":
      return { ...state, pricing: action.payload };
    case "SET_PRICE":
      return {
        ...state,
        pricing: { ...state.pricing, [action.bikeId]: action.price },
      };
    case "SET_PRICES":
      return {
        ...state,
        pricing: { ...state.pricing, ...action.payload },
      };
    case "NEXT":
      return {
        ...state,
        activeStep: Math.min(state.activeStep + 1, STEPS.length - 1),
      };
    case "BACK":
      return { ...state, activeStep: Math.max(state.activeStep - 1, 0) };
    case "SET_SAVING":
      return { ...state, isSaving: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
};

const canGoNext = (state) => {
  switch (state.activeStep) {
    case 0:
      return !!state.selectedService;
    case 1:
      return state.selectedCompanyIds.length > 0;
    case 2:
      return state.selectedBikes.length > 0;
    case 3:
      // Must have at least one CC range selected AND all those bikes must have cc > 0
      return state.selectedCCRanges.length > 0;
    case 4: {
      const pricedBikes = state.selectedBikes.filter((b) =>
        state.selectedCCRanges.includes(Number(b.cc || b.engine_cc || 0))
      );
      return (
        pricedBikes.length > 0 &&
        pricedBikes.every((b) => {
          const p = state.pricing[b._id];
          return p !== undefined && p !== "" && Number(p) > 0;
        })
      );
    }
    case 5:
      return true;
    default:
      return false;
  }
};

const AddServiceWizard = ({
  open,
  onClose,
  serviceType,
  allPricing,
  dealerId,
  onSave,
}) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [saveError, setSaveError] = useState(null);

  const handleClose = useCallback(() => {
    dispatch({ type: "RESET" });
    setSaveError(null);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      // Only save bikes whose CC is in the selected CC ranges
      const bikesToSave = state.selectedBikes.filter((bike) =>
        state.selectedCCRanges.includes(Number(bike.cc || bike.engine_cc || 0))
      );

      // Defensive: block bikes with cc <= 0 (should not reach here after Step4SelectCCRanges)
      const cczero = bikesToSave.filter(
        (b) => Number(b.cc || b.engine_cc || 0) <= 0
      );
      if (cczero.length > 0) {
        await Swal.fire({
          icon: "warning",
          title: "Invalid CC Data",
          html: `<strong>${cczero.length} bike(s)</strong> have no CC configured and cannot be saved:<br/><br/><em>${cczero.map((b) => b.variant_name).join(", ")}</em><br/><br/>Please update bike master data first.`,
        });
        return;
      }

      // Duplicate mapping check: warn if any selected bike is already mapped to this service
      const existingForService = allPricing.filter(
        (p) =>
          String(p.serviceId) === String(state.selectedService._id) &&
          p.type === serviceType
      );
      const duplicateBikes = bikesToSave.filter((bike) =>
        existingForService.some(
          (e) => String(e.variantId) === String(bike._id)
        )
      );
      if (duplicateBikes.length > 0) {
        const { isConfirmed } = await Swal.fire({
          icon: "warning",
          title: "Duplicate Bike Mappings",
          html: `<strong>${duplicateBikes.length} bike(s)</strong> are already mapped to this service:<br/><br/><em>${duplicateBikes
            .map((d) => d.variant_name)
            .join(
              ", "
            )}</em><br/><br/>Saving will update their existing pricing. Continue?`,
          showCancelButton: true,
          confirmButtonText: "Yes, Update",
          confirmButtonColor: "#1976d2",
          cancelButtonColor: "#757575",
          cancelButtonText: "Cancel",
        });
        if (!isConfirmed) return;
      }

      const newEntries = bikesToSave.map((bike) => ({
        type: serviceType,
        serviceId: String(state.selectedService._id),
        variantId: String(bike._id || bike.variant_id),
        cc: Number(bike.cc || bike.engine_cc || 0),
        price: Number(state.pricing[bike._id] || 0),
        bikeName: bike.variant_name || "",
        companyName: bike.company_name || "",
        modelName: bike.model_name || "",
      }));

      // Upsert only the selected bike mappings. Existing bikes for this service
      // must stay intact; removing mappings is an explicit action in Edit.
      const savedVariantIds = new Set(
        newEntries.map((entry) => String(entry.variantId))
      );
      const filtered = allPricing.filter(
        (p) =>
          !(
            String(p.serviceId) === String(state.selectedService._id) &&
            p.type === serviceType &&
            savedVariantIds.has(String(p.variantId))
          )
      );
      const merged = [...filtered, ...newEntries];
      await onSave(merged);

      Swal.fire({
        icon: "success",
        title: "Service Added!",
        text: `${state.selectedService.name} is now configured for ${bikesToSave.length} bike${bikesToSave.length !== 1 ? "s" : ""}.`,
        timer: 2000,
        showConfirmButton: false,
      });
      handleClose();
    } catch (err) {
      setSaveError(
        getApiErrorMessage(err, "Could not save service. Please try again.")
      );
    } finally {
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state, serviceType, allPricing, onSave, handleClose]);

  const stepProps = { state, dispatch, serviceType };
  const isLastStep = state.activeStep === STEPS.length - 1;
  const nextAllowed = canGoNext(state);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: { xs: "calc(100% - 16px)", sm: "min(1440px, calc(100% - 32px))" },
          height: { xs: "calc(100% - 16px)", sm: "94vh" },
          maxHeight: { xs: "calc(100% - 16px)", sm: "94vh" },
          m: { xs: 1, sm: 2 },
          overflow: "hidden",
        },
      }}
    >
      {/* ── Header ── */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Add {serviceType === "base" ? "Base" : "Additional"} Service
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Step {state.activeStep + 1} of {STEPS.length} —{" "}
            {STEPS[state.activeStep]}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* ── Stepper ── */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Stepper activeStep={state.activeStep} alternativeLabel>
          {STEPS.map((label, idx) => (
            <Step key={label} completed={idx < state.activeStep}>
              <StepLabel
                sx={{
                  "& .MuiStepLabel-label": {
                    fontSize: "0.68rem",
                    fontWeight: idx === state.activeStep ? 700 : 400,
                  },
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Divider />

      {/* ── Step Content ── */}
      <DialogContent sx={{ py: 3, px: { xs: 2, sm: 3 }, overflowY: "auto" }}>
        {saveError && (
          <Alert
            severity="error"
            onClose={() => setSaveError(null)}
            sx={{ mb: 2, whiteSpace: "normal", overflowWrap: "anywhere" }}
          >
            {saveError}
          </Alert>
        )}
        {state.activeStep === 0 && <Step1SelectService {...stepProps} />}
        {state.activeStep === 1 && <Step2SelectCompanies {...stepProps} />}
        {state.activeStep === 2 && <Step3SelectBikes {...stepProps} />}
        {state.activeStep === 3 && <Step4SelectCCRanges {...stepProps} />}
        {state.activeStep === 4 && <Step4Pricing {...stepProps} />}
        {state.activeStep === 5 && <Step5Review {...stepProps} />}
      </DialogContent>

      <Divider />

      {/* ── Footer Actions ── */}
      <DialogActions sx={{ px: 3, py: 2, gap: 1, bgcolor: "background.paper" }}>
        <Button
          onClick={handleClose}
          color="inherit"
          startIcon={state.activeStep === 0 ? <ArrowBackIcon /> : undefined}
          sx={{ mr: "auto", fontWeight: 600, textTransform: "none" }}
        >
          {state.activeStep === 0 ? "Back to services" : "Cancel"}
        </Button>
        {state.activeStep > 0 && (
          <Button
            onClick={() => dispatch({ type: "BACK" })}
            variant="outlined"
            sx={{ fontWeight: 700, textTransform: "none", borderRadius: 2 }}
          >
            Back
          </Button>
        )}
        {!isLastStep ? (
          <Button
            variant="contained"
            onClick={() => dispatch({ type: "NEXT" })}
            disabled={!nextAllowed}
            sx={{
              fontWeight: 700,
              textTransform: "none",
              borderRadius: 2,
              px: 3,
            }}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={handleSave}
            disabled={state.isSaving}
            startIcon={
              state.isSaving ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
            sx={{
              fontWeight: 800,
              textTransform: "none",
              borderRadius: 2,
              px: 4,
            }}
          >
            {state.isSaving ? "Saving…" : "Save Service"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddServiceWizard;
