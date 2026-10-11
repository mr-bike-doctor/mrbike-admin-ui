import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, Stack, Grid, Chip,
  CircularProgress, Divider, Button,
} from "@mui/material";
import {
  LocationOn as LocationOnIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  Radar as RadarIcon,
} from "@mui/icons-material";
import PageHeader from "../../components/Global/PageHeader";
import { getLocationFeaturedCategoryById } from "../../api";

const MapPreview = ({ locationName, lat, lng, radius }) => {
  const radiusSize = Math.min(Math.max(Number(radius) * 15, 40), 160);
  return (
    <Box
      sx={{
        width: "100%",
        height: 260,
        borderRadius: 2,
        overflow: "hidden",
        position: "relative",
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          bgcolor: "#e8f0d8",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "40px 40px, 40px 40px, 10px 10px, 10px 10px",
        }}
      />
      {[30, 48, 65].map((pct) => (
        <Box key={pct} sx={{ position: "absolute", top: `${pct}%`, left: 0, right: 0, height: pct === 48 ? 7 : 4, bgcolor: "rgba(255,255,255,0.85)" }} />
      ))}
      {[25, 50, 72].map((pct) => (
        <Box key={pct} sx={{ position: "absolute", top: 0, bottom: 0, left: `${pct}%`, width: pct === 50 ? 7 : 4, bgcolor: "rgba(255,255,255,0.85)" }} />
      ))}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `${radiusSize}px`,
          height: `${radiusSize}px`,
          borderRadius: "50%",
          border: "2px dashed #2563eb",
          bgcolor: "rgba(37, 99, 235, 0.1)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -100%)",
        }}
      >
        <LocationOnIcon sx={{ color: "#ef4444", fontSize: 40, filter: "drop-shadow(0 2px 6px rgba(239,68,68,0.4))" }} />
      </Box>
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: "rgba(255,255,255,0.92)",
          borderTop: "1px solid rgba(226,232,240,0.8)",
          px: 2,
          py: 1,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 260 }}>{locationName}</Typography>
            <Typography variant="caption" color="text.secondary">{lat}, {lng}</Typography>
          </Box>
          <Box sx={{ bgcolor: "primary.light", color: "primary.main", px: 1.5, py: 0.5, borderRadius: 10, fontSize: "0.75rem", fontWeight: 700 }}>
            {radius} KM radius
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

const DetailRow = ({ label, value }) => (
  <Box sx={{ py: 1.5, borderBottom: "1px solid #f1f5f9" }}>
    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.5, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
      {label}
    </Typography>
    <Typography variant="body2" color="text.primary" fontWeight={500}>
      {value || "—"}
    </Typography>
  </Box>
);

const ViewLocationFeaturedCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLocationFeaturedCategoryById(id)
      .then((response) => {
        if (response?.success) {
          setItem(response.data || null);
        } else {
          setItem(null);
        }
      })
      .catch((error) => {
        console.error("Error fetching category:", error);
        setItem(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!item) {
    return (
      <div className="page-wrapper">
        <div className="content container-fluid">
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">Record not found.</Typography>
            <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate("/location-featured-categories")}>
              Back to List
            </Button>
          </Box>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <Box sx={{ py: 1 }}>
          <PageHeader
            title="View Location Featured Category"
            breadcrumbs={[
              { label: "Dashboard", path: "/" },
              { label: "Location Based Featured Categories", path: "/location-featured-categories" },
              { label: "View", path: "#" },
            ]}
            action={{
              label: "Edit",
              icon: <EditIcon sx={{ fontSize: "14px !important" }} />,
              onClick: () => navigate(`/location-featured-categories/edit/${item._id}`),
            }}
          />

          <Grid container spacing={3} sx={{ maxWidth: 1000 }}>
            {/* Left column: Image + Status */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 2, border: "1px solid #e0e0e0", height: "100%" }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: "100%",
                      height: 180,
                      borderRadius: 2,
                      overflow: "hidden",
                      bgcolor: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 2,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {item.categoryImage ? (
                      <img src={item.categoryImage} alt={item.categoryName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Box sx={{ textAlign: "center", color: "#94a3b8" }}>
                        <i className="fa fa-image" style={{ fontSize: 40 }} />
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>No Image</Typography>
                      </Box>
                    )}
                  </Box>

                  <Typography variant="h6" fontWeight={700} gutterBottom>{item.categoryName}</Typography>

                  <Chip
                    label={item.status === "active" ? "Active" : "Inactive"}
                    color={item.status === "active" ? "success" : "default"}
                    size="small"
                    sx={{ fontWeight: 600, borderRadius: 10 }}
                  />

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={1.5}>
                    {item.serviceId && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <i className="fa fa-wrench" style={{ fontSize: 16, color: "#2563eb", width: 18, textAlign: "center" }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Major Service</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {item.serviceId?.name || item.serviceId}
                          </Typography>
                        </Box>
                      </Stack>
                    )}
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <RadarIcon sx={{ fontSize: 18, color: "primary.main" }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Radius</Typography>
                        <Typography variant="body2" fontWeight={600}>{item.radius} KM</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CalendarIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Created</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Right column: Location details + Map */}
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 2, border: "1px solid #e0e0e0", mb: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationOnIcon color="error" fontSize="small" />
                    Location Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <DetailRow label="Location Name" value={item.locationName} />
                  <DetailRow label="Full Address" value={item.address} />
                  <DetailRow label="Latitude" value={item.latitude} />
                  <DetailRow label="Longitude" value={item.longitude} />
                  <DetailRow label="Coverage Radius" value={`${item.radius} KM`} />
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    Map Preview
                  </Typography>
                  <MapPreview
                    locationName={item.locationName}
                    lat={item.latitude}
                    lng={item.longitude}
                    radius={item.radius}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </div>
    </div>
  );
};

export default ViewLocationFeaturedCategory;
