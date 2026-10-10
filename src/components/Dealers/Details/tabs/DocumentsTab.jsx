import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import ArticleIcon from "@mui/icons-material/Article";
import VerifiedIcon from "@mui/icons-material/Verified";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PendingIcon from "@mui/icons-material/Pending";
import RequestDocIcon from "@mui/icons-material/RequestPage";
import { ImagePreview, SectionHeader, InfoField } from "../DealerShared";
import { verifyDealerDocument, requestDealerDocuments } from "../../../../api";
import RequestDocumentsDialog, { DEFAULT_DOC_OPTIONS } from "../../RequestDocumentsDialog";
import DocumentRejectDialog from "../../DocumentRejectDialog";

const VERIFICATION_STATUS_MAP = {
  verified: { label: "Verified", color: "success" },
  pending: { label: "Pending Review", color: "warning" },
  rejected: { label: "Rejected", color: "error" },
  requested: { label: "Re-upload Requested", color: "info" },
  none: { label: "Not Reviewed", color: "default" },
  reReview: { label: "Waiting For Re-review", color: "info" },
};

// A "pending" doc on an approved dealer is only "Waiting For Re-review" if an explicit
// re-verification cycle is active (dealer.reVerification?.active === true).
// Otherwise it is simply pending review.
const displayStatus = (status, isApprovedDealer, reVerificationActive) =>
  status === "pending" && isApprovedDealer && reVerificationActive ? "reReview" : status;

const VerificationChip = ({ status, isApprovedDealer, reVerificationActive }) => {
  const resolved = displayStatus(status, isApprovedDealer, reVerificationActive);
  const { label, color } = VERIFICATION_STATUS_MAP[resolved] || VERIFICATION_STATUS_MAP.none;
  return (
    <Chip
      label={label}
      color={color}
      size="small"
      variant={status !== "none" ? "filled" : "outlined"}
      sx={{ fontWeight: 700, fontSize: "0.7rem" }}
    />
  );
};

const DOC_KEYS = ["aadharFront", "aadharBack", "pan", "shop", "face", "passbook"];

const allDocsVerified = (dv) => DOC_KEYS.every((k) => dv[k] === "verified");

// Reuses the same verify/reject action pattern as DealerVerficationTable's document review panel.
const DocumentVerificationCard = ({
  label,
  src,
  status,
  isApprovedDealer,
  reVerificationActive,
  reason,
  reviewedAt,
  pendingStatus,
  disabled,
  onVerify,
  onRejectClick,
}) => {
  const borderColor =
    status === "verified" ? "success.main" : status === "rejected" ? "error.main" : "divider";

  return (
    <Card
      elevation={0}
      sx={{ border: "1.5px solid", borderColor, borderRadius: 3, overflow: "hidden" }}
    >
      <CardContent sx={{ p: 2 }}>
        <ImagePreview src={src} label={label} showDownload />
        <Box sx={{ mt: 1.5 }}>
          <VerificationChip
            status={status}
            isApprovedDealer={isApprovedDealer}
            reVerificationActive={reVerificationActive}
          />
        </Box>
        {reason && (status === "rejected" || status === "requested") && (
          <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 1 }}>
            <strong>Reason:</strong> {reason}
          </Typography>
        )}
        {reviewedAt && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Last updated: {new Date(reviewedAt).toLocaleString("en-IN")}
          </Typography>
        )}
      </CardContent>

      {src && (
        <Box sx={{ display: "flex", borderTop: "1px solid", borderColor: "divider" }}>
          <Button
            fullWidth
            size="small"
            variant={status === "verified" ? "contained" : "text"}
            color="success"
            disabled={disabled}
            startIcon={
              pendingStatus === "verified" ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <CheckCircleIcon fontSize="small" />
              )
            }
            onClick={() => onVerify("verified")}
            sx={{ borderRadius: 0, py: 1, fontWeight: 800, fontSize: "0.72rem" }}
          >
            Verify
          </Button>
          <Divider orientation="vertical" flexItem />
          <Button
            fullWidth
            size="small"
            variant={status === "rejected" ? "contained" : "text"}
            color="error"
            disabled={disabled}
            startIcon={
              pendingStatus === "rejected" ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <CancelIcon fontSize="small" />
              )
            }
            onClick={onRejectClick}
            sx={{ borderRadius: 0, py: 1, fontWeight: 800, fontSize: "0.72rem" }}
          >
            Reject
          </Button>
        </Box>
      )}
    </Card>
  );
};

