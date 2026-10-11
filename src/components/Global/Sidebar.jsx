import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { getDealersVerify } from "../../api";
import { logout } from "../../redux/slices/authSlice";
import { useSupportUnread } from "../../context/SupportUnreadContext";
import {
  Box, Chip, Collapse, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, ListSubheader, Typography,
} from "@mui/material";
import {
  AccountBalanceWalletOutlined as WalletIcon,
  AdminPanelSettingsOutlined as AdminIcon,
  BarChartOutlined as FinanceIcon,
  BuildOutlined as ServiceIcon,
  CampaignOutlined as CampaignIcon,
  CardGiftcardOutlined as RewardsIcon,
  CategoryOutlined as CategoryIcon,
  DashboardOutlined as DashboardIcon,
  DashboardCustomizeOutlined as AppContentIcon,
  EventNoteOutlined as BookingIcon,
  ExpandLess, ExpandMore,
  FactCheckOutlined as VerificationIcon,
  GavelOutlined as LegalIcon,
  ImageOutlined as BannerIcon,
  InsightsOutlined as InsightsIcon,
  LocalOfferOutlined as OfferIcon,
  MapOutlined as ServiceAreaIcon,
  MonetizationOnOutlined as PlatformChargesIcon,
  PaymentsOutlined as PaymentsIcon,
  PeopleOutline as DealerIcon,
  PersonOutline as CustomerIcon,
  PowerSettingsNew as LogoutIcon,
  ReceiptLongOutlined as TransactionIcon,
  SavingsOutlined as DepositIcon,
  ReviewsOutlined as ReviewsIcon,
  SellOutlined as PromoCodeIcon,
  SupportAgentOutlined as SupportIcon,
  SwapHorizOutlined as WithdrawalIcon,
  SystemUpdateAltOutlined as MobileAppUpdatesIcon,
  TwoWheelerOutlined as BikeIcon,
  ViewCarouselOutlined as FeaturedIcon,
  TwoWheelerOutlined as RoadsideIcon,
} from "@mui/icons-material";

export const DRAWER_WIDTH = 280;

// Every destination below is an existing application route. `activePaths`
// associates detail/edit/legacy URLs with their owning navigation item.
export const menuSections = [
  {
    title: "DASHBOARD",
    items: [
      { title: "Dashboard", subtitle: "Overview & activity", icon: <DashboardIcon />, path: "/" },
      { title: "Home Insights", icon: <InsightsIcon />, path: "/home-insights" },
    ],
  },
  {
    title: "USERS",
    items: [
      { title: "Customers", icon: <CustomerIcon />, path: "/customers", activePaths: ["/view-customer/:id"] },
      { title: "Ratings & Reviews", icon: <ReviewsIcon />, path: "/reviews" },
      {
        title: "Support", icon: <SupportIcon />, badge: "support",
        children: [
          { title: "Customer Tickets", path: "/support/customer", activePaths: ["/all-tickets", "/all-tickets/view-ticket/:ticketId"] },
          { title: "Dealer Tickets", path: "/support/dealer" },
        ],
      },
    ],
  },
  {
    title: "DEALERS",
    items: [
      { title: "Dealers", icon: <DealerIcon />, path: "/dealers", activePaths: ["/add-dealer", "/add-dealer-ai", "/view-dealer/:id", "/updateDealer/:id"] },
      {
        title: "Dealer Verification", icon: <VerificationIcon />, path: "/dealers-verify", badge: "dealer-verification",
        activePaths: ["/view-verify-dealer/:id", "/edit-verify-dealer/:id", "/update-dealer-verify/:id"],
      },
      { title: "Service Areas", icon: <ServiceAreaIcon />, path: "/serviceable-areas" },
    ],
  },
  {
    title: "SERVICES",
    items: [
      {
        title: "Major Services", icon: <ServiceIcon />, path: "/MajorServices",
        activePaths: ["/base-services", "/create-base-service", "/edit-base-service/:id", "/view-service/:id"],
      },
      { title: "Categories", icon: <CategoryIcon />, path: "/service-categories" },
      { title: "Roadside Assistance", icon: <RoadsideIcon />, path: "/roadside-assistance" },
      {
        title: "Additional Services", icon: <OfferIcon />, path: "/base-additional-services",
        activePaths: ["/create-base-additional-service", "/edit-base-additional-service/:id", "/create-additional-service", "/additional-services/view/:id", "/additional-services/edit/:id"],
      },
      {
        title: "Bike Catalog", icon: <BikeIcon />,
        children: [
          { title: "Bike Companies", path: "/bikes" },
          { title: "Compatibility", path: "/bike-compatibility" },
          { title: "Add Bike Company", path: "/addBikeCompany" },
        ],
      },
    ],
  },
  {
    title: "BOOKINGS",
    items: [
      { title: "All Bookings", icon: <BookingIcon />, path: "/bookings", activePaths: ["/booking"] },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { title: "MR Bike Money", icon: <RewardsIcon />, path: "/mr-bike-money" },
      { title: "Finance Overview", icon: <FinanceIcon />, path: "/finance" },
      { title: "Dealer Wallets", icon: <WalletIcon />, path: "/finance/dealer-wallets", activePaths: ["/finance/dealer-wallets/:walletId"] },
      { title: "Deposits", icon: <DepositIcon />, path: "/finance/deposits" },
      { title: "Transactions", icon: <TransactionIcon />, path: "/finance/transactions" },
      { title: "Withdrawals", icon: <WithdrawalIcon />, path: "/finance/withdrawals", activePaths: ["/approve"] },
      { title: "Payments", icon: <PaymentsIcon />, path: "/paymentList" },
    ],
  },
  {
    title: "MARKETING",
    items: [
      { title: "Banners", icon: <BannerIcon />, path: "/bannerList", activePaths: ["/banners"] },
      { title: "Offers", icon: <OfferIcon />, path: "/offers", activePaths: ["/add-offer"] },
      {
        title: "Promotions", icon: <CampaignIcon />,
        children: [
          { title: "Campaigns", path: "/preferences/campaigns" },
          { title: "Promo Codes", icon: <PromoCodeIcon />, path: "/preferences/promo-codes" },
          { title: "Rewards & Referral", icon: <RewardsIcon />, path: "/preferences/rewards-referral", activePaths: ["/rewards"] },
        ],
      },
      {
        title: "Featured Categories", icon: <FeaturedIcon />, path: "/location-featured-categories",
        activePaths: ["/location-featured-categories/add", "/location-featured-categories/edit/:id", "/location-featured-categories/view/:id"],
      },
    ],
  },
  {
    title: "CONTENT & SETTINGS",
    items: [
      { title: "App Content", icon: <AppContentIcon />, path: "/preferences/app-content" },
      { title: "Platform Charges", icon: <PlatformChargesIcon />, path: "/preferences/platform-charges" },
      { title: "Mobile App Updates", icon: <MobileAppUpdatesIcon />, path: "/preferences/mobile-app-updates" },
      { title: "Legal", icon: <LegalIcon />, path: "/preferences/legal" },
      { title: "Admin Users", icon: <AdminIcon />, path: "/admins", activePaths: ["/addadmin"] },
    ],
  },
];

