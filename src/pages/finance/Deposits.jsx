import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import useDealerWallets from "../../hooks/useDealerWallets";
import useFinanceDeposits from "../../hooks/useFinanceDeposits";
import { fmtCurrency, fmtDateTime } from "../../utils/financeHelpers";
import { normalizeDeposit } from "../../utils/depositHelpers";
import SupportSearch from "../../components/Support/SupportSearch";
import SupportTable from "../../components/Support/SupportTable";
import SupportEmptyState from "../../components/Support/SupportEmptyState";
import DepositFilters from "../../components/finance/DepositFilters";
import FinanceStatusBadge from "../../components/finance/FinanceStatusBadge";
import TransactionDrawer from "../../components/finance/TransactionDrawer";

const ACCENT = "#16a34a";

const columns = [
  { key: "dealerName", label: "Dealer", sortable: true, render: (row) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.dealerName}</Typography> },
  { key: "amount", label: "Amount", sortable: true, render: (row) => <span style={{ color: "#166534", fontWeight: 700 }}>{fmtCurrency(row.amount)}</span> },
  { key: "depositType", label: "Deposit Type" },
  { key: "status", label: "Status", render: (row) => <FinanceStatusBadge status={row.status} /> },
  { key: "createdAt", label: "Date", sortable: true, render: (row) => fmtDateTime(row.createdAt) },
  { key: "reference", label: "Reference" },
  { key: "gatewayOrderId", label: "Gateway Order ID", render: (row) => row.gatewayOrderId || "—" },
  { key: "gatewayPaymentId", label: "Payment ID", render: (row) => row.gatewayPaymentId || "—" },
  { key: "balanceBefore", label: "Balance Before", render: (row) => fmtCurrency(row.balanceBefore) },
  { key: "balanceAfter", label: "Balance After", render: (row) => <span style={{ fontWeight: 700 }}>{fmtCurrency(row.balanceAfter)}</span> },
];

const Deposits = () => {
  const [search, setSearch] = useState("");
  const [dealerId, setDealerId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeDeposit, setActiveDeposit] = useState(null);

  const { wallets } = useDealerWallets({ page: 1, limit: 100, sortBy: "dealerName", sortOrder: "asc" });
  const { deposits, pagination, loading, error, refetch } = useFinanceDeposits({
    page,
    limit: pageSize,
    ...(search ? { search } : {}),
    ...(dealerId ? { dealer_id: dealerId } : {}),
    ...(status ? { status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(sortKey ? { sortBy: sortKey === "amount" ? "amount" : "createdAt", sortOrder: sortDirection } : {}),
  });

  const rows = useMemo(() => deposits.map(normalizeDeposit), [deposits]);
  const dealers = useMemo(() => wallets.map((wallet) => ({
    id: wallet._id || wallet.dealer?._id || wallet.dealerId,
    name: wallet.dealerName || wallet.dealer?.name || wallet.shopName || "Dealer",
  })), [wallets]);

  useEffect(() => setPage(1), [search, dealerId, status, from, to]);
  const hasActiveFilters = Boolean(search || dealerId || status || from || to);
  const clearAll = () => { setSearch(""); setDealerId(""); setStatus(""); setFrom(""); setTo(""); };
  const handleSort = (key) => {
    if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 3 }} spacing={1.5}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>Deposits</Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>Dealer wallet deposits from the wallet ledger</Typography>
        </Box>
        <Tooltip title="Refresh"><IconButton onClick={refetch} sx={{ bgcolor: "white", border: "1px solid #f1f5f9" }}><Refresh sx={{ fontSize: 18, color: "#64748b" }} /></IconButton></Tooltip>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}
      <Box sx={{ mb: 2 }}><SupportSearch value={search} onChange={setSearch} placeholder="Search dealer, reference, or order ID…" /></Box>
      <DepositFilters dealers={dealers} dealerId={dealerId} onDealerChange={setDealerId} status={status} onStatusChange={setStatus} from={from} to={to} onFromChange={setFrom} onToChange={setTo} hasActiveFilters={hasActiveFilters} onClearAll={clearAll} />
      <SupportTable
        columns={columns}
        rows={rows}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={pagination?.total ?? rows.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRowClick={setActiveDeposit}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSort}
        emptyState={<SupportEmptyState filtered={hasActiveFilters} accentColor={ACCENT} onClearFilters={clearAll} />}
      />
      <TransactionDrawer open={Boolean(activeDeposit)} transactionId={activeDeposit?.id} fallbackData={activeDeposit} onClose={() => setActiveDeposit(null)} />
    </Box>
  );
};

export default Deposits;
