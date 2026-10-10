import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Avatar,
  Chip,
  Stepper,
  Step,
  StepButton,
  Grid,
  Paper,
  Divider,
  Alert,
  AlertTitle,
  CircularProgress,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Article as ArticleIcon,
  AccountBalance as BankIcon,
  Verified as VerifiedIcon,
  Settings as SettingsIcon,
  Gavel as DecisionIcon,
  NoteAdd as NotesIcon,
  Assignment as RequestDocIcon,
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  Storefront as StorefrontIcon,
} from "@mui/icons-material";
import {
  approveDealer,
  rejectDealer,
  verifyDealerDocument,
  requestDealerDocuments,
  updateDealerField,
  IMAGE_BASE_URL,
} from "../../api";
import RequestDocumentsDialog, { DEFAULT_DOC_OPTIONS } from "./RequestDocumentsDialog";
import DocumentRejectDialog from "./DocumentRejectDialog";
import { getApiErrorMessage } from "../../utils/apiError";
import { SERVICE_RADIUS_DEFAULT_KM } from "./businessSettings";
import { computeDealerProgress } from "../../utils/dealerProgressHelper";

const WIZARD_STEPS = [
  { id: "basic", label: "Basic Info", icon: <BusinessIcon fontSize="small" /> },
  { id: "location", label: "Location & GPS", icon: <LocationIcon fontSize="small" /> },
  { id: "storefront", label: "Storefront Media", icon: <StorefrontIcon fontSize="small" /> },
  { id: "documents", label: "KYC Documents", icon: <ArticleIcon fontSize="small" /> },
  { id: "live", label: "Live Verification", icon: <CameraIcon fontSize="small" /> },
  { id: "banking", label: "Bank & Payout", icon: <BankIcon fontSize="small" /> },
  { id: "settings", label: "Wallet & Settings", icon: <SettingsIcon fontSize="small" /> },
  { id: "decision", label: "Final Decision", icon: <DecisionIcon fontSize="small" /> },
];

