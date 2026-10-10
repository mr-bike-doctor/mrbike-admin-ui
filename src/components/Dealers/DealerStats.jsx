import React from "react";
import { Box, Card, CardContent, Typography, Grid } from "@mui/material";
import {
  Storefront as RetailIcon,
  CheckCircle as ActiveIcon,
  PersonAddAlt1 as NewIcon,
  PendingActions as PendingIcon,
} from "@mui/icons-material";

const StatCard = ({ title, value, icon, color, bgColor }) => (
  <Card sx={{ 
    height: "100%", 
    borderRadius: 3, 
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)",
    border: "1px solid #edf2f7"
  }}>
    <CardContent sx={{ display: "flex", alignItems: "center", p: 3 }}>
      <Box sx={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        width: 56, 
        height: 56, 
        borderRadius: 2.5, 
        backgroundColor: bgColor, 
        color: color,
        mr: 2.5
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#718096", mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#1a202c" }}>
          {value}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

// Counts come straight from GET /dealer/admin/dealers — no client-side tallying.
const DealerStats = ({ counts = {} }) => {
  const total = counts.all ?? 0;
  const active = counts.active ?? 0;
  const newSignups = counts.new ?? 0;
  const waitingReview = (counts.waiting_review ?? 0) + (counts.reverification ?? 0);

  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Dealers"
            value={total}
            icon={<RetailIcon />}
            color="#2e83ff"
            bgColor="#eef5ff"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Dealers"
            value={active}
            icon={<ActiveIcon />}
            color="#38a169"
            bgColor="#f0fff4"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="New Signups"
            value={newSignups}
            icon={<NewIcon />}
            color="#805ad5"
            bgColor="#faf5ff"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Waiting Review"
            value={waitingReview}
            icon={<PendingIcon />}
            color="#e53e3e"
            bgColor="#fff5f5"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DealerStats;
