import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  AlertTitle,
  Button,
  Tooltip,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  HourglassEmpty as HourglassEmptyIcon,
  ArrowForward as ArrowForwardIcon,
  Verified as VerifiedIcon,
  WarningAmber as WarningIcon,
} from "@mui/icons-material";
import { computeDealerProgress } from "../../../utils/dealerProgressHelper";

const STEP_STATUS_COLORS = {
  completed: {
    bg: "#ecfdf5",
    border: "#10b981",
    text: "#065f46",
    badge: "success",
    icon: <CheckCircleIcon sx={{ fontSize: 16, color: "#10b981" }} />,
  },
  action_required: {
    bg: "#fef2f2",
    border: "#ef4444",
    text: "#991b1b",
    badge: "error",
    icon: <CancelIcon sx={{ fontSize: 16, color: "#ef4444" }} />,
  },
  requested: {
    bg: "#eff6ff",
    border: "#3b82f6",
    text: "#1e40af",
    badge: "info",
    icon: <HourglassEmptyIcon sx={{ fontSize: 16, color: "#3b82f6" }} />,
  },
  pending_admin: {
    bg: "#fffbeb",
    border: "#f59e0b",
    text: "#92400e",
    badge: "warning",
    icon: <PendingIcon sx={{ fontSize: 16, color: "#f59e0b" }} />,
  },
  pending_dealer: {
    bg: "#f8fafc",
    border: "#cbd5e1",
    text: "#475569",
    badge: "default",
    icon: <HourglassEmptyIcon sx={{ fontSize: 16, color: "#94a3b8" }} />,
  },
  upcoming: {
    bg: "#f8fafc",
    border: "#e2e8f0",
    text: "#94a3b8",
    badge: "default",
    icon: <HourglassEmptyIcon sx={{ fontSize: 16, color: "#cbd5e1" }} />,
  },
};

/**
 * DealerApprovalProgressTracker
 *
 * Renders a visual progress bar, active/pending step highlight,
 * blocking reason, and interactive step buttons.
 */
