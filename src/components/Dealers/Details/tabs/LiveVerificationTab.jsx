import React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import VerifiedIcon from "@mui/icons-material/Verified";
import { SectionHeader } from "../DealerShared";

const LiveVerificationTab = ({ dealer }) => {
  const lv = dealer.liveVerification || {};
  const hasPhoto = !!lv.shopLivePhoto;
  const hasCoords = !!(lv.latitude && lv.longitude);
  const isVerified = hasPhoto || hasCoords;

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      {/* Status Banner */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <Chip
          icon={<VerifiedIcon />}
          label={isVerified ? "Verification Captured" : "Not Verified"}
          color={isVerified ? "success" : "warning"}
          sx={{ fontWeight: 700 }}
        />
        {lv.capturedAt && (
          <Typography variant="caption" color="text.secondary">
            Last captured: {new Date(lv.capturedAt).toLocaleString("en-IN")}
          </Typography>
        )}
      </Stack>

      <Grid container spacing={3}>
        {/* Live Photo */}
        <Grid item xs={12} sm={5} md={4}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<CameraAltIcon />} title="Live Shop Photo" />
              {hasPhoto ? (
                <Box>
                  <Box
                    component="img"
                    src={
                      lv.shopLivePhoto.startsWith("http")
                        ? lv.shopLivePhoto
                        : `${process.env.REACT_APP_IMAGE_BASE_URL || ""}${lv.shopLivePhoto}`
                    }
                    alt="Live shop photo"
                    onClick={() => window.open(
                      lv.shopLivePhoto.startsWith("http")
                        ? lv.shopLivePhoto
                        : `${process.env.REACT_APP_IMAGE_BASE_URL || ""}${lv.shopLivePhoto}`,
                      "_blank"
                    )}
                    sx={{
                      width: "100%",
                      maxHeight: 280,
                      objectFit: "cover",
                      borderRadius: 2,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: "divider",
                      transition: "all 0.2s",
                      "&:hover": { transform: "scale(1.01)", boxShadow: 4 },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" mt={1} display="block" textAlign="center">
                    Click to enlarge
                  </Typography>
                </Box>
              ) : (
                <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
                  No live photo captured yet.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Location & Timestamps */}
        <Grid item xs={12} sm={7} md={8}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<MyLocationIcon />} title="GPS & Timestamps" />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="700"
                      sx={{ display: "block", mb: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      Latitude
                    </Typography>
                    <Typography variant="body1" fontWeight="600" fontFamily="monospace">
                      {lv.latitude ?? "N/A"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="700"
                      sx={{ display: "block", mb: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      Longitude
                    </Typography>
                    <Typography variant="body1" fontWeight="600" fontFamily="monospace">
                      {lv.longitude ?? "N/A"}
                    </Typography>
                  </Box>
                </Grid>

                {hasCoords && (
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<MyLocationIcon />}
                      component="a"
                      href={`https://maps.google.com/?q=${lv.latitude},${lv.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                      View on Google Maps
                    </Button>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="700"
                      sx={{ display: "block", mb: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      Capture Timestamp
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.8}>
                      <AccessTimeIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                      <Typography variant="body2" fontWeight="600">
                        {lv.timestamp
                          ? new Date(lv.timestamp).toLocaleString("en-IN")
                          : "N/A"}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="700"
                      sx={{ display: "block", mb: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      Captured At
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.8}>
                      <AccessTimeIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                      <Typography variant="body2" fontWeight="600">
                        {lv.capturedAt
                          ? new Date(lv.capturedAt).toLocaleString("en-IN")
                          : "N/A"}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!isVerified && (
        <Alert severity="warning" variant="outlined" sx={{ mt: 3, borderRadius: 2 }}>
          Live verification has not been completed for this dealer. The dealer needs to capture a live shop photo with GPS coordinates from the mobile app.
        </Alert>
      )}
    </Box>
  );
};

export default LiveVerificationTab;