const DocumentsTab = ({ dealer, onRefresh }) => {
  const docs = dealer.documents || {};
  const bank = dealer.bankDetails || {};

  const [docVerification, setDocVerification] = useState(dealer.documentVerification || {});
  const [pendingDoc, setPendingDoc] = useState(null); // { key, status } | null
  const [actionError, setActionError] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [rejectDoc, setRejectDoc] = useState(null); // { key, label } | null

  const isApprovedDealer = dealer.registrationStatus?.toLowerCase() === "approved";
  const reVerificationActive = Boolean(dealer.reVerification?.active);
  const documentRequests = dealer.documentRequests || {};
  const [verifyAllLoading, setVerifyAllLoading] = useState(false);

  useEffect(() => {
    setDocVerification(dealer.documentVerification || {});
  }, [dealer.documentVerification]);

  const handleDocVerify = async (docKey, status) => {
    setActionError(null);
    setPendingDoc({ key: docKey, status });
    try {
      await verifyDealerDocument(dealer._id, docKey, status);
      setDocVerification((prev) => ({ ...prev, [docKey]: status }));
      if (onRefresh) onRefresh();
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "Failed to update document status. Please try again."
      );
    } finally {
      setPendingDoc(null);
    }
  };

  const handleVerifyAll = async () => {
    setActionError(null);
    setVerifyAllLoading(true);
    try {
      await verifyDealerDocument(dealer._id, DOC_KEYS, "verified");
      const updated = {};
      DOC_KEYS.forEach((k) => {
        updated[k] = "verified";
      });
      setDocVerification(updated);
      if (onRefresh) onRefresh();
    } catch (error) {
      setActionError(
        error?.response?.data?.message || "Failed to verify all documents. Please try again."
      );
    } finally {
      setVerifyAllLoading(false);
    }
  };

  // Separate from handleDocVerify because the mandatory-reason dialog needs the
  // rejection to fail loudly (its own inline error), rather than being swallowed
  // into actionError like the direct Verify click.
  const handleRejectConfirm = async (docKey, reason) => {
    setActionError(null);
    setPendingDoc({ key: docKey, status: "rejected" });
    try {
      await verifyDealerDocument(dealer._id, docKey, "rejected", reason);
      setDocVerification((prev) => ({ ...prev, [docKey]: "rejected" }));
      if (onRefresh) onRefresh();
    } finally {
      setPendingDoc(null);
    }
  };

  const handleRequestDocuments = async (docTypes, reason) => {
    await requestDealerDocuments(dealer._id, docTypes, reason);
    setDocVerification((prev) => {
      const next = { ...prev };
      docTypes.forEach((key) => {
        next[key] = "requested";
      });
      return next;
    });
    if (onRefresh) onRefresh();
  };

  const docStatus = [
    { name: "Aadhar Card (Front)", uploaded: !!docs.aadharFront, verifyKey: "aadharFront", src: docs.aadharFront },
    { name: "Aadhar Card (Back)", uploaded: !!docs.aadharBack, verifyKey: "aadharBack", src: docs.aadharBack },
    { name: "PAN Card", uploaded: !!docs.panCardFront, verifyKey: "pan", src: docs.panCardFront },
    { name: "Shop Certificate", uploaded: !!docs.shopCertificate, verifyKey: "shop", src: docs.shopCertificate },
    { name: "Face Verification", uploaded: !!docs.faceVerificationImage, verifyKey: "face", src: docs.faceVerificationImage },
    { name: "Passbook / Cheque", uploaded: !!bank.passbookImage, verifyKey: "passbook", src: bank.passbookImage },
  ];

  const verifiedCount = DOC_KEYS.filter((k) => docVerification[k] === "verified").length;
  const hasRejected = Object.values(docVerification).some((v) => v === "rejected");

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Grid container spacing={3}>

        {/* Rejection Reason (if backend has recorded one for the application) */}
        {dealer.rejectionReason && (
          <Grid item xs={12}>
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              <strong>Rejection Reason:</strong> {dealer.rejectionReason}
            </Alert>
          </Grid>
        )}

        {/* KYC Numbers */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "#fafbff" }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<FingerprintIcon />} title="Identity Numbers" />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <InfoField label="Aadhar Card No." value={dealer.aadharCardNo} mono />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <InfoField label="PAN Card No." value={dealer.panCardNo?.toUpperCase()} mono />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="700"
                      sx={{ display: "block", mb: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      Identity Status
                    </Typography>
                    <Chip
                      label={
                        dealer.status?.documentVerified ||
                        dealer.status?.adminApproved ||
                        dealer.isVerify ||
                        allDocsVerified(docVerification)
                          ? "KYC Verified"
                          : "KYC Pending"
                      }
                      color={
                        dealer.status?.documentVerified ||
                        dealer.status?.adminApproved ||
                        dealer.isVerify ||
                        allDocsVerified(docVerification)
                          ? "success"
                          : "warning"
                      }
                      icon={<VerifiedIcon />}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Document Review */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
                <SectionHeader icon={<ArticleIcon />} title="KYC Documents" />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    size="small"
                    label={`${verifiedCount} / ${DOC_KEYS.length} Verified`}
                    color={allDocsVerified(docVerification) ? "success" : "warning"}
                    icon={allDocsVerified(docVerification) ? <CheckCircleIcon fontSize="small" /> : <PendingIcon fontSize="small" />}
                    sx={{ fontWeight: 800, fontSize: "0.7rem" }}
                  />
                  {!allDocsVerified(docVerification) && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={verifyAllLoading || !!pendingDoc}
                      startIcon={
                        verifyAllLoading ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <CheckCircleIcon fontSize="small" />
                        )
                      }
                      onClick={handleVerifyAll}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      Verify All Documents
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<RequestDocIcon fontSize="small" />}
                    onClick={() => setRequestDialogOpen(true)}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Request Documents
                  </Button>
                </Box>
              </Box>

              {actionError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                  {actionError}
                </Alert>
              )}

              {hasRejected ? (
                <Alert severity="error" sx={{ mb: 2, py: 0.5, fontSize: "0.75rem" }}>
                  <strong>Needs Attention:</strong> One or more documents have been rejected. The
                  dealer will need to re-upload these.
                </Alert>
              ) : !allDocsVerified(docVerification) ? (
                <Alert severity="info" sx={{ mb: 2, py: 0.5, fontSize: "0.75rem" }}>
                  Review each document below. Click the image to enlarge, then Verify or Reject.
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mb: 2, py: 0.5, fontSize: "0.75rem" }}>
                  All documents verified.
                </Alert>
              )}

              <Grid container spacing={3}>
                {docStatus.map((row) => (
                  <Grid item xs={12} sm={6} md={4} key={row.verifyKey}>
                    <DocumentVerificationCard
                      label={row.name}
                      src={row.src}
                      status={docVerification[row.verifyKey] || "none"}
                      isApprovedDealer={isApprovedDealer}
                      reVerificationActive={reVerificationActive}
                      reason={documentRequests[row.verifyKey]?.reason}
                      reviewedAt={documentRequests[row.verifyKey]?.requestedAt}
                      pendingStatus={pendingDoc?.key === row.verifyKey ? pendingDoc.status : null}
                      disabled={!!pendingDoc || verifyAllLoading}
                      onVerify={(status) => handleDocVerify(row.verifyKey, status)}
                      onRejectClick={() => setRejectDoc({ key: row.verifyKey, label: row.name })}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <RequestDocumentsDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        onSubmit={handleRequestDocuments}
        docOptions={DEFAULT_DOC_OPTIONS}
      />

      <DocumentRejectDialog
        open={!!rejectDoc}
        docLabel={rejectDoc?.label}
        onClose={() => setRejectDoc(null)}
        onConfirm={(reason) => handleRejectConfirm(rejectDoc.key, reason)}
      />
    </Box>
  );
};

export default DocumentsTab;
