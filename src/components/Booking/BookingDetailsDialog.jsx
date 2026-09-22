import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Avatar,
  Grid,
  Stack,
  Divider,
  Stepper,
  Step,
  StepLabel,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  TwoWheeler as TwoWheelerIcon,
  Storefront as StorefrontIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  DirectionsBike as BikeIcon,
  EditNote as NoteIcon,
  VerifiedUser as SecurityIcon,
  EventNote as CalendarIcon,
  Cancel as CancelIcon,
  ReceiptLong as InvoiceIcon,
  LocalShipping as TowingIcon,
  CurrencyRupee as CurrencyRupeeIcon,
  PhotoLibrary as PhotoLibraryIcon,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { updateBookingTowingCharge, getBookingCompletionPhotos } from "../../api";
import {
  formatDate,
  getBookingAmount,
  getStatusConfig,
  getActiveStep,
  lifecycleSteps,
  BIKE_CONDITION_LABELS,
  canEditTowingCharge,
} from "./bookingHelpers";
import InvoiceModal from "../Invoice/InvoiceModal";

// Reusable booking details view — used by the Bookings table and the Customer Details modal's
// "View Booking" action so both surfaces share the exact same booking view.
const BookingDetailsDialog = ({ open, booking, onClose, onRefresh }) => {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [towingChargeInput, setTowingChargeInput] = useState("");
  const [savingTowingCharge, setSavingTowingCharge] = useState(false);

  // The recomputed pricing the towing-charge endpoint returns, layered over
  // the booking row this dialog was handed. `onRefresh` is optional (the
  // Customer Details modal has no list to reload), so this is what guarantees
  // the dialog shows the new total on every surface immediately.
  const [pricingPatch, setPricingPatch] = useState(null);
  const view = pricingPatch ? { ...booking, ...pricingPatch } : booking;

  // Completion photos — the garage's internal record of the finished work.
  // Fetched separately because the field is `select: false` on the Booking
  // schema (so it can never leak into a customer response) and therefore is
  // not part of the booking row this dialog is handed.
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState(null);

  useEffect(() => {
    setPricingPatch(null);
  }, [booking?._id]);

  useEffect(() => {
    const bookingId = booking?._id;
    if (!open || !bookingId) {
      setCompletionPhotos([]);
      return undefined;
    }
    let cancelled = false;
    setPhotosLoading(true);
    getBookingCompletionPhotos(bookingId)
      .then((res) => {
        if (cancelled) return;
        setCompletionPhotos(res?.success ? res.data || [] : []);
      })
      .finally(() => {
        if (!cancelled) setPhotosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, booking?._id]);

  // Keep the editor in step with whatever the booking currently holds — both
  // on open and after another surface (the Dealer App) has changed it.
  useEffect(() => {
    setTowingChargeInput(view?.towingCharge ? String(view.towingCharge) : "");
  }, [view?._id, view?.towingCharge]);

  // Sends only the towing amount. The server recomputes the entire pricing
  // breakdown from it and is the only thing that decides the new total.
  const saveTowingCharge = async () => {
    const amount = Number(towingChargeInput);
    if (towingChargeInput === "" || !Number.isFinite(amount) || amount < 0) {
      Swal.fire("Invalid amount", "Enter a towing charge of 0 or more.", "warning");
      return;
    }

    setSavingTowingCharge(true);
    try {
      const res = await updateBookingTowingCharge(booking._id, amount);
      if (res?.success) {
        setPricingPatch(res.data || null);
        await onRefresh?.();
        Swal.fire("Saved", "Towing charge updated. The booking total has been recalculated.", "success");
      } else {
        throw new Error(res?.message || "Failed to update towing charge");
      }
    } catch (e) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setSavingTowingCharge(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          maxHeight: "90vh",
          m: { xs: 1, sm: 2, md: 3 },
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: "#f8f9fa",
          borderBottom: "1px solid #eee",
          p: { xs: 2, sm: 3 },
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48 }}>
            <NoteIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1a1a1a" }}>
              Booking {booking?.bookingId}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                letterSpacing: "0.1em",
                fontFamily: "Monospace",
              }}
            >
              ID: {booking?._id?.substring(0, 12).toUpperCase()}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={(booking?.vehicleLifecycleStatus || booking?.status || "").replace(
            /_/g,
            " ",
          )}
          size="medium"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            fontSize: "0.75rem",
            letterSpacing: 1,
            borderRadius: "8px",
            px: 1,
            bgcolor: `${getStatusConfig(booking?.vehicleLifecycleStatus || booking?.status).color}15`,
            color: `${getStatusConfig(booking?.vehicleLifecycleStatus || booking?.status).color}.dark`,
            border: `1px solid ${getStatusConfig(booking?.vehicleLifecycleStatus || booking?.status).color}30`,
          }}
        />
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: "#fff", overflowY: "auto" }}>
        {booking && (
          <>
            {/* Lifecycle Stepper */}
            <Box
              sx={{
                width: "100%",
                py: { xs: 2, sm: 5 },
                mb: 4,
                bgcolor: "#f8fafc",
                borderRadius: "16px",
                border: "1px solid #f1f5f9",
                overflowX: "auto",
              }}
            >
              <Stepper
                activeStep={getActiveStep(booking)}
                alternativeLabel
                sx={{
                  "& .MuiStepConnector-line": {
                    borderTopWidth: "2px",
                    borderRadius: "1px",
                  },
                  "& .MuiStepConnector-root.Mui-active .MuiStepConnector-line": {
                    borderColor: "primary.main",
                  },
                  "& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line": {
                    borderColor: "success.main",
                  },
                }}
              >
                {lifecycleSteps.map((label, index) => {
                  const stepStatus = getActiveStep(booking);
                  const isCompleted = index < stepStatus;
                  const isActive = index === stepStatus;

                  return (
                    <Step key={label} completed={isCompleted}>
                      <StepLabel
                        error={booking.status?.toLowerCase().includes("cancel")}
                        StepIconComponent={
                          booking.status?.toLowerCase().includes("cancel") && isActive
                            ? CancelIcon
                            : undefined
                        }
                        StepIconProps={{
                          sx: {
                            width: 32,
                            height: 32,
                            "&.Mui-active": {
                              color: "primary.main",
                              transform: "scale(1.1)",
                              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            },
                            "&.Mui-completed": { color: "success.main" },
                            "&.Mui-error": { color: "error.main" },
                            "& .MuiStepIcon-text": {
                              fontSize: "0.75rem",
                              fontWeight: 800,
                            },
                          },
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: isActive || isCompleted ? 800 : 600,
                            color: booking.status?.toLowerCase().includes("cancel") && isActive
                              ? "error.main"
                              : isActive
                                ? "primary.main"
                                : isCompleted
                                  ? "success.main"
                                  : "text.disabled",
                            fontSize: "0.75rem",
                            mt: 1,
                            display: "block",
                          }}
                        >
                          {label}
                        </Typography>
                      </StepLabel>
                    </Step>
                  );
                })}
              </Stepper>
            </Box>

            <Grid container spacing={3}>
              {/* Section 1: Customer & Bike */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.soft", width: 32, height: 32 }}>
                    <PersonIcon sx={{ color: "primary.main", fontSize: 18 }} />
                  </Avatar>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      color: "#4a5568",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    Customer & Vehicle
                  </Typography>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#fff",
                    height: "calc(100% - 48px)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Stack spacing={2.5}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 32 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Customer Name
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {booking.user_id?.first_name} {booking.user_id?.last_name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 32 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Contact Number
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 16, color: "primary.main", mb: "2px" }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {booking.user_id?.phone || "N/A"}
                        </Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ borderStyle: "dashed" }} />
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Avatar sx={{ bgcolor: "#f0f7ff", borderRadius: 2, width: 44, height: 44 }}>
                        <BikeIcon sx={{ color: "primary.main" }} />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "neutral.900" }}>
                          {booking.user_id?.customerId || "ID: ----"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.5 }}
                        >
                          {[booking.bike?.company_name, booking.bike?.model_name]
                            .filter(Boolean)
                            .join(" ") || "Unassigned"}
                          {booking.bike?.variant_name ? ` (${booking.bike.variant_name})` : ""}
                          {booking.bike?.engine_cc ? ` · ${booking.bike.engine_cc} CC` : ""}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "info.main",
                            fontWeight: 800,
                            bgcolor: "info.soft",
                            px: 1,
                            py: 0.2,
                            borderRadius: 1,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {booking.bike?.plate_number || booking.userBike_id?.plate_number || "No Plate"}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* Section 2: Service Plan */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.soft", width: 32, height: 32 }}>
                    <CalendarIcon sx={{ color: "primary.main", fontSize: 18 }} />
                  </Avatar>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      color: "#4a5568",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    Service Details
                  </Typography>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#fff",
                    height: "calc(100% - 48px)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Stack spacing={2}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 32 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Fulfillment Mode
                      </Typography>
                      <Chip
                        icon={
                          booking.pickupAndDropId ? (
                            <TwoWheelerIcon sx={{ fontSize: "1rem !important" }} />
                          ) : (
                            <StorefrontIcon sx={{ fontSize: "1rem !important" }} />
                          )
                        }
                        label={booking.pickupAndDropId ? "Pick & Drop" : "In-Shop Visit"}
                        size="small"
                        color={booking.pickupAndDropId ? "secondary" : "info"}
                        sx={{
                          fontWeight: 700,
                          borderRadius: 1.5,
                          height: 24,
                          "& .MuiChip-label": { px: 1, py: 0 },
                          alignSelf: "center",
                        }}
                      />
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 32 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Scheduled For
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formatDate(booking.pickupDate)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 32 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Total Estimate
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 900, color: "success.main", display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Typography variant="h6" component="span" sx={{ fontWeight: 700, mt: 0.5 }}>
                          ₹
                        </Typography>
                        {getBookingAmount(view).toLocaleString()}
                      </Typography>
                    </Box>
                    <Divider sx={{ borderStyle: "dashed" }} />
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 800, color: "text.secondary", mb: 1, display: "block" }}
                      >
                        ENROLLED SERVICES
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {booking.services?.map((s, idx) => (
                          <Chip
                            key={idx}
                            label={s.base_service_id?.name || s.serviceId || "N/A"}
                            size="small"
                            variant="soft"
                            sx={{ color: "primary.main", bgcolor: "#f0f7ff", fontWeight: 700, fontSize: "0.7rem" }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* Section 3: Bike Condition & Towing */}
              <Grid item xs={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.soft", width: 32, height: 32 }}>
                    <TowingIcon sx={{ color: "primary.main", fontSize: 18 }} />
                  </Avatar>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      color: "#4a5568",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    Bike Condition & Towing
                  </Typography>
                </Box>
                <Paper
                  elevation={0}
                  sx={{ p: 3, borderRadius: 4, border: "1px solid #e2e8f0", bgcolor: "#fff" }}
                >
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Bike Condition
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {BIKE_CONDITION_LABELS[view.bikeCondition] || "Rideable"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Towing Required
                      </Typography>
                      <Chip
                        label={view.towingRequired ? "YES" : "NO"}
                        size="small"
                        color={view.towingRequired ? "warning" : "default"}
                        sx={{ fontWeight: 900, fontSize: "0.65rem", borderRadius: 1.5, px: 1, mt: 0.5 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Towing Charge
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {view.towingRequired
                          ? view.towingCharge > 0
                            ? `₹${Number(view.towingCharge).toLocaleString()}`
                            : "Not set"
                          : "—"}
                      </Typography>
                    </Grid>

                    {!!view.towingNote && (
                      <Grid item xs={12}>
                        <Divider sx={{ borderStyle: "dashed", mb: 1.5 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          Customer's Note
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {view.towingNote}
                        </Typography>
                      </Grid>
                    )}

                    {/* Editable only while the customer still owes the money —
                        the backend enforces the same rule and rejects the call
                        once the booking is billed or paid. */}
                    {canEditTowingCharge(view) && (
                      <Grid item xs={12}>
                        <Divider sx={{ borderStyle: "dashed", mb: 2 }} />
                        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexWrap: "wrap" }}>
                          <TextField
                            label="Towing Charge"
                            type="number"
                            size="small"
                            value={towingChargeInput}
                            onChange={(e) => setTowingChargeInput(e.target.value)}
                            disabled={savingTowingCharge}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CurrencyRupeeIcon fontSize="small" />
                                </InputAdornment>
                              ),
                            }}
                            inputProps={{ min: 0 }}
                            sx={{ width: 200 }}
                          />
                          <Button
                            variant="contained"
                            disableElevation
                            onClick={saveTowingCharge}
                            disabled={savingTowingCharge}
                            startIcon={
                              savingTowingCharge ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : null
                            }
                            sx={{ borderRadius: 2, fontWeight: 800, textTransform: "none", px: 3, py: 1 }}
                          >
                            {savingTowingCharge ? "Saving…" : "Save Charge"}
                          </Button>
                        </Box>
                        <Alert severity="info" sx={{ borderRadius: 2, mt: 2 }}>
                          The server recalculates subtotal, tax, customer total,
                          commission and dealer payout from this amount. It is
                          billed as a separate line item on the invoice.
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>

              {/* Section 4: Verification & Security */}
              <Grid item xs={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.soft", width: 32, height: 32 }}>
                    <SecurityIcon sx={{ color: "primary.main", fontSize: 18 }} />
                  </Avatar>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      color: "#4a5568",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    Security & Verification
                  </Typography>
                </Box>
                <Paper
                  elevation={0}
                  sx={{ p: 3.5, borderRadius: 4, bgcolor: "#f1f5f9", border: "1px solid #e2e8f0" }}
                >
                  <Grid container spacing={4} alignItems="center">
                    <Grid item xs={6} sm={3}>
                      <Typography
                        variant="caption"
                        sx={{ color: "#64748b", fontWeight: 700, mb: 1, display: "block", textTransform: "uppercase", fontSize: "0.65rem" }}
                      >
                        PICKUP OTP
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 900,
                            color: "primary.main",
                            letterSpacing: 2,
                            fontFamily: "Monospace",
                            bgcolor: "primary.soft",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            display: "inline-block",
                          }}
                        >
                          {booking.pickupOtp || "----"}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography
                        variant="caption"
                        sx={{ color: "#64748b", fontWeight: 700, mb: 1, display: "block", textTransform: "uppercase", fontSize: "0.65rem" }}
                      >
                        DELIVERY OTP
                      </Typography>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 900,
                          color: "success.main",
                          letterSpacing: 2,
                          fontFamily: "Monospace",
                          bgcolor: "success.soft",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          display: "inline-block",
                        }}
                      >
                        {booking.deliveryOtp || "----"}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography
                        variant="caption"
                        sx={{ color: "#64748b", fontWeight: 700, mb: 1, display: "block", textTransform: "uppercase", fontSize: "0.65rem" }}
                      >
                        BOOKED ON
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CalendarIcon sx={{ fontSize: 16, color: "#64748b" }} />
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "#1e293b" }}>
                          {formatDate(booking.createdAt)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography
                        variant="caption"
                        sx={{ color: "#64748b", fontWeight: 700, mb: 1, display: "block", textTransform: "uppercase", fontSize: "0.65rem" }}
                      >
                        BILL STATUS
                      </Typography>
                      <Chip
                        label={
                          booking.status?.toLowerCase().includes("cancel") &&
                          (booking.billStatus === "pending" || !booking.billStatus)
                            ? "VOIDED"
                            : booking.billStatus?.toUpperCase() || "UNPAID"
                        }
                        size="small"
                        color={
                          booking.status?.toLowerCase().includes("cancel") &&
                          (booking.billStatus === "pending" || !booking.billStatus)
                            ? "default"
                            : booking.billStatus === "paid"
                              ? "success"
                              : booking.billStatus === "cancelled"
                                ? "error"
                                : "warning"
                        }
                        sx={{ fontWeight: 900, fontSize: "0.65rem", borderRadius: 1.5, px: 1 }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Section 5: Completion Photos — ADMIN-INTERNAL.
                  Uploaded by the garage from the partner app before it marks
                  the service complete. These are an internal service record:
                  they are never returned by any customer booking API and are
                  not shown in the customer app. */}
              <Grid item xs={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.soft", width: 32, height: 32 }}>
                    <PhotoLibraryIcon sx={{ color: "primary.main", fontSize: 18 }} />
                  </Avatar>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      color: "#4a5568",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      fontSize: "0.75rem",
                    }}
                  >
                    Completion Photos
                  </Typography>
                  <Chip
                    label="Internal"
                    size="small"
                    sx={{ fontWeight: 800, fontSize: "0.6rem", height: 20, borderRadius: 1.5 }}
                  />
                </Box>
                <Paper
                  elevation={0}
                  sx={{ p: 3.5, borderRadius: 4, bgcolor: "#f1f5f9", border: "1px solid #e2e8f0" }}
                >
                  {photosLoading ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2" sx={{ color: "#64748b" }}>
                        Loading photos…
                      </Typography>
                    </Box>
                  ) : completionPhotos.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                      No completion photos were uploaded for this booking.
                    </Typography>
                  ) : (
                    <Stack direction="row" flexWrap="wrap" gap={2}>
                      {completionPhotos.map((photo) => (
                        <Box
                          key={photo._id}
                          onClick={() => setViewerPhoto(photo)}
                          sx={{
                            width: 112,
                            cursor: "pointer",
                            "&:hover img": { opacity: 0.85 },
                          }}
                        >
                          <Box
                            component="img"
                            src={photo.url}
                            alt="Completion photo"
                            sx={{
                              width: 112,
                              height: 112,
                              objectFit: "cover",
                              borderRadius: 2,
                              border: "1px solid #cbd5e1",
                              display: "block",
                              transition: "opacity 120ms",
                            }}
                          />
                          {photo.uploadedAt && (
                            <Typography
                              variant="caption"
                              sx={{ color: "#64748b", mt: 0.5, display: "block", fontSize: "0.65rem" }}
                            >
                              {formatDate(photo.uploadedAt)}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, bgcolor: "#fff", borderTop: "1px solid #eee" }}>
        <Button
          onClick={() => setInvoiceOpen(true)}
          variant="outlined"
          startIcon={<InvoiceIcon />}
          sx={{ borderRadius: 2, px: 3, py: 1.2, fontWeight: 800, textTransform: "none" }}
        >
          View Invoice
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          disableElevation
          sx={{ borderRadius: 2, px: 4, py: 1.2, fontWeight: 800, textTransform: "none" }}
        >
          Close Dashboard
        </Button>
      </DialogActions>

      <InvoiceModal
        open={invoiceOpen}
        bookingId={booking?._id}
        onClose={() => setInvoiceOpen(false)}
      />

      {/* Full-screen viewer for a completion photo. */}
      <Dialog
        open={Boolean(viewerPhoto)}
        onClose={() => setViewerPhoto(null)}
        maxWidth="lg"
        PaperProps={{ sx: { bgcolor: "#0f172a", borderRadius: 3 } }}
      >
        <DialogContent sx={{ p: 2, textAlign: "center" }}>
          <Box
            component="img"
            src={viewerPhoto?.url}
            alt="Completion photo"
            sx={{ maxWidth: "100%", maxHeight: "78vh", display: "block", mx: "auto", borderRadius: 2 }}
          />
          {viewerPhoto?.uploadedAt && (
            <Typography variant="caption" sx={{ color: "#cbd5e1", mt: 1.5, display: "block" }}>
              Uploaded {formatDate(viewerPhoto.uploadedAt)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#0f172a", px: 2, pb: 2 }}>
          <Button onClick={() => setViewerPhoto(null)} sx={{ color: "#e2e8f0", textTransform: "none", fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default BookingDetailsDialog;
