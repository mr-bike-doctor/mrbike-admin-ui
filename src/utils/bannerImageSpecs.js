// Exact pixel sizes every banner creative must be uploaded at.
//
// The customer app never letterboxes a banner — both surfaces use
// resizeMode="cover", so an off-size upload gets silently cropped:
//   - Home hero  : BannerSlider renders a fixed 190dp tall card whose width is
//                  (screen - 40), i.e. a 1.68:1 (small Android) → 2.05:1 (Pro Max)
//                  card. 1200x640 (1.875:1) sits in the middle of that range so
//                  no device crops more than ~5%, and 1200px stays sharp at 3x.
//   - Popup /
//     announcement: AnnouncementPopup sizes the image from its own aspect ratio
//                  with FALLBACK_ASPECT_RATIO = 4:5, so 1080x1350 renders with
//                  no crop at all on normal-height screens.
//
// Uploads still have to land on these exact numbers — but admins rarely have a
// creative already cut to size, so an off-size file is not rejected outright:
// ImageCropDialog lets the admin choose the crop themselves and re-encodes the
// result at exactly these dimensions (see cropImageToSpec below). Deciding the
// framing by hand beats an automatic centre-crop, which happily cuts a head or
// a logo off without anyone noticing until the banner is live.
export const BANNER_IMAGE_SPECS = {
  home: {
    width: 1200,
    height: 640,
    label: "Home Hero banner",
    // The app paints a dark gradient + title/description/button over the bottom
    // ~70% of the card, so this must be a plain background photo.
    note: "Background photo only — the app overlays title, description and button over the bottom 70%. Keep text/logo out of it.",
    // Drawn as a shaded band in the crop dialog so the admin can see which part
    // of their photo the app's own text will sit on top of.
    overlayBottomPct: 0.7,
  },
  campaignBanner: {
    width: 1200,
    height: 640,
    label: "Campaign banner / push image",
    note: "Landscape artwork using the same dimensions and crop workflow as the home banner.",
  },
  popup: {
    width: 1080,
    height: 1350,
    label: "Popup banner",
    note: "Full designed creative (4:5). The app adds no text over it. Keep ~10% safe margin top and bottom for small screens.",
  },
  campaignInApp: {
    width: 1080,
    height: 1350,
    label: "In-app mobile image",
    note: "Portrait 4:5 artwork shown above the campaign title and description. Keep important text and logos inside a ~10% safe margin.",
  },
  announcement: {
    width: 1080,
    height: 1350,
    label: "Announcement banner",
    note: "Full designed creative (4:5). The app adds no text over it. Keep ~10% safe margin top and bottom for small screens.",
  },
};

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Files sent to S3 are much smaller than the source limit above. WebP at the
// quality levels below is visually near-lossless for banner artwork while
// avoiding multi-megabyte PNG downloads on every customer device.
export const MAX_OPTIMIZED_IMAGE_BYTES = 800 * 1024;

// Every "max size" string in the UI is derived from MAX_IMAGE_BYTES so the
// number in the copy can never drift away from the number being enforced.
export const MAX_IMAGE_LABEL = `${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB`;
export const MAX_OPTIMIZED_IMAGE_LABEL = `${Math.round(MAX_OPTIMIZED_IMAGE_BYTES / 1024)}KB`;

// Cropping blows the chosen box back up to the spec's exact pixel size, so a
// source much smaller than the target only ever produces a blurry banner.
// Below this fraction of the required size the upload is rejected instead of
// being offered a crop; above SOFT_UPSCALE_LIMIT the dialog warns but allows it.
export const MIN_SOURCE_SCALE = 0.5;
export const SOFT_UPSCALE_LIMIT = 1.25;

export const formatSpec = (spec) => (spec ? `${spec.width} × ${spec.height} px` : "");

// How much the source has to be scaled up (>1) or down (<1) for the largest
// possible crop box to fill the spec — i.e. the cover factor.
export const upscaleFactorFor = (dimensions, spec) =>
  Math.max(spec.width / dimensions.width, spec.height / dimensions.height);

// Reads the intrinsic pixel size of a File without uploading it. Rejects if the
// browser cannot decode the file (corrupt / not really an image).
export const readImageDimensions = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image file."));
    };
    img.src = url;
  });

// Same as readImageDimensions but hands back the decoded element itself, for
// callers that are about to draw it onto a canvas. The object URL stays alive
// until revoke() is called — drawing from a revoked URL fails in Safari.
export const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, revoke: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image file."));
    };
    img.src = url;
  });

