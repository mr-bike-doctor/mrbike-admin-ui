import React, { useState, useEffect, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import { addBanner, getBaseServiceList } from "../../api";
import ImageCropDialog from "../Common/ImageCropDialog";
import { BANNER_IMAGE_SPECS, formatSpec, validateBannerImage } from "../../utils/bannerImageSpecs";
import { useNavigate } from "react-router-dom";

// Legacy banners land on the app's home slider, so they share the Home Hero spec.
const HOME_SPEC = BANNER_IMAGE_SPECS.home;

const GOOGLE_MAPS_KEY = "AIzaSyCM15ry8lewwj6YZ-04_m7Z58dsQo_hBBA";

const loadGoogleMapsScript = (onReady) => {
  if (window.google?.maps?.places) { onReady(); return; }
  if (document.querySelector("script[data-gmaps]")) {
    const wait = setInterval(() => {
      if (window.google?.maps?.places) { clearInterval(wait); onReady(); }
    }, 100);
    return;
  }
  window.__gmapsCallback = () => { delete window.__gmapsCallback; onReady(); };
  const script = document.createElement("script");
  script.setAttribute("data-gmaps", "1");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&callback=__gmapsCallback`;
  script.async = true;
  document.head.appendChild(script);
};

const BannerForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    from_date: "",
    expiry_date: "",
    baseServiceId: "",
    locationType: "all",
    placeId: "",
    placeName: "",
    latitude: "",
    longitude: "",
    radius: "",
    displayOrder: "0",
    imageOnly: false,
  });
  const navigate = useNavigate()
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  // The picked file waiting to be cropped — also the crop dialog's open flag.
  const [cropSource, setCropSource] = useState(null);
  const [errors, setErrors] = useState({});
  const [services, setServices] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [googleReady, setGoogleReady] = useState(!!window.google?.maps?.places);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  // State updates are asynchronous, so keep an immediate lock as well. This
  // prevents two rapid clicks from starting two requests in the same render.
  const submitLockRef = useRef(false);

  // "Image already has text" turns the app's own overlay off, so the artwork
  // has to be the finished creative — and the crop dialog must stop shading
  // the bottom of the frame as if the app were going to paint text there.
  const imageSpec = useMemo(
    () =>
      formData.imageOnly
        ? {
            ...HOME_SPEC,
            note: "Finished creative — the app shows this image alone, with no title, description or button over it. Keep important content away from the rounded corners.",
            overlayBottomPct: 0,
          }
        : HOME_SPEC,
    [formData.imageOnly]
  );

  useEffect(() => {
    getBaseServiceList()
      .then((res) => { if (res?.data) setServices(res.data); })
      .catch(() => {});
  }, []);

  // Load Google Maps only when "Specific" location is selected
  useEffect(() => {
    if (formData.locationType !== "specific") {
      autocompleteRef.current = null;
      return;
    }
    loadGoogleMapsScript(() => setGoogleReady(true));
  }, [formData.locationType]);

  useEffect(() => {
    if (!googleReady || formData.locationType !== "specific" || !searchInputRef.current || autocompleteRef.current) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      searchInputRef.current,
      { fields: ["place_id", "geometry", "name", "formatted_address"] }
    );
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (!place?.geometry) return;
      const name = place.name || searchInputRef.current.value;
      setLocationQuery(name);
      setFormData((prev) => ({
        ...prev,
        placeId: place.place_id || "",
        placeName: name,
        latitude: String(place.geometry.location.lat()),
        longitude: String(place.geometry.location.lng()),
      }));
      setErrors((prev) => ({ ...prev, placeName: null }));
    });
  }, [googleReady, formData.locationType]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (name === "locationType" && value === "all") {
        updated.placeId = "";
        updated.placeName = "";
        updated.latitude = "";
        updated.longitude = "";
        updated.radius = "";
      }
      return updated;
    });
    if (name === "locationType" && value === "all") setLocationQuery("");
  };

  const handleLocationQueryChange = (e) => {
    const val = e.target.value;
    setLocationQuery(val);
    if (!val.trim()) {
      setFormData((prev) => ({ ...prev, placeId: "", placeName: "", latitude: "", longitude: "" }));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    // Reset so re-picking the same rejected file fires onChange again.
    e.target.value = "";
    if (!file) return;

    // Type, weight and exact pixel size are all gated here — an off-size
    // banner gets cropped by the app's fixed-height card and cannot be fixed
    // once it is live. A wrong-size file is not bounced, though: the admin
    // crops it to size right here, so they decide what gets cut off.
    const result = await validateBannerImage(file, imageSpec);
    if (result.needsCrop) {
      setImage(null);
      setPreview(null);
      setErrors((prev) => ({ ...prev, image: null }));
      setCropSource(file);
      return;
    }
    if (!result.ok) {
      setImage(null);
      setPreview(null);
      setErrors((prev) => ({ ...prev, image: result.message }));
      Swal.fire({
        icon: "error",
        title: "Image Not Accepted",
        text: result.message,
      });
      return;
    }

    setErrors((prev) => ({ ...prev, image: null }));
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleCropped = (croppedFile) => {
    setCropSource(null);
    setErrors((prev) => ({ ...prev, image: null }));
    setImage(croppedFile);
    setPreview(URL.createObjectURL(croppedFile));
  };

  const handleCropCancel = () => {
    const pending = cropSource;
    setCropSource(null);
    if (!image && pending) {
      setErrors((prev) => ({
        ...prev,
        image: `Crop cancelled — the banner must be exactly ${formatSpec(imageSpec)}. Choose the image again to crop it.`,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLockRef.current) return;

    const { name, from_date, expiry_date, locationType, placeName, latitude, longitude, radius } = formData;
    const newErrors = {};

    // Date parsing
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight
    const from = new Date(from_date);
    const to = new Date(expiry_date);

    // Validation
    if (!name) newErrors.name = "Banner name is required.";

    if (!from_date) {
      newErrors.from_date = "From date is required.";
    } else if (from < today) {
      newErrors.from_date = "From date cannot be in the past.";
    }

    if (!expiry_date) {
      newErrors.expiry_date = "Expiry date is required.";
    } else if (from_date && expiry_date && to < from) {
      newErrors.expiry_date = "Expiry date cannot be before start date.";
    }

    if (!image) newErrors.image = "Banner image is required.";

    if (locationType === "specific") {
      if (!placeName || !latitude || !longitude) {
        newErrors.placeName = "Please search and select a location from the suggestions.";
      }
      if (!radius || isNaN(Number(radius)) || Number(radius) <= 0) {
        newErrors.radius = "Please enter a valid radius (greater than 0).";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    // Proceed if no errors
    const form = new FormData();
    form.append("name", name);
    form.append("from_date", from_date);
    form.append("expiry_date", expiry_date);
    form.append("images", image); // must match backend key
    form.append("baseServiceId", formData.baseServiceId || "");
    form.append("locationType", locationType);
    form.append("placeId", formData.placeId || "");
    form.append("placeName", formData.placeName || "");
    form.append("latitude", formData.latitude || "");
    form.append("longitude", formData.longitude || "");
    form.append("radius", formData.radius || "");
    form.append("displayOrder", formData.displayOrder || "0");
    form.append("imageOnly", String(formData.imageOnly));

    try {
      const response = await addBanner(form);

      Swal.fire({
        title: "Success!",
        text: response.message || "Banner added successfully.",
        icon: "success",
      });
      navigate("/bannerList")
      setFormData({
        name: "",
        from_date: "",
        expiry_date: "",
        baseServiceId: "",
        locationType: "all",
        placeId: "",
        placeName: "",
        latitude: "",
        longitude: "",
        radius: "",
        displayOrder: "0",
        imageOnly: false,
      });
      setLocationQuery("");
      setImage(null);
      setErrors({});
    } catch (error) {
      Swal.fire({
        title: "Error!",
        text: error.response?.data?.message || "Something went wrong!",
        icon: "error",
      });
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="row">
      <div className="col-sm-12">
        <div className="card-table card p-3">
          <div className="card-body">
            <form className="form-horizontal" onSubmit={handleSubmit}>
              <div className="input-block mb-3">
                <label className="form-control-label">Banner Name</label>
                <input
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>

              <div className="input-block mb-3">
                <label className="form-control-label">From Date</label>
                <input
                  className={`form-control ${errors.from_date ? "is-invalid" : ""}`}
                  name="from_date"
                  type="date"
                  value={formData.from_date}
                  onChange={handleChange}
                />
                {errors.from_date && <div className="invalid-feedback">{errors.from_date}</div>}
              </div>

              <div className="input-block mb-3">
                <label className="form-control-label">Expiry Date</label>
                <input
                  className={`form-control ${errors.expiry_date ? "is-invalid" : ""}`}
                  name="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={handleChange}
                />
                {errors.expiry_date && <div className="invalid-feedback">{errors.expiry_date}</div>}
              </div>

              <div className="input-block mb-3">
                <label className="form-control-label">Upload Banner Image</label>
                <div className="alert alert-info py-2 px-3 mb-2" role="alert">
                  <strong>Required size: {formatSpec(imageSpec)}</strong> — any other size opens the crop tool.
                  <br />
                  <small>{imageSpec.note}</small>
                </div>
                <input
                  type="file"
                  className={`form-control mb-2 ${errors.image ? "is-invalid" : ""}`}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
                {errors.image && <div className="invalid-feedback d-block">{errors.image}</div>}
                {preview && (
                  <div className="border rounded p-2 bg-light text-center">
                    <img
                      src={preview}
                      alt="Preview"
                      style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" }}
                    />
                    <div className="mt-2">
                      <span className="badge bg-success me-2">{formatSpec(imageSpec)}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setCropSource(image)}
                      >
                        Adjust crop
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="input-block mb-3 border rounded p-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="bannerImageOnly"
                    name="imageOnly"
                    checked={formData.imageOnly}
                    onChange={handleChange}
                  />
                  <label className="form-control-label fw-bold mb-0" htmlFor="bannerImageOnly">
                    Image already has text
                  </label>
                </div>
                <small className="text-muted d-block mt-1">
                  On: the app hides its dark gradient, title and Bike Service button, and shows your
                  creative as-is. Turn this on for ready-made posters.
                </small>
              </div>

              <div className="input-block mb-3">
                <label className="form-control-label">Linked Service (optional)</label>
                <select
                  className="form-control"
                  name="baseServiceId"
                  value={formData.baseServiceId}
                  onChange={handleChange}
                >
                  <option value="">-- No Service Linked --</option>
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="input-block mb-3">
                <label className="form-control-label">Location Type</label>
                <select
                  className="form-control"
                  name="locationType"
                  value={formData.locationType}
                  onChange={handleChange}
                >
                  <option value="all">All Locations</option>
                  <option value="specific">Specific Location</option>
                </select>
              </div>

              {formData.locationType === "specific" && (
                <div className="input-block mb-3 border rounded p-3">
                  <label className="form-control-label">Search Location</label>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className={`form-control mb-2 ${errors.placeName ? "is-invalid" : ""}`}
                    placeholder={googleReady ? "Type to search a place..." : "Loading Google Maps..."}
                    value={locationQuery}
                    onChange={handleLocationQueryChange}
                    disabled={!googleReady}
                  />
                  {errors.placeName && <div className="invalid-feedback d-block">{errors.placeName}</div>}

                  <div className="row">
                    <div className="col-md-4 mb-2">
                      <label className="form-control-label">Latitude</label>
                      <input type="text" className="form-control" value={formData.latitude} readOnly />
                    </div>
                    <div className="col-md-4 mb-2">
                      <label className="form-control-label">Longitude</label>
                      <input type="text" className="form-control" value={formData.longitude} readOnly />
                    </div>
                    <div className="col-md-4 mb-2">
                      <label className="form-control-label">Radius (km)</label>
                      <input
                        type="number"
                        name="radius"
                        className={`form-control ${errors.radius ? "is-invalid" : ""}`}
                        value={formData.radius}
                        onChange={handleChange}
                        min="0.1"
                        step="0.5"
                      />
                      {errors.radius && <div className="invalid-feedback">{errors.radius}</div>}
                    </div>
                  </div>
                </div>
              )}

              <div className="input-block mb-3">
                <label className="form-control-label">Display Order</label>
                <input
                  type="number"
                  name="displayOrder"
                  className="form-control"
                  value={formData.displayOrder}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="form-group col-lg-12 mb-3">
                <button
                  className="btn btn-primary mt-4 mb-5"
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Creating...
                    </>
                  ) : (
                    "Create Banner"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ImageCropDialog
        open={Boolean(cropSource)}
        file={cropSource}
        spec={imageSpec}
        onCancel={handleCropCancel}
        onCropped={handleCropped}
      />
    </div>
  );
};

export default BannerForm;
