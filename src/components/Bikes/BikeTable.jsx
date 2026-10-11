"use client"

import React, { useState, useMemo, useRef } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Menu,
  Chip,
  alpha,
} from "@mui/material"
import {
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  TwoWheeler as BikeIcon,
} from "@mui/icons-material"
import Swal from "sweetalert2"
import { useDownloadExcel } from "react-export-table-to-excel"
import jsPDF from "jspdf"
import "jspdf-autotable"
import { deleteBike, deleteBikeModel, deleteBikeCompany } from "../../api"

const BikeTable = ({ triggerDownloadExcel, triggerDownloadPDF, tableHeaders, datas, text, onBikeDeleted }) => {
  const tableRef = useRef(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [filters, setFilters] = useState({
    company: "",
    model: "",
    variant: "",
    engineCC: "",
  })

  // Anchor for the actions menu
  const [anchorEl, setAnchorEl] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)

  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget)
    setSelectedRow(row)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedRow(null)
  }

  // Handle filter changes with cascading reset
  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value }
      if (key === "company") {
        newFilters.model = ""
        newFilters.variant = ""
        newFilters.engineCC = ""
      } else if (key === "model") {
        newFilters.variant = ""
        newFilters.engineCC = ""
      } else if (key === "variant") {
        newFilters.engineCC = ""
      }
      return newFilters
    })
    setCurrentPage(0)
  }

  // Get filtered data
  const filteredData = useMemo(() => {
    return datas
      .filter((company) => (filters.company ? company.name === filters.company : true))
      .map((company) => ({
        ...company,
        models: company.models
          .filter((model) => (filters.model ? model.model_name === filters.model : true))
          .map((model) => ({
            ...model,
            variants: model.variants.filter((variant) => {
              return (
                (filters.variant ? variant.variant_name === filters.variant : true) &&
                (filters.engineCC ? variant.engine_cc === +filters.engineCC : true)
              )
            }),
          }))
          .filter((model) => model.variants.length > 0),
      }))
      .filter((company) => company.models.length > 0)
  }, [datas, filters])

  // Options for dropdowns
  const companyOptions = useMemo(() => [...new Set(datas.map((c) => c.name))].sort(), [datas])
  const modelOptions = useMemo(() => {
    if (!filters.company) return [...new Set(datas.flatMap((c) => c.models.map((m) => m.model_name)))].sort()
    const selectedCompany = datas.find((c) => c.name === filters.company)
    return selectedCompany ? [...new Set(selectedCompany.models.map((m) => m.model_name))].sort() : []
  }, [datas, filters.company])

  const variantOptions = useMemo(() => {
    let variants = []
    if (filters.company && filters.model) {
      const selectedCompany = datas.find((c) => c.name === filters.company)
      const selectedModel = selectedCompany?.models.find((m) => m.model_name === filters.model)
      variants = selectedModel?.variants || []
    } else if (filters.company) {
      const selectedCompany = datas.find((c) => c.name === filters.company)
      variants = selectedCompany?.models.flatMap((m) => m.variants) || []
    } else {
      variants = datas.flatMap((c) => c.models.flatMap((m) => m.variants))
    }
    return [...new Set(variants.map((v) => v.variant_name))].sort()
  }, [datas, filters.company, filters.model])

  const engineCCOptions = useMemo(() => {
    let variants = []
    if (filters.company && filters.model && filters.variant) {
      const selectedCompany = datas.find((c) => c.name === filters.company)
      const selectedModel = selectedCompany?.models.find((m) => m.model_name === filters.model)
      variants = selectedModel?.variants.filter((v) => v.variant_name === filters.variant) || []
    } else if (filters.company && filters.model) {
      const selectedCompany = datas.find((c) => c.name === filters.company)
      const selectedModel = selectedCompany?.models.find((m) => m.model_name === filters.model)
      variants = selectedModel?.variants || []
    } else if (filters.company) {
      const selectedCompany = datas.find((c) => c.name === filters.company)
      variants = selectedCompany?.models.flatMap((m) => m.variants) || []
    } else {
      variants = datas.flatMap((c) => c.models.flatMap((m) => m.variants))
    }
    return [...new Set(variants.map((v) => v.engine_cc))].sort((a, b) => a - b)
  }, [datas, filters.company, filters.model, filters.variant])

  // Flat data for table
  const flatRows = useMemo(() => {
    const rows = []
    filteredData.forEach((company) => {
      company.models.forEach((model) => {
        model.variants.forEach((variant) => {
          rows.push({
            companyName: company.name,
            companyId: company._id,
            modelName: model.model_name,
            modelId: model._id,
            variantName: variant.variant_name,
            variantId: variant._id,
            engineCC: variant.engine_cc,
          })
        })
      })
    })
    return rows
  }, [filteredData])

  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setCurrentPage(0)
  }

  // Download Handlers
  const { onDownload } = useDownloadExcel({
    currentTableRef: tableRef.current,
    filename: "Bike_List",
    sheet: "Bikes",
  })

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.text("Bike List", 14, 10)
    doc.autoTable({
      html: "#bike-export-table",
      startY: 20,
      theme: "striped",
    })
    doc.save(`${text}.pdf`)
  }

  triggerDownloadExcel.current = onDownload
  triggerDownloadPDF.current = exportToPDF

  const handleDelete = async (type) => {
    const { variantId, modelId, companyId, variantName, modelName, companyName } = selectedRow
    handleMenuClose()

    let deleteFn, title, text, successText
    if (type === "variant") {
      deleteFn = () => deleteBike(variantId)
      title = `Delete variant "${variantName}"?`
      text = "This will only delete this specific variant."
      successText = "Variant deleted successfully"
    } else if (type === "model") {
      deleteFn = () => deleteBikeModel(modelId)
      title = `Delete model "${modelName}"?`
      text = `This will delete the model and ALL its variants under ${companyName}.`
      successText = "Model and variants deleted successfully"
    } else if (type === "company") {
      deleteFn = () => deleteBikeCompany(companyId)
      title = `Delete company "${companyName}"?`
      text = "This will delete the company and ALL its models and variants. This action cannot be undone!"
      successText = "Company and all associated data deleted successfully"
    }

    Swal.fire({
      title: title,
      text: text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await deleteFn()
          if (response.status === 200 || response.status === "200") {
            onBikeDeleted()
            Swal.fire({
              icon: "success",
              title: "Deleted!",
              text: response.message || successText,
              timer: 2000,
              showConfirmButton: false,
            })
          }
        } catch (error) {
          console.error("Bike deletion error:", error)
        }
      }
    })
  }

  return (
    <Box>
      {/* Filters Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 3, 
          borderRadius: "12px", 
          border: "1px solid", 
          borderColor: "divider",
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center"
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
          <FilterIcon sx={{ color: "text.secondary", mr: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.secondary" }}>
            FILTERS
          </Typography>
        </Box>

        {[
          { label: "Company", key: "company", options: companyOptions, disabled: false },
          { label: "Model", key: "model", options: modelOptions, disabled: !filters.company },
          { label: "Variant", key: "variant", options: variantOptions, disabled: !filters.model },
          { label: "Engine CC", key: "engineCC", options: engineCCOptions, disabled: !filters.variant },
        ].map((item) => (
          <FormControl key={item.key} size="small" sx={{ minWidth: 150 }} disabled={item.disabled}>
            <InputLabel>{item.label}</InputLabel>
            <Select
              value={filters[item.key]}
              label={item.label}
              onChange={(e) => handleFilterChange(item.key, e.target.value)}
              sx={{ borderRadius: "8px" }}
            >
              <option value="">{`All ${item.label}s`}</option>
              {item.options.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
      </Paper>

      {/* Table Section */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider", overflowX: "auto" }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: alpha("#2e83ff", 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Company Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Model Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Variant Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Engine CC</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flatRows.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage).map((row, index) => (
              <TableRow key={row.variantId} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                <TableCell>{currentPage * rowsPerPage + index + 1}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ p: 1, bgcolor: alpha("#2e83ff", 0.1), borderRadius: "8px", display: "flex" }}>
                      <BikeIcon sx={{ fontSize: 18, color: "primary.main" }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.companyName}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{row.modelName}</TableCell>
                <TableCell>
                  <Chip label={row.variantName} size="small" sx={{ bgcolor: "background.default", fontWeight: 500 }} />
                </TableCell>
                <TableCell>{row.engineCC} CC</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, row)}>
                    <MoreIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {flatRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography variant="body1" color="text.secondary">
                    No bikes found matching your criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={flatRows.length}
          rowsPerPage={rowsPerPage}
          page={currentPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: "1px solid", borderColor: "divider" }}
        />
      </TableContainer>

      {/* Hidden Table for Exporting */}
      <table ref={tableRef} id="bike-export-table" style={{ display: "none" }}>
        <thead>
          <tr>
            <th>Company</th>
            <th>Model</th>
            <th>Variant</th>
            <th>CC</th>
          </tr>
        </thead>
        <tbody>
          {flatRows.map((row) => (
            <tr key={row.variantId}>
              <td>{row.companyName}</td>
              <td>{row.modelName}</td>
              <td>{row.variantName}</td>
              <td>{row.engineCC}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 2,
          sx: { borderRadius: "10px", minWidth: 120 }
        }}
      >
        <MenuItem onClick={() => handleDelete("variant")} sx={{ color: "error.main", gap: 1.5 }}>
          <DeleteIcon fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Delete Variant</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleDelete("model")} sx={{ color: "error.main", gap: 1.5 }}>
          <DeleteIcon fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Delete Model</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleDelete("company")} sx={{ color: "error.main", gap: 1.5 }}>
          <DeleteIcon fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Delete Company</Typography>
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default BikeTable
