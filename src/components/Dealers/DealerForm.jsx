import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Paper,
  Stack,
  InputAdornment,
  Divider,
  IconButton,
  CircularProgress,
  Autocomplete,
  Chip,
  Alert,
  AlertTitle,
} from "@mui/material";
import {
  Storefront as ShopIcon,
  Person as PersonIcon,
  AccountBalance as BankIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  AddPhotoAlternate as AddIcon,
  CheckCircle as SuccessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { addDealer } from "../../api";
import { getApiErrorMessage, getApiFieldErrors } from "../../utils/apiError";
import { useNavigate } from "react-router-dom";
import LocationPicker from "../Common/LocationPicker";
import {
  SERVICE_RADIUS_MIN_KM,
  SERVICE_RADIUS_MAX_KM,
  SERVICE_RADIUS_DEFAULT_KM,
} from "./businessSettings";

const steps = ["Shop Details", "Owner, Bank & Documents"];

// Which wizard step owns each field, so a validation failure (ours or the
// server's) can send the admin back to the step that actually has the input.
const FIELD_STEP = {
  ownerName: 0,
  shopName: 0,
  email: 0,
  phone: 0,
  alternatePhone: 0,
  shopPincode: 0,
  shopNumber: 0,
  locality: 0,
  state: 0,
  city: 0,
  comission: 0,
  tax: 0,
  serviceRadiusKm: 0,
  latitude: 0,
  longitude: 0,
  aadharCardNo: 1,
  panCardNo: 1,
  accountNumber: 1,
  ifscCode: 1,
  accountHolderName: 1,
  bankName: 1,
  panCardFront: 1,
  aadharFront: 1,
  aadharBack: 1,
};

// addDealer answers a duplicate with { field: "shop-email" | "shop-contact" };
// map those onto the inputs that produced them.
const API_FIELD_ALIASES = {
  "shop-email": "email",
  "shop-contact": "phone",
  comission: "comission",
  commission: "comission",
  aadharcardno: "aadharCardNo",
  pancardno: "panCardNo",
};


const DealerForm = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [panCardFront, setPanCardFront] = useState(null);
  const [panPreview, setPanPreview] = useState(null);
  const [aadharFront, setAadharFront] = useState(null);
  const [aadharFrontPreview, setAadharFrontPreview] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [aadharBackPreview, setAadharBackPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] = useState({
    // Shop Details
    shopName: "",
    email: "",
    phone: "",
    shopPincode: "",
    shopNumber: "",
    locality: "",
    state: "",
    city: "",
    comission: "",
    tax: "",
    // How far around the shop this garage is shown to users. Blank submits
    // nothing and the backend applies its own default.
    serviceRadiusKm: String(SERVICE_RADIUS_DEFAULT_KM),
    latitude: "",
    longitude: "",
    // Personal Details
    ownerName: "",
    aadharCardNo: "",
    panCardNo: "",
    alternatePhone: "",
    // Bank Details
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  });

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [localities, setLocalities] = useState([]);

  useEffect(() => {
    const lookupPincode = async () => {
      if (
        formData.shopPincode.length === 6 &&
        /^\d+$/.test(formData.shopPincode)
      ) {
        setPincodeLoading(true);
        try {
          const response = await axios.get(
            `https://api.postalpincode.in/pincode/${formData.shopPincode}`,
          );
          if (response.data[0].Status === "Success") {
            const postOffices = response.data[0].PostOffice || [];
            if (postOffices.length > 0) {
              const { District, State } = postOffices[0];
              const areaNames = postOffices
                .map((po) => po.Name)
                .filter(Boolean);

              setLocalities(areaNames);
              setFormData((prev) => ({
                ...prev,
                state: State,
                city: District,
                locality:
                  prev.locality ||
                  (areaNames.length === 1 ? areaNames[0] : prev.locality),
              }));

              Swal.fire({
                icon: "success",
                title: "Location Found",
                text: `${District}, ${State} (${areaNames.length} localities found)`,
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: "top-end",
              });
            }
          } else {
            setLocalities([]);
          }
        } catch (err) {
          console.error("Pincode lookup failed", err);
          setLocalities([]);
        } finally {
          setPincodeLoading(false);
        }
      } else {
        setLocalities([]);
      }
    };
    lookupPincode();
  }, [formData.shopPincode]);

  const validateAadhar = (number) => /^\d{12}$/.test(number);
  const validatePAN = (number) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(number);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "state") updated.city = "";
      return updated;
    });

    // Real-time validation
    if (name === "aadharCardNo") {
      if (value && !validateAadhar(value)) {
        setErrors((prev) => ({ ...prev, aadharCardNo: "Aadhar must be 12 digits" }));
      } else {
        setErrors((prev) => ({ ...prev, aadharCardNo: "" }));
      }
    }

    if (name === "panCardNo") {
      if (value && !validatePAN(value)) {
        setErrors((prev) => ({ ...prev, panCardNo: "Invalid PAN format (e.g. ABCDE1234F)" }));
      } else {
        setErrors((prev) => ({ ...prev, panCardNo: "" }));
      }
    }

    if (errors[name] && name !== "aadharCardNo" && name !== "panCardNo") {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // A server-side rejection is no longer accurate once the admin edits the
    // field it pointed at.
    if (submitError) setSubmitError("");
  };

  // Mirrors the checks addDealer runs server-side, so a missing commission or a
  // malformed PAN is caught here with the field highlighted instead of coming
  // back as an opaque 400.
  const validateFields = (step) => {
    const found = {};
    const needs = (field, label) => {
      if (!String(formData[field] ?? "").trim()) {
        found[field] = `${label} is required`;
      }
    };

    if (step === 0 || step === undefined) {
      needs("ownerName", "Owner name");
      needs("shopName", "Shop name");
      needs("email", "Shop email");
      needs("phone", "Shop contact");
      needs("shopPincode", "Shop pincode");
      needs("shopNumber", "Shop no. / building");
      needs("locality", "Locality / area");
      needs("state", "Shop state");
      needs("city", "Shop city");

      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        found.email = "Enter a valid email address";
      }
      if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone.trim())) {
        found.phone = "Enter a valid 10-digit mobile number";
      }
      if (
        formData.alternatePhone &&
        !/^[6-9]\d{9}$/.test(formData.alternatePhone.trim())
      ) {
        found.alternatePhone = "Enter a valid 10-digit mobile number";
      }
      if (formData.shopPincode && !/^\d{6}$/.test(formData.shopPincode.trim())) {
        found.shopPincode = "Pincode must be 6 digits";
      }

      // The backend rejects anything outside 0-100 (and rejects blank outright).
      const commission = Number.parseFloat(formData.comission);
      if (!String(formData.comission).trim()) {
        found.comission = "Commission is required";
      } else if (Number.isNaN(commission) || commission < 0 || commission > 100) {
        found.comission = "Commission must be a number between 0 and 100";
      }

      // Tax is optional, but capped at 18% server-side.
      if (String(formData.tax).trim()) {
        const tax = Number.parseFloat(formData.tax);
        if (Number.isNaN(tax) || tax < 0 || tax > 18) {
          found.tax = "Tax must be a number between 0 and 18";
        }
      }

      // Service radius is optional too — left blank, addDealer stores its own
      // default. Bounds match helper/dealerServiceRadius.js on the backend.
      if (String(formData.serviceRadiusKm).trim()) {
        const radius = Number.parseFloat(formData.serviceRadiusKm);
        if (
          Number.isNaN(radius) ||
          radius < SERVICE_RADIUS_MIN_KM ||
          radius > SERVICE_RADIUS_MAX_KM
        ) {
          found.serviceRadiusKm = `Service radius must be between ${SERVICE_RADIUS_MIN_KM} and ${SERVICE_RADIUS_MAX_KM} km`;
        }
      }

      if (!String(formData.latitude).trim() || !String(formData.longitude).trim()) {
        found.latitude = "Pick the shop location on the map";
      }
    }

    if (step === 1 || step === undefined) {
      needs("aadharCardNo", "Aadhar card number");
      needs("panCardNo", "PAN card number");
      needs("accountNumber", "Account number");
      needs("ifscCode", "IFSC code");
      needs("accountHolderName", "Account holder name");
      needs("bankName", "Bank name");

      if (formData.aadharCardNo && !validateAadhar(formData.aadharCardNo.trim())) {
        found.aadharCardNo = "Aadhar must be 12 digits";
      }
      if (formData.panCardNo && !validatePAN(formData.panCardNo.trim())) {
        found.panCardNo = "Invalid PAN format (e.g. ABCDE1234F)";
      }
      if (
        formData.ifscCode &&
        !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifscCode.trim())
      ) {
        found.ifscCode = "Invalid IFSC format (e.g. HDFC0001234)";
      }
      if (
        formData.accountNumber &&
        !/^\d{9,18}$/.test(formData.accountNumber.trim())
      ) {
        found.accountNumber = "Account number must be 9-18 digits";
      }

      // addDealer treats these three as mandatory uploads.
      if (!panCardFront) found.panCardFront = "PAN card front is required";
      if (!aadharFront) found.aadharFront = "Aadhar front is required";
      if (!aadharBack) found.aadharBack = "Aadhar back is required";
    }

    return found;
  };

  // Sends the admin to the earliest step that has a problem and lists the
  // problems in the banner, so nothing is hidden behind a collapsed step.
  const reportValidation = (found) => {
    setErrors(found);
    const targetStep = Math.min(
      ...Object.keys(found).map((field) => FIELD_STEP[field] ?? 0),
    );
    if (Number.isFinite(targetStep) && targetStep !== activeStep) {
      setActiveStep(targetStep);
    }
    setSubmitError(
      `Please fix ${Object.keys(found).length} field${
        Object.keys(found).length > 1 ? "s" : ""
      } before continuing: ${Object.values(found).join("; ")}`,
    );
    window.scrollTo(0, 0);
  };

  const handleNext = () => {
    const found = validateFields(activeStep);
    if (Object.keys(found).length > 0) {
      reportValidation(found);
      return;
    }
    setErrors({});
    setSubmitError("");
    setActiveStep((prev) => prev + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setSubmitError("");
    setActiveStep((prev) => prev - 1);
    window.scrollTo(0, 0);
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve({
                file: compressedFile,
                preview: URL.createObjectURL(compressedFile),
              });
            },
            "image/jpeg",
            0.7,
          );
        };
      };
    });
  };

  const [shopImages, setShopImages] = useState([]); // Real files for submission

  const handleMultipleImages = async (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - previewUrls.length);
    for (const file of files) {
      const { file: optimized, preview } = await compressImage(file);
      setShopImages((prev) => [...prev, optimized]);
      setPreviewUrls((prev) => [...prev, preview]);
    }
  };

  const handleRemoveImage = (index) => {
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setShopImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = async (e, fileSetter, previewSetter, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      const { file: optimized, preview } = await compressImage(file);
      fileSetter(optimized);
      previewSetter(preview);
      if (fieldName) setErrors((prev) => ({ ...prev, [fieldName]: "" }));
    }
  };

  const handleSubmit = async () => {
    // Validate every step, not just the current one - a field left blank on
    // step 0 is otherwise only discovered by the server.
    const found = validateFields();
    if (Object.keys(found).length > 0) {
      reportValidation(found);
      return;
    }

    setErrors({});
    setSubmitError("");
    setIsSubmitting(true);

    const apiData = new FormData();
    Object.keys(formData).forEach((key) => apiData.append(key, formData[key]));

    // Use compressed shop images
    shopImages.forEach((file) => apiData.append("shopImages", file));

    if (panCardFront) apiData.append("panCardFront", panCardFront);
    if (aadharFront) apiData.append("aadharFront", aadharFront);
    if (aadharBack) apiData.append("aadharBack", aadharBack);

    try {
      const res = await addDealer(apiData);
      if (res?.success) {
        await Swal.fire({
          icon: "success",
          title: "Dealer Added Successfully!",
          text: res.message || "The dealer has been created.",
          timer: 2000,
          showConfirmButton: false,
        });
        navigate("/dealers");
        return;
      }

      // 2xx with success:false - still a failure, and it has a reason.
      const message = res?.message || "The dealer could not be created.";
      setSubmitError(message);
      Swal.fire({ icon: "error", title: "Failed to Add Dealer", text: message });
    } catch (err) {
      // Show exactly what the server said (e.g. "Commission must be between
      // 0-100%", "Shop Email already exists") and highlight the field it named.
      const message = getApiErrorMessage(
        err,
        "Failed to add the dealer. Please try again.",
      );
      const fieldErrors = getApiFieldErrors(err, API_FIELD_ALIASES);

      setSubmitError(message);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        const targetStep = Math.min(
          ...Object.keys(fieldErrors).map((field) => FIELD_STEP[field] ?? 0),
        );
        if (Number.isFinite(targetStep)) setActiveStep(targetStep);
      }
      window.scrollTo(0, 0);

      Swal.fire({ icon: "error", title: "Failed to Add Dealer", text: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderGridRow = (items) => (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "repeat(3, 1fr)",
        },
        gap: 3,
        mb: 3,
        alignItems: "start",
      }}
    >
      {items.map((item, idx) => (
        <Box key={idx} sx={{ width: "100%" }}>
          {item}
        </Box>
      ))}
    </Box>
  );

  const renderStep0 = () => (
    <Box>
      <Typography
        variant="h5"
        sx={{
          color: "#2e83ff",
          fontWeight: 800,
          mb: 3,
          pb: 1,
          borderBottom: "2px solid #eef2f6",
        }}
      >
        Shop Information
      </Typography>
      {renderGridRow([
        <TextField
          fullWidth
          label="Owner Name"
          name="ownerName"
          value={formData.ownerName}
          onChange={handleChange}
          error={!!errors.ownerName}
          helperText={errors.ownerName}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon color="action" />
              </InputAdornment>
            ),
          }}
        />,
        <TextField
          fullWidth
          label="Shop Name"
          name="shopName"
          value={formData.shopName}
          onChange={handleChange}
          error={!!errors.shopName}
          helperText={errors.shopName}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <ShopIcon color="action" />
              </InputAdornment>
            ),
          }}
        />,
        <TextField
          fullWidth
          label="Shop Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={!!errors.email}
          helperText={errors.email}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color="action" />
              </InputAdornment>
            ),
          }}
        />,
      ])}
      {renderGridRow([
        <TextField
          fullWidth
          label="Shop Contact"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          error={!!errors.phone}
          helperText={errors.phone || "10-digit mobile number"}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneIcon color="action" />
              </InputAdornment>
            ),
          }}
        />,
        <TextField
          fullWidth
          label="Alternative Number"
          name="alternatePhone"
          value={formData.alternatePhone}
          onChange={handleChange}
          error={!!errors.alternatePhone}
          helperText={errors.alternatePhone}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneIcon color="action" />
              </InputAdornment>
            ),
          }}
        />,
        <TextField
          fullWidth
          label="Shop Pincode"
          name="shopPincode"
          value={formData.shopPincode}
          onChange={handleChange}
          required
          InputProps={{
            endAdornment: pincodeLoading && (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ),
          }}
          error={!!errors.shopPincode}
          helperText={
            errors.shopPincode ||
            (pincodeLoading ? "Looking up location..." : "6-digit pincode")
          }
        />,
      ])}
      {renderGridRow([
        <TextField
          fullWidth
          label="Shop No. / Building"
          name="shopNumber"
          value={formData.shopNumber}
          onChange={handleChange}
          error={!!errors.shopNumber}
          helperText={errors.shopNumber}
          required
        />,
        <Autocomplete
          fullWidth
          freeSolo
          options={localities}
          value={formData.locality}
          onChange={(e, newValue) => {
            setFormData((prev) => ({ ...prev, locality: newValue || "" }));
          }}
          onInputChange={(e, newInputValue) => {
            setFormData((prev) => ({ ...prev, locality: newInputValue }));
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Locality / Area"
              name="locality"
              required
              error={!!errors.locality}
              helperText={
                errors.locality ||
                (localities.length > 0
                  ? "Select from auto-filled areas or type"
                  : "")
              }
            />
          )}
        />,
        <TextField
          fullWidth
          label="Shop State"
          name="state"
          value={formData.state}
          onChange={handleChange}
          error={!!errors.state}
          helperText={errors.state}
          required
        />,
      ])}
      {renderGridRow([
        <TextField
          fullWidth
          label="Shop City"
          name="city"
          value={formData.city}
          onChange={handleChange}
          error={!!errors.city}
          helperText={errors.city}
          required
        />,
        <TextField
          fullWidth
          label="Commission (%)"
          name="comission"
          value={formData.comission}
          onChange={handleChange}
          error={!!errors.comission}
          helperText={errors.comission || "Between 0 and 100"}
          required
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
        />,
        <TextField
          fullWidth
          label="Tax (%)"
          name="tax"
          value={formData.tax}
          onChange={handleChange}
          error={!!errors.tax}
          helperText={errors.tax || "Optional, max 18"}
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
        />,
      ])}
      {renderGridRow([
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
            `Only users within this many km of the shop will see this garage (default ${SERVICE_RADIUS_DEFAULT_KM})`
          }
          InputProps={{
            endAdornment: <InputAdornment position="end">km</InputAdornment>,
          }}
          inputProps={{
            min: SERVICE_RADIUS_MIN_KM,
            max: SERVICE_RADIUS_MAX_KM,
            step: 0.5,
          }}
        />,
      ])}
      <Divider sx={{ mb: 3 }}>
        <Chip label="Economics & Location" size="small" />
      </Divider>

      {renderGridRow([
        <Box sx={{ gridColumn: "span 3" }}>
          {errors.latitude && (
            <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
              {errors.latitude}
            </Alert>
          )}
          <LocationPicker
            value={{ lat: formData.latitude, lng: formData.longitude }}
            onChange={(newVal) => {
              setFormData((prev) => ({
                ...prev,
                latitude: newVal.lat,
                longitude: newVal.lng,
              }));
            }}
          />
        </Box>,
      ])}
    </Box>
  );

  const renderStep1 = () => (
    <Box>
      {/* Identity Documents */}
      <Typography
        variant="h5"
        sx={{
          color: "#2e83ff",
          fontWeight: 800,
          mb: 3,
          pb: 1,
          borderBottom: "2px solid #eef2f6",
        }}
      >
        Identity &amp; Documents
      </Typography>
      {renderGridRow([
        <TextField
          fullWidth
          label="Aadhar Card No."
          name="aadharCardNo"
          value={formData.aadharCardNo}
          onChange={handleChange}
          required
          error={!!errors.aadharCardNo}
          helperText={errors.aadharCardNo || "12-digit Aadhaar number"}
        />,
        <TextField
          fullWidth
          label="PAN Card No."
          name="panCardNo"
          value={formData.panCardNo}
          onChange={handleChange}
          required
          error={!!errors.panCardNo}
          helperText={errors.panCardNo || "10-character alphanumeric PAN"}
        />,
        <div />,
      ])}

      {/* Bank Information */}
      <Typography
        variant="h5"
        sx={{
          color: "#2e83ff",
          fontWeight: 800,
          mb: 3,
          mt: 5,
          pb: 1,
          borderBottom: "2px solid #eef2f6",
        }}
      >
        Bank Information
      </Typography>
      {renderGridRow([
        <TextField
          fullWidth
          label="Account Number"
          name="accountNumber"
          value={formData.accountNumber}
          onChange={handleChange}
          error={!!errors.accountNumber}
          helperText={errors.accountNumber}
          required
        />,
        <TextField
          fullWidth
          label="IFSC Code"
          name="ifscCode"
          value={formData.ifscCode}
          onChange={handleChange}
          error={!!errors.ifscCode}
          helperText={errors.ifscCode}
          required
        />,
        <TextField
          fullWidth
          label="Account Holder Name"
          name="accountHolderName"
          value={formData.accountHolderName}
          onChange={handleChange}
          error={!!errors.accountHolderName}
          helperText={errors.accountHolderName}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonIcon color="action" />
              </InputAdornment>
            ),
          }}
        />,
      ])}
      {renderGridRow([
        <TextField
          fullWidth
          label="Bank Name"
          name="bankName"
          value={formData.bankName}
          onChange={handleChange}
          error={!!errors.bankName}
          helperText={errors.bankName}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <BankIcon color="action" />
              </InputAdornment>
            ),
          }}
        />,
        <div />,
        <div />,
      ])}

      {/* Documents & Verification */}
      <Typography
        variant="h5"
        sx={{
          color: "#2e83ff",
          fontWeight: 800,
          mb: 3,
          mt: 5,
          pb: 1,
          borderBottom: "2px solid #eef2f6",
        }}
      >
        Documents & Verification
      </Typography>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "#475467",
          }}
        >
          <ShopIcon color="primary" /> Shop Images (Max 5)
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {previewUrls.map((url, idx) => (
            <Paper
              key={idx}
              sx={{
                position: "relative",
                width: 120,
                height: 120,
                overflow: "hidden",
                borderRadius: 2,
              }}
            >
              <img
                src={url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <IconButton
                size="small"
                onClick={() => handleRemoveImage(idx)}
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  bgcolor: "rgba(255,255,255,0.8)",
                }}
              >
                <DeleteIcon color="error" fontSize="small" />
              </IconButton>
            </Paper>
          ))}
          {previewUrls.length < 5 && (
            <Button
              component="label"
              variant="outlined"
              sx={{
                width: 120,
                height: 120,
                borderStyle: "dashed",
                borderRadius: 2,
                flexDirection: "column",
              }}
            >
              <AddIcon color="disabled" sx={{ mb: 1 }} />
              <Typography variant="caption">Add</Typography>
              <input
                type="file"
                hidden
                multiple
                accept="image/*"
                onChange={handleMultipleImages}
              />
            </Button>
          )}
        </Stack>
      </Box>

      {renderGridRow([
        <Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, mb: 1, display: "block", color: "#475467" }}
          >
            PAN CARD FRONT
          </Typography>
          {errors.panCardFront && (
            <Typography
              variant="caption"
              color="error"
              sx={{ display: "block", mb: 1, fontWeight: 600 }}
            >
              {errors.panCardFront}
            </Typography>
          )}
          {panPreview && (
            <Paper
              sx={{
                mb: 1.5,
                height: 140,
                overflow: "hidden",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
              }}
            >
              <img
                src={panPreview}
                alt="PAN Preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Paper>
          )}
          <Button
            fullWidth
            component="label"
            variant="outlined"
            startIcon={
              panCardFront ? <SuccessIcon color="success" /> : <UploadIcon />
            }
            sx={{ borderRadius: 2, py: 1 }}
          >
            {panCardFront ? "Regenerate" : "Upload PAN"}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) =>
                handleFileChange(e, setPanCardFront, setPanPreview, "panCardFront")
              }
            />
          </Button>
        </Box>,
        <Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, mb: 1, display: "block", color: "#475467" }}
          >
            AADHAR FRONT
          </Typography>
          {errors.aadharFront && (
            <Typography
              variant="caption"
              color="error"
              sx={{ display: "block", mb: 1, fontWeight: 600 }}
            >
              {errors.aadharFront}
            </Typography>
          )}
          {aadharFrontPreview && (
            <Paper
              sx={{
                mb: 1.5,
                height: 140,
                overflow: "hidden",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
              }}
            >
              <img
                src={aadharFrontPreview}
                alt="Aadhar Front Preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Paper>
          )}
          <Button
            fullWidth
            component="label"
            variant="outlined"
            startIcon={
              aadharFront ? <SuccessIcon color="success" /> : <UploadIcon />
            }
            sx={{ borderRadius: 2, py: 1 }}
          >
            {aadharFront ? "Regenerate" : "Upload Aadhar Front"}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) =>
                handleFileChange(e, setAadharFront, setAadharFrontPreview, "aadharFront")
              }
            />
          </Button>
        </Box>,
        <Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, mb: 1, display: "block", color: "#475467" }}
          >
            AADHAR BACK
          </Typography>
          {errors.aadharBack && (
            <Typography
              variant="caption"
              color="error"
              sx={{ display: "block", mb: 1, fontWeight: 600 }}
            >
              {errors.aadharBack}
            </Typography>
          )}
          {aadharBackPreview && (
            <Paper
              sx={{
                mb: 1.5,
                height: 140,
                overflow: "hidden",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
              }}
            >
              <img
                src={aadharBackPreview}
                alt="Aadhar Back Preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Paper>
          )}
          <Button
            fullWidth
            component="label"
            variant="outlined"
            startIcon={
              aadharBack ? <SuccessIcon color="success" /> : <UploadIcon />
            }
            sx={{ borderRadius: 2, py: 1 }}
          >
            {aadharBack ? "Regenerate" : "Upload Aadhar Back"}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) =>
                handleFileChange(e, setAadharBack, setAadharBackPreview, "aadharBack")
              }
            />
          </Button>
        </Box>,
      ])}
    </Box>
  );

  return (
    <Paper
      elevation={0}
      sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, border: "1px solid #eef2f6" }}
    >
      {submitError && (
        <Alert
          severity="error"
          onClose={() => setSubmitError("")}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          <AlertTitle sx={{ fontWeight: 700 }}>Could not add dealer</AlertTitle>
          {submitError}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel sx={{ "& .MuiStepLabel-label": { fontWeight: 600 } }}>
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && renderStep0()}
      {activeStep === 1 && renderStep1()}

      <Stack
        direction="row"
        spacing={2}
        justifyContent="flex-end"
        sx={{ mt: 5 }}
      >
        {activeStep > 0 && (
          <Button onClick={handleBack} variant="outlined" size="large">
            Back
          </Button>
        )}
        <Button
          variant="contained"
          size="large"
          disabled={isSubmitting}
          onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
          sx={{ minWidth: 150 }}
        >
          {isSubmitting ? (
            <>
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
              Submitting...
            </>
          ) : activeStep === steps.length - 1 ? (
            "Submit"
          ) : (
            "Next"
          )}
        </Button>
      </Stack>
    </Paper>
  );
};

export default DealerForm;
