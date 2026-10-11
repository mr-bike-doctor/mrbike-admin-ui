"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  Stack,
  Button,
  FormControlLabel,
  Checkbox,
  Switch,
  IconButton,
  CircularProgress,
  InputAdornment,
  Chip,
  Alert,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Person as PersonIcon,
  Storefront as ShopIcon,
  LocationOn as LocationIcon,
  Article as DocumentIcon,
  AccountBalance as BankIcon,
  Settings as SettingsIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  AddPhotoAlternate as AddIcon,
  Phone as PhoneIcon,
  Percent as PercentIcon,
  CurrencyRupee as CurrencyRupeeIcon,
  Save as SaveIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckCircleIcon,
  NotificationsActive as NotificationsIcon,
} from "@mui/icons-material";
import StateCitySelect from "../Global/StateCitySelect";
import Swal from "sweetalert2";
import { addDealer, updateDealer } from "../../api";
import { getApiErrorMessage, getApiFieldErrors } from "../../utils/apiError";
import { useNavigate } from "react-router-dom";
import {
  initBusinessSettings,
  validateBusinessSettings,
  SERVICE_RADIUS_MIN_KM,
  SERVICE_RADIUS_MAX_KM,
  SERVICE_RADIUS_DEFAULT_KM,
} from "./businessSettings";

const IMAGE_BASE_URL = process.env.REACT_APP_IMAGE_BASE_URL || "";
const getImageUrl = (path) =>
  !path ? null : path.startsWith("http") ? path : `${IMAGE_BASE_URL}${path}`;

// Normalizes a stored date (ISO string or Date) to the yyyy-MM-dd shape <input type="date"> requires.
const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const GENDER_OPTIONS = ["Male", "Female", "Other"];

