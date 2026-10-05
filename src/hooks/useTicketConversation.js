import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  getTicketById,
  replyToTicket,
  updateTicketStatus,
} from "../services/ticketService";
import { roleToSenderType } from "../utils/ticketHelpers";
import { useSupportUnread } from "../context/SupportUnreadContext";

// Re-implements the exact fetch/poll/reply/status behavior NewTicket.jsx has
// today (5s polling while not Closed, replying while Open silently
// transitioning to In Progress first, the same Swal confirm/success/error
// UX) behind one hook so the new TicketDrawer can reuse it without
// duplicating that logic. The legacy /all-tickets/view-ticket page keeps its
// own untouched copy — nothing here changes its behavior.
const useTicketConversation = (ticketId) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const { markTicketRead } = useSupportUnread();
  const lastMarkedCountRef = useRef(0);

  const me = useMemo(() => {
    try {
      const raw = localStorage.getItem("userData");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);
  const myId = me?._id;
  const mySenderType = roleToSenderType(me?.role);

  // Reply/status endpoints return the ticket without the admin-only
  // `raisedBy` summary, so carry the last known one forward.
  const keepRaisedBy = (data) => (prev) =>
    data && !data.raisedBy && prev?.raisedBy && String(prev._id) === String(data._id)
      ? { ...data, raisedBy: prev.raisedBy }
      : data;

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await getTicketById(ticketId);
      setTicket(keepRaisedBy(data));
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load ticket");
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) {
      setTicket(null);
      return;
    }
    setLoading(true);
    setText("");
    lastMarkedCountRef.current = 0;
    fetchTicket().finally(() => setLoading(false));
  }, [ticketId, fetchTicket]);

  useEffect(() => {
    if (!ticketId || ticket?.status === "Closed") return;
    const interval = setInterval(fetchTicket, 5000);
    return () => clearInterval(interval);
  }, [ticketId, ticket?.status, fetchTicket]);

  // Marks dealer/user messages read for the admin the moment the ticket is
  // opened, and again whenever a new message shows up while it's still open
  // (via the 5s poll above) — keeps the sidebar badge in sync without the
  // admin needing to reopen the ticket.
  useEffect(() => {
    if (!ticketId || !ticket) return;
    const count = ticket.messages?.length || 0;
    if (count !== lastMarkedCountRef.current) {
      lastMarkedCountRef.current = count;
      markTicketRead(ticketId);
    }
  }, [ticketId, ticket, markTicketRead]);

  const updateStatus = useCallback(
    async (newStatus, { confirm = true } = {}) => {
      if (!ticket?._id || statusLoading) return;
      if (confirm) {
        const result = await Swal.fire({
          title: "Are you sure?",
          text: `Do you want to change the status to "${newStatus}"?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes, change it!",
        });
        if (!result.isConfirmed) return;
      }
      setStatusLoading(true);
      try {
        const data = await updateTicketStatus(ticket._id, newStatus);
        setTicket(keepRaisedBy(data));
        if (confirm) {
          Swal.fire({
            icon: "success",
            title: "Success",
            text: `Status updated to ${newStatus}`,
            confirmButtonColor: "#3085d6",
            timer: 1500,
            showConfirmButton: false,
          });
        }
      } catch (e) {
        Swal.fire({ icon: "error", title: "Error", text: e?.message, confirmButtonColor: "#3085d6" });
      } finally {
        setStatusLoading(false);
      }
    },
    [ticket, statusLoading]
  );

  const sendReply = useCallback(async () => {
    const body = text.trim();
    if (!body || !ticket || replyLoading) return;
    if (!myId) {
      Swal.fire({ icon: "error", title: "Error", text: "You are not logged in." });
      return;
    }
    // Preserves the existing rule: replying while Open first moves the
    // ticket to In Progress (silently, no confirm dialog for this step).
    if (ticket.status === "Open") {
      await updateStatus("In Progress", { confirm: false });
    }
    setReplyLoading(true);
    try {
      const data = await replyToTicket(ticket._id, {
        message: body,
        senderId: myId,
        senderType: mySenderType,
      });
      setTicket(keepRaisedBy(data));
      setText("");
    } catch (e) {
      Swal.fire({ icon: "error", title: "Error", text: e?.message || "Error sending reply" });
    } finally {
      setReplyLoading(false);
    }
  }, [text, ticket, replyLoading, myId, mySenderType, updateStatus]);

  return {
    ticket,
    loading,
    error,
    text,
    setText,
    replyLoading,
    statusLoading,
    sendReply,
    updateStatus,
    refetch: fetchTicket,
  };
};

export default useTicketConversation;
