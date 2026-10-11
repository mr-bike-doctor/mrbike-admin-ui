import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Breadcrumbs,
  Link as MuiLink,
  Button,
  Stack,
  Paper,
  Container,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  NavigateNext as NavigateNextIcon,
  CloudUpload as CloudUploadIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationOnIcon,
  Close as CloseIcon,
  AddPhotoAlternate as AddPhotoAlternateIcon,
  Star as StarIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { addDealer, API_BASE_URL } from "../../api";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  SERVICE_RADIUS_MIN_KM,
  SERVICE_RADIUS_MAX_KM,
  SERVICE_RADIUS_DEFAULT_KM,
} from "../../components/Dealers/businessSettings";

const steps = ["Upload Documents", "Review Details", "Submit"];

const CreateDealerAI = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [files, setFiles] = useState({
    aadhaarFront: null,
    aadhaarBack: null,
    panCard: null,
    bankPassbook: null,
    shopImages: [],
    faceImage: null,
  });

  const [formData, setFormData] = useState({
    ownerName: "",
    aadhaarNumber: "",
    panNumber: "",
    phoneNumber: "",
    alternativePhoneNumber: "",
    email: "",
    dob: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    accountHolderName: "",
    shopName: "",
    shopNumber: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
    latitude: "",
    longitude: "",
    commission: "",
    tax: "",
    pickupCharges: "",
    // How far around the shop this garage is shown to users. Blank lets the
    // backend apply its own default.
    serviceRadiusKm: String(SERVICE_RADIUS_DEFAULT_KM),
  });

  const [formEnabled, setFormEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [postOffices, setPostOffices] = useState([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  const handleFileUpload = (fileType, file) => {
    setFiles((prev) => ({ ...prev, [fileType]: file }));
    setError("");
  };

  const handleShopImagesChange = (event) => {
    const newFiles = Array.from(event.target.files);
    setFiles((prev) => {
      const updatedImages = [...prev.shopImages, ...newFiles].slice(0, 5);
      return { ...prev, shopImages: updatedImages };
    });
  };

  const removeShopImage = (index) => {
    setFiles((prev) => ({
      ...prev,
      shopImages: prev.shopImages.filter((_, i) => i !== index),
    }));
  };

  const setAsMainImage = (index) => {
    setFiles((prev) => {
      const updatedImages = [...prev.shopImages];
      const selectedImage = updatedImages.splice(index, 1)[0];
      updatedImages.unshift(selectedImage);
      return { ...prev, shopImages: updatedImages };
    });
  };

  const allFilesUploaded =
    files.aadhaarFront && files.aadhaarBack && files.panCard;

  const handleAutoFill = async () => {
    if (!allFilesUploaded) {
      setError("Please upload all required documents");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("aadhaarFront", files.aadhaarFront);
      formDataToSend.append("aadhaarBack", files.aadhaarBack);
      formDataToSend.append("pan", files.panCard);
      if (files.bankPassbook) {
        formDataToSend.append("bankPassbook", files.bankPassbook);
      }

      const response = await fetch(`${API_BASE_URL}/dealer/process`, {
        method: "POST",
        body: formDataToSend,
        // /dealer/process is behind requireAdmin; without the token every
        // upload came back as a bare 401 the UI reported as a parse failure.
        headers: { token: localStorage.getItem("adminToken") || "" },
      });

      // A gateway error answers with HTML, not JSON - don't let response.json()
      // throw and turn a readable 502 into "Failed to process documents".
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          result?.message ||
            `Document processing failed (HTTP ${response.status}). Please try again.`,
        );
        return;
      }

      if (result?.success) {
        console.log("AI Result:", result.data); // Debug log

        setFormData({
          ownerName: result.data.aadhaar?.name || result.data.pan?.name || "",
          aadhaarNumber: result.data.aadhaar?.aadhaarNumber || "",
          panNumber: result.data.pan?.panNumber || "",
          phoneNumber: "", // Phone number is not available in Aadhaar/PAN documents
          alternativePhoneNumber: "", // Alternative phone number is not available in documents
          email: "", // Email is not available in Aadhaar/PAN documents
          dob: result.data.aadhaar?.dob || result.data.pan?.dob || "",
          accountNumber: result.data.bank?.accountNumber || "",
          ifscCode: result.data.bank?.ifscCode || "",
          bankName: result.data.bank?.bankName || "",
          accountHolderName: result.data.bank?.accountHolderName || "",
          shopName: "",
          shopNumber: "",
          locality: "",
          city: "",
          state: "",
          pincode: "",
          latitude: "",
          longitude: "",
          commission: "",
          tax: "",
        });

        setFormEnabled(true);
        setActiveStep(1);
      } else {
        setError(result?.message || "Failed to process documents");
      }
    } catch (error) {
      console.error("Auto-fill failed:", error);
      setError(
        getApiErrorMessage(
          error,
          "Failed to process documents. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        }));
        setLocationLoading(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setError("Failed to get current location. Please enter manually.");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const handlePincodeChange = async (pincode) => {
    setFormData((prev) => ({ ...prev, pincode }));
    setPostOffices([]);
    setSelectedPostOffice("");

    if (pincode.length === 6) {
      setPincodeLoading(true);
      try {
        // India Post Pincode API
        const response = await fetch(
          `https://api.postalpincode.in/pincode/${pincode}`,
        );
        const data = await response.json();

        if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
          const offices = data[0].PostOffice;
          setPostOffices(offices);

          const office = offices[0];
          setSelectedPostOffice(office.Name);
          setFormData((prev) => ({
            ...prev,
            city: office.District || prev.city,
            state: office.State || prev.state,
            locality: office.Name || prev.locality,
          }));
        } else {
          setError("Invalid pincode or no data found");
        }
      } catch (error) {
        console.error("Pincode lookup failed:", error);
        setError("Failed to fetch pincode details. Please try again.");
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handlePostOfficeSelect = (officeName) => {
    setSelectedPostOffice(officeName);
    const selectedOffice = postOffices.find(
      (office) => office.Name === officeName,
    );

    if (selectedOffice) {
      setFormData((prev) => ({
        ...prev,
        city: selectedOffice.District,
        state: selectedOffice.State,
        locality: selectedOffice.Name,
      }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const formDataToSend = new FormData();

      // Append files
      formDataToSend.append("aadharFront", files.aadhaarFront);
      formDataToSend.append("aadharBack", files.aadhaarBack);
      formDataToSend.append("panCardFront", files.panCard);
      if (files.bankPassbook) {
        formDataToSend.append("bankPassbook", files.bankPassbook);
      }

      if (files.faceImage) {
        formDataToSend.append("faceImage", files.faceImage);
      }

      // Append shop images
      files.shopImages.forEach((image) => {
        formDataToSend.append("shopImages", image);
      });

      // Map and append form data
      const dataMapping = {
        shopName: formData.shopName,
        email: formData.email,
        phone: formData.phoneNumber,
        shopPincode: formData.pincode,
        shopNumber: formData.shopNumber,
        locality: formData.locality,
        city: formData.city,
        state: formData.state,
        latitude: formData.latitude,
        longitude: formData.longitude,
        ownerName: formData.ownerName,
        alternatePhone: formData.alternativePhoneNumber,
        accountHolderName: formData.accountHolderName,
        ifscCode: formData.ifscCode,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        comission: formData.commission, // Backend uses single 'm' in some places, double in others. Checking routes... it's 'comission' in req.body
        tax: formData.tax,
        aadharCardNo: formData.aadhaarNumber,
        panCardNo: formData.panNumber,
        pickupCharges: formData.pickupCharges,
        serviceRadiusKm: formData.serviceRadiusKm,
      };

      Object.entries(dataMapping).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formDataToSend.append(key, value);
        }
      });

      const result = await addDealer(formDataToSend);

      if (result?.success) {
        setActiveStep(2);
      } else {
        setError(result?.message || "Failed to create dealer");
      }
    } catch (error) {
      console.error("Submission failed:", error);
      // Surface the server's own reason (validation failure, duplicate email,
      // missing document) rather than assuming every failure is the network.
      setError(
        getApiErrorMessage(
          error,
          "Failed to create dealer. Please check your connection and try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const SuccessView = () => (
    <Paper sx={{ p: 8, textAlign: "center", borderRadius: 4 }}>
      <Box sx={{ mb: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 80, color: "success.main" }} />
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
        Dealer Created Successfully!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        The dealer profile has been created and is now pending verification.
      </Typography>
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate("/dealers")}
          sx={{ borderRadius: 3, px: 4 }}
        >
          View All Dealers
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => window.location.reload()}
          sx={{ borderRadius: 3, px: 4 }}
        >
          Create Another
        </Button>
      </Stack>
    </Paper>
  );

  const FileUploadButton = ({ label, fileType, accept }) => (
    <Box sx={{ textAlign: "center" }}>
      <input
        accept={accept}
        style={{ display: "none" }}
        id={`upload-${fileType}`}
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(fileType, file);
        }}
      />
      <label htmlFor={`upload-${fileType}`}>
        <Button
          variant="outlined"
          component="span"
          startIcon={<CloudUploadIcon />}
          sx={{
            borderRadius: 3,
            borderStyle: "dashed",
            borderWidth: 2,
            py: 2,
            px: 3,
            minHeight: 80,
            width: "100%",
            flexDirection: "column",
            gap: 1,
            borderColor: files[fileType] ? "success.main" : "grey.300",
            color: files[fileType] ? "success.main" : "text.secondary",
            backgroundColor: files[fileType] ? "success.50" : "transparent",
            "&:hover": {
              borderColor: "primary.main",
              backgroundColor: "primary.50",
            },
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {label}
          </Typography>
        </Button>
      </label>
      {files[fileType] && (
        <Typography
          variant="caption"
          color="success.main"
          sx={{ mt: 1, display: "block" }}
        >
          ✓ {files[fileType].name}
        </Typography>
      )}
    </Box>
  );

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
            >
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: "#1e293b",
                    mb: 1,
                    letterSpacing: "-0.025em",
                  }}
                >
                  Create Dealer (AI)
                </Typography>
                <Breadcrumbs
                  separator={<NavigateNextIcon fontSize="small" />}
                  aria-label="breadcrumb"
                >
                  <MuiLink
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate("/")}
                    sx={{
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    Dashboard
                  </MuiLink>
                  <MuiLink
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate("/dealers")}
                    sx={{
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    Dealers
                  </MuiLink>
                  <Typography
                    color="text.primary"
                    sx={{ fontSize: "0.875rem", fontWeight: 600 }}
                  >
                    AI Creation
                  </Typography>
                </Breadcrumbs>
              </Box>

              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(-1)}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                Back to List
              </Button>
            </Stack>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {activeStep === 2 ? (
            <SuccessView />
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                    📄 Upload Documents
                  </Typography>

                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={3}>
                      <FileUploadButton
                        label="Aadhaar Front"
                        fileType="aadhaarFront"
                        accept="image/*"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FileUploadButton
                        label="Aadhaar Back"
                        fileType="aadhaarBack"
                        accept="image/*"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FileUploadButton
                        label="PAN Card"
                        fileType="panCard"
                        accept="image/*"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: "center" }}>
                        <FileUploadButton
                          label="Bank Passbook"
                          fileType="bankPassbook"
                          accept="image/*"
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 1, display: "block" }}
                        >
                          Optional
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={2.4}>
                      <Box sx={{ textAlign: "center" }}>
                        <FileUploadButton
                          label="Face / Selfie"
                          fileType="faceImage"
                          accept="image/*"
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 1, display: "block" }}
                        >
                          Required for verification
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ textAlign: "center" }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={
                        loading && activeStep === 0 ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <AutoAwesomeIcon />
                        )
                      }
                      onClick={handleAutoFill}
                      disabled={
                        !allFilesUploaded || (loading && activeStep === 0)
                      }
                      sx={{
                        borderRadius: 3,
                        py: 1.5,
                        px: 4,
                        fontWeight: 700,
                        textTransform: "none",
                        fontSize: "1.1rem",
                        background:
                          "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                        boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
                      }}
                    >
                      {loading && activeStep === 0
                        ? "Processing..."
                        : "Auto Fill Details"}
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              {formEnabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, borderRadius: 3 }}>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                        🧑 Personal Information
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3 }}
                      >
                        Auto-filled from Aadhaar and PAN documents
                      </Typography>

                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Owner Name"
                            value={formData.ownerName}
                            onChange={(e) =>
                              handleInputChange("ownerName", e.target.value)
                            }
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: formData.ownerName
                                  ? "#f0f9ff"
                                  : "transparent",
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Date of Birth"
                            value={formData.dob}
                            onChange={(e) =>
                              handleInputChange("dob", e.target.value)
                            }
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: formData.dob
                                  ? "#f0f9ff"
                                  : "transparent",
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Aadhaar Number"
                            value={formData.aadhaarNumber}
                            onChange={(e) =>
                              handleInputChange("aadhaarNumber", e.target.value)
                            }
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: formData.aadhaarNumber
                                  ? "#f0f9ff"
                                  : "transparent",
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="PAN Number"
                            value={formData.panNumber}
                            onChange={(e) =>
                              handleInputChange("panNumber", e.target.value)
                            }
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: formData.panNumber
                                  ? "#f0f9ff"
                                  : "transparent",
                              },
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, borderRadius: 3 }}>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                        📞 Contact Information
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3 }}
                      >
                        Manual entry required - not available in documents
                      </Typography>

                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Phone Number"
                            placeholder="Enter phone number"
                            value={formData.phoneNumber}
                            onChange={(e) =>
                              handleInputChange("phoneNumber", e.target.value)
                            }
                            required
                            helperText="Required field"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Alternative Phone Number"
                            placeholder="Enter alternative phone number"
                            value={formData.alternativePhoneNumber}
                            onChange={(e) =>
                              handleInputChange(
                                "alternativePhoneNumber",
                                e.target.value,
                              )
                            }
                            helperText="Optional field"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            placeholder="Enter email address"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange("email", e.target.value)
                            }
                            helperText="Optional field"
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, borderRadius: 3 }}>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                        🏦 Banking Information
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3 }}
                      >
                        Auto-filled from bank passbook (if uploaded)
                      </Typography>

                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Account Number"
                            value={formData.accountNumber}
                            onChange={(e) =>
                              handleInputChange("accountNumber", e.target.value)
                            }
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: formData.accountNumber
                                  ? "#f0f9ff"
                                  : "transparent",
                              },
                            }}
                            helperText="Optional - from bank passbook"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="IFSC Code"
                            value={formData.ifscCode}
                            onChange={(e) =>
                              handleInputChange("ifscCode", e.target.value)
                            }
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: formData.ifscCode
                                  ? "#f0f9ff"
                                  : "transparent",
                              },
                            }}
                            helperText="Optional - from bank passbook"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Bank Name"
                            value={formData.bankName}
                            onChange={(e) =>
                              handleInputChange("bankName", e.target.value)
                            }
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: formData.bankName
                                  ? "#f0f9ff"
                                  : "transparent",
                              },
                            }}
                            helperText="Optional - from bank passbook"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Account Holder Name"
                            value={formData.accountHolderName}
                            onChange={(e) =>
                              handleInputChange(
                                "accountHolderName",
                                e.target.value,
                              )
                            }
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                backgroundColor: formData.accountHolderName
                                  ? "#f0f9ff"
                                  : "transparent",
                              },
                            }}
                            helperText="Optional - from bank passbook"
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper sx={{ p: 4, borderRadius: 3 }}>
                      <Box
                        sx={{
                          mb: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            backgroundColor: "primary.50",
                            color: "primary.main",
                            display: "flex",
                          }}
                        >
                          <LocationOnIcon />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            🏢 Shop Details & Settings
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Complete shop information and business
                            configurations
                          </Typography>
                        </Box>
                      </Box>

                      {/* Sub-section 1: Business Identity */}
                      <Box sx={{ mb: 4 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: "text.secondary",
                            mb: 2,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          🏷️ Business Identity
                        </Typography>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Shop Name"
                              placeholder="Enter shop name"
                              value={formData.shopName}
                              onChange={(e) =>
                                handleInputChange("shopName", e.target.value)
                              }
                              required
                              helperText="Required field"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Shop Number / Building"
                              placeholder="Enter shop number or building name"
                              value={formData.shopNumber}
                              onChange={(e) =>
                                handleInputChange("shopNumber", e.target.value)
                              }
                              helperText="Shop number, building name, or floor details"
                            />
                          </Grid>
                        </Grid>
                      </Box>

                      <Divider sx={{ my: 4 }} />

                      {/* Sub-section 2: Location Details */}
                      <Box sx={{ mb: 4 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: "text.secondary",
                            mb: 2,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          📍 Location Details
                        </Typography>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Pincode"
                              placeholder="Enter 6-digit pincode first"
                              value={formData.pincode}
                              onChange={(e) =>
                                handlePincodeChange(e.target.value)
                              }
                              inputProps={{ maxLength: 6, pattern: "[0-9]{6}" }}
                              helperText={
                                pincodeLoading
                                  ? "Looking up locations..."
                                  : "Enter pincode to auto-fill location details"
                              }
                              InputProps={{
                                endAdornment: pincodeLoading && (
                                  <CircularProgress size={20} />
                                ),
                              }}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor:
                                    formData.pincode && postOffices.length > 0
                                      ? "#f0f9ff"
                                      : "transparent",
                                },
                              }}
                            />
                          </Grid>

                          {postOffices.length > 1 && (
                            <Grid item xs={12} md={6}>
                              <FormControl fullWidth>
                                <InputLabel>Select Area/Post Office</InputLabel>
                                <Select
                                  value={selectedPostOffice}
                                  onChange={(e) =>
                                    handlePostOfficeSelect(e.target.value)
                                  }
                                  label="Select Area/Post Office"
                                >
                                  {postOffices.map((office, index) => (
                                    <MenuItem key={index} value={office.Name}>
                                      {office.Name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          )}

                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Locality / Area"
                              placeholder="Auto-filled from pincode"
                              value={formData.locality}
                              onChange={(e) =>
                                handleInputChange("locality", e.target.value)
                              }
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor:
                                    formData.locality && postOffices.length > 0
                                      ? "#f0f9ff"
                                      : "transparent",
                                },
                              }}
                              helperText="Auto-filled from pincode selection"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="City"
                              placeholder="Auto-filled from pincode"
                              value={formData.city}
                              onChange={(e) =>
                                handleInputChange("city", e.target.value)
                              }
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor:
                                    formData.city && postOffices.length > 0
                                      ? "#f0f9ff"
                                      : "transparent",
                                },
                              }}
                              helperText="Auto-filled from pincode selection"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="State"
                              placeholder="Auto-filled from pincode"
                              value={formData.state}
                              onChange={(e) =>
                                handleInputChange("state", e.target.value)
                              }
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor:
                                    formData.state && postOffices.length > 0
                                      ? "#f0f9ff"
                                      : "transparent",
                                },
                              }}
                              helperText="Auto-filled from pincode selection"
                            />
                          </Grid>
                        </Grid>
                      </Box>

                      <Divider sx={{ my: 4 }} />

                      {/* Sub-section 3: GPS Coordinates */}
                      <Box sx={{ mb: 4 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              color: "text.secondary",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            🗺️ GPS Coordinates
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={
                              locationLoading ? (
                                <CircularProgress size={16} />
                              ) : (
                                <LocationOnIcon />
                              )
                            }
                            onClick={getCurrentLocation}
                            disabled={locationLoading}
                            sx={{ borderRadius: 2 }}
                          >
                            {locationLoading
                              ? "Getting GPS..."
                              : "Auto-Fill Location"}
                          </Button>
                        </Box>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Latitude"
                              placeholder="Enter latitude"
                              value={formData.latitude}
                              onChange={(e) =>
                                handleInputChange("latitude", e.target.value)
                              }
                              helperText="GPS coordinate (auto-filled or manual entry)"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Longitude"
                              placeholder="Enter longitude"
                              value={formData.longitude}
                              onChange={(e) =>
                                handleInputChange("longitude", e.target.value)
                              }
                              helperText="GPS coordinate (auto-filled or manual entry)"
                            />
                          </Grid>
                        </Grid>
                      </Box>

                      <Divider sx={{ my: 4 }} />

                      {/* Sub-section 4: Business Settings */}
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            color: "text.secondary",
                            mb: 2,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          💰 Business Settings
                        </Typography>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Commission (%)"
                              placeholder="Enter commission percentage"
                              value={formData.commission}
                              onChange={(e) =>
                                handleInputChange("commission", e.target.value)
                              }
                              type="number"
                              inputProps={{ min: 0, max: 100, step: 0.1 }}
                              helperText="Commission percentage for transactions"
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Tax (%)"
                              placeholder="Enter tax percentage"
                              value={formData.tax}
                              onChange={(e) =>
                                handleInputChange("tax", e.target.value)
                              }
                              type="number"
                              inputProps={{ min: 0, max: 100, step: 0.1 }}
                              helperText="Tax percentage being collected"
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Pick up charges"
                              placeholder="Enter pick up charges"
                              value={formData.pickupCharges}
                              onChange={(e) =>
                                handleInputChange("pickupCharges", e.target.value)
                              }
                              type="number"
                              inputProps={{ min: 0 }}
                              helperText="Flat charges for pick up service"
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Service radius (km)"
                              placeholder="Enter service radius"
                              value={formData.serviceRadiusKm}
                              onChange={(e) =>
                                handleInputChange("serviceRadiusKm", e.target.value)
                              }
                              type="number"
                              inputProps={{
                                min: SERVICE_RADIUS_MIN_KM,
                                max: SERVICE_RADIUS_MAX_KM,
                                step: 0.5,
                              }}
                              helperText={`Only users within this many km of the shop see this garage (default ${SERVICE_RADIUS_DEFAULT_KM})`}
                            />
                          </Grid>
                        </Grid>
                      </Box>

                      <Divider sx={{ my: 4 }} />

                      {/* Sub-section 5: Shop Images Gallery */}
                      <Box sx={{ mt: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 3,
                          }}
                        >
                          <Box>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 800,
                                color: "#1e293b",
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Box
                                sx={{
                                  p: 1,
                                  borderRadius: 2,
                                  backgroundColor: "primary.50",
                                  color: "primary.main",
                                  display: "flex",
                                }}
                              >
                                <AddPhotoAlternateIcon />
                              </Box>
                              Shop Gallery
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              The featured image (first one) will be shown as
                              your primary shop photo.
                            </Typography>
                          </Box>
                          <Chip
                            label={`${files.shopImages.length} / 5 Photos`}
                            size="medium"
                            color={
                              files.shopImages.length > 0
                                ? "primary"
                                : "default"
                            }
                            variant={
                              files.shopImages.length > 0
                                ? "filled"
                                : "outlined"
                            }
                            sx={{
                              fontWeight: 700,
                              borderRadius: 2,
                              height: 32,
                            }}
                          />
                        </Box>

                        <Grid container spacing={3}>
                          {files.shopImages.length === 0 ? (
                            <Grid item xs={12}>
                              <Box
                                component="label"
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  py: 10,
                                  px: 4,
                                  borderRadius: 5,
                                  border: "3px dashed",
                                  borderColor: "primary.light",
                                  backgroundColor: "rgba(33, 150, 243, 0.02)",
                                  cursor: "pointer",
                                  transition:
                                    "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                                  textAlign: "center",
                                  width: "100%",
                                  "&:hover": {
                                    backgroundColor: "rgba(33, 150, 243, 0.08)",
                                    borderColor: "primary.main",
                                    transform: "translateY(-4px)",
                                    boxShadow:
                                      "0 20px 40px -10px rgba(33, 150, 243, 0.15)",
                                    "& .add-icon-box": {
                                      transform: "scale(1.1) rotate(90deg)",
                                      boxShadow:
                                        "0 15px 30px -5px rgba(33, 150, 243, 0.3)",
                                    },
                                  },
                                }}
                              >
                                <Box
                                  className="add-icon-box"
                                  sx={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: "32px",
                                    backgroundColor: "primary.main",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow:
                                      "0 15px 30px -5px rgba(33, 150, 243, 0.3)",
                                    transition: "all 0.5s ease",
                                    mb: 3,
                                  }}
                                >
                                  <AddPhotoAlternateIcon
                                    sx={{ color: "#fff", fontSize: 48 }}
                                  />
                                </Box>
                                <Typography
                                  variant="h5"
                                  color="#1e293b"
                                  fontWeight={900}
                                  sx={{ mb: 1 }}
                                >
                                  Upload Shop Photos
                                </Typography>
                                <Typography
                                  variant="body1"
                                  color="text.secondary"
                                  sx={{ mb: 4, maxWidth: 500 }}
                                >
                                  Dealers with great shop photos see 40% more
                                  bookings. Upload at least 3 photos (Interior,
                                  Exterior, Main Entrance).
                                </Typography>
                                <Button
                                  variant="contained"
                                  component="span"
                                  startIcon={<CloudUploadIcon />}
                                  sx={{
                                    borderRadius: 3,
                                    px: 6,
                                    py: 1.5,
                                    textTransform: "none",
                                    fontWeight: 700,
                                    fontSize: "1rem",
                                    boxShadow:
                                      "0 10px 20px rgba(33, 150, 243, 0.2)",
                                  }}
                                >
                                  Select Photos from Computer
                                </Button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleShopImagesChange}
                                  style={{ display: "none" }}
                                />
                              </Box>
                            </Grid>
                          ) : (
                            <Box>
                              {/* Hero Image */}
                              <Box
                                sx={{
                                  position: "relative",
                                  width: "100%",
                                  height: { xs: 240, md: 360 },
                                  borderRadius: 5,
                                  overflow: "hidden",
                                  border: "4px solid",
                                  borderColor: "primary.main",
                                  boxShadow: "0 20px 40px -10px rgba(33, 150, 243, 0.2)",
                                  mb: 3,
                                  "&:hover .hero-overlay": { opacity: 1 }
                                }}
                              >
                                <img
                                  src={URL.createObjectURL(files.shopImages[0])}
                                  alt="Main Shop Preview"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                  onClick={() => setPreviewImage(URL.createObjectURL(files.shopImages[0]))}
                                />
                                
                                <Box
                                  sx={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    padding: 3,
                                    background: "linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0) 100%)",
                                    display: "flex",
                                    alignItems: "flex-end",
                                    pointerEvents: "none"
                                  }}
                                >
                                  <Chip 
                                    icon={<StarIcon style={{ color: "#fff" }} />} 
                                    label="Primary Featured Photo" 
                                    color="primary"
                                    sx={{ 
                                      fontWeight: 800, 
                                      fontSize: "0.85rem",
                                      borderRadius: 2,
                                      height: 36,
                                      boxShadow: "0 10px 15px -3px rgba(33, 150, 243, 0.4)"
                                    }} 
                                  />
                                </Box>

                                <Box
                                  className="hero-overlay"
                                  sx={{
                                    position: "absolute",
                                    top: 16,
                                    right: 16,
                                    opacity: 0,
                                    transition: "all 0.3s ease",
                                    display: "flex",
                                    gap: 1.5,
                                  }}
                                >
                                  <Tooltip title="Preview" arrow>
                                    <IconButton
                                      onClick={() => setPreviewImage(URL.createObjectURL(files.shopImages[0]))}
                                      sx={{ backgroundColor: "rgba(255,255,255,0.9)", color: "primary.main", "&:hover": { backgroundColor: "#fff", transform: "scale(1.1)" } }}
                                    >
                                      <VisibilityIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Remove" arrow>
                                    <IconButton
                                      onClick={() => removeShopImage(0)}
                                      sx={{ backgroundColor: "rgba(255,255,255,0.9)", color: "error.main", "&:hover": { backgroundColor: "#fff", transform: "scale(1.1)" } }}
                                    >
                                      <CloseIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>

                              {/* Thumbnail Strip */}
                              <Stack direction="row" spacing={2} sx={{ overflowX: "auto", pb: 2, "&::-webkit-scrollbar": { height: 8 }, "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(33, 150, 243, 0.2)", borderRadius: 4 } }}>
                                {files.shopImages.slice(1).map((file, i) => {
                                  const originalIndex = i + 1;
                                  return (
                                    <Box
                                      key={originalIndex}
                                      sx={{
                                        position: "relative",
                                        width: 140,
                                        height: 140,
                                        flexShrink: 0,
                                        borderRadius: 4,
                                        overflow: "hidden",
                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                        border: "2px solid transparent",
                                        "&:hover": { borderColor: "primary.light" },
                                        "&:hover .thumb-overlay": { opacity: 1 }
                                      }}
                                    >
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Shop Thumbnail ${originalIndex}`}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                                        onClick={() => setPreviewImage(URL.createObjectURL(file))}
                                      />
                                      <Box
                                        className="thumb-overlay"
                                        sx={{
                                          position: "absolute",
                                          top: 0, left: 0, right: 0, bottom: 0,
                                          backgroundColor: "rgba(15, 23, 42, 0.6)",
                                          backdropFilter: "blur(2px)",
                                          opacity: 0,
                                          transition: "all 0.3s ease",
                                          display: "flex",
                                          flexDirection: "column",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          gap: 1.5,
                                          pointerEvents: "none"
                                        }}
                                      >
                                        <Stack direction="row" spacing={1} sx={{ pointerEvents: "auto" }}>
                                          <Tooltip title="Preview" arrow>
                                            <IconButton
                                              size="small"
                                              onClick={() => setPreviewImage(URL.createObjectURL(file))}
                                              sx={{ backgroundColor: "rgba(255, 255, 255, 0.9)", color: "primary.main", "&:hover": { backgroundColor: "#fff", transform: "scale(1.1)" } }}
                                            >
                                              <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Set as Primary" arrow>
                                            <IconButton
                                              size="small"
                                              onClick={() => setAsMainImage(originalIndex)}
                                              sx={{ backgroundColor: "rgba(255, 255, 255, 0.9)", color: "warning.main", "&:hover": { backgroundColor: "#fff", transform: "scale(1.1)" } }}
                                            >
                                              <StarIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </Stack>
                                        <Tooltip title="Remove" arrow sx={{ pointerEvents: "auto" }}>
                                          <IconButton
                                            size="small"
                                            onClick={() => removeShopImage(originalIndex)}
                                            sx={{ backgroundColor: "rgba(255, 255, 255, 0.9)", color: "error.main", "&:hover": { backgroundColor: "#fff", transform: "scale(1.1)" } }}
                                          >
                                            <CloseIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </Box>
                                    </Box>
                                  );
                                })}

                                {/* Add More Button in Strip */}
                                {files.shopImages.length < 5 && (
                                  <Box
                                    component="label"
                                    sx={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: 140,
                                      height: 140,
                                      flexShrink: 0,
                                      borderRadius: 4,
                                      border: "3px dashed",
                                      borderColor: "primary.light",
                                      backgroundColor: "primary.50",
                                      cursor: "pointer",
                                      transition: "all 0.3s ease",
                                      "&:hover": {
                                        backgroundColor: "primary.100",
                                        borderColor: "primary.main",
                                        transform: "translateY(-4px)",
                                        "& .add-icon-mini": { transform: "scale(1.1)" }
                                      }
                                    }}
                                  >
                                    <Box
                                      className="add-icon-mini"
                                      sx={{
                                        width: 40, height: 40, borderRadius: "12px",
                                        backgroundColor: "primary.main",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        boxShadow: "0 8px 16px rgba(33, 150, 243, 0.2)",
                                        transition: "all 0.3s ease",
                                        mb: 1
                                      }}
                                    >
                                      <AddPhotoAlternateIcon sx={{ color: "#fff", fontSize: 20 }} />
                                    </Box>
                                    <Typography variant="caption" color="primary.main" fontWeight={800} sx={{ textTransform: "uppercase" }}>
                                      Add Photo
                                    </Typography>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={handleShopImagesChange}
                                      style={{ display: "none" }}
                                    />
                                  </Box>
                                )}
                              </Stack>
                            </Box>
                          )}
                        </Grid>

                        <Box
                          sx={{
                            mt: 4,
                            p: 2.5,
                            borderRadius: 3,
                            backgroundColor: "rgba(33, 150, 243, 0.05)",
                            border: "1px solid",
                            borderColor: "primary.50",
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={2.5}
                            alignItems="center"
                          >
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                backgroundColor: "primary.main",
                                color: "white",
                                display: "flex",
                                boxShadow: "0 4px 12px rgba(33, 150, 243, 0.3)",
                              }}
                            >
                              <AutoAwesomeIcon sx={{ fontSize: 20 }} />
                            </Box>
                            <Box>
                              <Typography
                                variant="subtitle2"
                                color="primary.main"
                                fontWeight={800}
                              >
                                Visual Impact Matters
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: "block",
                                  mt: 0.5,
                                  lineHeight: 1.5,
                                }}
                              >
                                Dealers with at least 3 high-quality shop photos
                                (Interior & Exterior) see{" "}
                                <strong>40% higher</strong> customer engagement.
                                Make sure your featured image shows your shop's
                                main entrance.
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
                      </Box>

                      {/* Image Preview Modal */}
                      <Dialog
                        open={Boolean(previewImage)}
                        onClose={() => setPreviewImage(null)}
                        maxWidth="lg"
                        fullWidth
                        PaperProps={{
                          sx: {
                            borderRadius: 6,
                            overflow: "hidden",
                            backgroundColor: "transparent",
                            boxShadow: "none",
                          },
                        }}
                      >
                        <DialogContent
                          sx={{
                            p: 0,
                            position: "relative",
                            backgroundColor: "rgba(0,0,0,0.8)",
                            backdropFilter: "blur(10px)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "50vh",
                          }}
                        >
                          <IconButton
                            onClick={() => setPreviewImage(null)}
                            sx={{
                              position: "absolute",
                              top: 24,
                              right: 24,
                              backgroundColor: "rgba(255,255,255,0.1)",
                              color: "white",
                              "&:hover": {
                                backgroundColor: "rgba(255,255,255,0.2)",
                                transform: "rotate(90deg)",
                              },
                              transition: "all 0.3s ease",
                              zIndex: 10,
                            }}
                          >
                            <CloseIcon />
                          </IconButton>
                          {previewImage && (
                            <img
                              src={previewImage}
                              alt="Shop Preview"
                              style={{
                                maxWidth: "95%",
                                maxHeight: "90vh",
                                objectFit: "contain",
                                borderRadius: "12px",
                                boxShadow:
                                  "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                              }}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </Paper>
                  </Grid>

                  <Box sx={{ mt: 4, width: "100%", textAlign: "center" }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleSubmit}
                      disabled={loading}
                      startIcon={
                        loading &&
                        activeStep === 1 && (
                          <CircularProgress size={20} color="inherit" />
                        )
                      }
                      sx={{
                        borderRadius: 3,
                        py: 1.5,
                        px: 6,
                        fontWeight: 700,
                        textTransform: "none",
                        fontSize: "1.1rem",
                        minWidth: 240,
                      }}
                    >
                      {loading && activeStep === 1
                        ? "Creating Dealer..."
                        : "Create Dealer"}
                    </Button>
                  </Box>
                </>
              )}
            </Grid>
          )}
        </Container>
      </div>
    </div>
  );
};

export default CreateDealerAI;
