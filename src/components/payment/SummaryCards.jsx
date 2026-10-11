import React from "react";
import { Grid, Card, CardContent, Typography, Box, Stack } from "@mui/material";
import {
  TrendingUp,
  Pending,
  Error,
  AccountBalanceWallet,
} from "@mui/icons-material";

const MetricCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <Card
    sx={{
      height: "100%",
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      "&:hover": { boxShadow: "0 4px 8px rgba(0,0,0,0.05)" },
      transition: "box-shadow 0.2s ease-in-out",
    }}
  >
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: "12px",
            bgcolor: `${color}15`,
            color: color,
          }}
        >
          <Icon fontSize="medium" />
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const SummaryCards = ({ data = [], revenue = null }) => {
  const stats = React.useMemo(() => {
    const total = data.length;
    const success = data.filter((p) => p.order_status === "SUCCESS");
    const pending = data.filter((p) => p.order_status === "PENDING");

    const successRate = total > 0 ? ((success.length / total) * 100).toFixed(1) : 0;

    return {
      total,
      successCount: success.length,
      pendingCount: pending.length,
      successRate,
    };
  }, [data]);

  return (
    <Grid container spacing={3} mb={4}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Revenue"
          value={revenue != null ? `₹${Number(revenue).toLocaleString("en-IN")}` : "—"}
          icon={AccountBalanceWallet}
          color="#2563eb"
          subtitle="From finance summary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total Payments"
          value={stats.total}
          icon={TrendingUp}
          color="#6366f1"
          subtitle={`${stats.successRate}% Success Rate`}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Failed Payments"
          value={data.length - stats.successCount - stats.pendingCount}
          icon={Error}
          color="#ef4444"
          subtitle="Requires attention"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Pending"
          value={stats.pendingCount}
          icon={Pending}
          color="#f59e0b"
          subtitle="Waiting for completion"
        />
      </Grid>
    </Grid>
  );
};

export default SummaryCards;
