import React from "react";
import {
  Box,
  Card,
  Typography,
  Container,
  Avatar,
  Paper,
  Divider,
  Grid,
} from "@mui/material";
import { useSelector } from "react-redux";

const ProfilePage = () => {
  const { user } = useSelector((state) => state.auth);

  if (!user) return null;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
        Administrator Profile
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              textAlign: "center",
              p: 3,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
            }}
          >
            <Avatar
              src={user.picture}
              alt={user.name}
              sx={{
                width: 120,
                height: 120,
                m: "0 auto 16px",
                border: "4px solid #fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {user.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administrator
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{ p: 4, borderRadius: 3, border: "1px solid #e2e8f0" }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Full Name
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {user.name}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Email Address
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {user.email}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Account Status
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 500, color: "success.main" }}
              >
                Active
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfilePage;