const DealerApprovalProgressTracker = ({
  dealer,
  dealerServices = [],
  onStepClick,
  activeStepId,
  compact = false,
}) => {
  const progress = computeDealerProgress(dealer, dealerServices);
  const { steps, completedCount, totalSteps, progressPercent, statusBanner, firstPendingStep } = progress;

  if (compact) {
    return (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
        <Chip
          size="small"
          label={`${completedCount}/${totalSteps} Steps`}
          color={
            progress.isApproved
              ? "success"
              : progress.hasActionRequired
              ? "error"
              : completedCount >= 7
              ? "primary"
              : "warning"
          }
          sx={{ fontWeight: 700, fontSize: "0.72rem" }}
        />
        {firstPendingStep && !progress.isApproved && (
          <Tooltip title={firstPendingStep.blockingReason || firstPendingStep.consequence}>
            <Chip
              size="small"
              variant="outlined"
              label={`Pending: ${firstPendingStep.shortTitle}`}
              color={firstPendingStep.status === "action_required" ? "error" : "warning"}
              sx={{ fontWeight: 600, fontSize: "0.7rem" }}
            />
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: progress.hasActionRequired ? "#fca5a5" : progress.isApproved ? "#bbf7d0" : "#e2e8f0",
        bgcolor: "#ffffff",
        mb: 3,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Top Header: Progress percentage & counts */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}>
              <VerifiedIcon color="primary" fontSize="small" />
              Dealer Verification & Approval Lifecycle
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All {totalSteps} steps must be completed for the dealer to log in, undergo review, and activate customer bookings.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`${completedCount} of ${totalSteps} Steps Completed (${progressPercent}%)`}
              color={
                progress.isApproved
                  ? "success"
                  : progress.hasActionRequired
                  ? "error"
                  : completedCount >= 7
                  ? "primary"
                  : "warning"
              }
              sx={{ fontWeight: 800, fontSize: "0.75rem" }}
            />
          </Stack>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2.5 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: "#f1f5f9",
              "& .MuiLinearProgress-bar": {
                borderRadius: 4,
                bgcolor:
                  progress.isApproved
                    ? "#10b981"
                    : progress.hasActionRequired
                    ? "#ef4444"
                    : completedCount >= 7
                    ? "#2563eb"
                    : "#f59e0b",
              },
            }}
          />
        </Box>

        {/* Status Alert Banner */}
        <Alert
          severity={statusBanner.type || "info"}
          sx={{
            mb: 2.5,
            borderRadius: 2,
            alignItems: "flex-start",
            border: "1px solid",
            borderColor:
              statusBanner.type === "error"
                ? "#fca5a5"
                : statusBanner.type === "warning"
                ? "#fde68a"
                : statusBanner.type === "success"
                ? "#bbf7d0"
                : "#bfdbfe",
          }}
          action={
            firstPendingStep && onStepClick ? (
              <Button
                color="inherit"
                size="small"
                endIcon={<ArrowForwardIcon fontSize="small" />}
                onClick={() => onStepClick(firstPendingStep)}
                sx={{ fontWeight: 700, textTransform: "none", whiteSpace: "nowrap" }}
              >
                Go to Step {firstPendingStep.stepNumber}
              </Button>
            ) : null
          }
        >
          <AlertTitle sx={{ fontWeight: 800, fontSize: "0.9rem", mb: 0.25 }}>
            {statusBanner.title}
          </AlertTitle>
          <Typography variant="body2" sx={{ fontSize: "0.825rem", color: "inherit", fontWeight: 500 }}>
            {statusBanner.message}
          </Typography>
          {statusBanner.consequence && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.75,
                fontWeight: 700,
                color: statusBanner.type === "error" ? "#991b1b" : "#92400e",
              }}
            >
              ⚠️ <strong>Impact:</strong> {statusBanner.consequence}
            </Typography>
          )}
        </Alert>

        {/* Horizontal Stepper Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(5, 1fr)",
              lg: "repeat(9, 1fr)",
            },
            gap: 1.25,
          }}
        >
          {steps.map((step) => {
            const style = STEP_STATUS_COLORS[step.status] || STEP_STATUS_COLORS.upcoming;
            const isCurrentActive = activeStepId === step.id;

            return (
              <Tooltip
                key={step.id}
                title={
                  <Box sx={{ p: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                      Step {step.stepNumber}: {step.title}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                      Status: <strong>{step.statusLabel}</strong>
                    </Typography>
                    {step.blockingReason && (
                      <Typography variant="caption" sx={{ display: "block", color: "#fca5a5" }}>
                        Reason: {step.blockingReason}
                      </Typography>
                    )}
                    {step.consequence && (
                      <Typography variant="caption" sx={{ display: "block", color: "#fde68a", mt: 0.5 }}>
                        Requirement: {step.consequence}
                      </Typography>
                    )}
                  </Box>
                }
              >
                <Box
                  onClick={() => onStepClick && onStepClick(step)}
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    border: "1.5px solid",
                    borderColor: isCurrentActive ? "#2563eb" : style.border,
                    bgcolor: isCurrentActive ? "#eff6ff" : style.bg,
                    cursor: onStepClick ? "pointer" : "default",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 82,
                    "&:hover": onStepClick
                      ? {
                          transform: "translateY(-2px)",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
                        }
                      : {},
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.68rem",
                        color: isCurrentActive ? "#2563eb" : style.text,
                        lineHeight: 1,
                      }}
                    >
                      Step {step.stepNumber}
                    </Typography>
                    {style.icon}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      lineHeight: 1.2,
                      color: "#1e293b",
                      mb: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {step.shortTitle}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      color: style.text,
                      lineHeight: 1,
                    }}
                  >
                    {step.statusLabel}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default DealerApprovalProgressTracker;

