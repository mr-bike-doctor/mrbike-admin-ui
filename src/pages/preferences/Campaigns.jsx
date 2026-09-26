import React, { useEffect, useMemo, useState } from "react";
import { Box, Chip, Divider, Grid, Stack, Typography } from "@mui/material";
import { Delete, ImageOutlined, NotificationsActive, PauseCircleOutline, PhoneIphone, ToggleOn } from "@mui/icons-material";
import Swal from "sweetalert2";

import PrefHeader from "../../components/Preferences/shared/PrefHeader";
import FilterSelect from "../../components/Preferences/shared/FilterSelect";
import BulkActionBar from "../../components/Preferences/shared/BulkActionBar";
import ConfirmDialog from "../../components/Preferences/shared/ConfirmDialog";
import FormDrawer from "../../components/Preferences/shared/FormDrawer";
import SupportSearch from "../../components/Support/SupportSearch";
import SupportTable from "../../components/Support/SupportTable";
import SupportEmptyState from "../../components/Support/SupportEmptyState";
import CampaignFormDrawer, { AUDIENCE_OPTIONS, STATUS_OPTIONS } from "../../components/Preferences/Campaigns/CampaignFormDrawer";
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  toggleCampaignStatus,
  sendCampaignNow,
  bulkDeleteCampaigns,
  bulkUpdateCampaignStatus,
  getCampaignAnalytics,
} from "../../api/preferences/campaignApi";

const ACCENT = "#f59e0b";

const STATUS_STYLES = {
  draft: { bg: "#f1f5f9", color: "#475569", label: "Draft" },
  scheduled: { bg: "#dbeafe", color: "#1d4ed8", label: "Scheduled" },
  active: { bg: "#dcfce7", color: "#15803d", label: "Active" },
  paused: { bg: "#fef3c7", color: "#b45309", label: "Paused" },
  completed: { bg: "#e2e8f0", color: "#334155", label: "Completed" },
};

const STAT_TILES = [
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "opened", label: "Opened" },
  { key: "clicked", label: "Clicked" },
  { key: "conversionRate", label: "Conversion Rate" },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
const audienceLabel = (value) => AUDIENCE_OPTIONS.find((o) => o.value === value)?.label || value;
const statusMeta = (status) => STATUS_STYLES[status] || STATUS_STYLES.draft;

const normalize = (c) => ({
  id: c._id || c.id,
  title: c.title || "",
  description: c.description || "",
  image: c.image || c.banner || c.bannerUrl || "",
  inAppImage: c.inAppImage || "",
  targetAudience: c.targetAudience || "all",
  pushNotification: c.pushNotification ?? false,
  inAppNotification: c.inAppNotification ?? false,
  scheduleAt: c.scheduleAt || c.scheduledAt || null,
  status: c.status || "draft",
  createdAt: c.createdAt || null,
});

