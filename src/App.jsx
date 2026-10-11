import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Outlet,
  useParams,
} from "react-router-dom";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  useMediaQuery,
  Box,
} from "@mui/material";
import { fetchGlobalSearchData } from "./redux/slices/searchSlice";
import { NetworkProvider } from "./context/NetworkContext";
import { SupportUnreadProvider } from "./context/SupportUnreadContext";
import "./App.css";
import AddAdmin from "./pages/admin/AddAdmin";
import Sidebar from "./components/Global/Sidebar";
import Navbar from "./components/Global/Navbar";
import LoginPage from "./pages/Auth/LoginPage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard/Dashboard";
import ProfilePage from "./pages/Auth/ProfilePage";
// Auth provider removed - using Redux authSlice
import AddDealer from "./pages/Dealer/Createdealer";
import CreateDealerAI from "./pages/Dealer/CreateDealerAI";
import Admins from "./pages/admin/admin";
import Bookings from "./pages/bookings/bookings";
import Customers from "./pages/customer/customer";
import DealerList from "./pages/Dealer/Dealers";
import AddBikeCompany from "./pages/bikes/AddBikeCompany";
import Bikes from "./pages/bikes/Bikes";
import CreateBanner from "./pages/banners/CreateBanner";
import Banners from "./pages/banners/Banners";
import PaymentList from "./pages/payment/payment";
import OfferList from "./pages/Offers/OfferList";
import DealerUpdate from "./pages/Dealer/updateDealer";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import WithdrawalManagement from "./pages/finance/WithdrawalManagement";
import DealerWallets from "./pages/finance/DealerWallets";
import DealerWalletDetail from "./pages/finance/DealerWalletDetail";
import Transactions from "./pages/finance/Transactions";
import Deposits from "./pages/finance/Deposits";
import DealerVerify from "./pages/Dealer/DealerVerify";
import Offer from "./pages/Offers/AddOffer";
import ViewDealerDetails from "./components/Dealers/ViewDealerDetails";
import EditService from "./components/Service/EditService";
import ViewAdditionalService from "./pages/additionalServices/ViewAdditionalService";
import AdditionalServiceForm from "./components/Additional/AdditionalServiceForm";
import EditVerifyDeaaaler from "./pages/Dealer/EditVerifyDeaaaler";
import ViewDealersVerify from "./pages/Dealer/ViewDealersVerify";
import UpdateDealerVerify from "./components/Dealers/UpdateDealerVerify";
import SupportOverview from "./pages/Support/SupportOverview";
import CustomerSupport from "./pages/Support/CustomerSupport";
import DealerSupport from "./pages/Support/DealerSupport";
// Removed BaseServices in favor of MajorServices
import BaseServiceForm from "./components/Service/BaseServiceForm";
import BaseAdditionalServices from "./pages/services/BaseAdditionalServices";
import BaseAdditionalServiceForm from "./components/Additional/BaseAdditionalServiceForm";
import ViewUserDetails from "./pages/customer/ViewUserDetails";
import ViewAdminServiceDetails from "./components/Service/ViewAdminServiceDetails";
import MajorServices from "./pages/services/MajorServices";
import ServiceCategories from "./pages/services/ServiceCategories";
import BikeCompatibility from "./pages/bikes/BikeCompatibility";
import HomeInsights from "./pages/Dashboard/HomeInsights";
import LocationFeaturedCategoryList from "./pages/locationFeaturedCategories/LocationFeaturedCategoryList";
import LocationFeaturedCategoryForm from "./components/LocationFeaturedCategories/LocationFeaturedCategoryForm";
import ViewLocationFeaturedCategory from "./pages/locationFeaturedCategories/ViewLocationFeaturedCategory";
import ServiceableAreas from "./pages/serviceableAreas/ServiceableAreas";
import Campaigns from "./pages/preferences/Campaigns";
import PromoCodes from "./pages/preferences/PromoCodes";
import RewardsReferral from "./pages/preferences/RewardsReferral";
import Legal from "./pages/preferences/Legal";
import AppContentPage from "./pages/preferences/AppContent";
import MobileAppUpdates from "./pages/preferences/MobileAppUpdates";
import PlatformCharges from "./pages/preferences/PlatformCharges";
import Reviews from "./pages/reviews/Reviews";
const theme = createTheme({
  palette: {
    primary: {
      main: "#2563eb",
      light: "#eff6ff",
      dark: "#1d4ed8",
      contrastText: "#fff",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#64748b",
    },
    success: {
      main: "#10b981",
    },
    warning: {
      main: "#f59e0b",
    },
    error: {
      main: "#ef4444",
    },
  },
  typography: {
    fontFamily: '"Inter", "Poppins", sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.025em" },
    h2: { fontWeight: 700, letterSpacing: "-0.025em" },
    h3: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: "8px 16px",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-1px)",
          },
        },
        containedPrimary: {
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          "&:hover": {
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          border: "1px solid #e2e8f0",
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NetworkProvider>
        <SupportUnreadProvider>
          <Router basename="/">
            <AppContent />
          </Router>
        </SupportUnreadProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}

// test

const AppContent = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { token } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleToggleDrawer = () => {
    setMobileOpen(!mobileOpen);
  };

  const hideNavbar = location.pathname.toLowerCase() === "/login";

  useEffect(() => {
    if (token) {
      dispatch(fetchGlobalSearchData());
    }
  }, [dispatch, token]);

  return (
    <>
      {!hideNavbar && <Navbar handleToggleDrawer={handleToggleDrawer} />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <SidebarLayout
                mobileOpen={mobileOpen}
                handleToggleDrawer={handleToggleDrawer}
              />
            </ProtectedRoute>
          }
        >
          <Route path="/addadmin" element={<AddAdmin />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/add-dealer" element={<AddDealer />} />
          <Route path="/add-dealer-ai" element={<CreateDealerAI />} />
          <Route path="/view-dealer/:id" element={<ViewDealerDetails />} />
          <Route
            path="/view-verify-dealer/:id"
            element={<ViewDealersVerify />}
          />
          <Route
            path="/edit-verify-dealer/:id"
            element={<EditVerifyDeaaaler />}
          />
          <Route path="/updateDealer/:id" element={<DealerUpdate />} />
          <Route
            path="/update-dealer-verify/:id"
            element={<UpdateDealerVerify />}
          />
          <Route path="/admins" element={<Admins />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/base-services" element={<MajorServices />} />
          <Route path="/MajorServices" element={<MajorServices />} />
          <Route path="/service-categories" element={<ServiceCategories />} />
          <Route path="/bike-compatibility" element={<BikeCompatibility />} />
          <Route path="/home-insights" element={<HomeInsights />} />
          <Route
            path="/create-base-service"
            element={<BaseServiceForm isEdit={false} />}
          />
          <Route
            path="/edit-base-service/:id"
            element={<BaseServiceForm isEdit={true} />}
          />
          <Route
            path="/base-additional-services"
            element={<BaseAdditionalServices />}
          />
          <Route
            path="/create-base-additional-service"
            element={<BaseAdditionalServiceForm isEdit={false} />}
          />
          <Route
            path="/edit-base-additional-service/:id"
            element={<BaseAdditionalServiceForm isEdit={true} />}
          />
          <Route path="/view-customer/:id" element={<ViewUserDetails />} />
          <Route
            path="/view-service/:id"
            element={<ViewAdminServiceDetails />}
          />
          <Route path="/edit-services/:id" element={<EditService />} />
          <Route
            path="/create-additional-service"
            element={<AdditionalServiceForm />}
          />
          <Route
            path="/additional-services/view/:id"
            element={<ViewAdditionalService />}
          />
          <Route
            path="/additional-services/edit/:id"
            element={<AdditionalServiceFormWrapper />}
          />
          <Route path="/dealers" element={<DealerList />} />
          <Route path="/dealers-verify" element={<DealerVerify />} />
          <Route path="/booking" element={<Bookings />} />
          <Route path="/addBikeCompany" element={<AddBikeCompany />} />
          <Route path="/bikes" element={<Bikes />} />
          <Route path="/banners" element={<CreateBanner />} />
          <Route path="/bannerList" element={<Banners />} />
          <Route path="/paymentList" element={<PaymentList />} />
          {/* Legacy redirect — Rewards now lives inside Preferences */}
          <Route path="/rewards" element={<Navigate to="/preferences/rewards-referral" replace />} />
          <Route path="/offers" element={<OfferList />} />

          {/* Preferences */}
          <Route path="/preferences/campaigns" element={<Campaigns />} />
          <Route path="/preferences/promo-codes" element={<PromoCodes />} />
          <Route path="/preferences/rewards-referral" element={<RewardsReferral />} />
          <Route path="/mr-bike-money" element={<RewardsReferral initialTab={2} />} />
          <Route path="/preferences/legal" element={<Legal />} />
          <Route path="/preferences/app-content" element={<AppContentPage />} />
          <Route
            path="/preferences/platform-charges"
            element={<PlatformCharges />}
          />
          <Route
            path="/preferences/mobile-app-updates"
            element={<MobileAppUpdates />}
          />
          {/* Legacy redirect — old /approve now lives at /finance/withdrawals */}
          <Route path="/approve" element={<Navigate to="/finance/withdrawals" replace />} />
          {/* Finance Phase 1 */}
          <Route path="/finance" element={<FinanceDashboard />} />
          <Route path="/finance/withdrawals" element={<WithdrawalManagement />} />
          {/* Finance Phase 2 */}
          <Route path="/finance/dealer-wallets" element={<DealerWallets />} />
          <Route path="/finance/dealer-wallets/:walletId" element={<DealerWalletDetail />} />
          <Route path="/finance/deposits" element={<Deposits />} />
          <Route path="/finance/transactions" element={<Transactions />} />
          <Route path="/add-offer" element={<Offer />} />

          <Route path="/support" element={<SupportOverview />} />
          <Route path="/support/customer" element={<CustomerSupport />} />
          <Route path="/support/dealer" element={<DealerSupport />} />
          {/* Legacy ticket routes — redirect to the new Support module */}
          <Route path="/all-tickets" element={<Navigate to="/support/customer" replace />} />
          <Route path="/all-tickets/view-ticket/:ticketId" element={<LegacyTicketRedirect />} />

          <Route path="/location-featured-categories" element={<LocationFeaturedCategoryList />} />
          <Route path="/location-featured-categories/add" element={<LocationFeaturedCategoryForm isEdit={false} />} />
          <Route path="/location-featured-categories/edit/:id" element={<LocationFeaturedCategoryForm isEdit={true} />} />
          <Route path="/location-featured-categories/view/:id" element={<ViewLocationFeaturedCategory />} />

          <Route path="/serviceable-areas" element={<ServiceableAreas />} />

          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </>
  );
};

const SidebarLayout = ({ mobileOpen, handleToggleDrawer }) => {
  const isMobile = useMediaQuery("(max-width:1200px)");
  const drawerWidth = 280;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f8f9fa", overflowX: "hidden" }}>
      <Sidebar
        mobileOpen={mobileOpen}
        handleToggleDrawer={handleToggleDrawer}
        isMobile={isMobile}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0, // Prevents wide children (e.g. tables) from expanding this flex item and breaking the page layout
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          maxWidth: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` }, // Offset for permanent drawer
          transition: "margin 0.3s",
          pt: "70px", // Header offset
          overflowX: "hidden", // Page itself never scrolls horizontally; only individual table wrappers do
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

const LegacyTicketRedirect = () => {
  const { ticketId } = useParams();
  return <Navigate to={`/support/customer?ticket=${ticketId}`} replace />;
};

const AdditionalServiceFormWrapper = () => {
  const { id } = useParams();
  return <AdditionalServiceForm serviceId={id} />;
};

export default App;
