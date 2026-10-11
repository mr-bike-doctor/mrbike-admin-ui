import React, { useRef, useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Button, 
  Breadcrumbs, 
  Link as MuiLink, 
  Stack,
  Menu,
  MenuItem,
} from "@mui/material";
import { 
  Add as AddIcon, 
  FileDownload as DownloadIcon, 
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Description as PdfIcon,
  TableChart as ExcelIcon
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import BikeTable from "../../components/Bikes/BikeTable";
import { getBikes } from "../../api";

const Bikes = () => {
  const [data, setData] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [downloadAnchorEl, setDownloadAnchorEl] = useState(null);

  const tableHeaders = ["#", "Company Name", "Model Name", "Variant Name", "Engine CC", "Action"];

  const triggerDownloadExcel = useRef(null);
  const triggerDownloadPDF = useRef(null);

  useEffect(() => {
    const fetchBikes = async () => {
      try {
        const response = await getBikes();
        if (response.status === 200) {
          setData(response.data);
        }
      } catch (error) {
        console.error("Error fetching bikes:", error);
      }
    };
    fetchBikes();
  }, [refresh]);

  const handleRefresh = () => {
    setRefresh((prev) => !prev);
  };

  const handleDownloadClick = (event) => {
    setDownloadAnchorEl(event.currentTarget);
  };

  const handleDownloadClose = () => {
    setDownloadAnchorEl(null);
  };

  const handleDownloadExcel = () => {
    if (triggerDownloadExcel.current) triggerDownloadExcel.current();
    handleDownloadClose();
  };

  const handleDownloadPDF = () => {
    if (triggerDownloadPDF.current) triggerDownloadPDF.current();
    handleDownloadClose();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Page Header */}
      <Stack 
        direction={{ xs: "column", md: "row" }} 
        justifyContent="space-between" 
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#1e293b", mb: 1 }}>
            Bike Companies
          </Typography>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
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
            <Typography color="text.primary" sx={{ fontWeight: 500 }}>Bikes</Typography>
          </Breadcrumbs>
        </Box>

        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ justifyContent: { xs: "flex-start", md: "flex-end" } }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadClick}
            sx={{ 
              borderRadius: "10px", 
              textTransform: "none", 
              fontWeight: 600,
              borderColor: "divider",
              color: "text.primary"
            }}
          >
            Download
          </Button>
          <Menu
            anchorEl={downloadAnchorEl}
            open={Boolean(downloadAnchorEl)}
            onClose={handleDownloadClose}
            PaperProps={{
              elevation: 2,
              sx: { borderRadius: "10px", mt: 1, minWidth: 150 }
            }}
          >
            <MenuItem onClick={handleDownloadExcel} sx={{ gap: 1.5 }}>
              <ExcelIcon sx={{ color: "#1d6f42" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Excel</Typography>
            </MenuItem>
            <MenuItem onClick={handleDownloadPDF} sx={{ gap: 1.5 }}>
              <PdfIcon sx={{ color: "#d32f2f" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>PDF</Typography>
            </MenuItem>
          </Menu>

          <Button
            component={RouterLink}
            to="/addBikeCompany"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ 
              borderRadius: "10px", 
              textTransform: "none", 
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(46, 131, 255, 0.3)"
            }}
          >
            Add New Bike
          </Button>
        </Stack>
      </Stack>

      <BikeTable
        datas={data}
        triggerDownloadExcel={triggerDownloadExcel}
        triggerDownloadPDF={triggerDownloadPDF}
        tableHeaders={tableHeaders}
        text={"Bikes"}
        onBikeDeleted={handleRefresh}
      />
    </Box>
  );
};

export default Bikes;