const Campaigns = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [saving, setSaving] = useState(false);

  const [viewCampaign, setViewCampaign] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [confirmState, setConfirmState] = useState({ open: false, mode: null, ids: [], nextStatus: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getCampaigns();
      const list = res?.data || res?.campaigns || (Array.isArray(res) ? res : []);
      setRows(list.map(normalize));
    } catch (e) {
      setError(e?.response?.data?.message || "Could not load campaigns. This module needs its backend endpoints connected.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!viewCampaign) {
      setAnalytics(null);
      return;
    }
    let cancelled = false;
    setAnalyticsLoading(true);
    getCampaignAnalytics(viewCampaign.id)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || res;
        setAnalytics(data && typeof data === "object" ? data : null);
      })
      .catch(() => {
        if (!cancelled) setAnalytics(null);
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewCampaign]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q));
    }
    if (targetAudience) list = list.filter((r) => r.targetAudience === targetAudience);
    if (status) list = list.filter((r) => r.status === status);
    return list;
  }, [rows, search, targetAudience, status]);

  useEffect(() => setPage(1), [search, targetAudience, status]);

  const total = filtered.length;
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const hasActiveFilters = Boolean(search || targetAudience || status);
  const clearAllFilters = () => {
    setSearch("");
    setTargetAudience("");
    setStatus("");
  };

  const openCreate = () => {
    setEditingCampaign(null);
    setDrawerOpen(true);
  };
  const openEdit = (row) => {
    setEditingCampaign(row);
    setDrawerOpen(true);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editingCampaign) {
        await updateCampaign(editingCampaign.id, payload);
      } else {
        await createCampaign(payload);
      }
      setDrawerOpen(false);
      await load();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Save failed", text: e?.response?.data?.message || "Something went wrong. Backend endpoint may not be connected yet." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (row, nextStatus) => {
    const prevStatus = row.status;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)));
    try {
      await toggleCampaignStatus(row.id, nextStatus);
    } catch (e) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: prevStatus } : r)));
      Swal.fire({ icon: "error", title: "Could not update status", text: e?.response?.data?.message || "Something went wrong." });
    }
  };

  const requestDelete = (ids) => setConfirmState({ open: true, mode: "delete", ids, nextStatus: null });
  const requestBulkStatus = (ids, nextStatus) => setConfirmState({ open: true, mode: "status", ids, nextStatus });
  const requestSendNow = (id) => setConfirmState({ open: true, mode: "send-now", ids: [id], nextStatus: null });

  const handleConfirm = async () => {
    const { mode, ids, nextStatus } = confirmState;
    setConfirmLoading(true);
    try {
      if (mode === "delete") {
        if (ids.length > 1) await bulkDeleteCampaigns(ids);
        else await deleteCampaign(ids[0]);
      } else if (mode === "send-now") {
        await sendCampaignNow(ids[0]);
      } else {
        if (ids.length > 1) await bulkUpdateCampaignStatus(ids, nextStatus);
        else await toggleCampaignStatus(ids[0], nextStatus);
      }
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      setConfirmState({ open: false, mode: null, ids: [], nextStatus: null });
      await load();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Action failed", text: e?.response?.data?.message || "Something went wrong." });
    } finally {
      setConfirmLoading(false);
    }
  };

  const toggleRow = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () => setSelectedIds((prev) => (prev.length === paged.length ? [] : paged.map((r) => r.id)));

  const columns = [
    {
      key: "image",
      label: "Banner",
      render: (r) =>
        r.image ? (
          <Box component="img" src={r.image} alt={r.title} sx={{ width: 48, height: 48, objectFit: "cover", borderRadius: "6px" }} />
        ) : (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "6px",
              bgcolor: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
            }}
          >
            <ImageOutlined fontSize="small" />
          </Box>
        ),
    },
    { key: "title", label: "Title", render: (r) => <strong>{r.title}</strong> },
    { key: "targetAudience", label: "Target Audience", render: (r) => audienceLabel(r.targetAudience) },
    {
      key: "channels",
      label: "Channels",
      render: (r) =>
        !r.pushNotification && !r.inAppNotification ? (
          "—"
        ) : (
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {r.pushNotification && (
              <Chip
                icon={<NotificationsActive sx={{ fontSize: 14 }} />}
                label="Push"
                size="small"
                sx={{ bgcolor: "#fef3c7", color: "#b45309", fontWeight: 600 }}
              />
            )}
            {r.inAppNotification && (
              <Chip
                icon={<PhoneIphone sx={{ fontSize: 14 }} />}
                label="In-App"
                size="small"
                sx={{ bgcolor: "#e0f2fe", color: "#0369a1", fontWeight: 600 }}
              />
            )}
          </Stack>
        ),
    },
    { key: "schedule", label: "Schedule", render: (r) => fmtDateTime(r.scheduleAt) },
    {
      key: "status",
      label: "Status",
      render: (r) => {
        const s = statusMeta(r.status);
        return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700 }} />;
      },
    },
    { key: "createdAt", label: "Created", render: (r) => fmtDate(r.createdAt) },
  ];

  const getRowActions = (row) => [
    { label: "View", onClick: () => setViewCampaign(row) },
    { label: "Edit", onClick: () => openEdit(row) },
    { label: "Send Now", onClick: () => requestSendNow(row.id) },
    {
      label: row.status === "active" ? "Pause" : "Resume",
      onClick: () => handleToggleStatus(row, row.status === "active" ? "paused" : "active"),
    },
    { label: "Delete", color: "#ef4444", onClick: () => requestDelete([row.id]) },
  ];

  const statValue = (tileKey) => {
    if (analyticsLoading) return "…";
    if (!analytics || analytics[tileKey] == null) return "—";
    return tileKey === "conversionRate" ? `${analytics[tileKey]}%` : analytics[tileKey];
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <PrefHeader
        title="Campaigns"
        count={rows.length}
        countLabel="campaign"
        onRefresh={load}
        onAdd={openCreate}
        addLabel="Add Campaign"
      />

      {error && (
        <Box sx={{ mb: 2.5, p: 2, borderRadius: "12px", bgcolor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "0.85rem", fontWeight: 600 }}>
          {error}
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <SupportSearch value={search} onChange={setSearch} placeholder="Search by campaign title…" />
      </Box>

      <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <FilterSelect label="Target Audience" value={targetAudience} onChange={setTargetAudience} options={AUDIENCE_OPTIONS} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        {hasActiveFilters && (
          <Chip label="Clear all" size="small" onClick={clearAllFilters} onDelete={clearAllFilters} sx={{ bgcolor: "#f1f5f9", fontWeight: 600, color: "#475569" }} />
        )}
      </Stack>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          { label: "Activate", icon: <ToggleOn fontSize="small" />, onClick: () => requestBulkStatus(selectedIds, "active") },
          { label: "Pause", icon: <PauseCircleOutline fontSize="small" />, onClick: () => requestBulkStatus(selectedIds, "paused") },
          { label: "Delete", icon: <Delete fontSize="small" />, color: "error", onClick: () => requestDelete(selectedIds) },
        ]}
      />

      <SupportTable
        columns={columns}
        rows={paged}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        getRowActions={getRowActions}
        selectable
        selectedIds={selectedIds}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        emptyState={<SupportEmptyState filtered={rows.length > 0} accentColor={ACCENT} onClearFilters={clearAllFilters} />}
      />

      <CampaignFormDrawer open={drawerOpen} campaign={editingCampaign} saving={saving} onClose={() => setDrawerOpen(false)} onSave={handleSave} />

      <FormDrawer
        open={Boolean(viewCampaign)}
        onClose={() => setViewCampaign(null)}
        title={viewCampaign?.title}
        subtitle="CAMPAIGN DETAILS"
        hideFooter
        accentColor={ACCENT}
      >
        {viewCampaign && (
          <Stack spacing={2}>
            {viewCampaign.image && (
              <Box>
                <Typography variant="caption" color="text.secondary">Banner / Push Image</Typography>
                <Box
                  component="img"
                  src={viewCampaign.image}
                  alt={`${viewCampaign.title} banner`}
                  sx={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: "12px", display: "block", mt: 0.5 }}
                />
              </Box>
            )}
            {viewCampaign.inAppImage && (
              <Box>
                <Typography variant="caption" color="text.secondary">In-App Mobile Image</Typography>
                <Box
                  component="img"
                  src={viewCampaign.inAppImage}
                  alt={`${viewCampaign.title} in-app`}
                  sx={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: "12px", display: "block", mt: 0.5 }}
                />
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary">Description</Typography>
              <Typography variant="body2">{viewCampaign.description || "—"}</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Target Audience</Typography>
                <Typography variant="body1" fontWeight={700}>{audienceLabel(viewCampaign.targetAudience)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box>
                  {(() => {
                    const s = statusMeta(viewCampaign.status);
                    return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700 }} />;
                  })()}
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Push Notification</Typography>
                <Typography variant="body1" fontWeight={700}>{viewCampaign.pushNotification ? "Yes" : "No"}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">In-App Notification</Typography>
                <Typography variant="body1" fontWeight={700}>{viewCampaign.inAppNotification ? "Yes" : "No"}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Scheduled For</Typography>
                <Typography variant="body1" fontWeight={700}>{fmtDateTime(viewCampaign.scheduleAt)}</Typography>
              </Grid>
            </Grid>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>Campaign Analytics</Typography>
              <Grid container spacing={1.5}>
                {STAT_TILES.map((t) => (
                  <Grid item xs={6} sm={4} key={t.key}>
                    <Box sx={{ p: 1.5, borderRadius: "10px", border: "1px solid #f1f5f9", bgcolor: "#f8fafc", textAlign: "center" }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: analytics ? "#0f172a" : "#cbd5e1" }}>
                        {statValue(t.key)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{t.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              {!analyticsLoading && !analytics && (
                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mt: 1.5, textAlign: "center" }}>
                  Analytics will appear once this campaign starts sending notifications.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </FormDrawer>

      <ConfirmDialog
        open={confirmState.open}
        loading={confirmLoading}
        title={
          confirmState.mode === "delete"
            ? "Delete campaign(s)?"
            : confirmState.mode === "send-now"
            ? "Send campaign now?"
            : confirmState.nextStatus === "active"
            ? "Activate campaign(s)?"
            : "Pause campaign(s)?"
        }
        message={
          confirmState.mode === "delete"
            ? `This will permanently delete ${confirmState.ids.length} campaign(s). This action cannot be undone.`
            : confirmState.mode === "send-now"
            ? "This will immediately send the push/in-app notification to the target audience, bypassing its schedule."
            : `This will set ${confirmState.ids.length} campaign(s) to "${confirmState.nextStatus === "active" ? "Active" : "Paused"}".`
        }
        confirmLabel={confirmState.mode === "delete" ? "Delete" : confirmState.mode === "send-now" ? "Send Now" : "Confirm"}
        confirmColor={confirmState.mode === "delete" ? "error" : "primary"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState({ open: false, mode: null, ids: [], nextStatus: null })}
      />
    </Box>
  );
};

export default Campaigns;
