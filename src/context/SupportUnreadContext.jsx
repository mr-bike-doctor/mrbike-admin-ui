import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getSupportUnreadCount,
  invalidateTicketListCache,
  markTicketRead as markTicketReadApi,
} from "../services/ticketService";
import { getSocket } from "../socket";
import Swal from "sweetalert2";

const SupportUnreadContext = createContext({
  unreadCount: 0,
  refreshUnreadCount: () => {},
  markTicketRead: () => {},
});

export const useSupportUnread = () => useContext(SupportUnreadContext);

const POLL_INTERVAL_MS = 300000;

const getLoggedInAdminId = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw)?._id : null;
  } catch {
    return null;
  }
};

export const SupportUnreadProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!localStorage.getItem("adminToken")) return;
    try {
      const count = await getSupportUnreadCount();
      setUnreadCount(count);
    } catch {
      // Badge just keeps its last known value on transient failures.
    }
  }, []);

  // The badge is driven by the "support:unread:changed" socket event below,
  // which the server emits on every ticket create, reply and mark-read. This
  // interval is only a fallback for a socket that never connected or silently
  // dropped, so it runs slowly and stops entirely while the tab is hidden —
  // refocusing the tab refreshes right away instead of waiting it out.
  useEffect(() => {
    const startPolling = () => {
      clearInterval(pollRef.current);
      pollRef.current = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(pollRef.current);
        return;
      }
      refreshUnreadCount();
      startPolling();
    };

    refreshUnreadCount();
    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    const adminId = getLoggedInAdminId();
    if (!adminId) return undefined;

    const socket = getSocket();
    // Events fired while the socket was down were never delivered, so a
    // (re)connect re-syncs the count rather than only rejoining the room.
    const join = () => {
      socket.emit("admin:join", { adminId });
      refreshUnreadCount();
    };
    join();
    socket.on("connect", join);
    socket.on("support:unread:changed", refreshUnreadCount);
    const handleNewBookingIssue = (event = {}) => {
      refreshUnreadCount();
      invalidateTicketListCache();
      window.dispatchEvent(new CustomEvent("support:ticket:new", { detail: event }));
      Swal.fire({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: event.priority === "urgent" ? 7000 : 5000,
        timerProgressBar: true,
        icon: event.priority === "urgent" ? "warning" : "info",
        title: event.priority === "urgent" ? "Urgent booking issue" : "New booking issue",
        text: event.issueLabel || event.subject || "A customer needs help with a booking.",
      });
    };
    socket.on("support:booking:new", handleNewBookingIssue);

    return () => {
      socket.off("connect", join);
      socket.off("support:unread:changed", refreshUnreadCount);
      socket.off("support:booking:new", handleNewBookingIssue);
    };
  }, [refreshUnreadCount]);

  const markTicketRead = useCallback(
    async (ticketId) => {
      if (!ticketId) return;
      try {
        const count = await markTicketReadApi(ticketId);
        setUnreadCount(count);
      } catch {
        refreshUnreadCount();
      }
    },
    [refreshUnreadCount]
  );

  return (
    <SupportUnreadContext.Provider
      value={{ unreadCount, refreshUnreadCount, markTicketRead }}
    >
      {children}
    </SupportUnreadContext.Provider>
  );
};

export default SupportUnreadContext;
