import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Breadcrumbs,
  Link,
  Grid,
  LinearProgress,
  Card,
  CardContent,
  Tabs,
  Tab,
  Stack,
  Alert,
} from "@mui/material";
import {
  FileDownload as DownloadIcon,
  Description as PdfIcon,
  TableChart as ExcelIcon,
  Home as HomeIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import BookingTable from "../../components/Booking/BookingTable";
import { getAllBookings } from "../../api";
import moment from "moment";

const Bookings = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");

  const triggerDownloadExcel = useRef(null);
  const triggerDownloadPDF = useRef(null);

  // Hoisted out of the mount effect so the table can re-run it after a change
  // that alters a booking's pricing (e.g. a towing charge added from the
  // booking details dialog).
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllBookings();
      if (response.status === 200) {
        setData(response.data);
        setFilteredData(response.data);
      } else {
        setError("Failed to fetch bookings.");
      }
    } catch (error) {
      console.error("Error fetching booking list:", error);
      setError("An error occurred while fetching bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ✅ Filter Logic
  useEffect(() => {
    let filtered = data;

    // First apply status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter((b) => {
        const s = b.status?.toLowerCase() || "";
        if (statusFilter === "Cancelled")
          return s.includes("cancel") || s.includes("reject");
        if (statusFilter === "Confirmed")
          return s === "confirmed" || s === "pickedup" || s === "arrived";
        if (statusFilter === "Pending")
          return s === "pending" || s === "waiting";
        if (statusFilter === "Completed")
          return s === "completed" || s === "cash received";
        if (statusFilter === "Awaiting Payment")
          return s === "awaiting_payment";
        if (statusFilter === "Payment Selected")
          return s === "payment_selected";
        if (statusFilter === "Ready For Delivery")
          return s === "ready_for_delivery";
        if (statusFilter === "Delivered")
          return s === "delivered";
        if (statusFilter === "Today") {
          const today = moment().startOf("day");
          const bookingDate = moment(b.createdAt);
          return bookingDate.isSame(today, "day");
        }
        return s === statusFilter.toLowerCase();
      });
    }

    setFilteredData(filtered);
  }, [statusFilter, data]);

  // ✅ Calculate Stats
  const stats = useMemo(() => {
    const total = data.length;
    const confirmed = data.filter((b) => {
      const s = b.status?.toLowerCase() || "";
      return ["confirmed", "completed", "cash received", "pickedup", "arrived", "awaiting_payment", "payment_selected", "ready_for_delivery", "delivered"].includes(s);
    }).length;
    const pending = data.filter((b) => {
      const s = b.status?.toLowerCase() || "";
      return ["pending", "waiting"].includes(s);
    }).length;
    const cancelled = data.filter((b) => {
      const s = b.status?.toLowerCase() || "";
      return s.includes("cancel") || s === "rejected";
    }).length;
    // Sum of each booking's own pricing snapshot — never a guessed/derived price.
    const revenue = data.reduce(
      (acc, curr) => acc + (curr.customerTotal ?? curr.totalBill ?? 0),
      0,
    );

    return [
      {
        label: "Total Bookings",
        value: total,
        color: "#6366f1",
        icon: <DownloadIcon />,
        targetStatus: "All",
      },
      {
        label: "Confirmed/Active",
        value: confirmed,
        color: "#10b981",
        icon: <CheckCircleIcon />,
        targetStatus: "Confirmed",
      },
      {
        label: "Pending",
        value: pending,
        color: "#f59e0b",
        icon: <PendingIcon />,
        targetStatus: "Pending",
      },
      {
        label: "Cancelled",
        value: cancelled,
        color: "#ef4444",
        icon: <CancelIcon />,
        targetStatus: "Cancelled",
      },
      {
        label: "Revenue",
        value: revenue,
        color: "#8b5cf6",
        icon: <PdfIcon />,
        isRevenue: true,
      },
    ];
  }, [data]);

  const statuses = [
    "All",
    "Today",
    "Pending",
    "Confirmed",
    "Completed",
    "Cancelled",
    "Awaiting Payment",
    "Payment Selected",
    "Ready For Delivery",
    "Delivered",
  ];

  const handleStatusChange = (event, newValue) => {
    setStatusFilter(newValue);
  };

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <Box sx={{ minHeight: "100vh", pb: 5 }}>
          {/* Page Header */}
          <Box sx={{ mb: 4 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
              <Link
                underline="hover"
                color="inherit"
                href="/"
                sx={{ display: "flex", alignItems: "center" }}
              >
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Dashboard
              </Link>
              <Typography color="text.primary">Bookings</Typography>
            </Breadcrumbs>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 2,
                mt: 2,
              }}
            >
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: "bold",
                    color: "primary.main",
                    fontSize: { xs: "1.75rem", sm: "2.125rem" },
                  }}
                >
                  Bookings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage and monitor all customer service bookings.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  width: { xs: "100%", sm: "auto" },
                  justifyContent: { xs: "flex-start", sm: "flex-end" },
                }}
              >
                <Button
                  variant="outlined"
                  startIcon={<ExcelIcon />}
                  onClick={() => triggerDownloadExcel.current?.()}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    flex: { xs: 1, sm: "none" },
                    px: 3,
                  }}
                >
                  Excel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PdfIcon />}
                  onClick={() => triggerDownloadPDF.current?.()}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    flex: { xs: 1, sm: "none" },
                    px: 3,
                  }}
                >
                  PDF
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Stats Overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {stats.map((stat, index) => {
              const goal = 50000;
              const progress = stat.isRevenue
                ? Math.min((stat.value / goal) * 100, 100)
                : 0;

              return (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={stat.isRevenue ? 6 : 3}
                  key={index}
                  lg={stat.isRevenue ? 4 : 2.4}
                >
                  <Card
                    elevation={0}
                    onClick={() =>
                      stat.targetStatus && setStatusFilter(stat.targetStatus)
                    }
                    sx={{
                      borderRadius: 4,
                      border: "1px solid #e2e8f0",
                      height: "100%",
                      transition: "all 0.2s",
                      cursor: stat.targetStatus ? "pointer" : "default",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: stat.targetStatus
                          ? "0 4px 20px -4px rgba(0,0,0,0.1)"
                          : "none",
                        borderColor: stat.targetStatus
                          ? stat.color
                          : "#e2e8f0",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        sx={{ mb: 2 }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: `${stat.color}15`,
                            color: stat.color,
                          }}
                        >
                          {stat.icon}
                        </Box>
                        {stat.isRevenue && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor: "success.light",
                              color: "success.dark",
                            }}
                          >
                            KPI
                          </Typography>
                        )}
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        variant="h4"
                        sx={{ fontWeight: 800, mt: 0.5, color: "neutral.800" }}
                      >
                        {stat.isRevenue
                          ? `₹${stat.value.toLocaleString()}`
                          : stat.value}
                      </Typography>

                      {stat.isRevenue && (
                        <Box sx={{ mt: 2 }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            sx={{ mb: 0.5 }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600 }}
                            >
                              Goal: ₹50,000
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, color: "primary.main" }}
                            >
                              {Math.round(progress)}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: "#f1f5f9",
                              "& .MuiLinearProgress-bar": {
                                borderRadius: 3,
                                bgcolor: stat.color,
                              },
                            }}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Status Filters */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={statusFilter}
              onChange={handleStatusChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  minWidth: 100,
                  py: 1.5,
                },
              }}
            >
              {statuses.map((status) => (
                <Tab key={status} label={status} value={status} />
              ))}
            </Tabs>
          </Box>

          {/* Main Table Section */}
          <Paper
            elevation={0}
            sx={{ p: 0, borderRadius: 2, bgcolor: "transparent" }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <BookingTable
              datas={filteredData}
              loading={loading}
              error={error}
              onRefresh={fetchBookings}
              triggerDownloadExcel={triggerDownloadExcel}
              triggerDownloadPDF={triggerDownloadPDF}
            />
          </Paper>
        </Box>
      </div>
    </div>
  );
};

export default Bookings;