// Full gate for a banner upload: type → weight → exact dimensions.
// Returns { ok: true } or { ok: false, message, reason } — never throws.
// reason "dimensions" comes with needsCrop: true, which is the caller's cue to
// open the crop dialog rather than to show the message; "too-small" is a hard
// stop because cropping cannot invent pixels that were never there.
export const validateBannerImage = async (file, spec) => {
  if (!file) return { ok: false, reason: "missing", message: "No file selected." };

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, reason: "type", message: "Only JPG, PNG or WEBP files are allowed." };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "size", message: `Image must be smaller than ${MAX_IMAGE_LABEL}.` };
  }

  if (!spec) return { ok: true };

  let dimensions;
  try {
    dimensions = await readImageDimensions(file);
  } catch (err) {
    return { ok: false, reason: "decode", message: err.message };
  }

  if (dimensions.width === spec.width && dimensions.height === spec.height) {
    return { ok: true, dimensions };
  }

  if (upscaleFactorFor(dimensions, spec) > 1 / MIN_SOURCE_SCALE) {
    const minW = Math.ceil(spec.width * MIN_SOURCE_SCALE);
    const minH = Math.ceil(spec.height * MIN_SOURCE_SCALE);
    return {
      ok: false,
      reason: "too-small",
      dimensions,
      message: `This image is too small to crop. ${spec.label} needs ${formatSpec(spec)}, and the smallest source that can be cropped up to it is ${minW} × ${minH} px — you uploaded ${dimensions.width} × ${dimensions.height} px.`,
    };
  }

  return {
    ok: false,
    reason: "dimensions",
    needsCrop: true,
    dimensions,
    message: `${spec.label} must be exactly ${formatSpec(spec)}. You uploaded ${dimensions.width} × ${dimensions.height} px — crop it to size before saving.`,
  };
};

// Keeps a crop box (source pixels) inside the image and non-degenerate, so a
// sub-pixel rounding error in the dialog's drag maths can never hand
// drawImage a box that hangs over the edge and bleeds transparent pixels in.
const clampCropBox = (crop, img) => {
  const width = Math.max(1, Math.min(Math.round(crop.width), img.naturalWidth));
  const height = Math.max(1, Math.min(Math.round(crop.height), img.naturalHeight));
  return {
    x: Math.max(0, Math.min(Math.round(crop.x), img.naturalWidth - width)),
    y: Math.max(0, Math.min(Math.round(crop.y), img.naturalHeight - height)),
    width,
    height,
  };
};

// Draws `crop` (source pixels) into a canvas of exactly spec.width x spec.height.
// Big downscales are stepped down by halves first: one drawImage from a 4000px
// photo straight to 1200px aliases badly in Chrome, halving does not.
const renderCrop = (img, spec, crop, opaque) => {
  let source = img;
  let { x, y, width, height } = crop;

  while (width > spec.width * 2 && height > spec.height * 2) {
    const half = document.createElement("canvas");
    half.width = Math.round(width / 2);
    half.height = Math.round(height / 2);
    const halfCtx = half.getContext("2d");
    halfCtx.imageSmoothingEnabled = true;
    halfCtx.imageSmoothingQuality = "high";
    halfCtx.drawImage(source, x, y, width, height, 0, 0, half.width, half.height);
    source = half;
    x = 0;
    y = 0;
    width = half.width;
    height = half.height;
  }

  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // JPEG has no alpha channel: without this, transparent source pixels encode
  // as black instead of white.
  if (opaque) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, spec.width, spec.height);
  }
  ctx.drawImage(source, x, y, width, height, 0, 0, spec.width, spec.height);
  return canvas;
};

const encodeCanvas = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the cropped image."))),
      type,
      quality
    );
  });

const optimizedFileName = (name, spec) => {
  const base = (name || "banner").replace(/\.[^./\\]+$/, "") || "banner";
  return `${base}-${spec.width}x${spec.height}.webp`;
};

// Encode at a high WebP quality first and only step down slightly when a very
// detailed creative misses the network-size budget. We intentionally never go
// below 90: at these banner dimensions that keeps text and edges crisp while
// still preventing the 1.5MB+ PNGs that caused long blank states in the app.
const encodeOptimizedBanner = async (canvas) => {
  let blob = null;
  for (const quality of [0.94, 0.92, 0.9]) {
    blob = await encodeCanvas(canvas, "image/webp", quality);
    if (blob.type !== "image/webp") {
      throw new Error("This browser cannot create optimized WEBP images. Please use the latest Chrome or Edge.");
    }
    if (blob.size <= MAX_OPTIMIZED_IMAGE_BYTES) return blob;
  }
  throw new Error(
    `The optimized banner is still larger than ${MAX_OPTIMIZED_IMAGE_LABEL}. Try a less detailed image.`
  );
};

const optimizedFileFromCanvas = async (canvas, file, spec) => {
  const blob = await encodeOptimizedBanner(canvas);
  return new File([blob], optimizedFileName(file.name, spec), {
    type: "image/webp",
    lastModified: Date.now(),
  });
};

// Cuts `crop` out of `file` and re-encodes it at exactly the spec's size.
// Returns a File ready to hand straight to the form's FormData.
// Every result becomes high-quality WebP. WebP preserves transparency, so PNG
// artwork keeps transparent corners without keeping PNG's download weight.
export const cropImageToSpec = async (file, spec, crop) => {
  const { img, revoke } = await loadImageElement(file);
  try {
    const box = clampCropBox(crop, img);
    return optimizedFileFromCanvas(renderCrop(img, spec, box, false), file, spec);
  } finally {
    revoke();
  }
};

// Exact-size uploads used to bypass the cropper and reach S3 unchanged. This
// closes that path so a 1200x640 PNG is optimized just like a cropped image.
export const optimizeBannerImage = async (file, spec) => {
  if (!file || !spec) return file;
  const { img, revoke } = await loadImageElement(file);
  try {
    const fullImage = { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
    return optimizedFileFromCanvas(renderCrop(img, spec, fullImage, false), file, spec);
  } finally {
    revoke();
  }
};
