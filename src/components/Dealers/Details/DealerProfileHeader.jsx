import React, { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Tooltip,
  Divider,
  Paper,
} from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import BlockIcon from "@mui/icons-material/Block";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { approveDealer, rejectDealer, updateDealerStatus } from "../../../api";
import { notifyDealerStatusChanged } from "../../../redux/dealerNotify";

const statusApprovalConfig = (status) => {
  const s = String(status ?? "").toLowerCase();
  if (s === "approved") return { label: "Approved", color: "success" };
  if (s === "rejected") return { label: "Rejected", color: "error" };
  return { label: "Pending", color: "warning" };
};

const DealerProfileHeader = ({ dealer, id, onRefresh, onExportPDF, pdfLoading }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [actionLoading, setActionLoading] = useState("");

  const approvalCfg = statusApprovalConfig(dealer.registrationStatus);
  const isBlocked = !!dealer.isBlocked;

  const handleActivateToggle = async () => {
    const next = !dealer.isActive;
    const label = next ? "Activate" : "Deactivate";
    const result = await Swal.fire({
      title: `${label} Dealer?`,
      text: `This will ${label.toLowerCase()} ${dealer.shopName}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: label,
      confirmButtonColor: next ? "#38a169" : "#e53e3e",
    });
    if (!result.isConfirmed) return;
    setActionLoading("activate");
    try {
      await updateDealerStatus(id, { isActive: next });
      notifyDealerStatusChanged(dispatch);
      await onRefresh();
      Swal.fire("Done", `Dealer ${label.toLowerCase()}d successfully.`, "success");
    } catch (e) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleBlockToggle = async () => {
    const next = !isBlocked;
    if (next) {
      const result = await Swal.fire({
        title: "Block Dealer?",
        text: `Please provide a reason for blocking ${dealer.shopName}.`,
        icon: "warning",
        input: "textarea",
        inputPlaceholder: "Enter reason for blocking...",
        inputAttributes: { "aria-label": "Block reason" },
        showCancelButton: true,
        confirmButtonText: "Block",
        confirmButtonColor: "#e53e3e",
        inputValidator: (value) => {
          if (!value || !value.trim()) return "A reason is required to block a dealer.";
        },
      });
      if (!result.isConfirmed) return;
      setActionLoading("block");
      try {
        await updateDealerStatus(id, { isBlocked: true, blockedReason: result.value.trim() });
        notifyDealerStatusChanged(dispatch);
        await onRefresh();
        Swal.fire("Blocked", `${dealer.shopName} has been blocked.`, "success");
      } catch (e) {
        Swal.fire("Error", e.message, "error");
      } finally {
        setActionLoading("");
      }
    } else {
      const result = await Swal.fire({
        title: "Unblock Dealer?",
        text: `This will restore access for ${dealer.shopName}.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Unblock",
        confirmButtonColor: "#38a169",
      });
      if (!result.isConfirmed) return;
      setActionLoading("block");
      try {
        await updateDealerStatus(id, { isBlocked: false, blockedReason: "" });
        notifyDealerStatusChanged(dispatch);
        await onRefresh();
        Swal.fire("Unblocked", `${dealer.shopName} has been unblocked.`, "success");
      } catch (e) {
        Swal.fire("Error", e.message, "error");
      } finally {
        setActionLoading("");
      }
    }
  };

  const handleApprove = async () => {
    const result = await Swal.fire({
      title: "Approve Dealer?",
      text: `Approve registration for ${dealer.shopName}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve",
      confirmButtonColor: "#38a169",
    });
    if (!result.isConfirmed) return;
    setActionLoading("approve");
    try {
      await approveDealer(id);
      await onRefresh();
      Swal.fire("Approved", "Dealer has been approved.", "success");
    } catch (e) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleReject = async () => {
    const result = await Swal.fire({
      title: "Reject Dealer?",
      text: `Reject registration for ${dealer.shopName}? Please provide a reason.`,
      icon: "warning",
      input: "textarea",
      inputPlaceholder: "Enter reason for rejection...",
      inputAttributes: { "aria-label": "Rejection reason" },
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#e53e3e",
      inputValidator: (value) => {
        if (!value || !value.trim()) return "A reason is required to reject a dealer.";
      },
    });
    if (!result.isConfirmed) return;
    setActionLoading("reject");
    try {
      await rejectDealer(id, result.value.trim());
      await onRefresh();
      Swal.fire("Rejected", "Dealer has been rejected.", "success");
    } catch (e) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderRadius: 0,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "white",
        px: { xs: 2, md: 4 },
        py: 2,
        mb: 3,
      }}
    >
      {/* Back nav row */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ color: "text.secondary", fontWeight: 700, textTransform: "none" }}
        >
          Back to Dealers
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={pdfLoading ? <CircularProgress size={14} /> : <DownloadIcon />}
          onClick={onExportPDF}
          disabled={pdfLoading}
          sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none" }}
        >
          {pdfLoading ? "Generating…" : "Export PDF"}
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Profile row */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        spacing={2}
      >
        {/* Left: Avatar + identity */}
        <Stack direction="row" alignItems="center" spacing={2.5}>
          <Avatar
            sx={{
              bgcolor: "primary.main",
              width: 64,
              height: 64,
              boxShadow: "0 4px 14px rgba(46,131,255,0.25)",
              flexShrink: 0,
            }}
          >
            <StorefrontIcon fontSize="large" />
          </Avatar>

          <Box>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography variant="h5" fontWeight="800" color="text.primary" sx={{ letterSpacing: -0.3 }}>
                {dealer.shopName || "—"}
              </Typography>

              {/* Approval status chip */}
              <Chip
                label={approvalCfg.label}
                color={approvalCfg.color}
                size="small"
                sx={{ fontWeight: 800, fontSize: "0.65rem", height: 22 }}
              />

              {/* Active / Inactive */}
              <Chip
                label={dealer.isActive ? "Active" : "Inactive"}
                color={dealer.isActive ? "success" : "default"}
                variant={dealer.isActive ? "filled" : "outlined"}
                size="small"
                sx={{ fontWeight: 800, fontSize: "0.65rem", height: 22 }}
              />

              {/* Blocked */}
              {isBlocked && (
                <Chip
                  label="Blocked"
                  color="error"
                  size="small"
                  icon={<BlockIcon sx={{ fontSize: "12px !important" }} />}
                  sx={{ fontWeight: 800, fontSize: "0.65rem", height: 22 }}
                />
              )}
            </Stack>

            {/* Owner name */}
            <Typography variant="body2" color="text.secondary" fontWeight="600" mt={0.3}>
              {dealer.ownerName || "—"}
            </Typography>

            {/* Meta row: ID · phone · email */}
            <Stack direction="row" spacing={2} mt={0.5} flexWrap="wrap">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <BadgeIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                <Typography variant="caption" color="text.disabled" fontFamily="monospace">
                  {String(id).slice(-10)}
                </Typography>
              </Stack>
              {dealer.phone && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <PhoneIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                  <Typography variant="caption" color="text.secondary">
                    {dealer.phone}
                  </Typography>
                </Stack>
              )}
              {(dealer.shopEmail || dealer.email) && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <EmailIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                  <Typography variant="caption" color="text.secondary">
                    {dealer.shopEmail || dealer.email}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Right: Quick actions */}
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          sx={{ "& .MuiButton-root": { textTransform: "none", fontWeight: 700, borderRadius: 2 } }}
        >
          <Tooltip title="Edit dealer profile">
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/updateDealer/${id}`)}
            >
              Edit
            </Button>
          </Tooltip>

          <Tooltip title={dealer.isActive ? "Deactivate dealer" : "Activate dealer"}>
            <Button
              variant={dealer.isActive ? "outlined" : "contained"}
              color={dealer.isActive ? "inherit" : "success"}
              size="small"
              startIcon={
                actionLoading === "activate" ? (
                  <CircularProgress size={14} />
                ) : (
                  <PowerSettingsNewIcon />
                )
              }
              disabled={actionLoading === "activate"}
              onClick={handleActivateToggle}
            >
              {dealer.isActive ? "Deactivate" : "Activate"}
            </Button>
          </Tooltip>

          <Tooltip title={isBlocked ? "Unblock dealer" : "Block dealer"}>
            <Button
              variant={isBlocked ? "contained" : "outlined"}
              color={isBlocked ? "error" : "inherit"}
              size="small"
              startIcon={
                actionLoading === "block" ? (
                  <CircularProgress size={14} />
                ) : isBlocked ? (
                  <LockOpenIcon />
                ) : (
                  <BlockIcon />
                )
              }
              disabled={actionLoading === "block"}
              onClick={handleBlockToggle}
            >
              {isBlocked ? "Unblock" : "Block"}
            </Button>
          </Tooltip>

          {approvalCfg.label !== "Approved" && (
            <Tooltip title="Approve dealer registration">
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={
                  actionLoading === "approve" ? (
                    <CircularProgress size={14} />
                  ) : (
                    <CheckCircleIcon />
                  )
                }
                disabled={actionLoading === "approve"}
                onClick={handleApprove}
              >
                Approve
              </Button>
            </Tooltip>
          )}

          {approvalCfg.label === "Pending" && (
            <Tooltip title="Reject dealer registration">
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={
                  actionLoading === "reject" ? (
                    <CircularProgress size={14} />
                  ) : (
                    <CancelIcon />
                  )
                }
                disabled={actionLoading === "reject"}
                onClick={handleReject}
              >
                Reject
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default DealerProfileHeader;
