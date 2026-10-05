import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Avatar, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { resolvePartyType } from "../../utils/ticketHelpers";

const Field = ({ label, value, href }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
      {label}
    </Typography>
    {href && value ? (
      <Typography
        component="a"
        href={href}
        variant="body2"
        sx={{ fontWeight: 600, color: "#0f172a", textDecoration: "none", wordBreak: "break-all" }}
      >
        {value}
      </Typography>
    ) : (
      <Typography variant="body2" sx={{ fontWeight: 600, color: value ? "#0f172a" : "#cbd5e1", wordBreak: "break-all" }}>
        {value || "—"}
      </Typography>
    )}
  </Box>
);

// Shows who raised the ticket — the backend attaches `raisedBy` (name, phone,
// email, id) for admins, resolved from the customers or Vendor collection.
const ProfileCard = ({ ticket, accentColor = "#2563eb" }) => {
  const partyType = resolvePartyType(ticket.user_type);
  const raisedBy = ticket.raisedBy;
  const isDealer = partyType === "Dealer";
  const name = raisedBy?.name || (raisedBy ? `Unnamed ${partyType.toLowerCase()}` : `${partyType} (account not found)`);
  const profilePath = raisedBy?._id ? (isDealer ? `/view-dealer/${raisedBy._id}` : `/view-customer/${raisedBy._id}`) : null;

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", border: "1px solid #f1f5f9" }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: raisedBy ? 1.5 : 0 }}>
        <Avatar sx={{ bgcolor: `${accentColor}15`, color: accentColor, fontWeight: 700, width: 44, height: 44 }}>
          {(raisedBy?.name || partyType).slice(0, 1).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }} noWrap>
            {name}
          </Typography>
          <Typography variant="caption" sx={{ color: "#94a3b8" }}>
            {partyType}
            {isDealer && raisedBy?.ownerName && raisedBy.ownerName !== raisedBy.name ? ` · Owner: ${raisedBy.ownerName}` : ""}
          </Typography>
        </Box>
        {profilePath && (
          <Button
            component={RouterLink}
            to={profilePath}
            size="small"
            variant="outlined"
            sx={{ borderRadius: "8px", fontWeight: 700, color: accentColor, borderColor: `${accentColor}55`, flexShrink: 0 }}
          >
            View profile
          </Button>
        )}
      </Stack>

      {raisedBy && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
          <Field label="Phone" value={raisedBy.phone} href={raisedBy.phone ? `tel:${raisedBy.phone}` : null} />
          <Field label="Email" value={raisedBy.email} href={raisedBy.email ? `mailto:${raisedBy.email}` : null} />
          <Field label={isDealer ? "Dealer ID" : "Customer ID"} value={raisedBy.displayId ? String(raisedBy.displayId) : String(raisedBy._id)} />
          <Field label="City" value={raisedBy.city} />
        </Box>
      )}
    </Paper>
  );
};

export default ProfileCard;
