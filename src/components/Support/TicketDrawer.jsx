import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import useTicketConversation from "../../hooks/useTicketConversation";
import { formatDateTime, getLastActivityAt } from "../../utils/ticketHelpers";
import StatusBadge from "./StatusBadge";
import ProfileCard from "./ProfileCard";
import ConversationTimeline from "./ConversationTimeline";

// Right-side ticket detail drawer — replaces the old full-page
// /all-tickets/view-ticket/:ticketId route. All reply/status/polling logic
// lives in useTicketConversation (shared with nothing else yet, but kept
// separate from this component so it isn't duplicated if another surface
// needs it later); this component is presentation only.
const TicketDrawer = ({ open, ticketId, accentColor = "#2563eb", onClose, onTicketUpdated }) => {
  const { ticket, loading, error, text, setText, replyLoading, statusLoading, sendReply, updateStatus } =
    useTicketConversation(open ? ticketId : null);

  const bottomRef = useRef(null);
  const lastNotifiedRef = useRef(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  useEffect(() => {
    if (ticket?.messages?.length) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 60);
    }
  }, [ticket?.messages?.length]);

  useEffect(() => {
    if (!ticket) return;
    const key = `${ticket._id}:${ticket.status}:${ticket.messages?.length}`;
    if (lastNotifiedRef.current !== key) {
      lastNotifiedRef.current = key;
      onTicketUpdated?.(ticket);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  const handleSend = () => sendReply();

  const handleConfirmCloseTicket = async () => {
    await updateStatus("Closed", { confirm: false });
    setCloseConfirmOpen(false);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 640 }, display: "flex", flexDirection: "column" } }}
    >
      <Box sx={{ height: 4, bgcolor: accentColor, flexShrink: 0 }} />

      <Box sx={{ p: 2.5, borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700 }}>
              #{ticket?.ticketNo || ticketId}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }} noWrap>
              {ticket?.subject || "Ticket"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close ticket drawer">
            <Close />
          </IconButton>
        </Box>
        {ticket && (
          <Box sx={{ mt: 1 }}>
            <StatusBadge status={ticket.status} />
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Typography sx={{ color: "#ef4444" }}>{error}</Typography>
        ) : !ticket ? null : (
          <>
            {ticket.source === "booking_support" && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  borderRadius: "12px",
                  bgcolor: ticket.priority === "urgent" ? "#fff1f2" : "#eff6ff",
                  border: `1px solid ${ticket.priority === "urgent" ? "#fecdd3" : "#bfdbfe"}`,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75, flexWrap: "wrap" }}>
                  <Chip
                    size="small"
                    label={`${String(ticket.priority || "normal").toUpperCase()} PRIORITY`}
                    color={ticket.priority === "urgent" ? "error" : "warning"}
                    sx={{ fontWeight: 800, fontSize: "0.65rem" }}
                  />
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                    Booking #{String(ticket.booking_id || "").slice(-6).toUpperCase()}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 800 }}>
                  {ticket.issue_label || "Booking support issue"}
                </Typography>
                {ticket.booking_status_at_creation && (
                  <Typography variant="caption" sx={{ color: "#64748b" }}>
                    Booking status when raised: {ticket.booking_status_at_creation}
                  </Typography>
                )}
              </Box>
            )}

            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>Created</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDateTime(ticket.created_at)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>Last Update</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDateTime(getLastActivityAt(ticket))}</Typography>
              </Grid>
            </Grid>

            <Box sx={{ mb: 2.5 }}>
              <ProfileCard ticket={ticket} accentColor={accentColor} />
            </Box>

            <Typography variant="overline" sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: "0.06em" }}>
              Conversation
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <ConversationTimeline messages={ticket.messages} accentColor={accentColor} bottomRef={bottomRef} />
          </>
        )}
      </Box>

      {ticket && (
        <Box sx={{ p: 2, borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
          {ticket.status === "Closed" ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "#f8fafc", borderRadius: "10px", p: 1.5 }}>
              <Typography variant="body2" sx={{ color: "#64748b" }}>This ticket is closed.</Typography>
              <Button size="small" onClick={() => updateStatus("Open")} disabled={statusLoading} sx={{ color: accentColor, fontWeight: 700 }}>
                Reopen
              </Button>
            </Box>
          ) : (
            <>
              {ticket.status === "Open" && (
                <Typography variant="caption" sx={{ display: "block", mb: 1, color: "#0ea5e9", fontWeight: 600 }}>
                  Replying will mark this ticket as In Progress.
                </Typography>
              )}
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                placeholder="Type your reply…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={replyLoading}
                sx={{ mb: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Button variant="outlined" color="error" size="small" onClick={() => setCloseConfirmOpen(true)} disabled={statusLoading}>
                  Close Ticket
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSend}
                  disabled={!text.trim() || replyLoading}
                  sx={{ bgcolor: accentColor, "&:hover": { bgcolor: accentColor } }}
                >
                  {replyLoading ? "Sending…" : "Reply"}
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}

      <Dialog
        open={closeConfirmOpen}
        onClose={(_, reason) => {
          if (statusLoading && reason === "backdropClick") return;
          setCloseConfirmOpen(false);
        }}
        aria-labelledby="close-ticket-dialog-title"
        aria-describedby="close-ticket-dialog-description"
      >
        <DialogTitle id="close-ticket-dialog-title" sx={{ fontWeight: 800 }}>
          Close Ticket?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="close-ticket-dialog-description">
            Are you sure you want to close this support ticket? This action can be reversed only if reopening is
            supported.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCloseConfirmOpen(false)} disabled={statusLoading} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmCloseTicket} disabled={statusLoading} variant="contained" color="error">
            {statusLoading ? "Closing…" : "Close Ticket"}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default TicketDrawer;
