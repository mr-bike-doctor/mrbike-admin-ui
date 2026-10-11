import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Snackbar,
  Grid,
  Skeleton,
} from "@mui/material";

// API Imports
import { createAdditionalService, updateAdditionalService } from "../../api/additionalServiceApi";
import {
  useGetBaseAdditionalServicesQuery,
  useGetAdminAdditionalServiceByIdQuery,
} from "../../redux/services/serviceApi";
import { useGetDealersQuery } from "../../redux/services/dealerApi";

// Modular Components
import AdditionalServiceConfigurationSection from "./AdditionalServiceConfigurationSection";
import CcPricingTable from "./CcPricingTable";
import PricingEngineSection from "../Service/service-form/PricingEngineSection";
import PricingDistributionSummary from "../Service/service-form/PricingDistributionSummary";
import BaseCatalogPreview from "../Service/service-form/BaseCatalogPreview";
import PricingPreviewPanel from "../Service/service-form/PricingPreviewPanel";
import FooterActions from "../Service/service-form/FooterActions";
import PageHeader from "../Global/PageHeader";

const EMPTY_ARRAY = [];

const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  const baseUrl = process.env.REACT_APP_IMAGE_BASE_URL || "https://api.mrbikedoctor.cloud/";
  
  if (imagePath.startsWith("http")) {
    if (imagePath.includes("localhost:8001")) {
      return imagePath.replace(/http:\/\/localhost:8001\//, baseUrl);
    }
    return imagePath;
  }
  
  return `${baseUrl}${imagePath}`;
};