const DealerReviewWizardDialog = ({
  open,
  onClose,
  dealer,
  onRefresh,
  onApproved,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [docVerification, setDocVerification] = useState({});
  const [minWalletAmount, setMinWalletAmount] = useState("");
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [walletSaveSuccess, setWalletSaveSuccess] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // 'approve' | 'reject' | null
  const [rejectionReason, setRejectionReason] = useState("");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [rejectDoc, setRejectDoc] = useState(null); // { key, label }

  useEffect(() => {
    if (dealer && open) {
      setDocVerification(dealer.documentVerification || {});
      setMinWalletAmount(dealer.minWalletAmount ?? "");
      setReviewNotes(dealer.reviewNotes || dealer.adminNotes || "");
      setWalletSaveSuccess(false);
      setNotesSaved(false);
      setActionError(null);
      setConfirmAction(null);
      setRejectionReason("");
      setActiveStep(0);
    }
  }, [dealer, open]);

  if (!dealer) return null;

  // Merge updated local state into dealer for real-time progress computation
  const mergedDealer = {
    ...dealer,
    documentVerification: docVerification,
    minWalletAmount: minWalletAmount !== "" ? minWalletAmount : dealer.minWalletAmount,
  };
  const progress = computeDealerProgress(mergedDealer);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${IMAGE_BASE_URL}${cleanPath}`;
  };

  const handleSaveMinWallet = async () => {
    setIsSavingWallet(true);
    setActionError(null);
    try {
      await updateDealerField(dealer._id, { minWalletAmount: Number(minWalletAmount) });
      setWalletSaveSuccess(true);
      setTimeout(() => setWalletSaveSuccess(false), 3000);
      onRefresh?.();
    } catch (error) {
      setActionError(error?.response?.data?.message || "Failed to save min wallet amount.");
    } finally {
      setIsSavingWallet(false);
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    setActionError(null);
    try {
      await updateDealerField(dealer._id, { reviewNotes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 3000);
      onRefresh?.();
    } catch (error) {
      setActionError(error?.response?.data?.message || "Failed to save review notes.");
    } finally {
      setNotesSaving(false);
    }
  };

  const handleDocVerify = async (docType, status) => {
    try {
      await verifyDealerDocument(dealer._id, docType, status);
      setDocVerification((prev) => ({ ...prev, [docType]: status }));
      onRefresh?.();
    } catch (error) {
      setActionError(error?.response?.data?.message || "Failed to update document status.");
    }
  };

  const handleRejectConfirm = async (docType, reason) => {
    await verifyDealerDocument(dealer._id, docType, "rejected", reason);
    setDocVerification((prev) => ({ ...prev, [docType]: "rejected" }));
    onRefresh?.();
  };

  const handleRequestDocuments = async (docTypes, reason) => {
    await requestDealerDocuments(dealer._id, docTypes, reason);
    setDocVerification((prev) => {
      const next = { ...prev };
      docTypes.forEach((key) => {
        next[key] = "requested";
      });
      return next;
    });
    onRefresh?.();
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (confirmAction === "approve") {
        await approveDealer(dealer._id);
        setConfirmAction(null);
        onClose();
        if (onApproved) onApproved();
      } else if (confirmAction === "reject") {
        await rejectDealer(dealer._id, rejectionReason.trim() || undefined);
        setConfirmAction(null);
        onClose();
        onRefresh?.();
      }
    } catch (error) {
      console.error("Action failed:", error);
      const msg = getApiErrorMessage(error, "Something went wrong. Please try again.");
      setActionError(msg);
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const allKycVerified = ["aadharFront", "aadharBack", "pan", "shop"].every(
    (k) => docVerification[k] === "verified"
  );
  const passbookVerified = docVerification.passbook === "verified";
  const minWalletSaved = Number(minWalletAmount) > 0 || Number(dealer.minWalletAmount) > 0;
  const isEligibleToApprove = allKycVerified && minWalletSaved;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!actionLoading) onClose();
      }}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* DIALOG HEADER */}
      <DialogTitle
        sx={{
          bgcolor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          p: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48, fontWeight: 800 }}>
            {dealer.shopName?.[0] || "D"}
          </Avatar>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" fontWeight={800} color="#0f172a">
                {dealer.shopName || "Unnamed Dealer"}
              </Typography>
              <Chip
                label={dealer.registrationStatus || "Pending"}
                color={
                  dealer.registrationStatus?.toLowerCase() === "approved"
                    ? "success"
                    : dealer.registrationStatus?.toLowerCase() === "rejected"
                    ? "error"
                    : "warning"
                }
                size="small"
                sx={{ fontWeight: 800, fontSize: "0.7rem", height: 22 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              ID: {dealer.dealerId || dealer._id} • Phone: {dealer.phone || "—"} • Owner: {dealer.ownerName || "—"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label={`${progress.completedCount} / ${progress.totalSteps} Steps Complete`}
            color={progress.canApprove ? "success" : progress.hasActionRequired ? "error" : "primary"}
            sx={{ fontWeight: 800, fontSize: "0.75rem" }}
          />
          <IconButton onClick={onClose} size="small" disabled={actionLoading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* STEPPER HEADER */}
      <Box sx={{ bgcolor: "#ffffff", borderBottom: "1px solid #e2e8f0", px: 3, py: 1.5, overflowX: "auto" }}>
        <Stepper nonLinear activeStep={activeStep}>
          {WIZARD_STEPS.map((step, idx) => {
            let isStepDone = false;
            if (step.id === "basic") isStepDone = !!(dealer.ownerName && dealer.phone);
            else if (step.id === "location") isStepDone = !!(dealer.city && (dealer.latitude || dealer.fullAddress));
            else if (step.id === "storefront") isStepDone = !!(dealer.shopName && dealer.shopImages?.length > 0);
            else if (step.id === "documents") isStepDone = allKycVerified;
            else if (step.id === "live") isStepDone = docVerification.face === "verified" || !!dealer.liveVerification?.shopLivePhoto;
            else if (step.id === "banking") isStepDone = passbookVerified || !!dealer.bankDetails?.accountNumber;
            else if (step.id === "settings") isStepDone = minWalletSaved;
            else if (step.id === "decision") isStepDone = isEligibleToApprove;

            return (
              <Step key={step.id} completed={isStepDone}>
                <StepButton
                  onClick={() => setActiveStep(idx)}
                  icon={
                    isStepDone ? (
                      <CheckCircleIcon sx={{ fontSize: 20, color: "#10b981" }} />
                    ) : (
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          bgcolor: activeStep === idx ? "#2563eb" : "#e2e8f0",
                          color: activeStep === idx ? "#fff" : "#64748b",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {idx + 1}
                      </Box>
                    )
                  }
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: activeStep === idx ? 800 : 600,
                      color: activeStep === idx ? "#2563eb" : "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step.label}
                  </Typography>
                </StepButton>
              </Step>
            );
          })}
        </Stepper>
      </Box>

      {/* ERROR BANNER */}
      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)} sx={{ mx: 3, mt: 2, borderRadius: 2 }}>
          {actionError}
        </Alert>
      )}

      {/* DIALOG CONTENT BODY */}
      <DialogContent sx={{ p: { xs: 2, sm: 3, md: 4 }, overflowY: "auto", flex: 1 }}>
        {/* STEP 1: BASIC INFORMATION */}
        {activeStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              <AlertTitle sx={{ fontWeight: 800 }}>Step 1: Basic Profile & Contact Details</AlertTitle>
              Verify owner identity and contact information. These details will be used for official communications and customer service alerts.
            </Alert>
            <Grid container spacing={3}>
              {[
                { label: "Owner Name", value: dealer.ownerName },
                { label: "Phone Number", value: dealer.phone },
                { label: "Alternative Phone", value: dealer.alternatePhone },
                { label: "Email Address", value: dealer.personalEmail || dealer.email },
                { label: "Shop Contact", value: dealer.shopContact },
                { label: "Created Via", value: dealer.createdVia || dealer.creatorType || "Self-Registration" },
                { label: "Registered On", value: dealer.createdAt ? new Date(dealer.createdAt).toLocaleDateString("en-IN") : "—" },
              ].map((item) => (
                <Grid item xs={12} sm={6} key={item.label}>
                  <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      {item.label}
                    </Typography>
                    <Typography variant="body1" fontWeight={700} color="#1e293b" mt={0.5}>
                      {item.value || "Not provided"}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* STEP 2: LOCATION & GPS */}
        {activeStep === 1 && (
          <Box>
            <Alert
              severity={dealer.latitude && dealer.longitude ? "success" : "warning"}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              <AlertTitle sx={{ fontWeight: 800 }}>Step 2: Shop Location & GPS Coordinates</AlertTitle>
              {dealer.latitude && dealer.longitude
                ? "GPS coordinates are set. Customer app will use these coordinates to discover garage within service radius."
                : "⚠️ Missing GPS coordinates! Latitude and Longitude must be set for customer radius matching."}
            </Alert>
            <Grid container spacing={3}>
              {[
                { label: "Shop Number / Door No.", value: dealer.shopNumber },
                { label: "Locality / Area", value: dealer.locality },
                { label: "City", value: dealer.city || dealer.permanentAddress?.city },
                { label: "State", value: dealer.state || dealer.permanentAddress?.state },
                { label: "Pincode", value: dealer.shopPincode },
                { label: "Full Address", value: dealer.fullAddress || dealer.permanentAddress?.address },
                {
                  label: "GPS Coordinates (Lat, Long)",
                  value: dealer.latitude ? `${dealer.latitude}, ${dealer.longitude}` : "Missing",
                },
              ].map((item) => (
                <Grid item xs={12} sm={6} key={item.label}>
                  <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      {item.label}
                    </Typography>
                    <Typography variant="body1" fontWeight={700} color="#1e293b" mt={0.5}>
                      {item.value || "—"}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {dealer.latitude && dealer.longitude && (
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LocationIcon />}
                  href={`https://www.google.com/maps/search/?api=1&query=${dealer.latitude},${dealer.longitude}`}
                  target="_blank"
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Open in Google Maps
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* STEP 3: STOREFRONT & WORKSHOP MEDIA */}
        {activeStep === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              <AlertTitle sx={{ fontWeight: 800 }}>Step 3: Storefront & Workshop Media</AlertTitle>
              Verify workshop pictures and business hours. Storefront photos help customers recognize the physical garage.
            </Alert>

            <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1.5}>
              Workshop Photos ({dealer.shopImages?.length || 0} uploaded)
            </Typography>

            <Grid container spacing={2} mb={3}>
              {Array.isArray(dealer.shopImages) && dealer.shopImages.length > 0 ? (
                dealer.shopImages.map((img, idx) => (
                  <Grid item xs={12} sm={4} md={3} key={idx}>
                    <Paper
                      elevation={0}
                      sx={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 2,
                        overflow: "hidden",
                        textAlign: "center",
                      }}
                    >
                      <Box
                        component="img"
                        src={getImageUrl(img)}
                        alt={`Shop Photo ${idx + 1}`}
                        onClick={() => window.open(getImageUrl(img), "_blank")}
                        sx={{
                          width: "100%",
                          height: 140,
                          objectFit: "cover",
                          cursor: "pointer",
                          display: "block",
                          "&:hover": { opacity: 0.85 },
                        }}
                      />
                      <Typography variant="caption" fontWeight={700} color="text.secondary" p={1} display="block">
                        Shop Photo {idx + 1}
                      </Typography>
                    </Paper>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ p: 4, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No storefront images uploaded yet.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Store Description
                  </Typography>
                  <Typography variant="body2" mt={0.5}>
                    {dealer.storeDescription || "No description provided."}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Weekly Holiday
                  </Typography>
                  <Typography variant="body2" mt={0.5}>
                    {dealer.holiday || "Open all days"}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* STEP 4: KYC DOCUMENTS REVIEW */}
        {activeStep === 3 && (
          <Box>
            <Alert
              severity={allKycVerified ? "success" : "warning"}
              sx={{ mb: 3, borderRadius: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<RequestDocIcon />}
                  onClick={() => setRequestDialogOpen(true)}
                  sx={{ fontWeight: 700, textTransform: "none" }}
                >
                  Request Docs
                </Button>
              }
            >
              <AlertTitle sx={{ fontWeight: 800 }}>Step 4: KYC Documents Verification (Mandatory)</AlertTitle>
              {allKycVerified
                ? "✓ All 4 KYC documents are verified! Prerequisite satisfied."
                : "⚠️ Review each KYC document below. Approve or Reject each document before approving dealer registration."}
            </Alert>

            <Grid container spacing={2.5}>
              {[
                { label: "Aadhaar Card (Front)", docKey: "aadharFront", path: dealer.documents?.aadharFront },
                { label: "Aadhaar Card (Back)", docKey: "aadharBack", path: dealer.documents?.aadharBack },
                { label: "PAN Card", docKey: "pan", path: dealer.documents?.panCardFront },
                { label: "Shop Certificate", docKey: "shop", path: dealer.documents?.shopCertificate },
              ].map((doc) => {
                const status = docVerification[doc.docKey] || "pending";
                const isVerified = status === "verified";
                const isRejected = status === "rejected";

                return (
                  <Grid item xs={12} sm={6} md={3} key={doc.docKey}>
                    <Paper
                      elevation={0}
                      sx={{
                        border: "1.5px solid",
                        borderColor: isVerified ? "#10b981" : isRejected ? "#ef4444" : "#e2e8f0",
                        bgcolor: isVerified ? "#f0fdf4" : isRejected ? "#fef2f2" : "#ffffff",
                        borderRadius: 2,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Box sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="subtitle2" fontWeight={800} fontSize="0.8rem">
                          {doc.label}
                        </Typography>
                        <Chip
                          size="small"
                          label={isVerified ? "Verified" : isRejected ? "Rejected" : "Pending"}
                          color={isVerified ? "success" : isRejected ? "error" : "warning"}
                          sx={{ fontSize: "0.65rem", fontWeight: 800, height: 20 }}
                        />
                      </Box>

                      {doc.path ? (
                        <Box
                          component="img"
                          src={getImageUrl(doc.path)}
                          alt={doc.label}
                          onClick={() => window.open(getImageUrl(doc.path), "_blank")}
                          sx={{
                            width: "100%",
                            height: 130,
                            objectFit: "contain",
                            cursor: "pointer",
                            bgcolor: "#f8fafc",
                            "&:hover": { opacity: 0.85 },
                          }}
                        />
                      ) : (
                        <Box sx={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc" }}>
                          <Typography variant="caption" color="text.secondary">
                            Not uploaded
                          </Typography>
                        </Box>
                      )}

                      {doc.path && (
                        <Box sx={{ display: "flex", borderTop: "1px solid #e2e8f0" }}>
                          <Button
                            fullWidth
                            size="small"
                            variant={isVerified ? "contained" : "text"}
                            color="success"
                            onClick={() => handleDocVerify(doc.docKey, "verified")}
                            sx={{ borderRadius: 0, fontWeight: 800, fontSize: "0.72rem", py: 0.75 }}
                          >
                            Approve
                          </Button>
                          <Divider orientation="vertical" flexItem />
                          <Button
                            fullWidth
                            size="small"
                            variant={isRejected ? "contained" : "text"}
                            color="error"
                            onClick={() => setRejectDoc({ key: doc.docKey, label: doc.label })}
                            sx={{ borderRadius: 0, fontWeight: 800, fontSize: "0.72rem", py: 0.75 }}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* STEP 5: LIVE GEO-VERIFICATION */}
        {activeStep === 4 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              <AlertTitle sx={{ fontWeight: 800 }}>Step 5: Live Shop Photo & Face Verification</AlertTitle>
              Verifies the physical garage presence using live camera capture with geo-tagging and owner selfie.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} mb={1.5}>
                    Live Storefront Photo
                  </Typography>
                  {dealer.liveVerification?.shopLivePhoto ? (
                    <Box
                      component="img"
                      src={getImageUrl(dealer.liveVerification.shopLivePhoto)}
                      alt="Live Shop"
                      onClick={() => window.open(getImageUrl(dealer.liveVerification.shopLivePhoto), "_blank")}
                      sx={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 1.5, cursor: "pointer", mb: 2 }}
                    />
                  ) : (
                    <Box sx={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", borderRadius: 1.5, mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">Live photo not uploaded</Typography>
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block">
                    Live Lat/Long: <strong>{dealer.liveVerification?.latitude ?? "—"}, {dealer.liveVerification?.longitude ?? "—"}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Captured At: <strong>{dealer.liveVerification?.timestamp ? new Date(dealer.liveVerification.timestamp).toLocaleString("en-IN") : "—"}</strong>
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Face Verification / Owner Selfie
                    </Typography>
                    <Chip
                      size="small"
                      label={docVerification.face === "verified" ? "Verified" : docVerification.face === "rejected" ? "Rejected" : "Pending"}
                      color={docVerification.face === "verified" ? "success" : docVerification.face === "rejected" ? "error" : "warning"}
                      sx={{ fontWeight: 800, fontSize: "0.65rem", height: 20 }}
                    />
                  </Box>

                  {dealer.documents?.faceVerificationImage ? (
                    <Box
                      component="img"
                      src={getImageUrl(dealer.documents.faceVerificationImage)}
                      alt="Face Verification"
                      onClick={() => window.open(getImageUrl(dealer.documents.faceVerificationImage), "_blank")}
                      sx={{ width: "100%", height: 180, objectFit: "contain", borderRadius: 1.5, cursor: "pointer", mb: 2, bgcolor: "#f8fafc" }}
                    />
                  ) : (
                    <Box sx={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", borderRadius: 1.5, mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">Selfie not uploaded</Typography>
                    </Box>
                  )}

                  {dealer.documents?.faceVerificationImage && (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant={docVerification.face === "verified" ? "contained" : "outlined"}
                        color="success"
                        fullWidth
                        onClick={() => handleDocVerify("face", "verified")}
                        sx={{ fontWeight: 700 }}
                      >
                        Approve Face
                      </Button>
                      <Button
                        size="small"
                        variant={docVerification.face === "rejected" ? "contained" : "outlined"}
                        color="error"
                        fullWidth
                        onClick={() => setRejectDoc({ key: "face", label: "Face / Selfie" })}
                        sx={{ fontWeight: 700 }}
                      >
                        Reject Face
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* STEP 6: BANKING & PAYOUT */}
        {activeStep === 5 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              <AlertTitle sx={{ fontWeight: 800 }}>Step 6: Bank Account & Passbook Verification</AlertTitle>
              Verified bank details ensure payouts, customer billing deposits, and financial reconciliation function properly.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={7}>
                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} mb={2}>
                    Bank Account Details
                  </Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: "Account Holder Name", value: dealer.bankDetails?.accountHolderName },
                      { label: "Bank Name", value: dealer.bankDetails?.bankName },
                      { label: "Account Number", value: dealer.bankDetails?.accountNumber },
                      { label: "IFSC Code", value: dealer.bankDetails?.ifscCode },
                      { label: "UPI ID", value: dealer.bankDetails?.upiId },
                    ].map((item) => (
                      <Grid item xs={12} sm={6} key={item.label}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          {item.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="#1e293b" mt={0.25}>
                          {item.value || "—"}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={5}>
                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Passbook / Cheque Image
                    </Typography>
                    <Chip
                      size="small"
                      label={docVerification.passbook === "verified" ? "Verified" : docVerification.passbook === "rejected" ? "Rejected" : "Pending"}
                      color={docVerification.passbook === "verified" ? "success" : docVerification.passbook === "rejected" ? "error" : "warning"}
                      sx={{ fontWeight: 800, fontSize: "0.65rem", height: 20 }}
                    />
                  </Box>

                  {dealer.bankDetails?.passbookImage ? (
                    <Box
                      component="img"
                      src={getImageUrl(dealer.bankDetails.passbookImage)}
                      alt="Passbook"
                      onClick={() => window.open(getImageUrl(dealer.bankDetails.passbookImage), "_blank")}
                      sx={{ width: "100%", height: 140, objectFit: "contain", borderRadius: 1.5, cursor: "pointer", mb: 2, bgcolor: "#f8fafc" }}
                    />
                  ) : (
                    <Box sx={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", borderRadius: 1.5, mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">Passbook image not uploaded</Typography>
                    </Box>
                  )}

                  {dealer.bankDetails?.passbookImage && (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant={docVerification.passbook === "verified" ? "contained" : "outlined"}
                        color="success"
                        fullWidth
                        onClick={() => handleDocVerify("passbook", "verified")}
                        sx={{ fontWeight: 700 }}
                      >
                        Approve Passbook
                      </Button>
                      <Button
                        size="small"
                        variant={docVerification.passbook === "rejected" ? "contained" : "outlined"}
                        color="error"
                        fullWidth
                        onClick={() => setRejectDoc({ key: "passbook", label: "Passbook / Cheque" })}
                        sx={{ fontWeight: 700 }}
                      >
                        Reject Passbook
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* STEP 7: WALLET & BUSINESS SETTINGS */}
        {activeStep === 6 && (
          <Box>
            <Alert
              severity={minWalletSaved ? "success" : "warning"}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              <AlertTitle sx={{ fontWeight: 800 }}>Step 7: Platform Parameters & Minimum Wallet Amount</AlertTitle>
              {minWalletSaved
                ? "✓ Minimum wallet amount is set! Dealer can maintain operational balance for booking deductions."
                : "⚠️ Minimum wallet amount must be saved before approving dealer. Dealer cannot take bookings without a minimum wallet threshold."}
            </Alert>

            <Grid container spacing={3}>
              {/* Min Wallet Box */}
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 3, border: "2px solid #2563eb", borderRadius: 2, bgcolor: "#f8faff" }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#1e40af" mb={1}>
                    MINIMUM WALLET BALANCE (MANDATORY)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                    The minimum wallet balance required for this dealer. If dealer wallet falls below this, bookings will pause.
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Min Wallet Amount (₹)"
                      value={minWalletAmount}
                      onChange={(e) => setMinWalletAmount(e.target.value)}
                      placeholder="e.g. 500"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      }}
                      sx={{ bgcolor: "#ffffff", borderRadius: 1 }}
                      disabled={isSavingWallet}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSaveMinWallet}
                      disabled={isSavingWallet || minWalletAmount === ""}
                      startIcon={isSavingWallet ? <CircularProgress size={14} color="inherit" /> : null}
                      sx={{ fontWeight: 700 }}
                    >
                      {isSavingWallet ? "Saving…" : "Save Wallet"}
                    </Button>
                  </Box>
                  {walletSaveSuccess && (
                    <Typography variant="caption" color="success.main" fontWeight={700} display="block" mt={1}>
                      ✓ Min wallet amount saved successfully!
                    </Typography>
                  )}
                </Paper>
              </Grid>

              {/* Review Notes */}
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                    INTERNAL REVIEW NOTES
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                    Internal notes visible only to admins regarding this dealer.
                  </Typography>

                  <TextField
                    multiline
                    rows={2}
                    fullWidth
                    size="small"
                    placeholder="Add internal notes..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    disabled={notesSaving}
                    sx={{ mb: 1.5 }}
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {notesSaved && (
                      <Typography variant="caption" color="success.main" fontWeight={700}>
                        ✓ Notes saved
                      </Typography>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleSaveNotes}
                      disabled={notesSaving}
                      sx={{ fontWeight: 700, ml: "auto" }}
                    >
                      Save Notes
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              {/* Platform Parameters Summary */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} mb={2}>
                    Platform Charges & Operational Parameters
                  </Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: "Commission %", value: dealer.commission != null ? `${dealer.commission}%` : "Default (Platform)" },
                      { label: "GST / Tax %", value: dealer.tax != null ? `${dealer.tax}%` : "0%" },
                      { label: "Pickup Charges", value: `₹${dealer.pickupCharges ?? 0}` },
                      { label: "Drop Charges", value: `₹${dealer.dropCharges ?? 0}` },
                      { label: "Towing Charges", value: `₹${dealer.towingCharges ?? 0}` },
                      { label: "Service Radius", value: `${dealer.serviceRadiusKm ?? SERVICE_RADIUS_DEFAULT_KM} km` },
                    ].map((item) => (
                      <Grid item xs={6} sm={4} md={2} key={item.label}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          {item.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="#1e293b" mt={0.25}>
                          {item.value}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* STEP 8: FINAL DECISION & APPROVAL */}
        {activeStep === 7 && (
          <Box>
            {/* Status Banner */}
            {isEligibleToApprove ? (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                <AlertTitle sx={{ fontWeight: 800 }}>Ready for Approval! 🎉</AlertTitle>
                All prerequisite onboarding steps, KYC documents, and business settings are verified. You can now approve this dealer. Approving will activate dealer login, review eligibility, and allow booking operations.
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                <AlertTitle sx={{ fontWeight: 800 }}>Action Required Before Approval ⚠️</AlertTitle>
                Dealer cannot be approved yet because one or more prerequisite steps are pending. See the checklist below.
              </Alert>
            )}

            {/* Comprehensive Checklist */}
            <Paper elevation={0} sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 3, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={800} color="#1e293b" mb={2}>
                Pre-Approval Verification Checklist
              </Typography>

              <Grid container spacing={2}>
                {[
                  {
                    title: "1. Basic & Contact Information",
                    done: !!(dealer.ownerName && dealer.phone),
                    detail: dealer.ownerName ? `${dealer.ownerName} (${dealer.phone})` : "Missing contact details",
                    stepIdx: 0,
                  },
                  {
                    title: "2. Shop Location & Coordinates",
                    done: !!(dealer.city && (dealer.latitude || dealer.fullAddress)),
                    detail: dealer.city ? `${dealer.city}, ${dealer.state || ""}` : "Missing address or GPS",
                    stepIdx: 1,
                  },
                  {
                    title: "3. Storefront Photos",
                    done: !!(dealer.shopName && dealer.shopImages?.length > 0),
                    detail: dealer.shopImages?.length ? `${dealer.shopImages.length} images uploaded` : "Storefront images missing",
                    stepIdx: 2,
                  },
                  {
                    title: "4. KYC Documents (Aadhaar, PAN, Shop)",
                    done: allKycVerified,
                    detail: allKycVerified ? "All 4 KYC documents verified" : "Some KYC documents pending or rejected",
                    stepIdx: 3,
                  },
                  {
                    title: "5. Live Geo-Verification & Selfie",
                    done: docVerification.face === "verified" || !!dealer.liveVerification?.shopLivePhoto,
                    detail: dealer.liveVerification?.shopLivePhoto ? "Live photo present" : "Live photo not verified",
                    stepIdx: 4,
                  },
                  {
                    title: "6. Bank Details & Passbook",
                    done: passbookVerified || !!dealer.bankDetails?.accountNumber,
                    detail: dealer.bankDetails?.accountNumber ? `A/C: ${dealer.bankDetails.accountNumber}` : "Bank details missing",
                    stepIdx: 5,
                  },
                  {
                    title: "7. Minimum Wallet Amount Saved",
                    done: minWalletSaved,
                    detail: minWalletSaved ? `₹${minWalletAmount || dealer.minWalletAmount} configured` : "Min Wallet NOT set (Required)",
                    stepIdx: 6,
                  },
                ].map((item, idx) => (
                  <Grid item xs={12} sm={6} key={idx}>
                    <Box
                      sx={{
                        p: 1.75,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: item.done ? "#bbf7d0" : "#fed7aa",
                        bgcolor: item.done ? "#f0fdf4" : "#fffbeb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        {item.done ? (
                          <CheckCircleIcon sx={{ color: "#10b981", fontSize: 20 }} />
                        ) : (
                          <CancelIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
                        )}
                        <Box>
                          <Typography variant="body2" fontWeight={700} color="#1e293b">
                            {item.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.detail}
                          </Typography>
                        </Box>
                      </Box>
                      {!item.done && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setActiveStep(item.stepIdx)}
                          sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.72rem" }}
                        >
                          Fix
                        </Button>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* Confirmation Strip when action clicked */}
            {confirmAction && (
              <Box
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 2,
                  bgcolor: confirmAction === "approve" ? "#ecfdf5" : "#fef2f2",
                  border: "1.5px solid",
                  borderColor: confirmAction === "approve" ? "#10b981" : "#ef4444",
                }}
              >
                <Typography variant="subtitle1" fontWeight={800} color={confirmAction === "approve" ? "#065f46" : "#991b1b"}>
                  {confirmAction === "approve"
                    ? `Confirm approval for "${dealer.shopName}"?`
                    : `Reject application for "${dealer.shopName}"?`}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {confirmAction === "approve"
                    ? "This will approve the dealer, activate their login access to the provider app, and enable booking features."
                    : "Please specify the rejection reason below so the dealer is informed."}
                </Typography>

                {confirmAction === "reject" && (
                  <TextField
                    multiline
                    rows={2}
                    fullWidth
                    size="small"
                    placeholder="Enter rejection reason (e.g., Incomplete KYC, invalid address)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    sx={{ mb: 2, bgcolor: "#ffffff" }}
                  />
                )}

                <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => setConfirmAction(null)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color={confirmAction === "approve" ? "success" : "error"}
                    onClick={executeConfirmedAction}
                    disabled={actionLoading}
                    startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : null}
                    sx={{ fontWeight: 800 }}
                  >
                    {confirmAction === "approve" ? "Yes, Approve & Activate Dealer" : "Yes, Reject Application"}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Action Buttons */}
            {!confirmAction && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<RequestDocIcon />}
                    onClick={() => setRequestDialogOpen(true)}
                    sx={{ fontWeight: 700 }}
                  >
                    Request Documents
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => setConfirmAction("reject")}
                    sx={{ fontWeight: 700 }}
                  >
                    Reject Application
                  </Button>
                </Box>

                <Tooltip
                  title={
                    !allKycVerified
                      ? "Review and approve all 4 KYC documents before approving dealer."
                      : !minWalletSaved
                      ? "Set and save a Min Wallet Amount before approving dealer."
                      : dealer.registrationStatus?.toLowerCase() === "approved"
                      ? "Dealer is already approved."
                      : ""
                  }
                >
                  <span>
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      startIcon={<CheckCircleIcon />}
                      disabled={!isEligibleToApprove || dealer.registrationStatus?.toLowerCase() === "approved"}
                      onClick={() => setConfirmAction("approve")}
                      sx={{ fontWeight: 800, px: 4 }}
                    >
                      {dealer.registrationStatus?.toLowerCase() === "approved"
                        ? "Already Approved"
                        : "Approve & Activate Dealer"}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      {/* DIALOG FOOTER NAVIGATION */}
      <DialogActions sx={{ p: 2, bgcolor: "#f8fafc", borderTop: "1px solid #e2e8f0", justifyContent: "space-between" }}>
        <Button
          onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
          disabled={activeStep === 0 || actionLoading}
          startIcon={<ArrowBackIcon />}
          sx={{ fontWeight: 700 }}
        >
          Previous
        </Button>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Step {activeStep + 1} of {WIZARD_STEPS.length}
          </Typography>
          {activeStep < WIZARD_STEPS.length - 1 && (
            <Button
              size="small"
              variant="text"
              onClick={() => setActiveStep(WIZARD_STEPS.length - 1)}
              sx={{ fontWeight: 700, textTransform: "none" }}
            >
              Skip to Decision
            </Button>
          )}
        </Box>

        {activeStep < WIZARD_STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setActiveStep((prev) => Math.min(WIZARD_STEPS.length - 1, prev + 1))}
            endIcon={<ArrowForwardIcon />}
            sx={{ fontWeight: 700 }}
          >
            Next Step
          </Button>
        ) : (
          <Button variant="outlined" color="inherit" onClick={onClose} sx={{ fontWeight: 700 }}>
            Done / Close
          </Button>
        )}
      </DialogActions>

      {/* DOCUMENT REQUEST & REJECT SUB-DIALOGS */}
      <RequestDocumentsDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        onSubmit={handleRequestDocuments}
        docOptions={DEFAULT_DOC_OPTIONS}
      />

      <DocumentRejectDialog
        open={!!rejectDoc}
        docLabel={rejectDoc?.label}
        onClose={() => setRejectDoc(null)}
        onConfirm={(reason) => handleRejectConfirm(rejectDoc.key, reason)}
      />
    </Dialog>
  );
};

export default DealerReviewWizardDialog;

