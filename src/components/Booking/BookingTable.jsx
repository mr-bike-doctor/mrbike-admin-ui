import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDownloadExcel } from "react-export-table-to-excel";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  TablePagination,
  TableSortLabel,
  Stack,
} from "@mui/material";
import {
  TwoWheeler as TwoWheelerIcon,
  Storefront as StorefrontIcon,
} from "@mui/icons-material";
import BookingDetailsDialog from "./BookingDetailsDialog";
import {
  formatDate,
  getBookingAmount,
  getStatusConfig,
} from "./bookingHelpers";

const BookingTable = ({
  triggerDownloadExcel,
  triggerDownloadPDF,
  datas,
  loading,
  error,
  onRefresh,
}) => {
  const tableRef = useRef(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("pickupDate");

  // `datas` is replaced wholesale on every refresh, so an open details dialog
  // would otherwise keep rendering the pre-refresh row object.
  useEffect(() => {
    setSelectedBooking((current) => {
      if (!current) return current;
      return datas?.find((b) => b._id === current._id) ?? current;
    });
  }, [datas]);

  // ✅ Relative Date Formatter (Today, Yesterday, etc.)
  const formatRelativeDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime =
      now.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays === -1) return "Tomorrow";
    if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

    return formatDate(dateString);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredData = useMemo(() => {
    let result = datas;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          (item.user_id?.first_name + " " + item.user_id?.last_name || "")
            .toLowerCase()
            .includes(term) ||
          item.bookingId?.toLowerCase().includes(term) ||
          item.dealer_id?.shopName?.toLowerCase().includes(term) ||
          item.user_id?.customerId?.toLowerCase().includes(term) || // ✅ Added Search by Customer ID
          item.dealer_id?.dealerId?.toLowerCase().includes(term) || // ✅ Added Search by Dealer ID
          item.bike?.company_name?.toLowerCase().includes(term) || // ✅ Added Search by Bike Brand
          item.bike?.model_name?.toLowerCase().includes(term) || // ✅ Added Search by Bike Model
          item.bike?.variant_name?.toLowerCase().includes(term) || // ✅ Added Search by Bike Variant
          item.services?.[0]?.base_service_id?.name
            ?.toLowerCase()
            .includes(term), // ✅ Added Search by Service Name
      );
    }

    // ✅ Robust Sorting Logic (Non-mutative)
    return [...result].sort((a, b) => {
      let valueA, valueB;

      if (orderBy === "customer") {
        valueA = (a.user_id?.first_name || "").toLowerCase();
        valueB = (b.user_id?.first_name || "").toLowerCase();
      } else if (orderBy === "amount") {
        valueA = getBookingAmount(a);
        valueB = getBookingAmount(b);
      } else if (orderBy === "pickupDate") {
        valueA = new Date(a.pickupDate || 0).getTime();
        valueB = new Date(b.pickupDate || 0).getTime();
      } else {
        valueA = String(a[orderBy] || "").toLowerCase();
        valueB = String(b[orderBy] || "").toLowerCase();
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

  // ✅ Excel & PDF Export
  const { onDownload } = useDownloadExcel({
    currentTableRef: tableRef.current,
    filename: "Booking_List",
    sheet: "Bookings",
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Booking List", 14, 10);
    doc.autoTable({ html: "#booking-table-mui", startY: 20, theme: "striped" });
    doc.save("Bookings.pdf");
  };

  if (triggerDownloadExcel) triggerDownloadExcel.current = onDownload;
  if (triggerDownloadPDF) triggerDownloadPDF.current = exportToPDF;

  const headers = [
    { id: "id", label: "#", sortable: false },
    { id: "bookingId", label: "Booking ID", sortable: true },
    { id: "customer", label: "Customer", sortable: true },
    { id: "dealer", label: "Dealer", sortable: false },
    { id: "bike", label: "Bike", sortable: false },
    { id: "service", label: "Services", sortable: false },
    { id: "mode", label: "Mode", sortable: false },
    { id: "amount", label: "Amount", sortable: true },
    { id: "pickupDate", label: "Date", sortable: true },
    { id: "status", label: "Status", sortable: true },
  ];

  return (
    <Box sx={{ width: "100%", mt: 2 }}>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "var(--shadow-card)",
          overflowX: "auto",
          "&::-webkit-scrollbar": { height: "8px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#cbd5e1",
            borderRadius: "10px",
          },
        }}
      >
        <Table id="booking-table-mui" ref={tableRef} sx={{ minWidth: 1200 }}>
          <TableHead sx={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              {headers.map((header) => (
                <TableCell
                  key={header.id}
                  sx={{
                    color: "neutral.600",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    py: 2,
                    borderBottom: "1px solid #e2e8f0",
                  }}
                  sortDirection={orderBy === header.id ? order : false}
                >
                  {header.sortable ? (
                    <TableSortLabel
                      active={orderBy === header.id}
                      direction={orderBy === header.id ? order : "asc"}
                      onClick={() => handleRequestSort(header.id)}
                      sx={{
                        "&.MuiTableSortLabel-active": { color: "primary.main" },
                        "& .MuiTableSortLabel-icon": {
                          color: "primary.main !important",
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
                <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                  <Typography variant="body1">Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                  <Typography variant="body1" color="error">
                    {error}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                  <Typography variant="body1" sx={{ fontStyle: "italic" }}>
                    No bookings found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((booking, index) => {
                const amount = getBookingAmount(booking);
                const services = booking.services || [];
                const firstService =
                  services[0]?.base_service_id?.name ||
                  services[0]?.description ||
                  services[0]?.serviceId ||
                  "N/A";
                const displayServices =
                  services.length > 1
                    ? `${firstService.substring(0, 15)}... +${services.length - 1}`
                    : firstService.substring(0, 20);

                return (
                  <TableRow
                    key={booking._id}
                    hover
                    onClick={() => setSelectedBooking(booking)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "neutral.50" },
                      transition: "background-color 0.2s",
                    }}
                  >
                    <TableCell
                      sx={{ color: "neutral.500", fontSize: "0.875rem" }}
                    >
                      {page * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        color: "text.primary",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {booking.bookingId || "N/A"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Box>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => setSelectedUser(booking.user_id)}
                          sx={{
                            textTransform: "none",
                            fontWeight: "bold",
                            p: 0,
                            justifyContent: "flex-start",
                          }}
                        >
                          {booking.user_id?.first_name}{" "}
                          {booking.user_id?.last_name}
                        </Button>
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                        >
                          {booking.user_id?.customerId || "ID: N/A"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Box>
                        <Button
                          variant="text"
                          size="small"
                          color="info"
                          onClick={() => setSelectedDealer(booking.dealer_id)}
                          sx={{
                            textTransform: "none",
                            fontWeight: "bold",
                            p: 0,
                            justifyContent: "flex-start",
                          }}
                        >
                          {booking.dealer_id?.shopName || (
                            <Typography
                              variant="caption"
                              sx={{
                                color: "text.disabled",
                                fontStyle: "italic",
                              }}
                            >
                              Unassigned
                            </Typography>
                          )}
                        </Button>
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                        >
                          {booking.dealer_id?.dealerId || ""}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Stack spacing={0}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: "bold" }}
                        >
                          {[booking.bike?.company_name, booking.bike?.model_name]
                            .filter(Boolean)
                            .join(" ") || (
                            <Typography
                              variant="caption"
                              sx={{
                                color: "text.disabled",
                                fontStyle: "italic",
                              }}
                            >
                              Unassigned
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {[
                            booking.bike?.engine_cc &&
                              `${booking.bike.engine_cc} CC`,
                            booking.bike?.variant_name,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Chip
                        label={displayServices}
                        size="small"
                        variant="soft"
                        color="secondary"
                        sx={{ fontSize: "0.7rem", height: 20 }}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        {booking.pickupAndDropId ? (
                          <TwoWheelerIcon fontSize="small" color="primary" />
                        ) : (
                          <StorefrontIcon fontSize="small" color="info" />
                        )}
                        <Typography variant="body2">
                          {booking.pickupAndDropId ? "Pickup" : "Visit"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        color: "#2e7d32",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ₹{amount.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight:
                            formatRelativeDate(booking.pickupDate) === "Today"
                              ? "bold"
                              : "normal",
                          color:
                            formatRelativeDate(booking.pickupDate) === "Today"
                              ? "primary.main"
                              : "text.primary",
                        }}
                      >
                        {formatRelativeDate(booking.pickupDate)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {(() => {
                        const displayStatus =
                          booking.vehicleLifecycleStatus ||
                          booking.status ||
                          "N/A";
                        const { color, icon } = getStatusConfig(displayStatus);
                        return (
                          <Chip
                            label={displayStatus.replace(/_/g, " ")}
                            color={color}
                            icon={icon}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              textTransform: "capitalize",
                              borderRadius: "8px",
                              fontSize: "0.75rem",
                            }}
                          />
                        );
                      })()}
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

      {/* ✅ User Details Dialog */}
      <Dialog
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}
      >
        <DialogTitle sx={{ bgcolor: "primary.main", color: "white", mb: 2 }}>
          Customer Dashboard
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                pt: 2,
              }}
            >
              <Avatar
                src={selectedUser.image}
                sx={{
                  width: 100,
                  height: 100,
                  mb: 1,
                  border: "4px solid #f8f9fa",
                }}
              >
                {selectedUser.first_name?.[0]}
              </Avatar>
              <Box sx={{ width: "100%" }}>
                <Typography
                  variant="h6"
                  align="center"
                  sx={{ fontWeight: "bold" }}
                >
                  {selectedUser.first_name} {selectedUser.last_name}
                </Typography>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  align="center"
                  gutterBottom
                >
                  {selectedUser.customerId || "No ID"} •{" "}
                  {selectedUser.reward_points || 0} Reward Points
                </Typography>

                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "#fcfcfc", borderRadius: 2, mt: 2 }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: "bold",
                      color: "primary.main",
                      mb: 1,
                      display: "block",
                    }}
                  >
                    CONTACT & LOCATION
                  </Typography>
                  {[
                    { label: "Email", value: selectedUser.email },
                    { label: "Phone", value: selectedUser.phone },
                    { label: "Address", value: selectedUser.address },
                    {
                      label: "City/State",
                      value: `${selectedUser.city || "N/A"}, ${selectedUser.state || "N/A"}`,
                    },
                    { label: "Pincode", value: selectedUser.pincode },
                  ].map((row) => (
                    <Box key={row.label} sx={{ display: "flex", mb: 1.5 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "bold", width: 100 }}
                      >
                        {row.label}:
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {row.value || "N/A"}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedUser(null)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Dealer Details Dialog */}
      <Dialog
        open={Boolean(selectedDealer)}
        onClose={() => setSelectedDealer(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { maxHeight: "90vh", m: { xs: 1, sm: 2 } } }}
      >
        <DialogTitle sx={{ bgcolor: "info.main", color: "white", mb: 2 }}>
          Dealer Business Profile
        </DialogTitle>
        <DialogContent>
          {selectedDealer && (
            <Box sx={{ pt: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold" }}
                align="center"
              >
                {selectedDealer.shopName || "N/A"}
              </Typography>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                align="center"
                gutterBottom
              >
                {selectedDealer.dealerId || "No ID"} •{" "}
                {selectedDealer.registrationStatus || "Unknown"} Status
              </Typography>

              <Paper
                variant="outlined"
                sx={{ p: 2, mt: 3, bgcolor: "#fcfcfc", borderRadius: 2 }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: "bold",
                    color: "info.main",
                    mb: 1,
                    display: "block",
                  }}
                >
                  BUSINESS DETAILS
                </Typography>
                {[
                  { label: "Owner", value: selectedDealer.ownerName },
                  {
                    label: "Phone",
                    value: selectedDealer.shopContact || selectedDealer.phone,
                  },
                  {
                    label: "Support Email",
                    value:
                      selectedDealer.shopEmail || selectedDealer.personalEmail,
                  },
                  { label: "Full Address", value: selectedDealer.fullAddress },
                  {
                    label: "City",
                    value:
                      selectedDealer.city ||
                      selectedDealer.permanentAddress?.city,
                  },
                  {
                    label: "Registration",
                    value: selectedDealer.registrationStatus,
                  },
                ].map((row) => (
                  <Box key={row.label} sx={{ display: "flex", mb: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: "bold", width: 110 }}
                    >
                      {row.label}:
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {row.value || "N/A"}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedDealer(null)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <BookingDetailsDialog
        open={Boolean(selectedBooking)}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onRefresh={onRefresh}
      />
    </Box>
  );
};

export default BookingTable;
