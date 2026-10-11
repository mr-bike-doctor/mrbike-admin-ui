import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import Swal from "sweetalert2";
import { getAdmins, deleteAdmin } from "../../../api";
import { useDownloadExcel } from "react-export-table-to-excel";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Switch,
  Grid,
  Avatar,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as RoleIcon,
  Person as PersonIcon,
  SupervisorAccount as ManagerIcon,
} from "@mui/icons-material";
import AdminStats from "../AdminStats";

const Alladmins = ({ triggerDownloadExcel, triggerDownloadPDF }) => {
  const [admins, setAdmins] = useState([]);

  const getRoleConfig = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return { 
          color: "#e53e3e", 
          bgColor: "#fff5f5", 
          icon: <AdminIcon sx={{ fontSize: 14 }} />,
          label: "Admin"
        };
      case "subadmin":
        return { 
          color: "#805ad5", 
          bgColor: "#faf5ff", 
          icon: <RoleIcon sx={{ fontSize: 14 }} />,
          label: "Subadmin"
        };
      case "manager":
        return { 
          color: "#38a169", 
          bgColor: "#f0fff4", 
          icon: <ManagerIcon sx={{ fontSize: 14 }} />,
          label: "Manager"
        };
      case "telecaller":
        return { 
          color: "#d69e2e", 
          bgColor: "#fffaf0", 
          icon: <PhoneIcon sx={{ fontSize: 14 }} />,
          label: "Telecaller"
        };
      case "executive":
        return { 
          color: "#3182ce", 
          bgColor: "#ebf8ff", 
          icon: <PersonIcon sx={{ fontSize: 14 }} />,
          label: "Executive"
        };
      default:
        return { 
          color: "#4a5568", 
          bgColor: "#f7fafc", 
          icon: <PersonIcon sx={{ fontSize: 14 }} />,
          label: role || "N/A"
        };
    }
  };
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting State
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("createdAt");

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Edit Dialog State
  const [openEdit, setOpenEdit] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    mobile: "",
    password: "",
  });

  // Action Menu State
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuAdmin, setMenuAdmin] = useState(null);

  const tableRef = useRef(null);
  const roles = ["Telecaller", "Manager", "Admin", "Subadmin", "Executive"];

  const { onDownload } = useDownloadExcel({
    currentTableRef: tableRef.current,
    filename: "Admin_List",
    sheet: "Admins",
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Admin List", 14, 10);
    doc.autoTable({
      html: "#admin-table-mui",
      startY: 20,
      theme: "striped",
    });
    doc.save("Admin_List.pdf");
  };

  triggerDownloadExcel.current = onDownload;
  triggerDownloadPDF.current = exportToPDF;

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await getAdmins();
      if (response.status === 200) {
        setAdmins(response.data);
      } else {
        setError("Failed to fetch admins");
      }
    } catch (err) {
      setError("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Search & Sort Logic
  const filteredData = useMemo(() => {
    let result = admins;

    // Filter by search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.name?.toLowerCase().includes(lowerTerm) ||
          a.email?.toLowerCase().includes(lowerTerm) ||
          a.mobile?.includes(lowerTerm) ||
          a.ID?.toLowerCase().includes(lowerTerm) ||
          a.role?.toLowerCase().includes(lowerTerm),
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      let valueA = a[orderBy] || "";
      let valueB = b[orderBy] || "";

      if (orderBy === "createdAt") {
        valueA = new Date(a.createdAt).getTime();
        valueB = new Date(b.createdAt).getTime();
      } else {
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
      }

      const multiplier = order === "asc" ? 1 : -1;
      return valueA < valueB
        ? -1 * multiplier
        : valueA > valueB
          ? 1 * multiplier
          : 0;
    });
  }, [admins, searchTerm, order, orderBy]);

  const currentData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event, admin) => {
    setAnchorEl(event.currentTarget);
    setMenuAdmin(admin);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuAdmin(null);
  };

  const handleDelete = async (adminId) => {
    handleMenuClose();
    Swal.fire({
      title: "Delete Admin?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, Delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await deleteAdmin(adminId);
          if (response.status === 200) {
            setAdmins((prev) => prev.filter((a) => a._id !== adminId));
            Swal.fire("Deleted!", "Admin removed successfully.", "success");
          }
        } catch (error) {
          Swal.fire("Error", "Failed to delete admin.", "error");
        }
      }
    });
  };

  const handleStatusToggle = async (admin) => {
    const newStatus = admin.status === "active" ? "inactive" : "active";
    try {
      const response = await fetch(
        `https://api.mrbikedoctor.cloud/bikedoctor/adminauth/update-status/${admin._id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (response.ok) {
        setAdmins((prev) =>
          prev.map((a) =>
            a._id === admin._id ? { ...a, status: newStatus } : a,
          ),
        );
      } else {
        Swal.fire("Error", "Failed to update status", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Server error", "error");
    }
  };

  const handleEditClick = (admin) => {
    handleMenuClose();
    setEditAdmin(admin);
    setFormData({
      name: admin.name || "",
      email: admin.email || "",
      role: admin.role || "",
      mobile: admin.mobile || "",
      password: "",
    });
    setOpenEdit(true);
  };

  const handleEditSubmit = async () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.role ||
      !formData.mobile
    ) {
      Swal.fire("Error", "All fields are required", "error");
      return;
    }

    try {
      const response = await fetch(
        `https://api.mrbikedoctor.cloud/bikedoctor/adminauth/admin/${editAdmin._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (response.ok) {
        setAdmins((prev) =>
          prev.map((a) =>
            a._id === editAdmin._id ? { ...a, ...formData } : a,
          ),
        );
        setOpenEdit(false);
        Swal.fire("Success", "Admin updated successfully", "success");
      }
    } catch (err) {
      Swal.fire("Error", "Failed to update admin", "error");
    }
  };

  const headers = [
    { id: "id", label: "#", sortable: false },
    { id: "name", label: "Admin Name", sortable: true },
    { id: "contact", label: "Contact Info", sortable: false },
    { id: "role", label: "Role", sortable: true },
    { id: "ID", label: "Employee ID", sortable: true },
    { id: "status", label: "Status", sortable: true },
    { id: "actions", label: "Actions", sortable: false },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <AdminStats admins={admins} />

      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search by Name, Email, ID..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          sx={{ width: { xs: "100%", sm: 350 }, backgroundColor: "white" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer
        component={Paper}
        elevation={3}
        sx={{
          borderRadius: 3,
          overflowX: "auto",
          border: "1px solid #edf2f7",
        }}
      >
        <Table id="admin-table-mui" ref={tableRef} sx={{ minWidth: 1000 }}>
          <TableHead sx={{ backgroundColor: "#2e83ff" }}>
            <TableRow>
              {headers.map((header) => (
                <TableCell
                  key={header.id}
                  sx={{ color: "white", fontWeight: "bold", py: 2 }}
                  sortDirection={orderBy === header.id ? order : false}
                >
                  {header.sortable ? (
                    <TableSortLabel
                      active={orderBy === header.id}
                      direction={orderBy === header.id ? order : "asc"}
                      onClick={() => handleRequestSort(header.id)}
                      sx={{
                        color: "white !important",
                        "&.MuiTableSortLabel-active": {
                          color: "white !important",
                        },
                        "& .MuiTableSortLabel-icon": {
                          color: "white !important",
                        },
                      }}
                    >
                      {header.label}
                    </TableSortLabel>
                  ) : (
                    header.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                  <Typography variant="body1">Loading admins...</Typography>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                  <Typography
                    variant="body1"
                    sx={{ color: "text.secondary", fontStyle: "italic" }}
                  >
                    No admins found matching your criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((admin, index) => (
                <TableRow
                  key={admin._id}
                  hover
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar
                        sx={{
                          bgcolor: "#eef5ff",
                          color: "#2e83ff",
                          mr: 2,
                          fontWeight: "bold",
                        }}
                      >
                        {admin.name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: "bold" }}
                        >
                          {admin.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Joined:{" "}
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <EmailIcon fontSize="inherit" color="action" />
                        <Typography variant="caption">{admin.email}</Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <PhoneIcon fontSize="inherit" color="action" />
                        <Typography variant="caption">
                          {admin.mobile || "N/A"}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const config = getRoleConfig(admin.role);
                      return (
                        <Chip
                          icon={config.icon}
                          label={config.label}
                          size="small"
                          sx={{ 
                            fontWeight: 700, 
                            color: config.color,
                            backgroundColor: config.bgColor,
                            border: `1px solid ${config.color}33`,
                            borderRadius: 1.5,
                            textTransform: "uppercase",
                            fontSize: "10px",
                            letterSpacing: "0.5px"
                          }}
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: "bold", color: "#2e83ff" }}
                    >
                      {admin.ID || "N/A"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Tooltip
                        title={
                          admin.status === "active" ? "Deactivate" : "Activate"
                        }
                      >
                        <Switch
                          size="small"
                          checked={admin.status === "active"}
                          onChange={() => handleStatusToggle(admin)}
                          color="success"
                        />
                      </Tooltip>
                      <Chip
                        label={admin.status}
                        size="small"
                        color={
                          admin.status === "active" ? "success" : "default"
                        }
                        variant="tonal"
                        sx={{
                          ml: 1,
                          textTransform: "capitalize",
                          fontWeight: "bold",
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, admin)}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: "1px solid #edf2f7" }}
        />
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleEditClick(menuAdmin)}>
          <EditIcon sx={{ mr: 1, color: "primary.main" }} fontSize="small" />{" "}
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleDelete(menuAdmin?._id)}>
          <DeleteIcon sx={{ mr: 1, color: "error.main" }} fontSize="small" />{" "}
          Delete
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{ fontWeight: "bold", backgroundColor: "#f8f9fa", pb: 2 }}
        >
          Edit Admin Profile
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mobile Number"
                  name="mobile"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ fontWeight: 600, fontSize: "1rem" }}>
                    Role
                  </InputLabel>
                  <Select
                    value={formData.role}
                    label="Role"
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    sx={{
                      borderRadius: 2,
                      backgroundColor: "white",
                      "& .MuiSelect-select": {
                        py: 2,
                        fontSize: "1.1rem",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                      },
                      height: 60,
                    }}
                    startAdornment={
                      <InputAdornment position="start" sx={{ ml: 1 }}>
                        <RoleIcon color="primary" />
                      </InputAdornment>
                    }
                  >
                    {roles.map((r) => (
                      <MenuItem
                        key={r}
                        value={r}
                        sx={{ py: 2, fontWeight: 500, fontSize: "1rem" }}
                      >
                        {r}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, backgroundColor: "#f8f9fa" }}>
          <Button
            onClick={() => setOpenEdit(false)}
            color="inherit"
            sx={{ fontWeight: "bold" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disableElevation
            sx={{ fontWeight: "bold", backgroundColor: "#2e83ff" }}
          >
            Save Improvements
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Alladmins;
