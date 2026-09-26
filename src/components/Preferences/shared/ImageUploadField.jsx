import React, { useEffect, useState } from "react";
import { Alert, Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { AddPhotoAlternate, Crop, Delete } from "@mui/icons-material";
import ImageCropDialog from "../../Common/ImageCropDialog";
import {
  formatSpec,
  MAX_IMAGE_LABEL,
  MAX_OPTIMIZED_IMAGE_LABEL,
  optimizeBannerImage,
  validateBannerImage,
} from "../../../utils/bannerImageSpecs";

// Reusable image upload box (upload → crop → preview → remove), generalized
// from the pattern in LocationFeaturedCategoryForm so every Preferences module
// (Campaigns banner, App Content banners) shares one upload control.
//
// Pass `spec` (from utils/bannerImageSpecs) to lock the field to one exact
// pixel size. The file is measured before it ever reaches the parent; an
// off-size image opens the crop dialog instead of being rejected, so what the
// parent receives is always already at the spec's exact dimensions. Only a
// source too small to crop up to the spec is refused outright.
const ImageUploadField = ({
  label = "Image",
  required = false,
  file,
  existingUrl,
  onFileChange,
  onRemove,
  error,
  helperText,
  height = 180,
  spec = null,
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sizeError, setSizeError] = useState(null);
  // The picked file waiting to be cropped — also the dialog's open flag.
  const [cropSource, setCropSource] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // A changed spec (e.g. the banner Type was switched) invalidates the old
  // rejection message and any half-finished crop — the parent clears the file
  // alongside it.
  useEffect(() => {
    setSizeError(null);
    setCropSource(null);
  }, [spec]);

  const handleSelect = async (e) => {
    const selected = e.target.files?.[0];
    // Reset the input so re-picking the same rejected file fires onChange again.
    e.target.value = "";
    if (!selected) return;

    const result = await validateBannerImage(selected, spec);
    if (result.needsCrop) {
      // Right kind of file, wrong dimensions — let the admin frame it instead
      // of sending them off to a photo editor.
      setSizeError(null);
      onFileChange(null);
      setCropSource(selected);
      return;
    }
    if (!result.ok) {
      setSizeError(result.message);
      onFileChange(null);
      return;
    }
    try {
      const optimized = await optimizeBannerImage(selected, spec);
      setSizeError(null);
      onFileChange(optimized);
    } catch (err) {
      setSizeError(err.message || "Could not optimize this image.");
      onFileChange(null);
    }
  };

  const handleCropped = (croppedFile) => {
    setCropSource(null);
    setSizeError(null);
    onFileChange(croppedFile);
  };

  const handleCropCancel = () => {
    const pending = cropSource;
    setCropSource(null);
    // Nothing usable was produced, so say why the field is still empty rather
    // than leaving the admin staring at an unchanged box.
    if (!file && pending && spec) {
      setSizeError(`Crop cancelled — ${spec.label} must be exactly ${formatSpec(spec)}. Upload the image again to crop it.`);
    }
  };

  const handleRemove = () => {
    setSizeError(null);
    onRemove();
  };

  const displayUrl = previewUrl || existingUrl;
  const shownError = sizeError || error;
  const hint =
    helperText ||
    (spec
      ? `JPG, PNG, WEBP · exactly ${formatSpec(spec)} · saved as high-quality WEBP (max ${MAX_OPTIMIZED_IMAGE_LABEL}; source max ${MAX_IMAGE_LABEL})`
      : `JPG, PNG, WEBP (Max ${MAX_IMAGE_LABEL})`);

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
        {label} {required && "*"}
      </Typography>
      {spec && (
        <Alert severity="info" icon={false} sx={{ mb: 1, py: 0.25, fontSize: 12 }}>
          <Typography variant="caption" fontWeight={700} display="block">
            Required size: {formatSpec(spec)} — any other size opens the crop tool
          </Typography>
          {spec.note && (
            <Typography variant="caption" color="text.secondary">
              {spec.note}
            </Typography>
          )}
        </Alert>
      )}
      <Box
        sx={{
          width: "100%",
          height: displayUrl ? "auto" : height,
          minHeight: displayUrl ? 160 : height,
          borderRadius: 2,
          border: `1px dashed ${shownError ? "#d32f2f" : "#d1d5db"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          bgcolor: "#fafafa",
        }}
      >
        {displayUrl ? (
          <Box sx={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", p: 1.5 }}>
            <img src={displayUrl} alt={label} style={{ maxHeight: 220, maxWidth: "100%", borderRadius: 4, objectFit: "contain" }} />
            <Stack direction="row" spacing={0.5} sx={{ position: "absolute", top: 8, right: 8 }}>
              {/* Swapping the artwork is the common edit, so it gets its own
                  button — removing first and then uploading is one step too
                  many, and on an already-saved banner the empty upload box
                  never even appeared. */}
              <Tooltip title="Replace image">
                <IconButton
                  component="label"
                  size="small"
                  sx={{ bgcolor: "rgba(255,255,255,0.9)", "&:hover": { bgcolor: "#fff" } }}
                >
                  <AddPhotoAlternate fontSize="small" />
                  <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleSelect} />
                </IconButton>
              </Tooltip>
              {/* Re-crop is only possible for a file picked in this session —
                  an already-uploaded image lives on another origin and would
                  taint the canvas. */}
              {file && spec && (
                <Tooltip title="Adjust crop">
                  <IconButton
                    onClick={() => setCropSource(file)}
                    size="small"
                    sx={{ bgcolor: "rgba(255,255,255,0.9)", "&:hover": { bgcolor: "#fff" } }}
                  >
                    <Crop fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Remove image">
                <IconButton
                  onClick={handleRemove}
                  size="small"
                  sx={{ bgcolor: "rgba(255,255,255,0.9)", "&:hover": { bgcolor: "#fff" } }}
                >
                  <Delete color="error" fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        ) : (
          <Button component="label" fullWidth sx={{ height: "100%", flexDirection: "column", gap: 1, color: "text.secondary", textTransform: "none" }}>
            <AddPhotoAlternate sx={{ fontSize: 30, color: "#9ca3af" }} />
            <Typography variant="body2" fontWeight={500}>Upload {label}</Typography>
            <Typography variant="caption" color="text.disabled">{hint}</Typography>
            <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleSelect} />
          </Button>
        )}
      </Box>
      {shownError && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1, display: "block" }}>
          {shownError}
        </Typography>
      )}

      <ImageCropDialog
        open={Boolean(cropSource && spec)}
        file={cropSource}
        spec={spec}
        onCancel={handleCropCancel}
        onCropped={handleCropped}
      />
    </Box>
  );
};

export default ImageUploadField;
