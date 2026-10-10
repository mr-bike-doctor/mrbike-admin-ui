import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  TablePagination,
  TextField,
  InputAdornment,
  TableSortLabel,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  MoreVert as MoreVertIcon,
  VerifiedUser as VerifiedIcon,
  FiberManualRecord as DotIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import DealerReviewWizardDialog from "./DealerReviewWizardDialog";
import { computeDealerProgress } from "../../utils/dealerProgressHelper";

const DealerVerficationTable = ({ datas, loading, onRefresh }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("createdAt");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredData = useMemo(() => {
    let result = datas || [];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.shopName?.toLowerCase().includes(term) ||
          item.ownerName?.toLowerCase().includes(term) ||
          item.email?.toLowerCase().includes(term) ||
          item.personalEmail?.toLowerCase().includes(term) ||
          item.shopEmail?.toLowerCase().includes(term) ||
          item.phone?.toLowerCase().includes(term) ||
          item.shopContact?.toLowerCase().includes(term) ||
          item._id?.toLowerCase().includes(term),
      );
    }

    return [...result].sort((a, b) => {
      let valueA = a[orderBy] || "";
      let valueB = b[orderBy] || "";

      if (orderBy === "createdAt" || orderBy === "updatedAt") {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }

      if (order === "asc") {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueB < valueA ? -1 : valueB > valueA ? 1 : 0;
      }
    });
  }, [datas, searchTerm, order, orderBy]);

  const currentData = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const headers = [
    { id: "id", label: "#", sortable: false },
    { id: "shopName", label: "Shop Details", sortable: true },
    { id: "ownerName", label: "Owner Info", sortable: true },
    { id: "progress", label: "Step Progress & Status", sortable: false },
    { id: "docs", label: "Documents Status", sortable: false },
    { id: "createdAt", label: "Requested On", sortable: true },
    { id: "actions", label: "Action", sortable: false },
  ];

  const handleActionClick = (event, dealer) => {
    setAnchorEl(event.currentTarget);
    setSelectedDealer(dealer);
  };

  const handleActionClose = () => {
    setAnchorEl(null);
  };

  const handleOpenReview = (dealerToReview) => {
    if (dealerToReview) setSelectedDealer(dealerToReview);
    setReviewDialogOpen(true);
    handleActionClose();
  };

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search by Shop, Owner, or Phone..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          sx={{ width: { xs: "100%", sm: 350 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer
        component={Paper}
        elevation={3}
        sx={{
          borderRadius: 2,
          overflowX: "auto",
        }}
      >
        <Table id="dealer-verify-table" sx={{ minWidth: 1200 }}>
          <TableHead sx={{ backgroundColor: "#2e83ff" }}>
            <TableRow>
              {headers.map((header) => (
                <TableCell
                  key={header.id}
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  {header.sortable ? (
                    <TableSortLabel
                      active={orderBy === header.id}
                      direction={orderBy === header.id ? order : "asc"}
                      onClick={() => handleRequestSort(header.id)}
                      sx={{
                        color: "white !important",
                        "&.MuiTableSortLabel-active": {
                          color: "white !important",
                        },
                        "& .MuiTableSortLabel-icon": {
                          color: "white !important",
                        },
                      }}
                    >
                      {header.label}
                    </TableSortLabel>
                  ) : (
                    header.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Loading Dealers...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 10 }}>
                  <Typography
                    variant="body1"
                    sx={{ fontStyle: "italic", color: "text.secondary" }}
                  >
                    No dealer verification requests found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((dealer, index) => {
                const progress = computeDealerProgress(dealer);

                return (
                  <TableRow key={dealer._id} hover>
                    <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: "bold",
                            cursor: "pointer",
                            "&:hover": { color: "#2563eb" },
                          }}
                          onClick={() => handleOpenReview(dealer)}
                        >
                          {dealer.shopName || "N/A"}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ fontStyle: "italic" }}
                        >
                          {dealer.fullAddress ||
                            dealer.permanentAddress?.address ||
                            dealer.presentAddress?.address ||
                            "No Address"}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {dealer.city ||
                            dealer.permanentAddress?.city ||
                            dealer.presentAddress?.city ||
                            "N/A"}
                          ,{" "}
                          {dealer.state ||
                            dealer.permanentAddress?.state ||
                            dealer.presentAddress?.state ||
                            "N/A"}
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Typography
                            variant="caption"
                            display="block"
                            color="primary"
                            sx={{ fontWeight: "bold" }}
                          >
                            {dealer.phone || "No Phone"}
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            {dealer.email || "No Email"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {dealer.ownerName || "N/A"}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {dealer.email || "N/A"}
                        </Typography>
                        {dealer.alternatePhone && (
                          <Typography
                            variant="caption"
                            color="primary"
                            display="block"
                            sx={{ fontWeight: "bold" }}
                          >
                            Alt: {dealer.alternatePhone}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* Step Progress & Pending Highlight */}
                    <TableCell sx={{ minWidth: 200 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                          <Chip
                            size="small"
                            label={`${progress.completedCount}/${progress.totalSteps} Steps`}
                            color={
                              progress.isApproved
                                ? "success"
                                : progress.hasActionRequired
                                ? "error"
                                : progress.canApprove
                                ? "success"
                                : "primary"
                            }
                            sx={{ fontWeight: 800, fontSize: "0.68rem", height: 20 }}
                          />
                          {progress.canApprove && (
                            <Chip
                              size="small"
                              label="Ready to Approve"
                              color="success"
                              sx={{ fontWeight: 800, fontSize: "0.65rem", height: 20 }}
                            />
                          )}
                        </Box>
                        {progress.firstPendingStep && !progress.isApproved && (
                          <Tooltip title={progress.firstPendingStep.blockingReason || progress.firstPendingStep.consequence}>
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`Pending: ${progress.firstPendingStep.shortTitle}`}
                              color={progress.firstPendingStep.status === "action_required" ? "error" : "warning"}
                              onClick={() => handleOpenReview(dealer)}
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.65rem",
                                height: 22,
                                cursor: "pointer",
                                maxWidth: 190,
                                "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", px: 0.75 },
                                "&:hover": { bgcolor: "#f1f5f9" },
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>

                    {/* Documents Status */}
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        {[
                          { key: "aadharFront", label: "Aadhar Front" },
                          { key: "aadharBack", label: "Aadhar Back" },
                          { key: "pan", label: "PAN" },
                          { key: "shop", label: "Shop" },
                          { key: "face", label: "Face" },
                          { key: "passbook", label: "Passbook" },
                        ].map((doc) => {
                          const status =
                            dealer.documentVerification?.[doc.key] || "none";
                          return (
                            <Box
                              key={doc.label}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                              }}
                            >
                              {status === "verified" ? (
                                <CheckCircleIcon
                                  sx={{
                                    fontSize: 13,
                                    color: "#22c55e",
                                    flexShrink: 0,
                                  }}
                                />
                              ) : status === "rejected" ? (
                                <CancelIcon
                                  sx={{
                                    fontSize: 13,
                                    color: "#ef4444",
                                    flexShrink: 0,
                                  }}
                                />
                              ) : status === "pending" ? (
                                <PendingIcon
                                  sx={{
                                    fontSize: 13,
                                    color: "#f59e0b",
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <DotIcon
                                  sx={{
                                    fontSize: 13,
                                    color: "#94a3b8",
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <Typography
                                variant="caption"
                                sx={{
                                  color:
                                    status === "verified"
                                      ? "#15803d"
                                      : status === "rejected"
                                        ? "#b91c1c"
                                        : status === "pending"
                                          ? "#92400e"
                                          : "#64748b",
                                  fontWeight: 600,
                                  lineHeight: 1,
                                }}
                              >
                                {doc.label}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                      {Object.entries(dealer.documentVerification || {}).filter(
                        ([_, v]) => v === "rejected",
                      ).length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#ef4444",
                              fontWeight: "bold",
                              display: "block",
                              fontSize: "0.65rem",
                              textTransform: "uppercase",
                            }}
                          >
                            Rejected:{" "}
                            {Object.entries(dealer.documentVerification)
                              .filter(([_, v]) => v === "rejected")
                              .map(([k, _]) => {
                                const labels = {
                                  aadharFront: "Aadhar Front",
                                  aadharBack: "Aadhar Back",
                                  pan: "PAN",
                                  shop: "Shop Cert",
                                  face: "Face/ID",
                                  passbook: "Passbook",
                                };
                                return labels[k] || k;
                              })
                              .join(", ")}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {new Date(dealer.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleActionClick(e, dealer)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionClose}
      >
        <MenuItem onClick={() => handleOpenReview(selectedDealer)}>
          <VisibilityIcon
            fontSize="small"
            sx={{ mr: 1, color: "primary.main" }}
          />{" "}
          Review Profile (Step-by-Step)
        </MenuItem>
      </Menu>

      {/* Step-by-Step Dealer Review & Approval Wizard */}
      <DealerReviewWizardDialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        dealer={selectedDealer}
        onRefresh={onRefresh}
        onApproved={() => {
          if (onRefresh) onRefresh();
          navigate("/dealers");
        }}
      />
    </Box>
  );
};

export default DealerVerficationTable;
