import React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Stack,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { InfoField, SectionHeader } from "../DealerShared";

const OverviewTab = ({ dealer }) => {
  const isProfileDone = Boolean(
    dealer.isProfile ||
    dealer.submittedAt ||
    dealer.status?.adminApproved ||
    dealer.formProgress?.shopDetails?.completed
  );

  const verificationStatusText = dealer.status?.adminApproved
    ? "Approved"
    : dealer.status?.documentVerified || dealer.isVerify
    ? "Verified"
    : dealer.submittedAt
    ? "Pending Review"
    : "Unverified";

  const isVerifiedColor =
    dealer.status?.adminApproved || dealer.status?.documentVerified || dealer.isVerify
      ? "success.main"
      : dealer.submittedAt
      ? "warning.main"
      : "error.main";

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, height: "100%" }}
          >
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<PersonIcon />} title="Personal Information" />
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <InfoField label="Full Name" value={dealer.ownerName} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoField label="Phone" value={dealer.phone} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoField label="Alternate Phone" value={dealer.alternatePhone} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoField
                    label="Email"
                    value={dealer.personalEmail || dealer.email}
                  />
                </Grid>
                {dealer.gender && (
                  <Grid item xs={12} sm={6}>
                    <InfoField label="Gender" value={dealer.gender} />
                  </Grid>
                )}
                {dealer.dob && (
                  <Grid item xs={12} sm={6}>
                    <InfoField
                      label="Date of Birth"
                      value={
                        dealer.dob
                          ? new Date(dealer.dob).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : null
                      }
                    />
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Shop Summary */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, height: "100%" }}
          >
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<StorefrontIcon />} title="Shop Summary" />
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <InfoField label="Shop Name" value={dealer.shopName} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoField label="Owner Name" value={dealer.ownerName} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoField
                    label="Shop Email"
                    value={dealer.shopEmail || dealer.email}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoField
                    label="Shop Contact"
                    value={dealer.shopContact || dealer.phone}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 0.5 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="700"
                      sx={{ display: "block", mb: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      Profile Status
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="700"
                      color={isProfileDone ? "success.main" : "warning.main"}
                    >
                      {isProfileDone ? "Completed" : "Incomplete"}
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
                      Verification
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="700"
                      color={isVerifiedColor}
                    >
                      {verificationStatusText}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* KYC Numbers — quick glance */}
        <Grid item xs={12}>
          <Card
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              bgcolor: "#fafbff",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <Typography variant="subtitle2" fontWeight="800" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                  KYC Numbers
                </Typography>
              </Stack>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <InfoField
                    label="Aadhar Card No."
                    value={dealer.aadharCardNo}
                    mono
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <InfoField
                    label="PAN Card No."
                    value={dealer.panCardNo?.toUpperCase()}
                    mono
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <InfoField
                    label="Registered On"
                    value={
                      dealer.createdAt
                        ? new Date(dealer.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : null
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OverviewTab;
