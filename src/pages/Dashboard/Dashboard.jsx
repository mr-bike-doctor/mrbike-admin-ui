import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Stack,
  Avatar,
  CircularProgress,
  Chip,
  Divider,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
} from "@mui/material";
import {
  ShoppingCart,
  Build,
  Redeem,
  People,
  Storefront,
  Refresh,
  Warning,
  CheckCircle,
  Cancel,
  LocalShipping,
  DirectionsBike,
  AttachMoney,
  EventNote,
  ArrowForwardIos,
  Block,
  HourglassEmpty,
  Percent,
  AccountBalanceWallet,
  PowerSettingsNew,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { AgCharts } from "ag-charts-react";
import { getAllBookings, getDealerList, getFinanceSummary, getAllPayouts, getDashboardCounts } from "../../api";
import { selectDealerRefreshVersion } from "../../redux/slices/dealerRefreshSlice";
import moment from "moment";

// ─── helpers ────────────────────────────────────────────────────────────────
const STATUS_META = {
  confirmed:          { label: "Confirmed",          color: "#2563eb", bg: "#eff6ff", icon: <CheckCircle fontSize="small" /> },
  pickedup:           { label: "Picked Up",          color: "#f59e0b", bg: "#fffbeb", icon: <LocalShipping fontSize="small" /> },
  arrived:            { label: "Arrived",            color: "#0ea5e9", bg: "#f0f9ff", icon: <EventNote fontSize="small" /> },
  awaiting_payment:   { label: "Awaiting Payment",   color: "#f59e0b", bg: "#fffbeb", icon: <AttachMoney fontSize="small" /> },
  payment_selected:   { label: "Payment Selected",   color: "#8b5cf6", bg: "#f5f3ff", icon: <AttachMoney fontSize="small" /> },
  ready_for_delivery: { label: "Ready for Delivery", color: "#0ea5e9", bg: "#f0f9ff", icon: <LocalShipping fontSize="small" /> },
  delivered:          { label: "Delivered",          color: "#10b981", bg: "#ecfdf5", icon: <DirectionsBike fontSize="small" /> },
  completed:          { label: "Completed",          color: "#10b981", bg: "#ecfdf5", icon: <CheckCircle fontSize="small" /> },
  "cash received":    { label: "Cash Received",      color: "#059669", bg: "#d1fae5", icon: <AttachMoney fontSize="small" /> },
  user_cancelled:     { label: "Cancelled",          color: "#ef4444", bg: "#fef2f2", icon: <Cancel fontSize="small" /> },
  cancelled:          { label: "Cancelled",          color: "#ef4444", bg: "#fef2f2", icon: <Cancel fontSize="small" /> },
  rejected:           { label: "Rejected",           color: "#ef4444", bg: "#fef2f2", icon: <Cancel fontSize="small" /> },
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <Typography
    variant="caption"
    sx={{
      display: "block",
      fontWeight: 700,
      color: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      fontSize: "0.62rem",
      mb: 1.5,
      mt: 0.5,
    }}
  >
    {children}
  </Typography>
);

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon, color, onClick }) => (
  <Card
    elevation={0}
    onClick={onClick}
    sx={{
      borderRadius: "14px",
      border: "1px solid #f1f5f9",
      bgcolor: "#ffffff",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      height: "100%",
      position: "relative",
      overflow: "hidden",
      "&:hover": onClick
        ? {
            transform: "translateY(-3px)",
            boxShadow: `0 12px 28px -8px ${color}35`,
            borderColor: `${color}50`,
          }
        : {},
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        background: color || "#e2e8f0",
        opacity: 0.8,
      },
    }}
  >
    <CardContent sx={{ p: 2.5, pt: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar
          sx={{
            bgcolor: `${color}12`,
            color: color || "primary.main",
            width: 44,
            height: 44,
            borderRadius: "11px",
            flexShrink: 0,
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontSize: "0.6rem",
              display: "block",
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: "#0f172a",
              mt: 0.3,
              fontSize: "1.4rem",
              lineHeight: 1.2,
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                mt: 0.4,
                display: "block",
                color: "#94a3b8",
                fontWeight: 500,
                fontSize: "0.68rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {onClick && (
          <ArrowForwardIos sx={{ fontSize: 11, color: "#cbd5e1", mt: 0.5, flexShrink: 0 }} />
        )}
      </Stack>
    </CardContent>
  </Card>
);

// ─── Status Pill ─────────────────────────────────────────────────────────────
const StatusPill = ({ statusKey, count, total }) => {
  const meta = STATUS_META[statusKey] || { label: statusKey, color: "#64748b", bg: "#f1f5f9" };
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 1.5,
        borderRadius: 2,
        bgcolor: meta.bg,
        mb: 1,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ color: meta.color, display: "flex" }}>{meta.icon}</Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: meta.color }}>
          {meta.label}
        </Typography>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="body2" sx={{ fontWeight: 800, color: meta.color }}>
          {count}
        </Typography>
        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
          ({pct}%)
        </Typography>
      </Stack>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ bookings: [], dealers: [] });
  const [dealerCounts, setDealerCounts] = useState(null); // { totalDealers, blockedDealers, inactiveDealers } from backend
  const [finance, setFinance] = useState(null); // null = loading, false = failed, object = loaded
  const dealerRefreshVersion = useSelector(selectDealerRefreshVersion);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Main data + finance data all in parallel
      const [bookingsRes, dealersRes, countsSettled, financeSettled] = await Promise.all([
        getAllBookings(),
        getDealerList(),
        Promise.allSettled([getDashboardCounts()]),
        Promise.allSettled([getFinanceSummary(), getAllPayouts("ALL")]),
      ]);

      setData({
        bookings: bookingsRes.data || [],
        dealers: dealersRes.data || [],
      });

      const [countsSettledResult] = countsSettled;
      setDealerCounts(
        countsSettledResult.status === "fulfilled"
          ? countsSettledResult.value?.data || null
          : null
      );

      // Process finance results (both optional — failures don't block the dashboard)
      const [summarySettled, payoutsSettled] = financeSettled;

      const rawSummary =
        summarySettled.status === "fulfilled"
          ? summarySettled.value?.data || summarySettled.value
          : null;

      const rawPayouts =
        payoutsSettled.status === "fulfilled"
          ? (() => {
              const v = payoutsSettled.value;
              if (Array.isArray(v?.data)) return v.data;
              if (Array.isArray(v?.payouts)) return v.payouts;
              if (Array.isArray(v?.withdrawals)) return v.withdrawals;
              return [];
            })()
          : [];

      if (rawSummary || rawPayouts.length > 0) {
        setFinance({
          totalRevenue: rawSummary?.totalBookingValue || 0,
          totalCommission: rawSummary?.totalCommissionEarned || 0,
          pendingSettlements: rawPayouts.filter((p) => p.order_status === "PENDING").length,
          totalWithdrawals: rawPayouts.filter((p) =>
            ["APPROVED", "COMPLETED"].includes(p.order_status)
          ).length,
          available: true,
        });
      } else {
        setFinance({ available: false });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setFinance({ available: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // dealerRefreshVersion bumps whenever a dealer is blocked/unblocked/activated/deactivated
    // elsewhere (list or detail page), so the stat cards below stay in sync without a reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealerRefreshVersion]);

  // ── dealer metrics ────────────────────────────────────────────────────────
  // total/blocked/inactive come straight from the dashboardCounts backend endpoint
  // (falls back to deriving from the dealer list if that call failed); pending isn't
  // returned by that endpoint so it's still derived from the dealer list.
  const dealerMetrics = useMemo(() => {
    const { dealers } = data;
    const pending = dealers.filter(
      (d) => (d.registrationStatus || "").toLowerCase() === "pending"
    ).length;

    if (dealerCounts) {
      const total = dealerCounts.totalDealers ?? dealers.length;
      const blocked = dealerCounts.blockedDealers ?? 0;
      const inactive = dealerCounts.inactiveDealers ?? 0;
      return {
        total,
        blocked,
        inactive,
        active: total - blocked - inactive,
        pending,
      };
    }

    return {
      total: dealers.length,
      active: dealers.filter((d) => d.isActive === true && !d.isBlocked).length,
      inactive: dealers.filter((d) => !d.isActive && !d.isBlocked).length,
      blocked: dealers.filter((d) => !!d.isBlocked).length,
      pending,
    };
  }, [data, dealerCounts]);

  // ── booking analytics ─────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const { bookings } = data;
    if (!bookings.length) return null;

    const today = moment().startOf("day");

    const labels = [];
    const monthlyBookings = {};
    const monthlyCancelled = {};
    for (let i = 5; i >= 0; i--) {
      const m = moment().subtract(i, "months").format("MMM");
      labels.push(m);
      monthlyBookings[m] = 0;
      monthlyCancelled[m] = 0;
    }

    let todayBookings = 0;
    const statusCounts = {};

    bookings.forEach((b) => {
      const month = moment(b.createdAt).format("MMM");
      const status = (b.status || "").toLowerCase();
      const isCancelled = status.includes("cancel") || status.includes("reject");

      if (monthlyBookings[month] !== undefined) {
        monthlyBookings[month]++;
        if (isCancelled) monthlyCancelled[month]++;
      }

      if (moment(b.createdAt).isSame(today, "day")) todayBookings++;

      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const sorted = [...bookings].sort(
      (a, b) => moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf()
    );
    const recentBookings = sorted.slice(0, 5);

    const completedCount =
      (statusCounts["completed"] || 0) +
      (statusCounts["cash received"] || 0) +
      (statusCounts["delivered"] || 0);
    const cancelledCount =
      (statusCounts["user_cancelled"] || 0) + (statusCounts["rejected"] || 0);
    const activeCount =
      (statusCounts["confirmed"] || 0) +
      (statusCounts["pickedup"] || 0) +
      (statusCounts["arrived"] || 0) +
      (statusCounts["awaiting_payment"] || 0) +
      (statusCounts["payment_selected"] || 0) +
      (statusCounts["ready_for_delivery"] || 0);

    return {
      todayBookings,
      totalBookings: bookings.length,
      completedCount,
      cancelledCount,
      activeCount,
      statusCounts,
      recentBookings,
      bookingTrend: labels.map((l) => ({
        month: l,
        bookings: monthlyBookings[l],
        cancelled: monthlyCancelled[l],
      })),
      cancelRate: bookings.length
        ? ((cancelledCount / bookings.length) * 100).toFixed(1)
        : 0,
    };
  }, [data]);

  // ── dealer alerts ─────────────────────────────────────────────────────────
  const highCancellationDealers = useMemo(() => {
    const { bookings, dealers } = data;
    if (!bookings.length || !dealers.length) return [];

    const stats = {};
    bookings.forEach((b) => {
      if (!b.dealer_id?._id) return;
      const id = b.dealer_id._id;
      if (!stats[id]) stats[id] = { total: 0, cancelled: 0 };
      stats[id].total++;
      if ((b.status || "").toLowerCase().includes("cancel")) stats[id].cancelled++;
    });

    return Object.keys(stats)
      .map((id) => {
        const dealer = dealers.find((d) => d._id === id);
        const s = stats[id];
        return {
          name: dealer?.shopName || "Unknown Shop",
          rate: ((s.cancelled / s.total) * 100).toFixed(1),
          total: s.total,
          cancelled: s.cancelled,
        };
      })
      .filter((d) => d.rate > 15 && d.total > 5)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
  }, [data]);

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
          gap: 2,
        }}
      >
        <CircularProgress size={48} thickness={3} />
        <Typography variant="body2" color="text.secondary">
          Loading dashboard…
        </Typography>
      </Box>
    );
  }

  const today = moment().format("dddd, D MMMM YYYY");
  const statusOrder = [
    "confirmed", "pickedup", "arrived", "awaiting_payment", "payment_selected",
    "ready_for_delivery", "delivered", "completed", "cash received",
    "user_cancelled", "cancelled", "rejected",
  ];

  // Revenue always comes from the finance summary API (a stored aggregate of
  // Booking pricing snapshots) — Admin never sums booking amounts itself.
  const displayRevenue = finance?.available ? finance.totalRevenue : null;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* ── Header ── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}
          >
            Hi, Admin 👋
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "#64748b", fontWeight: 500, mt: 0.5 }}
          >
            {today} — Here's what's happening today.
          </Typography>
        </Box>
        <Tooltip title="Refresh Dashboard">
          <IconButton
            onClick={fetchData}
            sx={{
              bgcolor: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              border: "1px solid #f1f5f9",
              "&:hover": { bgcolor: "#f8fafc" },
            }}
          >
            <Refresh sx={{ fontSize: 20, color: "#64748b" }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── Section 1: Dealer Overview ── */}
      <SectionLabel>Dealer Overview</SectionLabel>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          mb: 3.5,
        }}
      >
        {[
          {
            title: "Total Dealers",
            value: dealerMetrics.total,
            subtitle: "All registered dealers",
            icon: <Storefront fontSize="small" />,
            color: "#6366f1",
            route: "/dealers",
          },
          {
            title: "Active Dealers",
            value: dealerMetrics.active,
            subtitle: "Currently active",
            icon: <CheckCircle fontSize="small" />,
            color: "#10b981",
            route: "/dealers",
          },
          {
            title: "Inactive Dealers",
            value: dealerMetrics.inactive,
            subtitle: "Not currently active",
            icon: <PowerSettingsNew fontSize="small" />,
            color: "#94a3b8",
            route: "/dealers",
          },
          {
            title: "Blocked Dealers",
            value: dealerMetrics.blocked,
            subtitle: "Access restricted",
            icon: <Block fontSize="small" />,
            color: "#ef4444",
            route: "/dealers",
          },
          {
            title: "Pending Verification",
            value: dealerMetrics.pending,
            subtitle: "Awaiting approval",
            icon: <HourglassEmpty fontSize="small" />,
            color: "#f59e0b",
            route: "/dealers-verify",
          },
        ].map((card, i) => (
          <Box key={i} sx={{ flex: "1 1 170px", minWidth: 0 }}>
            <StatCard
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              color={card.color}
              onClick={() => navigate(card.route)}
            />
          </Box>
        ))}
      </Box>

      {/* ── Section 2: Booking Metrics ── */}
      <SectionLabel>Booking Metrics</SectionLabel>
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Bookings"
            value={analytics?.totalBookings ?? 0}
            subtitle="All time service requests"
            icon={<ShoppingCart fontSize="small" />}
            color="#6366f1"
            onClick={() => navigate("/booking")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Bookings"
            value={analytics?.activeCount ?? 0}
            subtitle="Confirmed · In progress · Payment flow"
            icon={<Build fontSize="small" />}
            color="#f59e0b"
            onClick={() => navigate("/booking")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed Bookings"
            value={analytics?.completedCount ?? 0}
            subtitle="Successfully delivered"
            icon={<CheckCircle fontSize="small" />}
            color="#10b981"
            onClick={() => navigate("/booking")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cancelled Bookings"
            value={analytics?.cancelledCount ?? 0}
            subtitle={`${analytics?.cancelRate ?? 0}% of all bookings`}
            icon={<Cancel fontSize="small" />}
            color="#ef4444"
            onClick={() => navigate("/booking")}
          />
        </Grid>
      </Grid>

      {/* ── Section 3: Financial Metrics ── */}
      <SectionLabel>Financial Metrics</SectionLabel>
      {finance?.available === false && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "#f59e0b",
            fontWeight: 600,
            mb: 1.5,
            fontSize: "0.72rem",
          }}
        >
          ⚠ Revenue, commission & settlement data unavailable (finance API unreachable).
        </Typography>
      )}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={finance?.available ? fmt(displayRevenue) : "—"}
            subtitle="From finance summary"
            icon={<AttachMoney fontSize="small" />}
            color="#10b981"
            onClick={finance?.available ? () => navigate("/finance") : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Commission"
            value={finance?.available ? fmt(finance.totalCommission) : "—"}
            subtitle="Platform commission earned"
            icon={<Percent fontSize="small" />}
            color="#2563eb"
            onClick={finance?.available ? () => navigate("/finance") : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Settlements"
            value={finance?.available ? finance.pendingSettlements : "—"}
            subtitle="Withdrawal requests awaiting review"
            icon={<HourglassEmpty fontSize="small" />}
            color="#f59e0b"
            onClick={finance?.available ? () => navigate("/finance/withdrawals") : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Withdrawals"
            value={finance?.available ? finance.totalWithdrawals : "—"}
            subtitle="Approved payout requests"
            icon={<AccountBalanceWallet fontSize="small" />}
            color="#8b5cf6"
            onClick={finance?.available ? () => navigate("/finance/withdrawals") : undefined}
          />
        </Grid>
      </Grid>

      {/* ── Row: Chart + Status Breakdown + Quick Actions ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Trend Chart */}
        <Grid item xs={12} lg={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid #e8ecf0",
              height: "100%",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#0f172a" }}
                >
                  📊 Monthly Bookings
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  How many bikes came in each month vs cancellations
                </Typography>
              </Box>
            </Stack>
            <AgCharts
              options={{
                height: 260,
                data: analytics?.bookingTrend,
                series: [
                  {
                    type: "bar",
                    xKey: "month",
                    yKey: "bookings",
                    yName: "Total Bookings",
                    fill: "#6366f1",
                    cornerRadiusBbox: { topLeft: 4, topRight: 4 },
                  },
                  {
                    type: "line",
                    xKey: "month",
                    yKey: "cancelled",
                    yName: "Cancellations",
                    stroke: "#ef4444",
                    marker: { fill: "#ef4444", size: 6 },
                  },
                ],
                axes: [
                  { type: "category", position: "bottom" },
                  {
                    type: "number",
                    position: "left",
                    label: { formatter: (p) => `${p.value}` },
                  },
                ],
                legend: { position: "bottom" },
                background: { fill: "transparent" },
              }}
            />
          </Paper>
        </Grid>

        {/* Status Breakdown */}
        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid #e8ecf0",
              height: "100%",
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "#0f172a", mb: 0.5 }}
            >
              📋 Booking Status
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              What's the status of all bookings?
            </Typography>
            {statusOrder.map((key) =>
              analytics?.statusCounts?.[key] ? (
                <StatusPill
                  key={key}
                  statusKey={key}
                  count={analytics.statusCounts[key]}
                  total={analytics.totalBookings}
                />
              ) : null
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} sm={6} lg={2}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid #e8ecf0",
              height: "100%",
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "#0f172a", mb: 0.5 }}
            >
              ⚡ Quick Actions
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              Jump to important sections
            </Typography>
            <Stack spacing={1}>
              {[
                {
                  label: "View All Bookings",
                  icon: <ShoppingCart fontSize="small" />,
                  route: "/booking",
                  color: "#6366f1",
                },
                {
                  label: "Approve Dealers",
                  icon: <Storefront fontSize="small" />,
                  route: "/dealers-verify",
                  color: "#f59e0b",
                },
                {
                  label: "Manage Services",
                  icon: <Build fontSize="small" />,
                  route: "/dealers",
                  color: "#10b981",
                },
                {
                  label: "View Customers",
                  icon: <People fontSize="small" />,
                  route: "/customers",
                  color: "#8b5cf6",
                },
                {
                  label: "Check Offers",
                  icon: <Redeem fontSize="small" />,
                  route: "/offers",
                  color: "#ec4899",
                },
              ].map((a, i) => (
                <Box
                  key={i}
                  onClick={() => navigate(a.route)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    cursor: "pointer",
                    border: "1px solid #e8ecf0",
                    transition: "all 0.15s",
                    "&:hover": {
                      bgcolor: `${a.color}10`,
                      borderColor: a.color,
                    },
                  }}
                >
                  <Box sx={{ color: a.color, display: "flex" }}>{a.icon}</Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: "#334155", flex: 1 }}
                  >
                    {a.label}
                  </Typography>
                  <ArrowForwardIos sx={{ fontSize: 10, color: "#94a3b8" }} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Row: Recent Bookings + Dealer Alerts ── */}
      <Grid container spacing={2.5}>
        {/* Recent Bookings */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: 3, border: "1px solid #e8ecf0" }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#0f172a" }}
                >
                  🕐 Recent Bookings
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  The 5 most recently placed bookings
                </Typography>
              </Box>
              <Chip
                label="See All"
                size="small"
                onClick={() => navigate("/booking")}
                sx={{ cursor: "pointer", fontWeight: 600 }}
              />
            </Stack>
            <List disablePadding>
              {analytics?.recentBookings?.map((b, i) => {
                const status = (b.status || "").toLowerCase();
                const meta = STATUS_META[status] || {
                  label: status,
                  color: "#64748b",
                  bg: "#f1f5f9",
                };
                const dealer =
                  b.dealer_id?.shopName || b.dealer_id?.name || "Unknown Dealer";
                const ago = moment(b.createdAt).fromNow();
                return (
                  <React.Fragment key={b._id}>
                    <ListItem sx={{ px: 0, py: 1.5 }}>
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: meta.bg,
                            color: meta.color,
                            width: 40,
                            height: 40,
                          }}
                        >
                          <DirectionsBike fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: "#0f172a" }}
                            >
                              Booking #{b.id || i + 1}
                            </Typography>
                            <Chip
                              label={meta.label}
                              size="small"
                              sx={{
                                bgcolor: meta.bg,
                                color: meta.color,
                                fontWeight: 700,
                                fontSize: "0.68rem",
                                height: 20,
                              }}
                            />
                          </Stack>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {dealer} · {ago}
                          </Typography>
                        }
                      />
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: "#0f172a" }}
                      >
                        {fmt(b.totalBill)}
                      </Typography>
                    </ListItem>
                    {i < analytics.recentBookings.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>
        </Grid>

        {/* Dealer Alerts */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid #fecaca",
              bgcolor: "#fff8f8",
              height: "100%",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Warning sx={{ color: "#ef4444" }} />
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#7f1d1d" }}
                >
                  ⚠️ Dealer Alerts
                </Typography>
                <Typography variant="caption" sx={{ color: "#b91c1c" }}>
                  Dealers with too many cancellations
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ mb: 2, borderColor: "#fecaca" }} />
            {highCancellationDealers.length > 0 ? (
              <Stack spacing={2}>
                {highCancellationDealers.map((d, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid #fca5a5",
                      bgcolor: "white",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: "#0f172a" }}
                      >
                        {d.name}
                      </Typography>
                      <Chip
                        label={`${d.rate}% cancelled`}
                        size="small"
                        sx={{
                          bgcolor: "#fef2f2",
                          color: "#ef4444",
                          fontWeight: 700,
                        }}
                      />
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mb: 1 }}
                    >
                      Out of {d.total} bookings, {d.cancelled} were cancelled
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={parseFloat(d.rate)}
                      sx={{
                        borderRadius: 2,
                        bgcolor: "#fecaca",
                        "& .MuiLinearProgress-bar": { bgcolor: "#ef4444" },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CheckCircle sx={{ color: "#10b981", fontSize: 40, mb: 1 }} />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "#065f46" }}
                >
                  All dealers are performing well! 🎉
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  No high cancellation rates detected.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
