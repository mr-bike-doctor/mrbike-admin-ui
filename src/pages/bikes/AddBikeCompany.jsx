import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Breadcrumbs,
  Link as MuiLink,
  Stack,
  Card,
  CardContent,
  Grid,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Divider,
  Paper,
  alpha,
  IconButton,
} from "@mui/material";
import {
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Business as CompanyIcon,
  DirectionsBike as BikeIcon,
  Tune as VariantIcon,
  CheckCircle as SuccessIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import Swal from "sweetalert2";
import {
  addBikeVariant,
  getBikeCompanies,
  getBikeModels,
  deleteBikeCompany,
  deleteBikeModel,
  addBikeCompany,
  addBikeModel,
} from "../../api";

const AddBike = () => {
  const [companyName, setCompanyName] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [modelName, setModelName] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [variantName, setVariantName] = useState("");
  const [engineCC, setEngineCC] = useState("");
  const [companies, setCompanies] = useState([]);
  const [models, setModels] = useState([]);

  // Fetch companies on component load
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await getBikeCompanies();
        if (response.status === 200) {
          setCompanies(response.data);
        }
      } catch (error) {
        Swal.fire("Error", "Failed to fetch companies", "error");
      }
    };
    fetchCompanies();
  }, []);

  // Fetch models when selectedCompanyId changes
  useEffect(() => {
    if (!selectedCompanyId) {
      setModels([]);
      setSelectedModelId("");
      return;
    }
    const fetchModels = async () => {
      try {
        const response = await getBikeModels(selectedCompanyId);
        if (response.status === 200) {
          setModels(response.data);
        }
      } catch (error) {
        Swal.fire("Error", "Failed to fetch models", "error");
      }
    };
    fetchModels();
  }, [selectedCompanyId]);

  const handleSubmitCompany = async () => {
    if (!companyName)
      return Swal.fire("Error", "Company name required!", "error");
    try {
      const response = await addBikeCompany({ name: companyName });
      if (response.message === "Bike company added successfully") {
        setCompanies([...companies, response.data]);
        Swal.fire("Success", "Company added!", "success");
        setCompanyName("");
      } else if (response.message === "Bike company already exists!") {
        Swal.fire("Error", "Bike company already exists!", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Failed to add company", "error");
    }
  };

  const handleSubmitModel = async () => {
    if (!modelName || !selectedCompanyId)
      return Swal.fire("Error", "Model name & Company required!", "error");
    try {
      const response = await addBikeModel({
        company_id: selectedCompanyId,
        model_name: modelName,
      });
      if (response.message === "Bike model added successfully") {
        setModels([...models, response.data]);
        Swal.fire("Success", "Bike model added successfully", "success");
        setModelName("");
      } else if (response.message === "Bike model already exists!") {
        Swal.fire("Error", "Bike model already exists!", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Failed to add model", "error");
    }
  };

  const handleSubmitVariant = async () => {
    if (!variantName || !engineCC || !selectedModelId)
      return Swal.fire("Error", "All fields required!", "error");
    try {
      const response = await addBikeVariant({
        model_id: selectedModelId,
        variant_name: variantName,
        engine_cc: engineCC,
      });
      if (response.status === 200) {
        Swal.fire("Success", "Variant added!", "success");
        setVariantName("");
        setEngineCC("");
      }
    } catch (error) {
      Swal.fire("Error", "Failed to add variant", "error");
    }
  };

  const handleDeleteCompany = async (id, name) => {
    Swal.fire({
      title: `Delete company "${name}"?`,
      text: "This will delete the company and ALL its models and variants. This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await deleteBikeCompany(id);
          if (response.status === 200 || response.status === "200") {
            setCompanies(companies.filter((c) => c._id !== id));
            if (selectedCompanyId === id) {
              setSelectedCompanyId("");
              setModels([]);
              setSelectedModelId("");
            }
            Swal.fire("Deleted!", "Company has been deleted.", "success");
          }
        } catch (error) {
          console.error("Delete company error:", error);
        }
      }
    });
  };

  const handleDeleteModel = async (id, name) => {
    Swal.fire({
      title: `Delete model "${name}"?`,
      text: "This will delete the model and ALL its variants. This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await deleteBikeModel(id);
          if (response.status === 200 || response.status === "200") {
            setModels(models.filter((m) => m._id !== id));
            if (selectedModelId === id) {
              setSelectedModelId("");
            }
            Swal.fire("Deleted!", "Model has been deleted.", "success");
          }
        } catch (error) {
          console.error("Delete model error:", error);
        }
      }
    });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header Section */}
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#1e293b" }}>
          🚀 Add Bike Details
        </Typography>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
        >
          <MuiLink
            component={RouterLink}
            underline="hover"
            color="inherit"
            to="/"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Dashboard
          </MuiLink>
          <MuiLink
            component={RouterLink}
            underline="hover"
            color="inherit"
            to="/bikes"
          >
            Bikes
          </MuiLink>
          <Typography color="text.primary" sx={{ fontWeight: 500 }}>
            Add Bike
          </Typography>
        </Breadcrumbs>
      </Stack>

      {/* Main Grid Layout */}
      <Grid container spacing={3}>
        {/* Column 1: Company Selection/Addition */}
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              height: "100%",
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent
              sx={{
                p: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}
              >
                <Box
                  sx={{
                    p: 1,
                    bgcolor: alpha("#2e83ff", 0.1),
                    borderRadius: "10px",
                    display: "flex",
                  }}
                >
                  <CompanyIcon color="primary" />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Company
                </Typography>
              </Box>

              <Box
                sx={{
                  flexGrow: 1,
                  mb: 3,
                  maxHeight: "400px",
                  overflowY: "auto",
                  pr: 1,
                }}
              >
                <FormControl component="fieldset" fullWidth>
                  <RadioGroup
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                  >
                    {companies.map((company) => (
                      <Paper
                        key={company._id}
                        elevation={0}
                        sx={{
                          mb: 1,
                          p: 0.5,
                          borderRadius: "10px",
                          border: "1px solid",
                          borderColor:
                            selectedCompanyId === company._id
                              ? "primary.main"
                              : "divider",
                          bgcolor:
                            selectedCompanyId === company._id
                              ? alpha("#2e83ff", 0.04)
                              : "transparent",
                          transition: "all 0.2s",
                          "&:hover": { bgcolor: alpha("#2e83ff", 0.02) },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            pr: 1,
                          }}
                        >
                          <FormControlLabel
                            value={company._id}
                            control={<Radio size="small" />}
                            label={company.name}
                            sx={{ m: 0, flexGrow: 1 }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCompany(company._id, company.name);
                            }}
                            sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Paper>
                    ))}
                    {companies.length === 0 && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontStyle: "italic", textAlign: "center", mt: 2 }}
                      >
                        No companies found.
                      </Typography>
                    )}
                  </RadioGroup>
                </FormControl>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="New Company"
                  placeholder="e.g. Bajaj"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />
                <Button
                  variant="contained"
                  onClick={handleSubmitCompany}
                  sx={{ borderRadius: "10px", minWidth: 80 }}
                >
                  Add
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Column 2: Model Selection/Addition */}
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              height: "100%",
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "divider",
              opacity: !selectedCompanyId ? 0.6 : 1,
              transition: "opacity 0.3s",
            }}
          >
            <CardContent
              sx={{
                p: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}
              >
                <Box
                  sx={{
                    p: 1,
                    bgcolor: alpha("#2e83ff", 0.1),
                    borderRadius: "10px",
                    display: "flex",
                  }}
                >
                  <BikeIcon color="primary" />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Bike Model
                </Typography>
              </Box>

              {!selectedCompanyId ? (
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontStyle: "italic",
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="body2">
                    Select a company first
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    flexGrow: 1,
                    mb: 3,
                    maxHeight: "400px",
                    overflowY: "auto",
                    pr: 1,
                  }}
                >
                  <RadioGroup
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                  >
                    {models.map((model) => (
                      <Paper
                        key={model._id}
                        elevation={0}
                        sx={{
                          mb: 1,
                          p: 0.5,
                          borderRadius: "10px",
                          border: "1px solid",
                          borderColor:
                            selectedModelId === model._id
                              ? "primary.main"
                              : "divider",
                          bgcolor:
                            selectedModelId === model._id
                              ? alpha("#2e83ff", 0.04)
                              : "transparent",
                          transition: "all 0.2s",
                          "&:hover": { bgcolor: alpha("#2e83ff", 0.02) },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            pr: 1,
                          }}
                        >
                          <FormControlLabel
                            value={model._id}
                            control={<Radio size="small" />}
                            label={model.model_name}
                            sx={{ m: 0, flexGrow: 1 }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteModel(model._id, model.model_name);
                            }}
                            sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Paper>
                    ))}
                    {models.length === 0 && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontStyle: "italic", textAlign: "center", mt: 2 }}
                      >
                        No models found.
                      </Typography>
                    )}
                  </RadioGroup>
                </Box>
              )}

              <Divider sx={{ mb: 3 }} />

              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="New Model"
                  placeholder="e.g. Pulsar"
                  disabled={!selectedCompanyId}
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />
                <Button
                  variant="contained"
                  disabled={!selectedCompanyId}
                  onClick={handleSubmitModel}
                  sx={{ borderRadius: "10px", minWidth: 80 }}
                >
                  Add
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Column 3: Variant Addition */}
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              height: "100%",
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "divider",
              opacity: !selectedModelId ? 0.6 : 1,
              transition: "opacity 0.3s",
            }}
          >
            <CardContent
              sx={{
                p: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}
              >
                <Box
                  sx={{
                    p: 1,
                    bgcolor: alpha("#2e83ff", 0.1),
                    borderRadius: "10px",
                    display: "flex",
                  }}
                >
                  <VariantIcon color="primary" />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Add Variant
                </Typography>
              </Box>

              {!selectedModelId ? (
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontStyle: "italic",
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="body2">Select a model first</Typography>
                </Box>
              ) : (
                <Stack spacing={3} sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "background.default",
                      borderRadius: "12px",
                      border: "1px dashed",
                      borderColor: "primary.light",
                    }}
                  >
                    <SuccessIcon
                      color="primary"
                      sx={{ fontSize: 40, mb: 1, opacity: 0.8 }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}
                    >
                      Ready to add variant
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Adding details to the selected model.
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    label="Variant Name"
                    placeholder="e.g. NS 160 BS6"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                    }}
                  />

                  <TextField
                    fullWidth
                    type="number"
                    label="Engine CC"
                    placeholder="e.g. 160"
                    value={engineCC}
                    onChange={(e) => setEngineCC(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                    }}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSubmitVariant}
                    sx={{
                      borderRadius: "10px",
                      py: 1.5,
                      fontWeight: 700,
                      boxShadow: "0 4px 12px rgba(46, 131, 255, 0.4)",
                    }}
                  >
                    Add Variant
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AddBike;
