import React from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { BsStars } from "react-icons/bs";
import DeleteIcon from "@mui/icons-material/Delete";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import RichTextEditor from "../../Preferences/shared/RichTextEditor";

/**
 * Basics tab.
 *
 * Mixes two storage locations on purpose, and the split matters:
 *   - name / description / category / basePrice / duration / pickup /
 *     warranty / image are existing BaseService fields, saved through the
 *     existing base-service endpoint, unchanged.
 *   - shortDescription / warrantyText / recommendedInterval are the Phase 1
 *     lightweight BaseService fields, and fullDescription is ServiceDetail
 *     content; those save through the Service Detail endpoint.
 * The admin sees one form; the form fans out to the right writer for each
 * field so no existing API contract changes.
 */
const BasicsTab = ({
  form,
  errors,
  categories,
  onChange,
  onSwitchChange,
  onFullDescriptionChange,
  onGenerateDescription,
  isGenerating,
  imagePreviewUrl,
  existingImage,
  onImageSelect,
  onImageClear,
  isEdit,
}) => {
  const fieldProps = {
    fullWidth: true,
    variant: "outlined",
    size: "small",
    onChange,
    InputLabelProps: { shrink: true },
  };

  const hasImage = imagePreviewUrl || existingImage;

  return (
    <Stack spacing={3}>
      <TextField
        {...fieldProps}
        label="Service Name"
        name="name"
        value={form.name}
        error={!!errors.name}
        helperText={errors.name}
        required
        placeholder="e.g. General Service"
      />

      <TextField
        {...fieldProps}
        label="Short Description"
        name="shortDescription"
        value={form.shortDescription}
        error={!!errors.shortDescription}
        helperText={
          errors.shortDescription ||
          "One line shown on service cards and at the top of the detail screen. Required before publishing."
        }
        placeholder="e.g. Complete periodic service for everyday riding"
        inputProps={{ maxLength: 300 }}
      />

      <TextField
        {...fieldProps}
        label="Service Description (internal / listing)"
        name="description"
        value={form.description}
        multiline
        rows={4}
        placeholder="Enter description…"
        helperText="Plain-text summary used by existing listings. The rich description below is what the detail screen shows."
        InputProps={{
          endAdornment: (
            <InputAdornment position="end" sx={{ alignSelf: "flex-end", mb: 1, mr: -1 }}>
              <Tooltip title="Generate description with AI">
                <span>
                  <IconButton
                    color="primary"
                    onClick={onGenerateDescription}
                    disabled={!form.name.trim() || isGenerating}
                  >
                    {isGenerating ? <CircularProgress size={24} /> : <BsStars />}
                  </IconButton>
                </span>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />

      <Box>
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
          Full Description
        </Typography>
        <RichTextEditor
          value={form.fullDescription}
          onChange={onFullDescriptionChange}
          placeholder="Describe the service in full — what it covers, why it matters…"
          minHeight={220}
          error={!!errors.fullDescription}
          helperText={
            errors.fullDescription || "Shown on the rider's Service Detail screen. Required before publishing."
          }
          disabled={!isEdit}
        />
        {!isEdit && (
          <Typography variant="caption" color="text.secondary">
            Save the service first to add rich content.
          </Typography>
        )}
      </Box>

      <Divider />

      <FormControl fullWidth size="small">
        <InputLabel shrink>Category</InputLabel>
        <Select
          label="Category"
          name="categoryId"
          value={form.categoryId}
          onChange={onChange}
          displayEmpty
          notched
        >
          <MenuItem value="">
            <em>No category</em>
          </MenuItem>
          {categories.map((c) => (
            <MenuItem key={c._id} value={c._id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField {...fieldProps} label="Base Price (₹)" name="basePrice" type="number" value={form.basePrice} placeholder="e.g. 349" />
        <TextField
          {...fieldProps}
          label="Duration (minutes)"
          name="duration"
          type="number"
          value={form.duration}
          placeholder="e.g. 45"
          helperText="Shown as the duration chip on the detail screen"
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          {...fieldProps}
          label="Warranty Text"
          name="warrantyText"
          value={form.warrantyText}
          placeholder="e.g. 30 days / 1000 km"
          helperText="Free text shown as the warranty chip"
          inputProps={{ maxLength: 200 }}
        />
        <TextField
          {...fieldProps}
          label="Recommended Interval"
          name="recommendedInterval"
          value={form.recommendedInterval}
          placeholder="e.g. Every 3000 km"
          helperText="How often riders should book this"
          inputProps={{ maxLength: 200 }}
        />
      </Stack>

      <Stack direction="row" spacing={4}>
        <FormControlLabel
          control={<Switch checked={form.pickupAvailable} onChange={onSwitchChange} name="pickupAvailable" />}
          label="Pickup Available"
        />
        <FormControlLabel
          control={<Switch checked={form.warranty} onChange={onSwitchChange} name="warranty" />}
          label="Warranty"
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <FormControlLabel
          control={<Switch checked={!!form.isFeatured} onChange={onSwitchChange} name="isFeatured" />}
          label="Feature on Customer Home"
        />
        <FormControlLabel
          control={<Switch checked={!!form.isQuickService} onChange={onSwitchChange} name="isQuickService" />}
          label="Show as Quick Service"
        />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Home selections appear only when a nearby garage can book this service for the customer’s bike.
      </Typography>

      <Box>
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
          Main Image {!isEdit && "*"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Used by existing listings, bookings and invoices. Gallery images live on the Media tab.
        </Typography>
        <Box
          sx={{
            mt: 1,
            position: "relative",
            width: "100%",
            minHeight: hasImage ? "200px" : "120px",
            borderRadius: 2,
            border: `1px dashed ${errors.image ? "#d32f2f" : "#d1d5db"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            bgcolor: "#fff",
          }}
        >
          {hasImage ? (
            <Box sx={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", p: 2 }}>
              <img
                src={imagePreviewUrl || existingImage}
                alt="Preview"
                style={{ maxHeight: "250px", maxWidth: "100%", borderRadius: "4px" }}
              />
              <IconButton
                onClick={onImageClear}
                sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(255,255,255,0.9)", "&:hover": { bgcolor: "#fff" } }}
                size="small"
              >
                <DeleteIcon color="error" fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Button
              component="label"
              fullWidth
              sx={{ height: "100%", flexDirection: "column", gap: 1, color: "text.secondary", textTransform: "none" }}
            >
              <AddPhotoAlternateIcon sx={{ fontSize: 32, color: "#9ca3af" }} />
              <Typography variant="body2" fontWeight={500}>
                Upload Main Image {!isEdit && "*"}
              </Typography>
              <input type="file" hidden accept="image/*" onChange={onImageSelect} />
            </Button>
          )}
        </Box>
        {errors.image && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1, display: "block" }}>
            {errors.image}
          </Typography>
        )}
      </Box>
    </Stack>
  );
};

export default BasicsTab;
