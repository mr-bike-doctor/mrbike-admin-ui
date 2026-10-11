import { Link, useNavigate } from 'react-router-dom'
import { Box, Stack, Avatar, Typography, Menu, MenuItem, IconButton, Tooltip, Divider, ListItemIcon } from "@mui/material"
import { Logout as LogoutIcon, Person as PersonIcon, Menu as MenuIcon } from "@mui/icons-material"
import React, { useState } from "react"
import img2 from "../../assets2/img/logos/logo-small.png"
import img3 from "../../assets/img/profiles/avatar-07.jpg"
import GlobalSearch from "./GlobalSearch"
import NotificationPanel from "../Support/NotificationPanel"

import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';

const Navbar = ({ handleToggleDrawer }) => {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const handleOpenUserMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  function handleLogout() {
    handleCloseUserMenu();
    dispatch(logout());
    navigate("/login")
  }

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        top: 0,
        right: 0,
        left: 0,
        height: "70px",
        bgcolor: "#ffffff",
        borderBottom: "1px solid #f1f5f9",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        px: { xs: 2, lg: 4 },
      }}
    >
      {/* Mobile Toggle & Logo */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton
          onClick={handleToggleDrawer}
          sx={{ display: { lg: "none" }, color: "neutral.600" }}
        >
          <MenuIcon />
        </IconButton>
        
        <Box sx={{ display: { lg: "none" } }}>
          <Link to="/">
            <img src={img2} alt="Logo" style={{ height: "40px" }} />
          </Link>
        </Box>
      </Box>

      {/* Desktop Search Area */}
      <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "flex-start", ml: { lg: 32 } }}>
        <Box sx={{ display: { xs: "none", md: "block" }, width: "100%", maxWidth: "500px" }}>
          <GlobalSearch />
        </Box>
      </Box>

      {/* Right Actions */}
      <Stack direction="row" spacing={2} alignItems="center">
        <NotificationPanel />

        <Tooltip title="Account settings">
          <IconButton onClick={handleOpenUserMenu} sx={{ p: 0.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right" }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "neutral.800" }}>
                  {user?.name || "Admin User"}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontWeight: 600 }}>
                  Administrator
                </Typography>
              </Box>
              <Avatar 
                alt={user?.name || "Admin User"} 
                src={user?.picture || img3} 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  border: '2px solid #fff', 
                  boxShadow: "0 0 0 1px #e2e8f0" 
                }} 
              />
            </Stack>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseUserMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              borderRadius: "12px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              minWidth: 220,
              overflow: 'visible',
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {user?.name || "Admin User"}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
              {user?.email || "No email available"}
            </Typography>
          </Box>
          <Divider sx={{ my: 1, opacity: 0.6 }} />
          <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/profile'); }} sx={{ py: 1.2, px: 2, borderRadius: "8px", mx: 0.5 }}>
            <ListItemIcon>
              <PersonIcon fontSize="small" sx={{ color: "primary.main" }} />
            </ListItemIcon>
            <Typography variant="body2" fontWeight={600}>Profile</Typography>
          </MenuItem>
          <Divider sx={{ my: 1, opacity: 0.6 }} />
          <MenuItem onClick={handleLogout} sx={{ py: 1.2, px: 2, borderRadius: "8px", mx: 0.5, color: "error.main" }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: "inherit" }} />
            </ListItemIcon>
            <Typography variant="body2" fontWeight={600}>Log Out</Typography>
          </MenuItem>
        </Menu>
      </Stack>
    </Box>
  )
}

export default Navbar
