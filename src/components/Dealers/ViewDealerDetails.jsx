"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ArticleIcon from "@mui/icons-material/Article";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import HistoryIcon from "@mui/icons-material/History";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { FaTools } from "react-icons/fa";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import "jspdf-autotable";

import {
  getServiceList,
  getAdditionalServiceList,
  getDealerById,
  getDealerActivityHistory,
  getDealerNotifications,
} from "../../api";
import { getImageUrl } from "./Details/dealerUtils";

import DealerProfileHeader from "./Details/DealerProfileHeader";
import OverviewTab from "./Details/tabs/OverviewTab";
import ShopLocationTab from "./Details/tabs/ShopLocationTab";
import DocumentsTab from "./Details/tabs/DocumentsTab";
import BankingTab from "./Details/tabs/BankingTab";
import LiveVerificationTab from "./Details/tabs/LiveVerificationTab";
import BusinessSettingsTab from "./Details/tabs/BusinessSettingsTab";
import ActivityTab from "./Details/tabs/ActivityTab";
import NotificationsTab from "./Details/tabs/NotificationsTab";
import DealerServicesManager from "./ServicesV2/DealerServicesManager";
import DealerApprovalProgressTracker from "./Progress/DealerApprovalProgressTracker";

function CustomTabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dealer-tabpanel-${index}`}
      aria-labelledby={`dealer-tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const TABS = [
  { label: "Overview", icon: <PersonIcon sx={{ fontSize: 18 }} /> },
  { label: "Shop & Location", icon: <LocationOnIcon sx={{ fontSize: 18 }} /> },
  { label: "Documents", icon: <ArticleIcon sx={{ fontSize: 18 }} /> },
  { label: "Banking", icon: <AccountBalanceIcon sx={{ fontSize: 18 }} /> },
  { label: "Live Verification", icon: <CameraAltIcon sx={{ fontSize: 18 }} /> },
  { label: "Business Settings", icon: <SettingsIcon sx={{ fontSize: 18 }} /> },
  { label: "Services", icon: <FaTools style={{ fontSize: 17 }} /> },
  { label: "Activity", icon: <HistoryIcon sx={{ fontSize: 18 }} /> },
  { label: "Notifications", icon: <NotificationsIcon sx={{ fontSize: 18 }} /> },
];

const VendorDealerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dealer, setDealer] = useState(null);
  const [dealerServices, setDealersServices] = useState([]);
  const [additionalServices, setAdditionalServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [activityHistory, setActivityHistory] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState(null);

  const fetchDealer = useCallback(async () => {
    try {
      const data = await getDealerById(id);
      if (!data) throw new Error("Failed to load dealer");
      setDealer(data);
    } catch (err) {
      Swal.fire("Error", err.message || "Failed to load dealer", "error");
      navigate("/dealers");
    }
  }, [id, navigate]);

  const fetchServices = useCallback(async () => {
    try {
      const [servicesRes, addServicesRes] = await Promise.all([
        getServiceList(),
        getAdditionalServiceList(),
      ]);

      if (servicesRes?.status === true && Array.isArray(servicesRes.data)) {
        setDealersServices(
          servicesRes.data.filter((s) => {
            const sid = s.dealer_id?._id || s.dealer_id || s.dealer?._id || s.dealer;
            return sid === id;
          })
        );
      } else {
        setDealersServices([]);
      }

      if (addServicesRes?.status === true && Array.isArray(addServicesRes.data)) {
        setAdditionalServices(
          addServicesRes.data.filter((s) => {
            const sid = s.dealer_id?._id || s.dealer_id || s.dealer?._id || s.dealer;
            return sid === id;
          })
        );
      } else {
        setAdditionalServices([]);
      }
    } catch {
      setDealersServices([]);
      setAdditionalServices([]);
    }
  }, [id]);

  const fetchActivityHistory = useCallback(async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const res = await getDealerActivityHistory(id);
      setActivityHistory(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setActivityError(
        err?.response?.data?.message || "Failed to load activity history."
      );
      setActivityHistory([]);
    } finally {
      setActivityLoading(false);
    }
  }, [id]);

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const res = await getDealerNotifications(id);
      setNotifications(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setNotificationsError(
        err?.response?.data?.message || "Failed to load notifications."
      );
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchDealer(),
        fetchServices(),
        fetchActivityHistory(),
        fetchNotifications(),
      ]);
      setLoading(false);
    };
    init();
  }, [fetchDealer, fetchServices, fetchActivityHistory, fetchNotifications]);

  const groupedServices = React.useMemo(() => {
    const groups = {};
    dealerServices.forEach((service) => {
      const baseId = service.base_service_id?._id || service.base_service_id || "unknown";
      if (!groups[baseId]) {
        groups[baseId] = {
          details: service.base_service_id || { name: service.name || "Unknown Service" },
          instances: [],
        };
      }
      groups[baseId].instances.push(service);
    });
    return Object.values(groups);
  }, [dealerServices]);

  const groupedAdditionalServices = React.useMemo(() => {
    const groups = {};
    additionalServices.forEach((service) => {
      const baseId = service.base_additional_service_id?._id || service.base_additional_service_id || "unknown";
      if (!groups[baseId]) {
        groups[baseId] = {
          details: service.base_additional_service_id || { name: service.name || "Unknown Service" },
          instances: [],
        };
      }
      groups[baseId].instances.push(service);
    });
    return Object.values(groups);
  }, [additionalServices]);

  const downloadDealerPDF = async () => {
    setPdfLoading(true);
    try {
      const doc = new jsPDF();

      const convertImageToBase64 = async (url) => {
        try {
          const fetchUrl = `${url}${url.includes("?") ? "&" : "?"}cache_bust=${Date.now()}`;
          const res = await fetch(fetchUrl, { mode: "cors", credentials: "omit" });
          if (!res.ok) return null;
          const blob = await res.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      doc.setFillColor(46, 131, 255);
      doc.rect(0, 0, 210, 40, "F");
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text(dealer.shopName || "Dealer Profile", 15, 25);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 33);

      let yPos = 50;
      const addSection = (title) => {
        if (yPos > 260) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setTextColor(46, 131, 255);
        doc.setFont("helvetica", "bold");
        doc.text(title, 15, yPos);
        yPos += 2;
        doc.setDrawColor(46, 131, 255);
        doc.setLineWidth(0.5);
        doc.line(15, yPos, 195, yPos);
        yPos += 8;
      };

      const addInfo = (label, value) => {
        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 15, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);
        const splitValue = doc.splitTextToSize(String(value || "N/A"), 130);
        doc.text(splitValue, 60, yPos);
        yPos += splitValue.length * 6 + 1;
      };

      addSection("Shop Information");
      addInfo("Shop Name", dealer.shopName);
      addInfo("Shop Email", dealer.shopEmail || dealer.email);
      addInfo("Shop Contact", dealer.shopContact || dealer.phone);
      addInfo("Full Address", dealer.permanentAddress?.address || dealer.fullAddress);
      addInfo("City / State", `${dealer.permanentAddress?.city || dealer.city || "N/A"} / ${dealer.permanentAddress?.state || dealer.state || "N/A"}`);
      addInfo("Pincode", dealer.shopPincode);
      addInfo("Commission / Tax", `${dealer.commission || 0}% / ${dealer.tax || 0}%`);
      addInfo("Status", dealer.isActive ? "Active" : "Inactive");
      yPos += 5;

      if (Array.isArray(dealer.shopImages) && dealer.shopImages.length > 0) {
        addSection("Shop Images");
        const imgWidth = 40, imgHeight = 30;
        let xOffset = 15;
        for (let i = 0; i < Math.min(dealer.shopImages.length, 4); i++) {
          const imgUrl = `${process.env.REACT_APP_IMAGE_BASE_URL}${dealer.shopImages[i]}`;
          const base64Img = await convertImageToBase64(imgUrl);
          if (base64Img) {
            try {
              const format = base64Img.split(";")[0].split("/")[1].toUpperCase();
              doc.addImage(base64Img, format === "JPEG" ? "JPEG" : "PNG", xOffset, yPos, imgWidth, imgHeight);
              xOffset += imgWidth + 5;
            } catch {}
          }
        }
        yPos += imgHeight + 10;
      }

      addSection("Owner Details");
      addInfo("Owner Name", dealer.ownerName);
      addInfo("Owner Email", dealer.personalEmail || dealer.email);
      addInfo("Owner Phone", dealer.phone);
      addInfo("Alternate Phone", dealer.alternatePhone);
      addInfo("Aadhar No.", dealer.aadharCardNo);
      addInfo("PAN No.", (dealer.panCardNo || "N/A").toUpperCase());
      yPos += 10;

      addSection("KYC Documents");
      const docItems = [
        { label: "Aadhar Front", key: dealer.documents?.aadharFront },
        { label: "Aadhar Back", key: dealer.documents?.aadharBack },
        { label: "PAN Card", key: dealer.documents?.panCardFront },
        { label: "Passbook", key: dealer.bankDetails?.passbookImage },
      ];
      let docXOffset = 15;
      for (const docItem of docItems) {
        if (docItem.key) {
          const imgUrl = getImageUrl(docItem.key);
          const base64Img = await convertImageToBase64(imgUrl);
          if (base64Img) {
            try {
              const format = base64Img.split(";")[0].split("/")[1].toUpperCase();
              doc.setFontSize(8);
              doc.text(docItem.label, docXOffset, yPos);
              doc.addImage(base64Img, format === "JPEG" ? "JPEG" : "PNG", docXOffset, yPos + 2, 40, 30);
              docXOffset += 45;
            } catch {}
          }
        }
      }
      yPos += 45;

      addSection("Banking Details");
      addInfo("Account Holder", dealer.bankDetails?.accountHolderName);
      addInfo("Bank Name", dealer.bankDetails?.bankName);
      addInfo("Account Number", dealer.bankDetails?.accountNumber);
      addInfo("IFSC Code", dealer.bankDetails?.ifscCode);
      yPos += 5;

      addSection("Document Status");
      const isShopProfileDone = Boolean(
        dealer.isProfile ||
        dealer.submittedAt ||
        dealer.status?.adminApproved ||
        dealer.formProgress?.shopDetails?.completed
      );
      const isVerifiedText = dealer.status?.adminApproved
        ? "Approved"
        : dealer.status?.documentVerified || dealer.isVerify
        ? "Verified"
        : dealer.submittedAt
        ? "Pending Review"
        : "Unverified";

      const docStatus = [
        ["Document Type", "Status"],
        ["Aadhar Card Front", dealer.documents?.aadharFront ? "Uploaded" : "Pending"],
        ["Aadhar Card Back", dealer.documents?.aadharBack ? "Uploaded" : "Pending"],
        ["PAN Card Front", dealer.documents?.panCardFront ? "Uploaded" : "Pending"],
        ["Passbook", dealer.bankDetails?.passbookImage ? "Uploaded" : "Pending"],
        ["Shop Profile", isShopProfileDone ? "Completed" : "Incomplete"],
        ["Verification", isVerifiedText],
      ];
      doc.autoTable({
        body: docStatus,
        startY: yPos,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
      });
      yPos = doc.lastAutoTable.finalY + 15;

      if (dealerServices.length > 0) {
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setTextColor(46, 131, 255);
        doc.setFont("helvetica", "bold");
        doc.text("Service & Pricing Information", 15, yPos);
        yPos += 5;
        const serviceRows = [];
        dealerServices.forEach((service, sIdx) => {
          if (service.bikes?.length > 0) {
            service.bikes.forEach((bike, bIdx) => {
              serviceRows.push([
                bIdx === 0 ? sIdx + 1 : "",
                bIdx === 0 ? service.name : "",
                `${bike.cc} CC`,
                `Rs. ${bike.price}`,
                bIdx === 0 ? new Date(service.createdAt).toLocaleDateString() : "",
              ]);
            });
          }
        });
        doc.autoTable({
          head: [["#", "Service Name", "Bike Capacity", "Service Price", "Listed On"]],
          body: serviceRows,
          startY: yPos,
          theme: "grid",
          headStyles: { fillColor: [46, 131, 255], textColor: 255 },
          styles: { fontSize: 9 },
        });
      }

      doc.save(`${dealer.shopName.replace(/\s/g, "_")}_Full_Profile.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      Swal.fire("Error", "Failed to generate PDF", "error");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (!dealer) return <Alert severity="error">Dealer not found.</Alert>;

  return (
    <Box sx={{ bgcolor: "#f8f9fa", minHeight: "100vh" }}>
      {/* Sticky Profile Header */}
      <DealerProfileHeader
        dealer={dealer}
        id={id}
        onRefresh={fetchDealer}
        onExportPDF={downloadDealerPDF}
        pdfLoading={pdfLoading}
      />

      {/* Tab Card & Progress Tracker */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pb: 6 }}>
        {/* Onboarding & Approval Step Progress Tracker */}
        <DealerApprovalProgressTracker
          dealer={dealer}
          dealerServices={dealerServices}
          onStepClick={(step) => {
            if (step.tabIndex !== undefined && step.tabIndex !== null) {
              setTabIndex(step.tabIndex);
            }
          }}
        />

        <Card
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
          }}
        >
          {/* Tab Bar */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", px: 1, bgcolor: "white" }}>
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="dealer profile tabs"
              sx={{
                "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
                "& .MuiTab-root": {
                  fontWeight: 700,
                  py: 2.5,
                  fontSize: "0.85rem",
                  color: "text.secondary",
                  textTransform: "none",
                  minWidth: 120,
                  "&.Mui-selected": { color: "primary.main" },
                },
              }}
            >
              {TABS.map((tab) => (
                <Tab
                  key={tab.label}
                  icon={tab.icon}
                  iconPosition="start"
                  label={tab.label}
                />
              ))}
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ bgcolor: "#f8fafc" }}>
            <CardContent sx={{ p: 0 }}>

              <CustomTabPanel value={tabIndex} index={0}>
                <OverviewTab dealer={dealer} />
              </CustomTabPanel>

              <CustomTabPanel value={tabIndex} index={1}>
                <ShopLocationTab dealer={dealer} />
              </CustomTabPanel>

              <CustomTabPanel value={tabIndex} index={2}>
                <DocumentsTab dealer={dealer} onRefresh={fetchDealer} />
              </CustomTabPanel>

              <CustomTabPanel value={tabIndex} index={3}>
                <BankingTab dealer={dealer} />
              </CustomTabPanel>

              <CustomTabPanel value={tabIndex} index={4}>
                <LiveVerificationTab dealer={dealer} />
              </CustomTabPanel>

              <CustomTabPanel value={tabIndex} index={5}>
                <BusinessSettingsTab dealer={dealer} onRefresh={fetchDealer} />
              </CustomTabPanel>

              <CustomTabPanel value={tabIndex} index={6}>
                <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
                  <DealerServicesManager dealer={dealer} />
                </Box>
              </CustomTabPanel>

              <CustomTabPanel value={tabIndex} index={7}>
                <ActivityTab
                  activity={activityHistory}
                  loading={activityLoading}
                  error={activityError}
                />
              </CustomTabPanel>

              <CustomTabPanel value={tabIndex} index={8}>
                <NotificationsTab
                  notifications={notifications}
                  loading={notificationsLoading}
                  error={notificationsError}
                />
              </CustomTabPanel>

            </CardContent>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default VendorDealerDetails;
