import React, { useEffect, useMemo, useState } from "react";
import GoogleMapReact from "google-map-react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { getAdminBookingModificationCatalog, getAdminBookingScheduleSlots, previewAdminBookingModification, requestAdminBookingConsent, getAdminBookingConsentStatus, saveAdminBookingModification } from "../../api";
import { getGoogleMapsApiKey } from "../../utils/googleMaps";

const MapPin = () => <Box sx={{ width: 18, height: 18, borderRadius: "50% 50% 50% 0", bgcolor: "error.main", border: "2px solid white", transform: "rotate(-45deg)", boxShadow: 2 }} />;
const selectedIds = (items) => (items || []).map((item) => String(item?._id || item));
const locationState = (source) => ({ address: source?.address || "", latitude: source?.latitude ?? "", longitude: source?.longitude ?? "" });

function LocationEditor({ title, value, onChange }) {
  const [mapError, setMapError] = useState("");
  const lat = Number(value.latitude);
  const lng = Number(value.longitude);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng) && value.latitude !== "" && value.longitude !== "";
  const center = hasCoordinates ? { lat, lng } : { lat: 20.5937, lng: 78.9629 };
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography fontWeight={800} mb={1.5}>{title}</Typography>
      <Stack spacing={1.5}>
        <TextField label="Full address" value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} fullWidth size="small" />
        <Grid container spacing={1}>
          <Grid item xs={6}><TextField label="Latitude" value={value.latitude} onChange={(e) => onChange({ ...value, latitude: e.target.value })} fullWidth size="small" /></Grid>
          <Grid item xs={6}><TextField label="Longitude" value={value.longitude} onChange={(e) => onChange({ ...value, longitude: e.target.value })} fullWidth size="small" /></Grid>
        </Grid>
        <Box sx={{ height: 240, borderRadius: 1.5, overflow: "hidden", border: "1px solid #d8dee8" }}>
          <GoogleMapReact
            bootstrapURLKeys={{ key: getGoogleMapsApiKey() }}
            center={center}
            zoom={hasCoordinates ? 14 : 5}
            onClick={({ lat: latitude, lng: longitude }) => {
              const point = { latitude: Number(latitude.toFixed(7)), longitude: Number(longitude.toFixed(7)) };
              setMapError("");
              if (!window.google?.maps?.Geocoder) {
                setMapError("Google Maps geocoding is unavailable. Enter coordinates and verify the address.");
                onChange({ ...value, ...point });
                return;
              }
              new window.google.maps.Geocoder().geocode({ location: { lat: point.latitude, lng: point.longitude } }, (results, status) => {
                const address = status === "OK" ? results?.[0]?.formatted_address : "";
                if (!address) setMapError("Could not resolve an address for this map point. Check the address before previewing.");
                onChange({ ...value, ...point, ...(address ? { address } : {}) });
              });
            }}
          >
            {hasCoordinates && <MapPin lat={lat} lng={lng} />}
          </GoogleMapReact>
        </Box>
        {mapError && <Alert severity="warning">{mapError}</Alert>}
        <Typography variant="caption" color="text.secondary">Click the map to set real coordinates. Confirm the address against the pin with the customer.</Typography>
      </Stack>
    </Paper>
  );
}

function todayLocalDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function BookingModificationDialog({ open, booking, onClose, onSaved }) {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(null);
  const [services, setServices] = useState([]);
  const [additionalServices, setAdditionalServices] = useState([]);
  const [pickupLocation, setPickupLocation] = useState(locationState(booking?.pickupLocation));
  const [deliveryLocation, setDeliveryLocation] = useState(locationState(booking?.deliveryLocation));
  const [scheduleDate, setScheduleDate] = useState(booking?.scheduleDate || "");
  const [timeSlot, setTimeSlot] = useState(booking?.timeSlot || "");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [userBikeId, setUserBikeId] = useState(String(booking?.userBike_id?._id || booking?.userBike_id || ""));
  const [reason, setReason] = useState("");
  const [consentId, setConsentId] = useState("");
  const [consentStatus, setConsentStatus] = useState("");
  const [edit, setEdit] = useState({ services: false, pickup: false, delivery: false, schedule: false, vehicle: false });

  useEffect(() => {
    if (!open || !booking?._id) return undefined;
    setPickupLocation(locationState(booking.pickupLocation));
    setDeliveryLocation(locationState(booking.deliveryLocation));
    setScheduleDate(booking.scheduleDate || "");
    setTimeSlot(booking.timeSlot || "");
    setUserBikeId(String(booking.userBike_id?._id || booking.userBike_id || ""));
    setEdit({ services: false, pickup: false, delivery: false, schedule: false, vehicle: false });
    setReason("");
    setSuccess("");
    setConsentId("");
    setConsentStatus("");
    let active = true;
    setLoading(true); setError(""); setPreview(null);
    getAdminBookingModificationCatalog(booking._id)
      .then((result) => {
        if (!active) return;
        setCatalog(result?.data || null);
        if (!result?.success) setError(result?.message || "Could not load booking edit options.");
        setServices(result?.data?.selectedServices || selectedIds(booking.services));
        setAdditionalServices(result?.data?.selectedAdditionalServices || selectedIds(booking.additionalServices));
      })
      .catch((e) => active && setError(e.message || "Could not load booking edit options."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, booking?._id, booking?.services, booking?.additionalServices, booking?.pickupLocation, booking?.deliveryLocation, booking?.scheduleDate, booking?.timeSlot, booking?.userBike_id]);

  useEffect(() => {
    if (!open || !edit.schedule || !booking?._id || !scheduleDate) {
      setAvailableSlots([]);
      setSlotsError("");
      setSlotsLoading(false);
      return undefined;
    }
    let active = true;
    setAvailableSlots([]);
    setSlotsError("");
    setSlotsLoading(true);
    getAdminBookingScheduleSlots(booking._id, scheduleDate)
      .then((result) => {
        if (!active) return;
        if (!result?.success) throw new Error(result?.message || "Could not load available garage slots.");
        setAvailableSlots(result?.data?.slots || []);
      })
      .catch((error) => active && setSlotsError(error.response?.data?.message || error.message || "Could not verify garage availability."))
      .finally(() => active && setSlotsLoading(false));
    return () => { active = false; };
  }, [open, edit.schedule, booking?._id, scheduleDate]);

  useEffect(() => {
    if (!open || !consentId || !booking?._id || ["approved", "rejected", "applied", "expired"].includes(consentStatus)) return undefined;
    let active = true;
    const check = async () => {
      try {
        const result = await getAdminBookingConsentStatus(booking._id, consentId);
        if (active && result?.success) setConsentStatus(result.data?.status || "");
      } catch { /* The next poll can recover from a temporary network failure. */ }
    };
    check();
    const timer = setInterval(check, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [open, booking?._id, consentId, consentStatus]);

  const body = useMemo(() => {
    const changes = {};
    if (edit.services) { changes.services = services; changes.additionalServices = additionalServices; }
    if (edit.pickup) changes.pickupLocation = { address: pickupLocation.address, latitude: Number(pickupLocation.latitude), longitude: Number(pickupLocation.longitude) };
    if (edit.delivery) changes.deliveryLocation = { address: deliveryLocation.address, latitude: Number(deliveryLocation.latitude), longitude: Number(deliveryLocation.longitude) };
    if (edit.schedule) { changes.scheduleDate = scheduleDate; changes.timeSlot = timeSlot; }
    if (edit.vehicle) changes.userBikeId = userBikeId;
    return changes;
  }, [edit, services, additionalServices, pickupLocation, deliveryLocation, scheduleDate, timeSlot, userBikeId]);

  useEffect(() => {
    setPreview(null);
    setConsentId("");
    setConsentStatus("");
    setSuccess("");
  }, [body]);

  const toggle = (list, setList, id) => setList((old) => old.includes(String(id)) ? old.filter((item) => item !== String(id)) : [...old, String(id)]);
  const runPreview = async () => {
    setError(""); setSuccess(""); setPreview(null); setConsentId(""); setConsentStatus(""); setSaving(true); setSavingAction("preview");
    try {
      if (!Object.keys(body).length) throw new Error("Select at least one field to edit.");
      if (body.scheduleDate && body.scheduleDate < todayLocalDate()) throw new Error("Choose today or a future date.");
      if (body.scheduleDate && !body.timeSlot) throw new Error("Choose an available garage time slot for the selected date.");
      for (const key of ["pickupLocation", "deliveryLocation"]) {
        if (!body[key]) continue;
        if (!window.google?.maps?.Geocoder) throw new Error("Google Maps validation is unavailable. Reopen this editor after Maps loads.");
        const result = await new Promise((resolve, reject) => {
          new window.google.maps.Geocoder().geocode({ address: body[key].address }, (matches, status) => {
            if (status !== "OK" || !matches?.[0]?.geometry?.location) return reject(new Error(`Google could not verify the ${key === "pickupLocation" ? "pickup" : "delivery"} address.`));
            resolve(matches[0].geometry.location);
          });
        });
        const targetLat = result.lat(); const targetLng = result.lng();
        const radians = (n) => n * Math.PI / 180;
        const dLat = radians(targetLat - body[key].latitude); const dLng = radians(targetLng - body[key].longitude);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(body[key].latitude)) * Math.cos(radians(targetLat)) * Math.sin(dLng / 2) ** 2;
        const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (distance > 500) throw new Error(`The ${key === "pickupLocation" ? "pickup" : "delivery"} address and map pin are more than 500 m apart. Correct one before previewing.`);
      }
      const result = await previewAdminBookingModification(booking._id, body);
      if (!result?.success) throw new Error(result?.message || "Preview failed.");
      setPreview(result);
    } catch (e) {
      setPreview(null);
      setError(e.response?.data?.message || e.message || "Preview failed.");
    } finally { setSaving(false); setSavingAction(""); }
  };
  const save = async () => {
    if (!preview || consentStatus !== "approved") return;
    if (!reason.trim()) { setError("Enter the support reason."); return; }
    setSaving(true); setSavingAction("save"); setError("");
    try {
      const result = await saveAdminBookingModification(booking._id, { ...body, expectedUpdatedAt: preview.expectedUpdatedAt, reason: reason.trim(), consentReference: consentId });
      if (!result?.success) throw new Error(result?.message || "Booking update failed.");
      await onSaved?.(result.data);
      setSuccess("Booking updated. The change and audit record were saved.");
      setPreview(null); setConsentId(""); setConsentStatus("");
    } catch (e) {
      if (e.response?.data?.code === "BOOKING_CHANGED") {
        setPreview(null); setConsentId(""); setConsentStatus("");
        setError("This booking changed after the preview. Refresh the booking and create a new preview before continuing.");
      } else setError(e.response?.data?.message || e.message || "Booking update failed.");
    }
    finally { setSaving(false); setSavingAction(""); }
  };

  const requestApproval = async () => {
    if (!preview || !reason.trim()) { setError("Add the support reason before requesting customer approval."); return; }
    setSaving(true); setSavingAction("approval"); setError("");
    try {
      const result = await requestAdminBookingConsent(booking._id, { ...body, expectedUpdatedAt: preview.expectedUpdatedAt, reason: reason.trim() });
      if (!result?.success || !result.consentId) throw new Error(result?.message || "Could not request customer approval.");
      setConsentId(result.consentId);
      setConsentStatus(result.status || "pending");
    } catch (e) {
      if (e.response?.data?.code === "BOOKING_CHANGED") setPreview(null);
      setError(e.response?.data?.message || e.message || "Could not request customer approval.");
    }
    finally { setSaving(false); setSavingAction(""); }
  };

  const paidOrClosed = booking?.billStatus === "paid" || booking?.payment_status === "completed" || booking?.billGenerated || ["completed", "awaiting_payment", "payment_selected", "ready_for_delivery", "delivered", "cancelled", "user_cancelled", "rejected", "expired"].includes(booking?.status);
  const pickupStatus = String(booking?.pickupStatus || "pending").toLowerCase();
  const pickupLocked = !["pending", "booking_confirmed"].includes(pickupStatus) || booking?.pickupTrackingActive === true || Boolean(booking?.pickupStartedAt || booking?.riderNearbyAt || booking?.arrivedAt || booking?.pickupOtpVerifiedAt || booking?.pickupCompletedAt || booking?.pickupCurrentLocation?.updatedAt || (booking?.garageTransportStatus && booking.garageTransportStatus !== "NOT_STARTED") || booking?.garageTransportStartedAt || booking?.garageArrivedAt || (booking?.deliveryTransportStatus && booking.deliveryTransportStatus !== "NOT_STARTED") || booking?.deliveryTransportStartedAt || booking?.deliveryArrivedAt || booking?.deliveryTransportCompletedAt) || !["pending", "confirmed"].includes(booking?.status) || paidOrClosed;
  const scheduleEnabled = Boolean(catalog?.scheduleChangesEnabled) && !pickupLocked;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 900 }}>Edit booking</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          {loading ? <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box> : <>
            <Alert severity="info">Changes are stage-checked by the backend. Paid invoices are locked. The assigned garage and historical tracking points are not changed.</Alert>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <FormControlLabel disabled={paidOrClosed || !catalog} control={<Checkbox checked={edit.services} onChange={(e) => setEdit((s) => ({ ...s, services: e.target.checked }))} />} label="Edit services (quantity is not supported by the booking schema)" />
              {edit.services && <Grid container spacing={1}>
                {[ ["Services", catalog?.services || [], services, setServices], ["Additional services", catalog?.additionalServices || [], additionalServices, setAdditionalServices] ].map(([title, items, selected, setSelected]) => <Grid item xs={12} sm={6} key={title}>
                  <Typography variant="subtitle2" fontWeight={800}>{title}</Typography>
                  {items.map((item) => <FormControlLabel key={item._id} sx={{ display: "flex" }} control={<Checkbox checked={selected.includes(String(item._id))} onChange={() => toggle(selected, setSelected, item._id)} />} label={`${item.name} — ₹${Number(item.price).toFixed(2)}`} />)}
                  {!items.length && <Typography variant="caption" color="text.secondary">No eligible catalog entries for this bike.</Typography>}
                </Grid>)}
              </Grid>}
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <FormControlLabel disabled={!scheduleEnabled} control={<Checkbox checked={edit.schedule} onChange={(e) => setEdit((s) => ({ ...s, schedule: e.target.checked }))} />} label="Reschedule booking (before pickup only)" />
              {!scheduleEnabled && <Alert severity="info">{pickupLocked ? (catalog?.scheduleChangeBlockedReason || "Pickup, garage transport, service, payment, or delivery activity has started. Rescheduling is locked.") : (catalog?.scheduleChangeBlockedReason || "Garage slot capacity and existing reservations are not verified. Rescheduling remains disabled until authoritative capacity is configured and reconciled.")}</Alert>}
              {edit.schedule && <><Alert severity="info">Available times come from configured garage capacity. The backend checks pickup lifecycle and slot capacity again during preview and save. Customer approval is required.</Alert><Grid container spacing={1}><Grid item xs={12} sm={6}><TextField type="date" label="Date" InputLabelProps={{ shrink: true }} inputProps={{ min: todayLocalDate() }} value={scheduleDate} onChange={(e) => { setScheduleDate(e.target.value); setTimeSlot(""); }} fullWidth /></Grid><Grid item xs={12} sm={6}><TextField select label="Available time slot" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} disabled={slotsLoading || !availableSlots.length} fullWidth>{availableSlots.map((slot) => <MenuItem key={slot.timeSlot} value={slot.timeSlot}>{slot.timeSlot}{slot.current ? " · current" : ` · ${slot.remaining} remaining`}</MenuItem>)}</TextField></Grid></Grid>{slotsLoading && <Box display="flex" alignItems="center" gap={1}><CircularProgress size={18} /><Typography variant="caption">Checking garage capacity…</Typography></Box>}{slotsError && <Alert severity="error">{slotsError}</Alert>}{!slotsLoading && !slotsError && !availableSlots.length && <Alert severity="warning">No verified open garage slots are configured for this date.</Alert>}</>}
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <FormControlLabel disabled={pickupLocked || !catalog?.vehicles?.length} control={<Checkbox checked={edit.vehicle} onChange={(e) => setEdit((s) => ({ ...s, vehicle: e.target.checked }))} />} label="Correct customer vehicle (before pickup)" />
              {edit.vehicle && <TextField select label="Customer vehicle" value={userBikeId} onChange={(e) => setUserBikeId(e.target.value)} fullWidth>{(catalog?.vehicles || []).map((bike) => <MenuItem key={bike._id} value={bike._id}>{bike.plate_number} · {bike.name} {bike.model} ({bike.bike_cc} cc)</MenuItem>)}</TextField>}
            </Paper>
            <FormControlLabel disabled={pickupLocked} control={<Checkbox checked={edit.pickup} onChange={(e) => setEdit((s) => ({ ...s, pickup: e.target.checked }))} />} label="Correct pickup address and map pin" />
            {edit.pickup && <LocationEditor title="Pickup location" value={pickupLocation} onChange={setPickupLocation} />}
            <FormControlLabel disabled={["OUT_FOR_DELIVERY", "ARRIVED_AT_CUSTOMER", "DELIVERED"].includes(String(booking?.deliveryTransportStatus || "").toUpperCase())} control={<Checkbox checked={edit.delivery} onChange={(e) => setEdit((s) => ({ ...s, delivery: e.target.checked }))} />} label="Correct delivery address and map pin" />
            {edit.delivery && <LocationEditor title="Delivery location" value={deliveryLocation} onChange={setDeliveryLocation} />}
            <TextField label="Support reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} fullWidth />
            {preview && <Alert severity={consentStatus === "approved" ? "success" : consentStatus === "rejected" ? "error" : "warning"}><b>Price difference: ₹{Number(preview.priceDifference || 0).toFixed(2)}</b><br />Service total: ₹{Number(preview.before?.serviceAmount || 0).toFixed(2)} → ₹{Number(preview.after?.serviceAmount || 0).toFixed(2)}<br />Customer total: ₹{Number(preview.before?.customerTotal || 0).toFixed(2)} → ₹{Number(preview.after?.customerTotal || 0).toFixed(2)} · Amount due: ₹{Number(preview.before?.amountDue || 0).toFixed(2)} → ₹{Number(preview.after?.amountDue || 0).toFixed(2)}<br />{consentStatus === "approved" ? "Customer approved these exact changes." : consentStatus === "rejected" ? "Customer declined this request. Revise the proposal to request approval again." : consentStatus === "pending" ? "Waiting for the customer to review this proposal in the User App." : "Customer approval is required before saving."}</Alert>}
          </>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>{success ? "Close" : "Cancel"}</Button>
        <Button variant="outlined" onClick={runPreview} disabled={loading || saving || !Object.keys(body).length}>{savingAction === "preview" ? <CircularProgress size={20} /> : "Preview changes"}</Button>
        <Button variant="outlined" onClick={requestApproval} disabled={!preview || saving || consentStatus === "pending" || consentStatus === "approved"}>{savingAction === "approval" ? <CircularProgress size={20} /> : "Request customer approval"}</Button>
        <Button variant="contained" onClick={save} disabled={!preview || saving || consentStatus !== "approved"}>{saving ? <CircularProgress size={20} /> : "Save changes"}</Button>
      </DialogActions>
    </Dialog>
  );
}
