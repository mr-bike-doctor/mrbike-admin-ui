import React, { useState, useEffect, useMemo } from "react";
import DealerVerficationTable from "../../components/Dealers/DealerVerficationTable";
import { getDealersVerify } from "../../api";
import { 
  Typography, 
  Box, 
  Stack, 
  Paper, 
  Grid, 
  Avatar, 
  Breadcrumbs,
  Link as MuiLink
} from "@mui/material";
import {
  PendingActions,
  AssignmentLate,
  HowToReg,
  NavigateNext
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { computeDealerProgress } from "../../utils/dealerProgressHelper";

const DealerVerify = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDealers = async () => {
      setLoading(true);
      try {
        const response = await getDealersVerify();
        if (response.success) {
          setData(response.vendors || []);
        }
      } catch (error) {
        console.error("Error fetching dealers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDealers();
  }, [refresh]);

  const handleRefresh = () => {
    setRefresh((prev) => !prev);
  };

  const queueStats = useMemo(() => {
    const evaluated = (data || []).map((d) => computeDealerProgress(d));
    const readyToApprove = evaluated.filter((p) => p.canApprove).length;
    const actionRequired = evaluated.filter((p) => p.hasActionRequired).length;
    const pendingReview = evaluated.filter((p) => !p.canApprove && !p.hasActionRequired).length;

    return [
      { label: "Ready for Approval", value: readyToApprove, icon: <HowToReg />, color: "#10b981" },
      { label: "Action Required / Rejected", value: actionRequired, icon: <AssignmentLate />, color: "#ef4444" },
      { label: "Under Review / Incomplete", value: pendingReview, icon: <PendingActions />, color: "#f59e0b" },
    ];
  }, [data]);

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 4 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: "-0.025em" }}>
                Verification Queue
              </Typography>
              <Breadcrumbs separator={<NavigateNext fontSize="small" />} aria-label="breadcrumb" sx={{ mt: 1 }}>
                <MuiLink underline="hover" color="inherit" onClick={() => navigate("/")} sx={{ cursor: "pointer", fontSize: "0.875rem" }}>
                  Dashboard
                </MuiLink>
                <Typography color="text.primary" sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
                  Verification Requests
                </Typography>
              </Breadcrumbs>
            </Box>
          </Stack>

          {/* Queue Priority Highlights */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {queueStats.map((stat, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 4, 
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    transition: "all 0.2s",
                    "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }
                  }}
                >
                  <Avatar sx={{ bgcolor: `${stat.color}15`, color: stat.color, width: 48, height: 48 }}>
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>{stat.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper elevation={0} sx={{ p: 0, borderRadius: 4, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <Box sx={{ p: 3, borderBottom: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Recent Requests
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Process dealers in order of submission or priority.
              </Typography>
            </Box>
            <DealerVerficationTable
              datas={data}
              loading={loading}
              onRefresh={handleRefresh}
            />
          </Paper>
        </Box>
      </div>
    </div>
  );
};

export default DealerVerify;
