import { useCallback, useEffect, useState } from "react";
import { getTicketList } from "../services/ticketService";

// Fetches the single combined customer+dealer ticket list backing
// /support, /support/customer and /support/dealer — the same
// GET /ticket/user-dealer endpoint AllTicket.jsx has always used, shared
// across all three pages instead of being re-fetched with duplicated
// effect code in each one.
const useTicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getTicketList();
      setTickets(rows);
    } catch (e) {
      setTickets([]);
      setError(e?.message || "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("support:ticket:new", refresh);
    return () => window.removeEventListener("support:ticket:new", refresh);
  }, [load]);

  return { tickets, loading, error, refetch: load };
};

export default useTicketList;