// ─── Section card wrapper ─────────────────────────────────────────────────────
const SectionCard = ({ icon, title, subtitle, errorCount = 0, children }) => (
  <Card
    elevation={0}
    sx={{
      border: "1px solid",
      borderColor: errorCount > 0 ? "error.light" : "divider",
      borderRadius: 3,
      overflow: "visible",
      mb: 3,
    }}
  >
    <Box
      sx={{
        px: 3,
        py: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "#fafbff",
        borderRadius: "12px 12px 0 0",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box sx={{ color: "primary.main", display: "flex", alignItems: "center" }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" fontWeight="800" color="text.primary" lineHeight={1.2}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {errorCount > 0 && (
        <Chip
          label={`${errorCount} error${errorCount > 1 ? "s" : ""}`}
          size="small"
          color="error"
          variant="outlined"
          sx={{ fontWeight: 700, fontSize: "0.7rem" }}
        />
      )}
    </Box>
    <CardContent sx={{ p: 3 }}>{children}</CardContent>
  </Card>
);

// ─── Document upload slot ─────────────────────────────────────────────────────
const DocUploadSlot = ({ label, existingUrl, newFile, onUpload, onClear }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ mb: 1, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
      {label}
    </Typography>
    {existingUrl || newFile ? (
      <Box sx={{ position: "relative", width: "100%", height: 120, borderRadius: 2, overflow: "hidden", border: "2px solid", borderColor: "success.light" }}>
        <img
          src={newFile ? URL.createObjectURL(newFile) : existingUrl}
          alt={label}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <Box sx={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 0.5 }}>
          <Box sx={{ bgcolor: "success.main", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircleIcon sx={{ fontSize: 14, color: "white" }} />
          </Box>
          <IconButton size="small" onClick={onClear} sx={{ bgcolor: "white", width: 22, height: 22, "&:hover": { bgcolor: "#fee2e2" } }}>
            <DeleteIcon sx={{ fontSize: 14, color: "error.main" }} />
          </IconButton>
        </Box>
      </Box>
    ) : (
      <Button
        component="label"
        variant="outlined"
        fullWidth
        startIcon={<UploadIcon fontSize="small" />}
        sx={{
          height: 120,
          borderStyle: "dashed",
          borderRadius: 2,
          flexDirection: "column",
          gap: 0.5,
          color: "text.secondary",
          borderColor: "divider",
          "&:hover": { borderColor: "primary.main", color: "primary.main", bgcolor: "#f0f6ff" },
        }}
      >
        <Typography variant="caption" fontWeight="700">
          Upload
        </Typography>
        <input type="file" hidden accept="image/*" onChange={onUpload} />
      </Button>
    )}
  </Box>
);

// ─── Main component ───────────────────────────────────────────────────────────
const DealerForm = ({ dealerData, dealerId, isEdit }) => {
  const navigate = useNavigate();

  const [shopImages, setShopImages] = useState([]);
  const [existingShopImages, setExistingShopImages] = useState([]);
  const [existingImages, setExistingImages] = useState({
    panCardFront: null, aadharFront: null, aadharBack: null,
    shopCertificate: null, faceVerificationImage: null, passbookImage: null,
  });

  const initFormData = useCallback(() => {
    if (isEdit && dealerData) {
      return {
        shopName: dealerData.shopName || "",
        shopEmail: dealerData.shopEmail || "",
        phone: dealerData.phone || "",
        shopPincode: dealerData.shopPincode || "",
        shopContact: dealerData.shopContact || "",
        locality: dealerData.locality || "",
        gstNumber: dealerData.gstNumber || "",
        shopOpeningDate: toDateInputValue(dealerData.shopOpeningDate),
        holiday: dealerData.holiday || "",
        openingTime: dealerData.businessHours?.open || "",
        closingTime: dealerData.businessHours?.close || "",
        storeDescription: dealerData.storeDescription || "",
        ownerName: dealerData.ownerName || "",
        personalEmail: dealerData.personalEmail || "",
        personalPhone: dealerData.phone || "",
        alternatePhone: dealerData.alternatePhone || "",
        gender: dealerData.gender || "",
        dob: toDateInputValue(dealerData.dob),
        aadharCardNo: dealerData.aadharCardNo || "",
        panCardNo: dealerData.panCardNo || "",
        fullAddress: dealerData.permanentAddress?.address || "",
        state: dealerData.permanentAddress?.state || "",
        city: dealerData.permanentAddress?.city || "",
        permanentAddress: dealerData.permanentAddress?.address || "",
        permanentState: dealerData.permanentAddress?.state || "",
        permanentCity: dealerData.permanentAddress?.city || "",
        presentAddress: dealerData.presentAddress?.address || "",
        presentState: dealerData.presentAddress?.state || "",
        presentCity: dealerData.presentAddress?.city || "",
        latitude: dealerData.latitude || "",
        longitude: dealerData.longitude || "",
        accountHolderName: dealerData.bankDetails?.accountHolderName || "",
        bankName: dealerData.bankDetails?.bankName || "",
        accountNumber: dealerData.bankDetails?.accountNumber || "",
        ifscCode: dealerData.bankDetails?.ifscCode || "",
        upiId: dealerData.bankDetails?.upiId || "",
        ...initBusinessSettings(dealerData),
        notifyEmail: !!dealerData.notifications?.email,
        notifySms: !!dealerData.notifications?.sms,
        notifyApp: !!dealerData.notifications?.app,
      };
    }
    return {
      shopName: "", shopEmail: "", phone: "", shopPincode: "",
      shopContact: "", locality: "", gstNumber: "", shopOpeningDate: "", holiday: "",
      openingTime: "", closingTime: "", storeDescription: "",
      ownerName: "", personalEmail: "", personalPhone: "", alternatePhone: "",
      gender: "", dob: "",
      aadharCardNo: "", panCardNo: "",
      fullAddress: "", state: "", city: "",
      permanentAddress: "", permanentState: "", permanentCity: "",
      presentAddress: "", presentState: "", presentCity: "",
      latitude: "", longitude: "",
      accountHolderName: "", bankName: "", accountNumber: "", ifscCode: "", upiId: "",
      ...initBusinessSettings(),
      notifyEmail: false, notifySms: false, notifyApp: false,
    };
  }, [isEdit, dealerData]);

  const [formData, setFormData] = useState(initFormData);
  const [errors, setErrors] = useState({});
  const [previewUrls, setPreviewUrls] = useState([]);
  const [panCardFront, setPanCardFront] = useState(null);
  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [shopCertificate, setShopCertificate] = useState(null);
  const [faceVerificationImage, setFaceVerificationImage] = useState(null);
  const [passbookImage, setPassbookImage] = useState(null);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // track submit-attempt so errors appear only after first save click
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (isEdit && dealerData) {
      setFormData(initFormData());
      setExistingShopImages(
        dealerData.shopImages?.length > 0
          ? dealerData.shopImages.map((img) => getImageUrl(img))
          : []
      );
      setExistingImages({
        panCardFront: getImageUrl(dealerData.documents?.panCardFront || dealerData.panCardFront),
        aadharFront: getImageUrl(dealerData.documents?.aadharFront || dealerData.aadharFront),
        aadharBack: getImageUrl(dealerData.documents?.aadharBack || dealerData.aadharBack),
        shopCertificate: getImageUrl(dealerData.documents?.shopCertificate),
        faceVerificationImage: getImageUrl(dealerData.documents?.faceVerificationImage),
        passbookImage: getImageUrl(dealerData.bankDetails?.passbookImage),
      });
      setSameAsPermanent(
        dealerData.presentAddress?.address === dealerData.permanentAddress?.address &&
        dealerData.presentAddress?.state === dealerData.permanentAddress?.state &&
        dealerData.presentAddress?.city === dealerData.permanentAddress?.city
      );
    }
  }, [dealerData, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Unsaved changes: warn on browser refresh/close ──────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ─── Validation ───────────────────────────────────────────────────────────
  const validate = (data = formData) => {
    const e = {};
    if (!data.ownerName?.trim()) e.ownerName = "Owner name is required";
    if (!data.phone?.trim()) e.phone = "Contact number is required";
    else if (!/^\d{10}$/.test(data.phone.trim())) e.phone = "Must be a 10-digit number";
    if (data.aadharCardNo && !/^\d{12}$/.test(data.aadharCardNo))
      e.aadharCardNo = "Aadhar must be exactly 12 digits";
    if (data.panCardNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(data.panCardNo))
      e.panCardNo = "Invalid PAN format (e.g. ABCDE1234F)";
    if (!data.shopName?.trim()) e.shopName = "Shop name is required";
    if (!data.shopEmail?.trim()) e.shopEmail = "Shop email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.shopEmail.trim()))
      e.shopEmail = "Enter a valid email address";
    if (!data.shopPincode?.trim()) e.shopPincode = "Pincode is required";
    else if (!/^\d{6}$/.test(data.shopPincode.trim()))
      e.shopPincode = "Pincode must be 6 digits";
    if (data.shopContact && !/^\d{10}$/.test(data.shopContact.trim()))
      e.shopContact = "Must be a 10-digit number";
    if (data.gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(data.gstNumber.trim()))
      e.gstNumber = "Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)";
    if (!data.fullAddress?.trim()) e.fullAddress = "Address is required";
    if (!data.state?.trim()) e.state = "State is required";
    if (!data.city?.trim()) e.city = "City is required";
    Object.assign(e, validateBusinessSettings(data));
    if (data.accountNumber && !/^\d{9,18}$/.test(data.accountNumber))
      e.accountNumber = "Account number must be 9–18 digits";
    if (data.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode.toUpperCase()))
      e.ifscCode = "Invalid IFSC format (e.g. SBIN0001234)";
    return e;
  };

  // errors per section for badge display
  const sectionErrors = {
    personal: ["ownerName", "phone", "aadharCardNo", "panCardNo"],
    shop: ["shopName", "shopEmail", "shopPincode", "shopContact", "gstNumber"],
    location: ["fullAddress", "state", "city"],
    bank: ["accountNumber", "ifscCode"],
    business: ["comission", "tax", "serviceRadiusKm"],
  };
  const countSectionErrors = (keys) =>
    submitAttempted ? keys.filter((k) => errors[k]).length : 0;

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "sameAsPermanent") {
      setSameAsPermanent(checked);
      if (checked) {
        setFormData((prev) => ({
          ...prev,
          presentAddress: prev.permanentAddress || prev.fullAddress,
          presentState: prev.permanentState || prev.state,
          presentCity: prev.permanentCity || prev.city,
        }));
      }
      setIsDirty(true);
      return;
    }
    const newVal = type === "checkbox" ? checked : value;
    setFormData((prev) => {
      const next = { ...prev, [name]: newVal };
      // keep fullAddress / permanentAddress in sync
      if (name === "fullAddress") {
        next.permanentAddress = value;
      }
      if (name === "state") {
        next.permanentState = value;
      }
      if (name === "city") {
        next.permanentCity = value;
      }
      return next;
    });
    setIsDirty(true);
    // clear individual error on change if already submitted
    if (submitAttempted && errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileUpload = (setter, fieldName) => (e) => {
    const file = e.target.files[0];
    if (file) {
      setter(file);
      setExistingImages((prev) => ({ ...prev, [fieldName]: null }));
      setIsDirty(true);
    }
  };

  const handleMultipleImages = (e) => {
    const files = Array.from(e.target.files);
    if (existingShopImages.length + shopImages.length + files.length > 5) {
      Swal.fire("Limit Exceeded", "Maximum 5 shop images allowed.", "warning");
      return;
    }
    setPreviewUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    setShopImages((prev) => [...prev, ...files]);
    setIsDirty(true);
  };

  const handleRemoveImage = (index, isExisting) => {
    if (isExisting) {
      setExistingShopImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
      setShopImages((prev) => prev.filter((_, i) => i !== index));
    }
    setIsDirty(true);
  };

  const handleCancel = async () => {
    if (isDirty) {
      const result = await Swal.fire({
        title: "Discard changes?",
        text: "You have unsaved changes. Leaving will discard them.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Discard",
        cancelButtonText: "Keep editing",
        confirmButtonColor: "#e53e3e",
      });
      if (!result.isConfirmed) return;
    }
    navigate(-1);
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // scroll to first error
      const firstKey = Object.keys(errs)[0];
      document.querySelector(`[name="${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    const form = new FormData();
    if (isEdit && dealerId) form.append("id", dealerId);

    const nestedKeys = [
      "openingTime", "closingTime", "upiId", "providesPickup", "providesDrop", "providesTowing",
      "fullAddress", "state", "city",
      "permanentAddress", "permanentState", "permanentCity",
      "presentAddress", "presentState", "presentCity",
      "notifyEmail", "notifySms", "notifyApp",
    ];
    Object.keys(formData).forEach((key) => {
      if (!nestedKeys.includes(key)) form.append(key, formData[key]);
    });

    form.append("businessHours[open]", formData.openingTime || "");
    form.append("businessHours[close]", formData.closingTime || "");
    form.append("bankDetails[upiId]", formData.upiId || "");
    form.append("providesPickup", formData.providesPickup);
    form.append("providesDrop", formData.providesDrop);
    form.append("providesTowing", formData.providesTowing);

    // Permanent/present address are nested objects on the backend
    // (permanentAddress: { address, state, city }), so submit them
    // with bracket notation instead of flattening to top-level fields.
    form.append("permanentAddress[address]", formData.fullAddress || "");
    form.append("permanentAddress[state]", formData.state || "");
    form.append("permanentAddress[city]", formData.city || "");
    form.append("presentAddress[address]", formData.presentAddress || "");
    form.append("presentAddress[state]", formData.presentState || "");
    form.append("presentAddress[city]", formData.presentCity || "");

    form.append("notifications[email]", formData.notifyEmail);
    form.append("notifications[sms]", formData.notifySms);
    form.append("notifications[app]", formData.notifyApp);

    if (panCardFront) form.append("panCardFront", panCardFront);
    if (aadharFront) form.append("aadharFront", aadharFront);
    if (aadharBack) form.append("aadharBack", aadharBack);
    if (shopCertificate) form.append("shopCertificate", shopCertificate);
    if (faceVerificationImage) form.append("faceVerificationImage", faceVerificationImage);
    if (passbookImage) form.append("passbookImage", passbookImage);
    existingShopImages.forEach((url) => form.append("existingShopImages", url));
    shopImages.forEach((file) => form.append("shopImages", file));

    try {
      const response = isEdit ? await updateDealer(form) : await addDealer(form);
      if (response?.success || response?.status === true || response?.status === 200) {
        setIsDirty(false);
        setSubmitAttempted(false);
        Swal.fire("Saved!", response.message || "Dealer profile updated.", "success").then(() => {
          navigate("/dealers");
        });
        return;
      }

      // 2xx body that still reports a failure carries the reason in `message`.
      Swal.fire({
        icon: "error",
        title: isEdit ? "Failed to Update Dealer" : "Failed to Add Dealer",
        text: response?.message || "The dealer could not be saved.",
      });
    } catch (error) {
      // Report what the server actually rejected instead of a blanket
      // "Failed to save dealer", and mark the offending field if it named one.
      const fieldErrors = getApiFieldErrors(error, {
        "shop-email": "email",
        "shop-contact": "phone",
        commission: "comission",
      });
      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }

      Swal.fire({
        icon: "error",
        title: isEdit ? "Failed to Update Dealer" : "Failed to Add Dealer",
        text: getApiErrorMessage(error, "Failed to save dealer. Please try again."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>

      {/* ── Unsaved changes banner ─────────────────────────────────────────── */}
      {isDirty && (
        <Alert
          severity="warning"
          icon={<WarningIcon fontSize="inherit" />}
          sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}
        >
          You have unsaved changes. Use the Save button below to apply them.
        </Alert>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — Personal Information
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={<PersonIcon />}
        title="Personal Information"
        subtitle="Owner identity and contact details"
        errorCount={countSectionErrors(sectionErrors.personal)}
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Owner Name"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              error={!!errors.ownerName}
              helperText={errors.ownerName}
              placeholder="Full legal name of the shop owner"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Contact Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone || "10-digit mobile number"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{ maxLength: 10 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Personal Email"
              name="personalEmail"
              value={formData.personalEmail}
              onChange={handleChange}
              placeholder="owner@example.com"
              helperText="Owner's personal email (different from shop email)"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Alternate Phone"
              name="alternatePhone"
              value={formData.alternatePhone}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              helperText="Optional secondary contact number"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Aadhaar Card No."
              name="aadharCardNo"
              value={formData.aadharCardNo}
              onChange={handleChange}
              error={!!errors.aadharCardNo}
              helperText={errors.aadharCardNo || "12-digit Aadhaar number"}
              inputProps={{ maxLength: 12 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="PAN Card No."
              name="panCardNo"
              value={formData.panCardNo}
              onChange={handleChange}
              error={!!errors.panCardNo}
              helperText={errors.panCardNo || "10-character PAN (e.g. ABCDE1234F)"}
              inputProps={{ maxLength: 10, style: { textTransform: "uppercase" } }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="gender-label">Gender</InputLabel>
              <Select
                labelId="gender-label"
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <MenuItem value="">
                  <em>Not specified</em>
                </MenuItem>
                {(formData.gender && !GENDER_OPTIONS.includes(formData.gender)
                  ? [formData.gender, ...GENDER_OPTIONS]
                  : GENDER_OPTIONS
                ).map((g) => (
                  <MenuItem key={g} value={g}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Date of Birth"
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — Shop Information
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={<ShopIcon />}
        title="Shop Information"
        subtitle="Business name, contact, and operating hours"
        errorCount={countSectionErrors(sectionErrors.shop)}
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Shop Name"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              error={!!errors.shopName}
              helperText={errors.shopName || "Registered name of the shop"}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Shop Email"
              name="shopEmail"
              type="email"
              value={formData.shopEmail}
              onChange={handleChange}
              error={!!errors.shopEmail}
              helperText={errors.shopEmail || "Used for booking notifications"}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Shop Pincode"
              name="shopPincode"
              value={formData.shopPincode}
              onChange={handleChange}
              error={!!errors.shopPincode}
              helperText={errors.shopPincode || "6-digit postal code of the shop"}
              inputProps={{ maxLength: 6 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Shop Contact Number"
              name="shopContact"
              value={formData.shopContact}
              onChange={handleChange}
              error={!!errors.shopContact}
              helperText={errors.shopContact || "Landline / mobile number displayed for the shop (if different from owner's phone)"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{ maxLength: 10 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Locality / Area"
              name="locality"
              value={formData.locality}
              onChange={handleChange}
              placeholder="e.g. Atmakur, Kurnool"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="GST Number"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
              error={!!errors.gstNumber}
              helperText={errors.gstNumber || "15-character GSTIN (optional)"}
              inputProps={{ maxLength: 15, style: { textTransform: "uppercase" } }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Opening Time"
              name="openingTime"
              value={formData.openingTime}
              onChange={handleChange}
              placeholder="e.g. 09:00 AM"
              helperText="Daily opening time"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Closing Time"
              name="closingTime"
              value={formData.closingTime}
              onChange={handleChange}
              placeholder="e.g. 07:00 PM"
              helperText="Daily closing time"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Shop Opening Date"
              name="shopOpeningDate"
              type="date"
              value={formData.shopOpeningDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              helperText="Date the shop was established"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Weekly Holiday"
              name="holiday"
              value={formData.holiday}
              onChange={handleChange}
              placeholder="e.g. Sunday"
              helperText="Day the shop is closed weekly"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Store Description"
              name="storeDescription"
              value={formData.storeDescription}
              onChange={handleChange}
              placeholder="Brief description of the shop and services offered"
              helperText="Displayed on the dealer's public profile"
              inputProps={{ maxLength: 500 }}
            />
          </Grid>
        </Grid>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — Location Information
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={<LocationIcon />}
        title="Location Information"
        subtitle="Permanent address, present address, and coordinates"
        errorCount={countSectionErrors(sectionErrors.location)}
      >
        <Grid container spacing={2.5}>
          {/* Permanent / shop address */}
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: 0.8 }}>
              Permanent Address
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Full Address"
              name="fullAddress"
              value={formData.fullAddress}
              onChange={handleChange}
              error={!!errors.fullAddress}
              helperText={errors.fullAddress || "Door / flat number, street, locality"}
            />
          </Grid>
          <Grid item xs={12}>
            <StateCitySelect
              value={formData}
              onChange={handleChange}
              stateName="state"
              cityName="city"
              errors={submitAttempted ? errors : {}}
              stateLabel="State"
              cityLabel="City"
            />
          </Grid>

          {/* Present address */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
              <Typography variant="body2" fontWeight="700" color="text.secondary" sx={{ textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: 0.8 }}>
                Present Address
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    name="sameAsPermanent"
                    checked={sameAsPermanent}
                    onChange={handleChange}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight="600" color="text.secondary">
                    Same as permanent
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Present Address"
              name="presentAddress"
              value={formData.presentAddress}
              onChange={handleChange}
              disabled={sameAsPermanent}
              helperText="Current residential address"
            />
          </Grid>
          <Grid item xs={12}>
            <StateCitySelect
              value={{ state: formData.presentState, city: formData.presentCity }}
              onChange={(e) => {
                const { name, value } = e.target;
                const mapped = name === "state" ? "presentState" : "presentCity";
                handleChange({ target: { name: mapped, value } });
              }}
              stateName="state"
              cityName="city"
              errors={{}}
              stateLabel="Present State"
              cityLabel="Present City"
              disabled={sameAsPermanent}
            />
          </Grid>

          {/* Coordinates */}
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight="700" color="text.secondary" sx={{ mt: 1, mb: 1.5, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: 0.8 }}>
              GPS Coordinates (optional)
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Latitude"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              type="number"
              helperText="e.g. 22.7196"
              inputProps={{ step: "any" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Longitude"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              type="number"
              helperText="e.g. 75.8577"
              inputProps={{ step: "any" }}
            />
          </Grid>
        </Grid>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — Documents
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={<DocumentIcon />}
        title="Documents"
        subtitle="KYC documents and shop images"
      >
        <Grid container spacing={3}>
          {/* KYC docs */}
          <Grid item xs={12} sm={4}>
            <DocUploadSlot
              label="PAN Card (Front)"
              existingUrl={existingImages.panCardFront}
              newFile={panCardFront}
              onUpload={handleFileUpload(setPanCardFront, "panCardFront")}
              onClear={() => { setPanCardFront(null); setExistingImages((p) => ({ ...p, panCardFront: null })); setIsDirty(true); }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <DocUploadSlot
              label="Aadhaar Card (Front)"
              existingUrl={existingImages.aadharFront}
              newFile={aadharFront}
              onUpload={handleFileUpload(setAadharFront, "aadharFront")}
              onClear={() => { setAadharFront(null); setExistingImages((p) => ({ ...p, aadharFront: null })); setIsDirty(true); }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <DocUploadSlot
              label="Aadhaar Card (Back)"
              existingUrl={existingImages.aadharBack}
              newFile={aadharBack}
              onUpload={handleFileUpload(setAadharBack, "aadharBack")}
              onClear={() => { setAadharBack(null); setExistingImages((p) => ({ ...p, aadharBack: null })); setIsDirty(true); }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <DocUploadSlot
              label="Shop Certificate"
              existingUrl={existingImages.shopCertificate}
              newFile={shopCertificate}
              onUpload={handleFileUpload(setShopCertificate, "shopCertificate")}
              onClear={() => { setShopCertificate(null); setExistingImages((p) => ({ ...p, shopCertificate: null })); setIsDirty(true); }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <DocUploadSlot
              label="Face Verification Image"
              existingUrl={existingImages.faceVerificationImage}
              newFile={faceVerificationImage}
              onUpload={handleFileUpload(setFaceVerificationImage, "faceVerificationImage")}
              onClear={() => { setFaceVerificationImage(null); setExistingImages((p) => ({ ...p, faceVerificationImage: null })); setIsDirty(true); }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <DocUploadSlot
              label="Passbook Image"
              existingUrl={existingImages.passbookImage}
              newFile={passbookImage}
              onUpload={handleFileUpload(setPassbookImage, "passbookImage")}
              onClear={() => { setPassbookImage(null); setExistingImages((p) => ({ ...p, passbookImage: null })); setIsDirty(true); }}
            />
          </Grid>

          {/* Shop images */}
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight="700" color="text.secondary" sx={{ mb: 1.5, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: 0.8 }}>
              Shop Images ({existingShopImages.length + shopImages.length} / 5)
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              {existingShopImages.map((url, idx) => (
                <Box
                  key={`ext-${idx}`}
                  sx={{ position: "relative", width: { xs: 90, sm: 110 }, height: { xs: 90, sm: 110 }, borderRadius: 2, overflow: "hidden", border: "2px solid", borderColor: "divider" }}
                >
                  <img src={url} alt="Shop" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveImage(idx, true)}
                    sx={{ position: "absolute", top: 3, right: 3, bgcolor: "white", width: 22, height: 22, "&:hover": { bgcolor: "#fee2e2" } }}
                  >
                    <DeleteIcon sx={{ fontSize: 13, color: "error.main" }} />
                  </IconButton>
                </Box>
              ))}
              {previewUrls.map((url, idx) => (
                <Box
                  key={`pre-${idx}`}
                  sx={{ position: "relative", width: { xs: 90, sm: 110 }, height: { xs: 90, sm: 110 }, borderRadius: 2, overflow: "hidden", border: "2px dashed", borderColor: "primary.light" }}
                >
                  <img src={url} alt="New" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveImage(idx, false)}
                    sx={{ position: "absolute", top: 3, right: 3, bgcolor: "white", width: 22, height: 22, "&:hover": { bgcolor: "#fee2e2" } }}
                  >
                    <DeleteIcon sx={{ fontSize: 13, color: "error.main" }} />
                  </IconButton>
                </Box>
              ))}
              {existingShopImages.length + shopImages.length < 5 && (
                <Button
                  component="label"
                  variant="outlined"
                  sx={{
                    width: { xs: 90, sm: 110 },
                    height: { xs: 90, sm: 110 },
                    borderStyle: "dashed",
                    borderRadius: 2,
                    flexDirection: "column",
                    gap: 0.5,
                    color: "text.secondary",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    "&:hover": { borderColor: "primary.main", color: "primary.main", bgcolor: "#f0f6ff" },
                  }}
                >
                  <AddIcon fontSize="small" />
                  Add Photo
                  <input type="file" hidden multiple accept="image/*" onChange={handleMultipleImages} />
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — Bank Details
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={<BankIcon />}
        title="Bank Details"
        subtitle="Account information for payouts"
        errorCount={countSectionErrors(sectionErrors.bank)}
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Account Holder Name"
              name="accountHolderName"
              value={formData.accountHolderName}
              onChange={handleChange}
              helperText="Exactly as printed on the bank passbook"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Bank Name"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Account Number"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              error={!!errors.accountNumber}
              helperText={errors.accountNumber || "9–18 digit bank account number"}
              inputProps={{ maxLength: 18 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="IFSC Code"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleChange}
              error={!!errors.ifscCode}
              helperText={errors.ifscCode || "11-character bank branch code (e.g. SBIN0001234)"}
              inputProps={{ maxLength: 11, style: { textTransform: "uppercase" } }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="UPI ID"
              name="upiId"
              value={formData.upiId}
              onChange={handleChange}
              placeholder="e.g. dealer@upi"
              helperText="Used for instant UPI payouts — must match the registered bank account"
            />
          </Grid>
        </Grid>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 — Business Settings
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={<SettingsIcon />}
        title="Business Settings"
        subtitle="Service area, commission, charges, wallet limits, and admin notes"
        errorCount={countSectionErrors(sectionErrors.business)}
      >
        <Grid container spacing={2.5}>
          {/* Commission & Tax */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Commission %"
              name="comission"
              type="number"
              value={formData.comission}
              onChange={handleChange}
              error={!!errors.comission}
              helperText={errors.comission || "Platform fee deducted from each booking (0–100)"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <PercentIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Tax %"
              name="tax"
              type="number"
              value={formData.tax}
              onChange={handleChange}
              error={!!errors.tax}
              helperText={errors.tax || "GST/tax applied to each booking (0–18)"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <PercentIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{ min: 0, max: 18, step: 0.1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Service Radius (km)"
              name="serviceRadiusKm"
              type="number"
              value={formData.serviceRadiusKm}
              onChange={handleChange}
              error={!!errors.serviceRadiusKm}
              helperText={
                errors.serviceRadiusKm ||
                `Users within this many km of the shop see this garage (${SERVICE_RADIUS_MIN_KM}–${SERVICE_RADIUS_MAX_KM}, default ${SERVICE_RADIUS_DEFAULT_KM})`
              }
              InputProps={{
                endAdornment: <InputAdornment position="end">km</InputAdornment>,
              }}
              inputProps={{
                min: SERVICE_RADIUS_MIN_KM,
                max: SERVICE_RADIUS_MAX_KM,
                step: 0.5,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Minimum Wallet Amount"
              name="minWalletAmount"
              type="number"
              value={formData.minWalletAmount}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CurrencyRupeeIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              helperText="Minimum wallet balance required; dealer is flagged below this"
              inputProps={{ min: 0 }}
            />
          </Grid>
  {/* Admin notes */}
  <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Admin Notes"
              name="adminNotes"
              value={formData.adminNotes}
              onChange={handleChange}
              placeholder="Internal notes about this dealer — not visible to the dealer."
              helperText={`${(formData.adminNotes || "").length}/1000 — visible to admins only`}
              inputProps={{ maxLength: 1000 }}
            />
          </Grid>
          <Grid container spacing={3}>
  {/* Pickup Row */}
  <Grid item xs={12}>
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} sm={6} md={3}>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
            height: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          <FormControlLabel
            control={
              <Switch
                name="providesPickup"
                checked={!!formData.providesPickup}
                onChange={handleChange}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="body2" fontWeight={700}>
                Provides Pickup
              </Typography>
            }
          />
        </Box>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          label="Pickup Charges"
          name="pickupCharges"
          type="number"
          value={formData.pickupCharges}
          onChange={handleChange}
          disabled={!formData.providesPickup}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CurrencyRupeeIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          helperText="Charged to the customer for bike pickup"
          inputProps={{ min: 0 }}
        />
      </Grid>
    </Grid>
  </Grid>

  {/* Drop Row */}
  <Grid item xs={12}>
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} sm={6} md={3}>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
            height: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          <FormControlLabel
            control={
              <Switch
                name="providesDrop"
                checked={!!formData.providesDrop}
                onChange={handleChange}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="body2" fontWeight={700}>
                Provides Drop
              </Typography>
            }
          />
        </Box>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          label="Drop Charges"
          name="dropCharges"
          type="number"
          value={formData.dropCharges}
          onChange={handleChange}
          disabled={!formData.providesDrop}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CurrencyRupeeIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          helperText="Charged to the customer for bike drop-off"
          inputProps={{ min: 0 }}
        />
      </Grid>
    </Grid>
  </Grid>

  {/* Towing Row — applied when the customer declares the bike Not Rideable
      or Completely Dead at booking time. */}
  <Grid item xs={12}>
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} sm={6} md={3}>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
            height: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          <FormControlLabel
            control={
              <Switch
                name="providesTowing"
                checked={!!formData.providesTowing}
                onChange={handleChange}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="body2" fontWeight={700}>
                Provides Towing
              </Typography>
            }
          />
        </Box>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          label="Towing Charges"
          name="towingCharges"
          type="number"
          value={formData.towingCharges}
          onChange={handleChange}
          disabled={!formData.providesTowing}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CurrencyRupeeIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          helperText="Charged when the bike is not rideable and must be towed"
          inputProps={{ min: 0 }}
        />
      </Grid>
    </Grid>
  </Grid>
</Grid>

        
        </Grid>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7 — Notification Preferences
      ══════════════════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={<NotificationsIcon />}
        title="Notification Preferences"
        subtitle="Channels the dealer receives booking and account alerts on"
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    name="notifyEmail"
                    checked={!!formData.notifyEmail}
                    onChange={handleChange}
                    color="primary"
                    size="small"
                  />
                }
                label={<Typography variant="body2" fontWeight="700">Email Notifications</Typography>}
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    name="notifySms"
                    checked={!!formData.notifySms}
                    onChange={handleChange}
                    color="primary"
                    size="small"
                  />
                }
                label={<Typography variant="body2" fontWeight="700">SMS Notifications</Typography>}
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    name="notifyApp"
                    checked={!!formData.notifyApp}
                    onChange={handleChange}
                    color="primary"
                    size="small"
                  />
                }
                label={<Typography variant="body2" fontWeight="700">App Notifications</Typography>}
              />
            </Box>
          </Grid>
        </Grid>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════════════
          STICKY SAVE BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <Paper
        elevation={4}
        sx={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          borderTop: "1px solid",
          borderColor: "divider",
          px: { xs: 2, md: 4 },
          py: 1.5,
          bgcolor: "white",
          borderRadius: 0,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            {isDirty ? (
              <>
                <WarningIcon sx={{ fontSize: 16, color: "warning.main" }} />
                <Typography variant="caption" color="warning.dark" fontWeight="700">
                  Unsaved changes
                </Typography>
              </>
            ) : (
              <>
                <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
                <Typography variant="caption" color="success.dark" fontWeight="700">
                  All changes saved
                </Typography>
              </>
            )}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={isSubmitting}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none", px: 3 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
                px: 4,
                bgcolor: "#2e83ff",
                "&:hover": { bgcolor: "#1a6fe0" },
              }}
            >
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Dealer"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* bottom padding so last section isn't hidden behind sticky bar */}
      <Box sx={{ height: 24 }} />
    </Box>
  );
};

export default DealerForm;
