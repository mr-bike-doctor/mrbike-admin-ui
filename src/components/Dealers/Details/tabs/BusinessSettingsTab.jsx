import React, { useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  Stack,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import PercentIcon from "@mui/icons-material/Percent";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import Swal from "sweetalert2";
import { updateDealer } from "../../../../api";
import { SectionHeader } from "../DealerShared";
import {
  initBusinessSettings,
  validateBusinessSettings,
  appendBusinessSettingsToForm,
  SERVICE_RADIUS_MIN_KM,
  SERVICE_RADIUS_MAX_KM,
  SERVICE_RADIUS_DEFAULT_KM,
} from "../../businessSettings";

const BusinessSettingsTab = ({ dealer, onRefresh }) => {
  const [settings, setSettings] = useState(initBusinessSettings(dealer));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setSettings((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSave = async () => {
    const errs = validateBusinessSettings(settings);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const form = new FormData();
      form.append("id", dealer._id);
      appendBusinessSettingsToForm(form, settings);

      const res = await updateDealer(form);
      if (res && res.success) {
        await onRefresh();
        Swal.fire("Saved", "Business settings updated.", "success");
      } else {
        throw new Error(res?.message || "Failed to save settings");
      }
    } catch (e) {
      Swal.fire("Error", e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Grid container spacing={3}>

        {/* Pickup, Drop & Towing */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<TwoWheelerIcon />} title="Pickup, Drop & Towing" />
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.providesPickup}
                        onChange={handleChange("providesPickup")}
                        color="primary"
                      />
                    }
                    label={
                      <Typography fontWeight="700" variant="body2">
                        Provides Pickup
                      </Typography>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Pickup Charges"
                    type="number"
                    size="small"
                    fullWidth
                    disabled={!settings.providesPickup}
                    value={settings.pickupCharges}
                    onChange={handleChange("pickupCharges")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CurrencyRupeeIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.providesDrop}
                        onChange={handleChange("providesDrop")}
                        color="primary"
                      />
                    }
                    label={
                      <Typography fontWeight="700" variant="body2">
                        Provides Drop
                      </Typography>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Drop Charges"
                    type="number"
                    size="small"
                    fullWidth
                    disabled={!settings.providesDrop}
                    value={settings.dropCharges}
                    onChange={handleChange("dropCharges")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CurrencyRupeeIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ min: 0 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.providesTowing}
                        onChange={handleChange("providesTowing")}
                        color="primary"
                      />
                    }
                    label={
                      <Typography fontWeight="700" variant="body2">
                        Provides Towing
                      </Typography>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Towing Charges"
                    type="number"
                    size="small"
                    fullWidth
                    disabled={!settings.providesTowing}
                    value={settings.towingCharges}
                    onChange={handleChange("towingCharges")}
                    error={!!errors.towingCharges}
                    helperText={errors.towingCharges || " "}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CurrencyRupeeIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Towing is charged when the customer declares their bike as
                    <b> Not Rideable</b> or <b>Completely Dead</b> at booking.
                    The amount is snapshotted onto the booking and billed as a
                    separate line item — it is never hardcoded in the apps. You
                    or the dealer can still revise it on an individual booking
                    until it is paid.
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Service Area */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<MyLocationIcon />} title="Service Area" />
              <Grid container spacing={2.5} alignItems="flex-start">
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Service Radius"
                    type="number"
                    size="small"
                    fullWidth
                    value={settings.serviceRadiusKm}
                    onChange={handleChange("serviceRadiusKm")}
                    error={!!errors.serviceRadiusKm}
                    helperText={
                      errors.serviceRadiusKm ||
                      `${SERVICE_RADIUS_MIN_KM}–${SERVICE_RADIUS_MAX_KM} km. Blank uses the ${SERVICE_RADIUS_DEFAULT_KM} km default.`
                    }
                    InputProps={{
                      endAdornment: <InputAdornment position="end">km</InputAdornment>,
                    }}
                    inputProps={{
                      min: SERVICE_RADIUS_MIN_KM,
                      max: SERVICE_RADIUS_MAX_KM,
                      step: 0.5,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    This garage and its services only appear in the customer app
                    for users whose location falls inside this radius of the shop.
                    The dealer can also change it from the Dealer App.
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Rates */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<PercentIcon />} title="Commission & Tax" />
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Commission %"
                    type="number"
                    size="small"
                    fullWidth
                    value={settings.comission}
                    onChange={handleChange("comission")}
                    error={!!errors.comission}
                    helperText={errors.comission || " "}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <PercentIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Tax %"
                    type="number"
                    size="small"
                    fullWidth
                    value={settings.tax}
                    onChange={handleChange("tax")}
                    error={!!errors.tax}
                    helperText={errors.tax || "0–18"}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <PercentIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ min: 0, max: 18, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Minimum Wallet Amount"
                    type="number"
                    size="small"
                    fullWidth
                    value={settings.minWalletAmount}
                    onChange={handleChange("minWalletAmount")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CurrencyRupeeIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{ min: 0 }}
                    helperText="Minimum balance required in dealer's wallet"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Admin Notes */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader icon={<NoteAltIcon />} title="Admin Notes" />
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="Internal notes about this dealer — not visible to the dealer."
                value={settings.adminNotes}
                onChange={handleChange("adminNotes")}
                variant="outlined"
                inputProps={{ maxLength: 1000 }}
                helperText={`${settings.adminNotes.length}/1000 — visible to admins only`}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Save */}
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button
              variant="outlined"
              onClick={() => {
                setSettings(initBusinessSettings(dealer));
                setErrors({});
              }}
              disabled={saving}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none" }}
            >
              Discard
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none", px: 4 }}
            >
              {saving ? "Saving…" : "Save Settings"}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BusinessSettingsTab;
