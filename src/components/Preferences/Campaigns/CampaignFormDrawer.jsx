import React, { useEffect, useState } from "react";
import {
  Box,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import FormDrawer from "../shared/FormDrawer";
import ImageUploadField from "../shared/ImageUploadField";
import { BANNER_IMAGE_SPECS } from "../../../utils/bannerImageSpecs";

const ACCENT = "#f59e0b";

export const AUDIENCE_OPTIONS = [
  { value: "all", label: "All Users" },
  { value: "new_users", label: "New Users" },
  { value: "returning_customers", label: "Returning Customers" },
  { value: "dealers", label: "Dealers" },
  { value: "inactive_users", label: "Inactive Users" },
];

export const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

const emptyForm = {
  title: "",
  description: "",
  targetAudience: "all",
  pushNotification: false,
  inAppNotification: false,
  scheduleAt: "",
  status: "draft",
};

// Converts an ISO date string to the "YYYY-MM-DDTHH:mm" format required by a
// <TextField type="datetime-local" /> value.
const toDatetimeLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Create/Edit drawer for a single campaign. `campaign` is null for create,
// or the row object (already normalized by Campaigns.jsx) for edit. Mirrors
// PromoCodeFormDrawer.jsx structure but builds a multipart FormData payload
// (banner image + fields) instead of a plain JSON object, following the
// LocationFeaturedCategoryForm upload pattern.
const CampaignFormDrawer = ({ open, campaign, saving, onClose, onSave }) => {
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [inAppImageFile, setInAppImageFile] = useState(null);
  const [existingInAppImage, setExistingInAppImage] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(
        campaign
          ? {
              title: campaign.title || "",
              description: campaign.description || "",
              targetAudience: campaign.targetAudience || "all",
              pushNotification: campaign.pushNotification ?? false,
              inAppNotification: campaign.inAppNotification ?? false,
              scheduleAt: toDatetimeLocal(campaign.scheduleAt),
              status: campaign.status || "draft",
            }
          : emptyForm
      );
      setImageFile(null);
      setExistingImage(campaign?.image || null);
      setInAppImageFile(null);
      setExistingInAppImage(campaign?.inAppImage || null);
      setErrors({});
    }
  }, [open, campaign]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSwitch = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.checked }));
  };

  const handleImageChange = (file) => {
    setImageFile(file);
    if (errors.image) setErrors((prev) => ({ ...prev, image: null }));
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setExistingImage(null);
  };

  const handleInAppImageChange = (file) => {
    setInAppImageFile(file);
    if (errors.inAppImage) setErrors((prev) => ({ ...prev, inAppImage: null }));
  };

  const handleInAppImageRemove = () => {
    setInAppImageFile(null);
    setExistingInAppImage(null);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Campaign title is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.targetAudience) e.targetAudience = "Target audience is required";
    if (!form.scheduleAt) e.scheduleAt = "Schedule date & time is required";
    if (!form.status) e.status = "Campaign status is required";
    if (!imageFile && !existingImage) e.image = "Banner image is required";
    if (form.inAppNotification && !inAppImageFile && !existingInAppImage) {
      e.inAppImage = "A separate mobile image is required for an in-app notification";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload = new FormData();
    payload.append("title", form.title.trim());
    payload.append("description", form.description.trim());
    payload.append("targetAudience", form.targetAudience);
    payload.append("pushNotification", form.pushNotification);
    payload.append("inAppNotification", form.inAppNotification);
    // form.scheduleAt is a naive "YYYY-MM-DDTHH:mm" string with no timezone
    // info. `new Date(...)` here resolves it against the admin's own browser
    // timezone, and toISOString() sends an unambiguous UTC instant so the
    // backend (which may run in a different timezone) fires at the moment
    // the admin actually picked.
    payload.append("scheduleAt", new Date(form.scheduleAt).toISOString());
    payload.append("status", form.status);
    if (imageFile) payload.append("image", imageFile);
    if (inAppImageFile) payload.append("inAppImage", inAppImageFile);
    onSave(payload);
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={campaign ? "Edit Campaign" : "Create Campaign"}
      subtitle="CAMPAIGNS"
      saving={saving}
      onSave={handleSave}
      saveLabel={campaign ? "Update" : "Create"}
      accentColor={ACCENT}
    >
      <Stack spacing={2.5}>
        <ImageUploadField
          label="Banner / Push Image"
          required
          file={imageFile}
          existingUrl={existingImage}
          onFileChange={handleImageChange}
          onRemove={handleImageRemove}
          error={errors.image}
          spec={BANNER_IMAGE_SPECS.campaignBanner}
        />

        <Divider />

        <TextField
          fullWidth
          label="Campaign Title"
          value={form.title}
          onChange={handleChange("title")}
          error={!!errors.title}
          helperText={errors.title}
          placeholder="e.g. Monsoon Service Special"
          size="small"
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={4}
          label="Description"
          value={form.description}
          onChange={handleChange("description")}
          error={!!errors.description}
          helperText={errors.description}
          placeholder="What is this campaign about?"
          size="small"
          InputLabelProps={{ shrink: true }}
        />

        <FormControl fullWidth size="small" error={!!errors.targetAudience}>
          <InputLabel shrink>Target Audience</InputLabel>
          <Select value={form.targetAudience} onChange={handleChange("targetAudience")} label="Target Audience">
            {AUDIENCE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {errors.targetAudience && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
              {errors.targetAudience}
            </Typography>
          )}
        </FormControl>

        <Divider />

        <Stack spacing={1}>
          <FormControlLabel
            control={<Switch checked={form.pushNotification} onChange={handleSwitch("pushNotification")} color="warning" />}
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>Send as Push Notification</Typography>
                <Typography variant="caption" color="text.secondary">Delivered directly to the customer's device</Typography>
              </Box>
            }
          />
          <FormControlLabel
            control={<Switch checked={form.inAppNotification} onChange={handleSwitch("inAppNotification")} color="warning" />}
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>Show as In-App Notification</Typography>
                <Typography variant="caption" color="text.secondary">Shown inside the app's notification center</Typography>
              </Box>
            }
          />
        </Stack>

        {form.inAppNotification && (
          <ImageUploadField
            label="In-App Mobile Image"
            required
            file={inAppImageFile}
            existingUrl={existingInAppImage}
            onFileChange={handleInAppImageChange}
            onRemove={handleInAppImageRemove}
            error={errors.inAppImage}
            spec={BANNER_IMAGE_SPECS.campaignInApp}
          />
        )}

        <Divider />

        <TextField
          fullWidth
          type="datetime-local"
          label="Schedule Date & Time"
          value={form.scheduleAt}
          onChange={handleChange("scheduleAt")}
          error={!!errors.scheduleAt}
          helperText={errors.scheduleAt}
          size="small"
          InputLabelProps={{ shrink: true }}
        />

        <FormControl fullWidth size="small" error={!!errors.status}>
          <InputLabel shrink>Campaign Status</InputLabel>
          <Select value={form.status} onChange={handleChange("status")} label="Campaign Status">
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {errors.status && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
              {errors.status}
            </Typography>
          )}
        </FormControl>
      </Stack>
    </FormDrawer>
  );
};

export default CampaignFormDrawer;
