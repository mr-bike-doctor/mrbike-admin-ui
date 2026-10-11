import {
  Box,
  Typography,
  Card,
  IconButton,
  Button,
  alpha,
  useTheme,
  Chip,
} from "@mui/material";
import { DataGrid, GridToolbarContainer, GridToolbarFilterButton, GridToolbarExport } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

const CustomToolbar = ({ onAddRow }) => (
  <GridToolbarContainer sx={{ p: 2, pb: 1, borderBottom: "1px solid", borderColor: "divider", justifyContent: 'space-between' }}>
    <Box>
      <GridToolbarFilterButton />
      <GridToolbarExport />
    </Box>
    <Button
      variant="contained"
      size="small"
      startIcon={<AddCircleOutlineIcon />}
      onClick={onAddRow}
      sx={{ borderRadius: "8px", fontWeight: 700, textTransform: 'none' }}
    >
      Add CC Range
    </Button>
  </GridToolbarContainer>
);

const CcPricingTable = ({
  bikes,
  processRowUpdate,
  handleProcessRowUpdateError,
  onAddRow,
  onDeleteRow,
}) => {
  const theme = useTheme();

  const columns = [
    {
      field: "cc",
      headerName: "Engine CC",
      flex: 1,
      editable: true,
      type: "number",
      headerAlign: "left",
      align: "left",
      renderHeader: (params) => (
        <Typography variant="subtitle2" fontWeight="800" color="text.secondary">ENGINE CC</Typography>
      ),
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="700">{params.value || "--"} CC</Typography>
      ),
    },
    {
      field: "effectivePrice",
      headerName: "Pricing (₹)",
      flex: 1,
      editable: true,
      type: "number",
      headerAlign: "left",
      align: "left",
      renderHeader: (params) => (
        <Typography variant="subtitle2" fontWeight="800" color="text.secondary">PRICE (₹)</Typography>
      ),
      renderCell: (params) => {
        const hasPrice = params.value !== null && params.value !== undefined && params.value !== "";
        if (!hasPrice) return <Typography color="text.disabled" variant="body2">Not set</Typography>;

        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" fontWeight="900" color="primary.main">
              ₹{params.value.toLocaleString()}
            </Typography>
            {params.row.isManualOverride ? (
               <Chip 
               label="Manual" 
               size="small" 
               sx={{ 
                 height: 18, 
                 fontSize: '0.6rem', 
                 fontWeight: 800,
                 bgcolor: alpha(theme.palette.warning.main, 0.1),
                 color: 'warning.dark',
                 border: 'none'
               }} 
             />
            ) : params.row.computedPrice !== null && (
              <Chip 
                label="Auto" 
                size="small" 
                sx={{ 
                  height: 18, 
                  fontSize: '0.6rem', 
                  fontWeight: 800,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  color: 'success.dark',
                  border: 'none'
                }} 
              />
            )}
          </Box>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          color="error"
          size="small"
          onClick={() => onDeleteRow(params.row.id)}
          sx={{ 
            opacity: 0.6, 
            "&:hover": { opacity: 1, bgcolor: alpha(theme.palette.error.main, 0.1) } 
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Card
      sx={{
        mb: 4,
        borderRadius: "20px",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 4, pb: 0 }}>
        <Typography variant="h6" fontWeight="800" gutterBottom>
          Pricing configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Set prices for different engine capacities. You can add ranges manually or use the rule engine for bulk updates.
        </Typography>
      </Box>

      <Box sx={{ height: 450, width: "100%" }}>
        <DataGrid
          rows={bikes}
          columns={columns}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={handleProcessRowUpdateError}
          slots={{
            toolbar: CustomToolbar,
          }}
          slotProps={{
            toolbar: { onAddRow },
          }}
          disableRowSelectionOnClick
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: alpha(theme.palette.grey[50], 0.5),
              borderBottom: "1px solid",
              borderColor: "divider",
            },
            "& .MuiDataGrid-cell": {
              borderColor: alpha(theme.palette.divider, 0.5),
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid",
              borderColor: "divider",
            },
            "& .MuiDataGrid-row:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.02),
            },
          }}
        />
      </Box>
    </Card>
  );
};

export default CcPricingTable;