const normalizePath = (path) => {
  const cleanPath = (path || "/").split(/[?#]/)[0].replace(/\/+$/, "");
  return (cleanPath || "/").toLowerCase();
};

const pathMatches = (pathname, pattern) => {
  const currentParts = normalizePath(pathname).split("/").filter(Boolean);
  const patternParts = normalizePath(pattern).split("/").filter(Boolean);
  return currentParts.length === patternParts.length && patternParts.every(
    (part, index) => part.startsWith(":") || part === currentParts[index],
  );
};

const isItemActive = (item, pathname) =>
  [item.path, ...(item.activePaths || [])].filter(Boolean).some((path) => pathMatches(pathname, path))
  || (item.children || []).some((child) => isItemActive(child, pathname));

const activeParentTitles = (pathname) => menuSections.flatMap((section) =>
  section.items
    .filter((item) => item.children && isItemActive(item, pathname))
    .map((item) => item.title),
);

const Sidebar = ({ mobileOpen, handleToggleDrawer, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [openMenus, setOpenMenus] = useState(() =>
    Object.fromEntries(activeParentTitles(location.pathname).map((title) => [title, true])),
  );
  const [pendingVerifyCount, setPendingVerifyCount] = useState(0);
  const { unreadCount: supportUnreadCount } = useSupportUnread();

  useEffect(() => {
    getDealersVerify()
      .then((res) => {
        if (res.success) {
          setPendingVerifyCount((res.vendors || []).filter(
            (vendor) => (vendor.registrationStatus || "").toLowerCase() === "pending",
          ).length);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const activeParents = activeParentTitles(location.pathname);
    if (activeParents.length) {
      setOpenMenus((previous) => ({
        ...previous,
        ...Object.fromEntries(activeParents.map((title) => [title, true])),
      }));
    }
  }, [location.pathname]);

  const badges = useMemo(() => ({
    support: supportUnreadCount,
    "dealer-verification": pendingVerifyCount,
  }), [pendingVerifyCount, supportUnreadCount]);

  const handleMenuClick = (item) => {
    if (item.children) {
      setOpenMenus((previous) => ({ ...previous, [item.title]: !previous[item.title] }));
    } else if (item.path) {
      navigate(item.path);
      if (isMobile) handleToggleDrawer();
    }
  };

  const renderBadge = (badgeKey) => badges[badgeKey] ? (
    <Chip
      label={badges[badgeKey]}
      size="small"
      color="error"
      sx={{ height: 20, minWidth: 24, fontSize: "0.65rem", fontWeight: 700, "& .MuiChip-label": { px: 0.75 } }}
    />
  ) : null;

  const renderMenuItem = (item, isChild = false) => {
    const hasChildren = Boolean(item.children?.length);
    const isOpen = Boolean(openMenus[item.title]);
    const isActive = isItemActive(item, location.pathname);
    const collapseId = hasChildren ? `sidebar-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined;

    return (
      <React.Fragment key={item.title}>
        <ListItem disablePadding sx={{ mb: 0.375 }}>
          <ListItemButton
            onClick={() => handleMenuClick(item)}
            selected={isActive}
            aria-current={isActive && !hasChildren ? "page" : undefined}
            aria-expanded={hasChildren ? isOpen : undefined}
            aria-controls={collapseId}
            sx={{
              minHeight: isChild ? 38 : item.subtitle ? 52 : 42,
              borderRadius: 1.5,
              py: item.subtitle ? 0.75 : 0.625,
              pl: isChild ? 1.75 : 1.25,
              pr: 1,
              color: isActive ? "primary.dark" : "text.secondary",
              position: "relative",
              "&.Mui-selected": { bgcolor: hasChildren ? "transparent" : "primary.light", color: "primary.dark" },
              "&.Mui-selected:hover": { bgcolor: hasChildren ? "grey.100" : "primary.light" },
              "&:hover": { bgcolor: "grey.100", color: "text.primary" },
              "&::before": isActive && !hasChildren ? {
                content: '""', position: "absolute", left: 0, top: 9, bottom: 9,
                width: 3, borderRadius: "0 4px 4px 0", bgcolor: "primary.main",
              } : undefined,
            }}
          >
            <ListItemIcon sx={{ minWidth: isChild ? 26 : 34, color: isActive ? "primary.main" : "inherit", "& svg": { fontSize: isChild ? 17 : 20 } }}>
              {item.icon || <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: isActive ? "primary.main" : "grey.400" }} />}
            </ListItemIcon>
            <ListItemText
              primary={item.title}
              secondary={item.subtitle}
              primaryTypographyProps={{
                fontSize: isChild ? "0.8125rem" : "0.875rem",
                fontWeight: isActive ? 700 : 550,
                lineHeight: 1.3,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              }}
              secondaryTypographyProps={{ fontSize: "0.6875rem", color: "text.secondary", lineHeight: 1.25, mt: 0.2 }}
              sx={{ my: 0 }}
            />
            {renderBadge(item.badge)}
            {hasChildren && (
              <Box sx={{ display: "flex", ml: 0.5, color: isActive ? "primary.main" : "grey.500" }}>
                {isOpen ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
              </Box>
            )}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse id={collapseId} in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ ml: 2.125, pl: 1, borderLeft: "1px solid", borderColor: "grey.200" }}>
              {item.children.map((child) => renderMenuItem(child, true))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.paper" }}>
      <Box sx={{ minHeight: 72, px: 2.5, py: 1.75, display: "flex", alignItems: "center", gap: 1.5, borderBottom: "1px solid", borderColor: "grey.100" }}>
        <Box sx={{
          width: 38, height: 38, flexShrink: 0, bgcolor: "primary.main", borderRadius: 2,
          display: "grid", placeItems: "center", color: "common.white", fontWeight: 800,
          fontSize: "0.95rem", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.22)",
        }}>
          BD
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, lineHeight: 1.25, color: "text.primary" }}>Bike Doctor</Typography>
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.09em", color: "text.secondary" }}>ADMIN CONSOLE</Typography>
        </Box>
      </Box>

      <Box
        component="nav"
        aria-label="Admin navigation"
        sx={{
          flexGrow: 1, overflowY: "auto", px: 1.5, py: 1,
          scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent",
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "grey.300", borderRadius: 10 },
        }}
      >
        {menuSections.map((section, sectionIndex) => (
          <List
            key={section.title}
            disablePadding
            aria-labelledby={`sidebar-section-${sectionIndex}`}
            subheader={
              <ListSubheader
                id={`sidebar-section-${sectionIndex}`}
                component="div"
                disableSticky
                sx={{
                  bgcolor: "transparent", color: "text.secondary", fontSize: "0.625rem",
                  fontWeight: 800, lineHeight: 1, letterSpacing: "0.11em", px: 1.25,
                  pt: sectionIndex === 0 ? 1 : 2.25, pb: 0.875,
                }}
              >
                {section.title}
              </ListSubheader>
            }
          >
            {section.items.map((item) => renderMenuItem(item))}
          </List>
        ))}
      </Box>

      <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "grey.100" }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => { dispatch(logout()); navigate("/login"); }}
            sx={{
              minHeight: 42, borderRadius: 1.5, color: "text.secondary", px: 1.25,
              "&:hover": { bgcolor: "rgba(239, 68, 68, 0.08)", color: "error.main", "& .MuiListItemIcon-root": { color: "inherit" } },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}><LogoutIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="Log out" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 650 }} />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  const paperSx = {
    boxSizing: "border-box", width: DRAWER_WIDTH, border: "none", borderRight: "1px solid",
    borderColor: "grey.100", bgcolor: "background.paper",
  };

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleToggleDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", lg: "none" }, "& .MuiDrawer-paper": { ...paperSx, boxShadow: "0 20px 40px rgba(15, 23, 42, 0.16)" } }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{ display: { xs: "none", lg: "block" }, "& .MuiDrawer-paper": paperSx }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