const AdditionalServiceForm = ({ serviceId, dealerId, onDataLoaded }) => {
  const navigate = useNavigate();
  const isEditMode = !!serviceId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    base_service_id: "",
    description: "",
  });
  const [pricingRules, setPricingRules] = useState([]);
  const [newRule, setNewRule] = useState({ minCc: "", maxCc: "", price: "" });
  const [formErrors, setFormErrors] = useState({});

  // Data/Selection State
  const [bikes, setBikes] = useState([{ id: 1, cc: "", manualPrice: null }]);
  const [selectedBaseService, setSelectedBaseService] = useState(null);
  const [selectedDealer, setSelectedDealer] = useState(null);

  const [alertInfo, setAlertInfo] = useState({
    show: false,
    message: "",
    severity: "success",
  });

  // --- RTK Query Hooks ---
  const { data: baseServices = EMPTY_ARRAY, isLoading: loadingBS } =
    useGetBaseAdditionalServicesQuery();
  const { data: dealers = EMPTY_ARRAY, isLoading: loadingDeal } = useGetDealersQuery();

  const { data: editData, isFetching: loadingEdit } =
    useGetAdminAdditionalServiceByIdQuery(serviceId, {
      skip: !isEditMode,
    });

  const isLoading = loadingBS || loadingDeal || (isEditMode && loadingEdit);

  useEffect(() => {
    if (!isLoading) setIsDirty(true);
  }, [
    formData,
    selectedBaseService,
    selectedDealer,
    pricingRules,
    bikes,
    isLoading,
  ]);

  // Sync loaded edit data
  useEffect(() => {
    if (isLoading) return;

    if (
      isEditMode &&
      editData &&
      baseServices.length &&
      dealers.length
    ) {
      const data = editData.data || editData;
      if (!data) {
        setAlertInfo({
          show: true,
          message: "Failed to load additional service.",
          severity: "error",
        });
        return;
      }
      
      const bId = typeof data.base_additional_service_id === "string" 
        ? data.base_additional_service_id 
        : data.base_additional_service_id?._id || "";
      
      setFormData((prev) => ({
        ...prev,
        base_service_id: bId,
        description: data.description || "",
      }));

      const foundBase = baseServices.find((s) => s._id === bId) || null;
      if (selectedBaseService !== foundBase) setSelectedBaseService(foundBase);

      const dIdLoaded = data.dealer_id
        ? typeof data.dealer_id === "string"
          ? data.dealer_id
          : data.dealer_id._id
        : "";
      const foundDealer = dealers.find((d) => d._id === dIdLoaded) || null;
      if (selectedDealer?._id !== foundDealer?._id) setSelectedDealer(foundDealer);

      // Map loaded bikes (cc/price)
      if (data.bikes && Array.isArray(data.bikes)) {
        setBikes(data.bikes.map((b, idx) => ({
          id: b._id || idx + 1,
          cc: b.cc,
          manualPrice: Number(b.price),
          dbId: b._id
        })));
      }

      if (onDataLoaded) onDataLoaded(data);
    } else if (!isEditMode && dealers.length) {
      const urlParams = new URLSearchParams(window.location.search);
      const dIdParam = dealerId || urlParams.get("dealerId");
      if (dIdParam) {
        const preD = dealers.find((d) => d._id === dIdParam);
        if (preD && selectedDealer?._id !== preD._id) setSelectedDealer(preD);
      }
    }
  }, [editData, isEditMode, baseServices, dealers, isLoading, dealerId, onDataLoaded, selectedBaseService, selectedDealer?._id]);

  const addPricingRule = () => {
    const min = Number(newRule.minCc),
      max = Number(newRule.maxCc),
      prc = Number(newRule.price);
    if (min >= 0 && max >= min && prc > 0) {
      setPricingRules((prev) => [
        ...prev,
        { id: Date.now(), minCc: min, maxCc: max, price: prc },
      ]);
      setNewRule({ minCc: "", maxCc: "", price: "" });
    } else
      setAlertInfo({
        show: true,
        message: "Invalid rule.",
        severity: "warning",
      });
  };

  const allBikesWithPrices = useMemo(
    () =>
      bikes.map((bike) => {
        let computed = null;
        const ccNum = Number(bike.cc);
        for (const r of pricingRules) {
          if (ccNum >= r.minCc && ccNum <= r.maxCc) {
            computed = r.price;
            break;
          }
        }
        const isManual =
          bike.manualPrice !== null && String(bike.manualPrice).trim() !== "";
        return {
          ...bike,
          computedPrice: computed,
          effectivePrice: isManual ? Number(bike.manualPrice) : computed,
          isManualOverride: isManual,
        };
      }),
    [bikes, pricingRules],
  );

  const priceDistribution = useMemo(() => {
    const dist = {};
    allBikesWithPrices.forEach((b) => {
      if (b.effectivePrice)
        dist[b.effectivePrice] = (dist[b.effectivePrice] || 0) + 1;
    });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
  }, [allBikesWithPrices]);

  const validate = () => {
    const errors = {};
    if (!selectedBaseService)
      errors.base_service_id = "Please select a base additional service";
    if (!formData.description?.trim())
      errors.description = "Please enter a description";
    if (!selectedDealer) errors.dealer = "Please select a dealer";
    if (
      allBikesWithPrices.length > 0 &&
      !allBikesWithPrices.some((b) => b.cc && b.effectivePrice > 0)
    )
      errors.noPrices = "At least one CC range must have a price";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    const bikesPayload = allBikesWithPrices
      .filter((b) => b.cc && b.effectivePrice > 0)
      .map((b) => ({
        cc: Number(b.cc),
        price: Number(b.effectivePrice),
        ...(b.dbId ? { _id: b.dbId } : {}),
      }));

    const payload = {
      base_additional_service_id: selectedBaseService?._id,
      description: formData.description,
      dealer_id: selectedDealer?._id,
      bikes: JSON.stringify(bikesPayload),
    };

    try {
      const res = isEditMode
        ? await updateAdditionalService(serviceId, payload)
        : await createAdditionalService(payload);
        
      if (res?.status === true || res?.status === 200) {
        setIsDirty(false);
        setAlertInfo({ show: true, message: `Success!`, severity: "success" });
        setTimeout(() => {
          if (selectedDealer?._id) navigate(`/view-dealer/${selectedDealer._id}`);
          else navigate("/dealers");
        }, 1500);
      } else throw new Error(res.message || "Failed");
    } catch (err) {
      setAlertInfo({ show: true, message: err.message, severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", path: "/" },
    { label: "Dealers", path: "/dealers" },
    { 
      label: selectedDealer?.shopName || "Dealer", 
      path: selectedDealer?._id ? `/view-dealer/${selectedDealer._id}` : "#" 
    },
    { label: isEditMode ? "Edit Addtl. Service" : "Create Addtl. Service", path: "#" },
  ];

  if (isLoading)
    return (
      <Box sx={{ pb: 10, px: 4 }}>
        <Skeleton variant="text" sx={{ width: "20%", height: 40, mb: 4 }} />
        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 4, mb: 4 }} />
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 4 }} />
          </Grid>
        </Grid>
      </Box>
    );

  return (
    <Box sx={{ pb: 12, px: { xs: 2, lg: 4 } }}>
      <PageHeader
        title={isEditMode ? "Edit Additional Service" : "New Additional Service"}
        breadcrumbs={breadcrumbs}
        action={{
          label: "Back to Profile",
          onClick: () => {
            if (selectedDealer?._id) navigate(`/view-dealer/${selectedDealer._id}`);
            else navigate(-1);
          }
        }}
      />

      <form onSubmit={handleSubmit}>
        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            <AdditionalServiceConfigurationSection
              {...{
                selectedBaseService,
                setSelectedBaseService,
                baseServices,
                selectedDealer,
                setSelectedDealer,
                dealers,
                formData,
                setFormData,
                formErrors,
                setFormErrors,
                dealerId,
                getImageUrl,
              }}
            />
            
            <PricingEngineSection
              {...{
                pricingRules,
                setPricingRules,
                newRule,
                setNewRule,
                addPricingRule,
                deletePricingRule: (id) =>
                  setPricingRules((p) => p.filter((r) => r.id !== id)),
              }}
            />
            
            <PricingDistributionSummary priceDistribution={priceDistribution} />
            
            <CcPricingTable
              bikes={allBikesWithPrices}
              processRowUpdate={(nR) => {
                const nMP = nR.effectivePrice === "" || nR.effectivePrice === null ? null : Number(nR.effectivePrice);
                setBikes((p) => p.map((b) => b.id === nR.id ? { ...b, cc: nR.cc, manualPrice: nMP } : b));
                return { ...nR, effectivePrice: nMP, isManualOverride: true };
              }}
              handleProcessRowUpdateError={(e) => setAlertInfo({ show: true, message: e.message, severity: "error" })}
              onAddRow={() => setBikes(p => [...p, { id: Date.now(), cc: "", manualPrice: null }])}
              onDeleteRow={(id) => setBikes(p => p.filter(b => b.id !== id))}
            />
          </Grid>
          <Grid item xs={12} lg={4}>
            <Box sx={{ position: { lg: "sticky" }, top: 100 }}>
              <BaseCatalogPreview
                selectedBaseService={selectedBaseService}
                getImageUrl={getImageUrl}
              />
              <PricingPreviewPanel allBikesWithPrices={allBikesWithPrices.map(b => ({ ...b, model_name: `${b.cc || '--'} CC`, variant_name: 'Range' }))} />
            </Box>
          </Grid>
        </Grid>
        <FooterActions
          isDirty={isDirty}
          isSubmitting={isSubmitting}
          navigate={navigate}
        />
      </form>
      <Snackbar
        open={alertInfo.show}
        autoHideDuration={3000}
        onClose={() => setAlertInfo({ ...alertInfo, show: false })}
        message={alertInfo.message}
        sx={{ mb: 8 }}
      />
    </Box>
  );
};

export default AdditionalServiceForm;
