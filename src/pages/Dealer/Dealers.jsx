import React, { useRef, useState, useEffect } from "react";
import UserTable from "../../components/Dealers/DealerTable";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getAdminDealers } from "../../api";
import { selectDealerRefreshVersion } from "../../redux/slices/dealerRefreshSlice";
import {
  Box,
  Typography,
  Breadcrumbs,
  Link as MuiLink,
  Button,
  Stack,
  Container,
} from "@mui/material";
import {
  Add as AddIcon,
  FileDownload as DownloadIcon,
  NavigateNext as NavigateNextIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import DealerStats from "../../components/Dealers/DealerStats";

const SEARCH_DEBOUNCE_MS = 400;

const Dealer = () => {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const dealerRefreshVersion = useSelector(selectDealerRefreshVersion);

  // Every one of these is sent to the server — the panel never filters,
  // searches, sorts or paginates the dealer list itself.
  const [stage, setStage] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  const triggerDownloadExcel = useRef(null);
  const triggerDownloadPDF = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const fetchDealers = async () => {
      setLoading(true);
      try {
        const response = await getAdminDealers({
          stage,
          search,
          page: page + 1,
          limit: rowsPerPage,
          sortBy,
          order,
        });
        if (cancelled || !response?.status) return;
        setRows(response.data || []);
        setCounts(response.counts || {});
        setTotal(response.pagination?.total || 0);
      } catch (error) {
        console.error("Error fetching dealer list:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDealers();
    return () => {
      cancelled = true;
    };
    // dealerRefreshVersion covers mutations triggered from the Dealer Details page,
    // so the list stays in sync even if it wasn't the source of the change.
  }, [stage, search, page, rowsPerPage, sortBy, order, refresh, dealerRefreshVersion]);

  const handleRefresh = () => {
    setRefresh((prev) => !prev);
  };

  const handleStageChange = (next) => {
    setStage(next);
    setPage(0);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setOrder("asc");
    }
    setPage(0);
  };

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <Container maxWidth="xl">
          {/* MUI Header */}
          <Box sx={{ mb: 4 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
            >
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: "#1e293b",
                    mb: 1,
                    letterSpacing: "-0.025em",
                  }}
                >
                  Dealers
                </Typography>
                <Breadcrumbs
                  separator={<NavigateNextIcon fontSize="small" />}
                  aria-label="breadcrumb"
                >
                  <MuiLink
                    underline="hover"
                    color="inherit"
                    onClick={() => navigate("/")}
                    sx={{
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  >
                    Dashboard
                  </MuiLink>
                  <Typography
                    color="text.primary"
                    sx={{ fontSize: "0.875rem", fontWeight: 600 }}
                  >
                    Dealers List
                  </Typography>
                </Breadcrumbs>
              </Box>

              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => triggerDownloadExcel.current?.()}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    borderColor: "#e2e8f0",
                    color: "#4a5568",
                    "&:hover": {
                      backgroundColor: "#f7fafc",
                      borderColor: "#cbd5e0",
                    },
                  }}
                >
                  Export
                </Button>
                <Button
                  component={Link}
                  to="/add-dealer-ai"
                  variant="contained"
                  startIcon={<AutoAwesomeIcon />}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                    "&:hover": {
                      background: "linear-gradient(45deg, #1976D2 30%, #0288D1 90%)"
                    },
                    boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
                  }}
                >
                  AI Create
                </Button>
                <Button
                  component={Link}
                  to="/add-dealer"
                  variant="contained"
                  startIcon={<AddIcon />}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    backgroundColor: "#2e83ff",
                    "&:hover": { backgroundColor: "#1a6fed" },
                    boxShadow: "0 4px 12px rgba(46, 131, 255, 0.25)",
                  }}
                >
                  Add Dealer
                </Button>
              </Stack>
            </Stack>
          </Box>

          {/* Stats Section */}
          <DealerStats counts={counts} />

          {/* Table Section */}
          <UserTable
            rows={rows}
            counts={counts}
            total={total}
            loading={loading}
            stage={stage}
            onStageChange={handleStageChange}
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            page={page}
            onPageChange={setPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(n) => {
              setRowsPerPage(n);
              setPage(0);
            }}
            sortBy={sortBy}
            order={order}
            onSort={handleSort}
            triggerDownloadExcel={triggerDownloadExcel}
            triggerDownloadPDF={triggerDownloadPDF}
            text={"Dealers"}
            onDealerDeleted={handleRefresh}
          />
        </Container>
      </div>
    </div>
  );
};

export default Dealer;
