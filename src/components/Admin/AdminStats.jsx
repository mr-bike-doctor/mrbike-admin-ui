import React from "react";
import { Box, Card, CardContent, Typography, Grid } from "@mui/material";
import {
  People as PeopleIcon,
  CheckCircle as ActiveIcon,
  SupervisorAccount as RoleIcon,
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

const AdminStats = ({ admins = [] }) => {
  const total = admins.length;
  const active = admins.filter(a => a.status === "active").length;
  const adminCount = admins.filter(a => a.role?.toLowerCase() === "admin").length;
  const managerCount = admins.filter(a => a.role?.toLowerCase() === "manager").length;
  
  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Staff"
            value={total}
            icon={<PeopleIcon />}
            color="#2e83ff"
            bgColor="#eef5ff"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Now"
            value={active}
            icon={<ActiveIcon />}
            color="#38a169"
            bgColor="#f0fff4"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Admins"
            value={adminCount}
            icon={<RoleIcon />}
            color="#e53e3e"
            bgColor="#fff5f5"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Managers"
            value={managerCount}
            icon={<RoleIcon />}
            color="#38a169"
            bgColor="#f0fff4"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminStats;
