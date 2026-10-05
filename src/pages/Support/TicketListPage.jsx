import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import moment from "moment";
import { useSearchParams } from "react-router-dom";
import useTicketList from "../../hooks/useTicketList";
import { resolvePartyType, getLastMessage, getLastActivityAt, formatDateTime } from "../../utils/ticketHelpers";
import SupportHeader from "../../components/Support/SupportHeader";
import SupportSearch from "../../components/Support/SupportSearch";
import SupportFilters from "../../components/Support/SupportFilters";
import SupportTable from "../../components/Support/SupportTable";
import SupportEmptyState from "../../components/Support/SupportEmptyState";
import StatusBadge from "../../components/Support/StatusBadge";
import TicketDrawer from "../../components/Support/TicketDrawer";

const withinDateRange = (iso, range) => {
  if (range === "all") return true;
  const m = moment(iso);
  if (range === "today") return m.isSameOrAfter(moment().startOf("day"));
  if (range === "7d") return m.isSameOrAfter(moment().subtract(7, "days"));
  if (range === "30d") return m.isSameOrAfter(moment().subtract(30, "days"));
  return true;
};

const columns = [
  { key: "ticketNo", label: "Ticket ID", render: (t) => <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#64748b" }}>#{t.ticketNo || t._id}</Typography> },
  {
    key: "subject",
    label: "Subject",
    minWidth: 260,
    render: (t) => {
      const lastMessage = getLastMessage(t);
      return (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          {t.unread && (
            <Box
              aria-label="Unread"
              sx={{ width: 8, height: 8, mt: "6px", borderRadius: "50%", bgcolor: "#ef4444", flexShrink: 0 }}
            />
          )}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: t.unread ? 700 : 600 }} noWrap>{t.subject}</Typography>
            {lastMessage?.message && (
              <Typography variant="caption" sx={{ color: "#94a3b8" }} noWrap component="div" style={{ maxWidth: 300 }}>
                {lastMessage.message}
              </Typography>
            )}
          </Box>
        </Box>
      );
    },
  },
  {
    key: "raisedBy",
    label: "Raised By",
    minWidth: 180,
    render: (t) => (
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {t.raisedBy?.name || (t.raisedBy ? "Unnamed" : "—")}
        </Typography>
        {t.raisedBy?.phone && (
          <Typography variant="caption" sx={{ color: "#94a3b8" }} noWrap component="div">
            {t.raisedBy.phone}
          </Typography>
        )}
      </Box>
    ),
  },
  { key: "status", label: "Status", render: (t) => <StatusBadge status={t.status} /> },
  { key: "created_at", label: "Created", render: (t) => formatDateTime(t.created_at) },
  { key: "lastActivity", label: "Last Reply", render: (t) => moment(getLastActivityAt(t)).fromNow() },
];

// Shared by /support/customer and /support/dealer — the two pages only differ
// in accent color and which party type they filter to.
const TicketListPage = ({ partyType, title, accentColor }) => {
  const { tickets, loading, refetch } = useTicketList();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState([]);
  const [dateRange, setDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTicketId, setActiveTicketId] = useState(searchParams.get("ticket") || null);

  // Keeps the drawer in sync with the URL when a ?ticket= link (e.g. from the
  // notification panel) is opened while this page is already mounted.
  useEffect(() => {
    const fromUrl = searchParams.get("ticket");
    if (fromUrl !== activeTicketId) setActiveTicketId(fromUrl || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const scoped = useMemo(() => tickets.filter((t) => resolvePartyType(t.user_type) === partyType), [tickets, partyType]);

  const filtered = useMemo(() => {
    let rows = [...scoped];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.subject?.toLowerCase().includes(q) ||
          String(t.ticketNo || t._id).toLowerCase().includes(q) ||
          t.raisedBy?.name?.toLowerCase().includes(q) ||
          t.raisedBy?.phone?.toLowerCase().includes(q) ||
          t.raisedBy?.email?.toLowerCase().includes(q) ||
          (t.messages || []).some((m) => m.message?.toLowerCase().includes(q))
      );
    }
    if (status.length) rows = rows.filter((t) => status.includes(t.status));
    rows = rows.filter((t) => withinDateRange(t.created_at, dateRange));
    // Unread tickets float to the top; stable sort keeps everything else in
    // its existing (most-recent-first) order.
    rows.sort((a, b) => (b.unread ? 1 : 0) - (a.unread ? 1 : 0));
    return rows;
  }, [scoped, search, status, dateRange]);

  useEffect(() => setPage(1), [search, status, dateRange]);

  const total = filtered.length;
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const hasActiveFilters = Boolean(search || status.length || dateRange !== "all");
  const clearAllFilters = () => {
    setSearch("");
    setStatus([]);
    setDateRange("all");
  };

  const openDrawer = (ticket) => {
    setActiveTicketId(ticket._id);
    setSearchParams({ ticket: ticket._id });
  };
  const closeDrawer = () => {
    setActiveTicketId(null);
    setSearchParams({});
  };

  const getRowActions = (row) => [
    { label: "Open ticket", onClick: openDrawer },
    { label: "Copy link", onClick: (r) => navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?ticket=${r._id}`) },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <SupportHeader title={title} accentColor={accentColor} countLabel={`${scoped.length} tickets · ${scoped.filter((t) => t.status === "Open").length} open`} />

      <Box sx={{ mb: 2 }}>
        <SupportSearch value={search} onChange={setSearch} placeholder="Search by ticket ID, name, phone, subject…" />
      </Box>

      <SupportFilters status={status} onStatusChange={setStatus} dateRange={dateRange} onDateRangeChange={setDateRange} hasActiveFilters={hasActiveFilters} onClearAll={clearAllFilters} />

      <SupportTable
        columns={columns}
        rows={paged}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={openDrawer}
        getRowActions={getRowActions}
        emptyState={<SupportEmptyState filtered={scoped.length > 0} accentColor={accentColor} onClearFilters={clearAllFilters} />}
      />

      <TicketDrawer open={Boolean(activeTicketId)} ticketId={activeTicketId} accentColor={accentColor} onClose={closeDrawer} onTicketUpdated={refetch} />
    </Box>
  );
};

export default TicketListPage;
