import { useCallback, useEffect, useState } from "react";
import {
  createBaseService,
  getBaseServiceById,
  updateBaseService,
  getServiceCategories,
  getServiceDetail,
  saveServiceDetail,
  setServiceDetailPublished,
} from "../../api";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import axios from "axios";
import PageHeader from "../Global/PageHeader";
import BasicsTab from "./service-detail/BasicsTab";
import MediaTab from "./service-detail/MediaTab";
import ContentTab from "./service-detail/ContentTab";
import FaqsTab from "./service-detail/FaqsTab";
import PreviewTab from "./service-detail/PreviewTab";
import { withKeys, stripKeys } from "./service-detail/ContentTab";

const AI_API_URL = process.env.REACT_APP_AI_API_URL || "/ai/generate";

const TABS = [
  { key: "basics", label: "Basics" },
  { key: "media", label: "Media" },
  { key: "content", label: "Content" },
  { key: "faqs", label: "FAQs" },
  { key: "preview", label: "Preview" },
];

const emptyForm = {
  name: "",
  description: "",
  categoryId: "",
  basePrice: "",
  duration: "",
  pickupAvailable: false,
  warranty: false,
  isFeatured: false,
  isQuickService: false,
  // Phase 1 lightweight BaseService fields
  shortDescription: "",
  warrantyText: "",
  recommendedInterval: "",
  // ServiceDetail content
  fullDescription: "",
};

/**
 * Base Service create/edit — upgraded into the Service Detail CMS.
 *
 * Create mode intentionally exposes Basics only: media uploads and detail
 * content are keyed by service id, which doesn't exist until the service is
 * created. Saving a new service therefore redirects into edit mode, where the
 * remaining tabs unlock — that also means an upload can never be orphaned in
 * S3 against a service that was never created.
 *
 * Saving writes through TWO endpoints, deliberately: the existing
 * base-service endpoint keeps ownership of the fields it always owned, and
 * the new Service Detail endpoint owns the new content. No existing API
 * contract changes.
 */
const BaseServiceForm = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeTab, setActiveTab] = useState("basics");
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState({ essentialItems: [], optionalItems: [], benefits: [] });
  const [faqs, setFaqs] = useState([]);
  const [isPublished, setIsPublished] = useState(false);

  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  const [categories, setCategories] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [publishBlockers, setPublishBlockers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await getServiceCategories();
        if (res?.status) setCategories(res.data || []);
      } catch (error) {
        console.error("Error fetching service categories:", error);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;

    const fetchAll = async () => {
      try {
        setIsLoading(true);
        // Base fields and detail content come from two endpoints; neither
        // failing should block the other from rendering.
        const [baseRes, detailRes] = await Promise.all([
          getBaseServiceById(id),
          getServiceDetail(id).catch(() => null),
        ]);

        const service = baseRes?.data;
        const detailData = detailRes?.data;
        const detail = detailData?.detail;

        setForm({
          name: service?.name || "",
          description: service?.description || "",
          categoryId: service?.categoryId?._id || service?.categoryId || "",
          basePrice: service?.basePrice ?? "",
          duration: service?.duration ?? "",
          pickupAvailable: !!service?.pickupAvailable,
          warranty: !!service?.warranty,
          isFeatured: !!service?.isFeatured,
          isQuickService: !!service?.isQuickService,
          shortDescription: detailData?.shortDescription ?? service?.shortDescription ?? "",
          warrantyText: detailData?.warrantyText ?? service?.warrantyText ?? "",
          recommendedInterval: detailData?.recommendedInterval ?? service?.recommendedInterval ?? "",
          fullDescription: detail?.fullDescription || "",
        });
        setExistingImage(service?.image || null);
        setImages(detail?.images || []);
        setVideoUrl(detail?.videoUrl || "");
        setContent({
          essentialItems: withKeys(detail?.essentialItems || []),
          optionalItems: withKeys(detail?.optionalItems || []),
          benefits: withKeys(detail?.benefits || []),
        });
        setFaqs(
          (detail?.faqs || []).map((faq, index) => ({ ...faq, _key: `faq-loaded-${index}` })),
        );
        setIsPublished(!!detail?.isPublished);
      } catch (error) {
        console.error("Error fetching service:", error);
        setGlobalError("Failed to load service details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [isEdit, id]);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(image);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleGenerateDescription = async () => {
    if (!form.name.trim()) return;
    setIsGenerating(true);
    setGlobalError(null);
    try {
      const { data } = await axios.post(AI_API_URL, {
        prompt: `Write a clear, professional description for a bike service called "${form.name}". Please provide the description ONLY as a short list of bullet points using standard dashes (-). Do not use any markdown formatting like asterisks (**) for bolding. Do not include any introductory text, conversational filler, or concluding remarks.`,
      });
      if (data?.result) setForm((prev) => ({ ...prev, description: data.result }));
    } catch (error) {
      console.error("Failed to generate description:", error);
      setSnackbar({ open: true, message: "Failed to generate AI description", severity: "error" });
    } finally {
      setIsGenerating(false);
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Service name is required";
    else if (form.name.length < 2) errors.name = "Name must be at least 2 characters";
    if (!isEdit && !image) errors.image = "Service image is required";
    setFormErrors(errors);
    if (Object.keys(errors).length) setActiveTab("basics");
    return Object.keys(errors).length === 0;
  };

  const buildDetailPayload = useCallback(
    () => ({
      shortDescription: form.shortDescription,
      warrantyText: form.warrantyText,
      recommendedInterval: form.recommendedInterval,
      fullDescription: form.fullDescription,
      videoUrl: videoUrl.trim() || null,
      images: images.map(({ url, alt, isCover }) => ({ url, alt, isCover })),
      essentialItems: stripKeys(content.essentialItems),
      optionalItems: stripKeys(content.optionalItems),
      benefits: stripKeys(content.benefits),
      faqs: stripKeys(faqs),
    }),
    [form, videoUrl, images, content, faqs],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setGlobalError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // 1. Existing base-service endpoint — unchanged contract.
      const baseData = new FormData();
      baseData.append("name", form.name);
      baseData.append("description", form.description);
      if (form.categoryId) baseData.append("categoryId", form.categoryId);
      baseData.append("basePrice", form.basePrice || 0);
      baseData.append("duration", form.duration || 0);
      baseData.append("pickupAvailable", form.pickupAvailable);
      baseData.append("warranty", form.warranty);
      baseData.append("isFeatured", form.isFeatured);
      baseData.append("isQuickService", form.isQuickService);
      if (image) baseData.append("image", image);

      if (!isEdit) {
        const created = await createBaseService(baseData);
        const newId = created?.data?._id;
        setSnackbar({ open: true, message: "Service created. Add detail content below.", severity: "success" });
        // Detail content is keyed by service id, so editing continues in edit
        // mode where media upload and the remaining tabs are available.
        if (newId) setTimeout(() => navigate(`/edit-base-service/${newId}`), 800);
        else setTimeout(() => navigate("/MajorServices"), 800);
        return;
      }

      await updateBaseService(id, baseData);

      // 2. New Service Detail endpoint — upsert, never a duplicate insert.
      const detailRes = await saveServiceDetail(id, buildDetailPayload());
      if (detailRes?.status === false) {
        setGlobalError(detailRes.message || "Could not save service detail content");
        return;
      }

      setIsPublished(!!detailRes?.data?.detail?.isPublished);
      setPreviewKey((k) => k + 1);
      setPublishBlockers([]);
      setSnackbar({ open: true, message: "Service saved successfully.", severity: "success" });
    } catch (error) {
      const err = error.response?.data;
      if (err?.field) setFormErrors((prev) => ({ ...prev, [err.field]: err.message }));
      else setGlobalError(err?.message || "An unexpected error occurred during submission");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Publishing is gated server-side; a rejection returns every blocker at
  // once so the admin gets one complete checklist instead of one error per try.
  const handleTogglePublish = async () => {
    setIsPublishing(true);
    setGlobalError(null);
    setPublishBlockers([]);
    try {
      const next = !isPublished;
      const res = await setServiceDetailPublished(id, next);
      if (res?.status) {
        setIsPublished(next);
        setPreviewKey((k) => k + 1);
        setSnackbar({
          open: true,
          message: next ? "Service detail published." : "Service detail moved to draft.",
          severity: "success",
        });
      } else {
        setPublishBlockers(res?.blockers || []);
        setGlobalError(res?.message || "Could not change publish state");
      }
    } catch (error) {
      const err = error.response?.data;
      setPublishBlockers(err?.blockers || []);
      setGlobalError(err?.message || "Could not change publish state");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  const detailTabsDisabled = !isEdit;

  return (
    <div className="page-wrapper">
      <div className="content container-fluid">
        <Box sx={{ py: 1 }}>
          <PageHeader
            title={isEdit ? "Edit Service" : "Add Service"}
            breadcrumbs={[
              { label: "Dashboard", path: "/" },
              { label: "Services", path: "/MajorServices" },
              { label: isEdit ? "Edit" : "Add", path: "#" },
            ]}
          />

          <Box sx={{ width: "100%", maxWidth: "1000px" }}>
            <Card elevation={3} sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}>
              {isEdit && (
                <>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    gap={1.5}
                    sx={{ px: { xs: 2, md: 4 }, pt: 2.5 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                        DETAIL PAGE
                      </Typography>
                      <Chip
                        size="small"
                        label={isPublished ? "Published" : "Draft"}
                        color={isPublished ? "success" : "default"}
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                    <Button
                      variant={isPublished ? "outlined" : "contained"}
                      color={isPublished ? "inherit" : "success"}
                      onClick={handleTogglePublish}
                      disabled={isPublishing || isSubmitting}
                      sx={{ textTransform: "none", fontWeight: 700, minWidth: 150 }}
                    >
                      {isPublishing ? (
                        <CircularProgress size={22} color="inherit" />
                      ) : isPublished ? (
                        "Move to Draft"
                      ) : (
                        "Publish Detail Page"
                      )}
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ px: { xs: 2, md: 4 }, display: "block", mt: 0.5 }}>
                    {isPublished
                      ? "This detail page is live in the rider app."
                      : "Draft content is never shown in the rider app. Save your changes, then publish."}
                  </Typography>
                </>
              )}

              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ px: { xs: 1, md: 3 }, mt: isEdit ? 1.5 : 1, borderBottom: "1px solid #e2e8f0" }}
              >
                {TABS.map((tab) => (
                  <Tab
                    key={tab.key}
                    value={tab.key}
                    label={tab.label}
                    disabled={tab.key !== "basics" && detailTabsDisabled}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  />
                ))}
              </Tabs>

              <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                {globalError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setGlobalError(null)}>
                    <AlertTitle sx={{ fontWeight: 700, mb: publishBlockers.length ? 0.5 : 0 }}>{globalError}</AlertTitle>
                    {publishBlockers.length > 0 && (
                      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                        {publishBlockers.map((blocker) => (
                          <li key={blocker}>
                            <Typography variant="body2">{blocker}</Typography>
                          </li>
                        ))}
                      </Box>
                    )}
                  </Alert>
                )}

                {!isEdit && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Create the service first — media, content, FAQs and preview unlock once it exists.
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <Box hidden={activeTab !== "basics"}>
                    <BasicsTab
                      form={form}
                      errors={formErrors}
                      categories={categories}
                      onChange={handleChange}
                      onSwitchChange={handleSwitchChange}
                      onFullDescriptionChange={(html) => setForm((prev) => ({ ...prev, fullDescription: html }))}
                      onGenerateDescription={handleGenerateDescription}
                      isGenerating={isGenerating}
                      imagePreviewUrl={previewUrl}
                      existingImage={existingImage}
                      onImageSelect={(e) => {
                        if (e.target.files?.length) {
                          setImage(e.target.files[0]);
                          setFormErrors((prev) => ({ ...prev, image: null }));
                        }
                      }}
                      onImageClear={() => {
                        setImage(null);
                        setPreviewUrl(null);
                        if (isEdit) setExistingImage(null);
                      }}
                      isEdit={isEdit}
                    />
                  </Box>

                  {isEdit && (
                    <>
                      <Box hidden={activeTab !== "media"}>
                        <MediaTab
                          serviceId={id}
                          images={images}
                          onImagesChange={setImages}
                          videoUrl={videoUrl}
                          onVideoUrlChange={setVideoUrl}
                          baseImage={existingImage}
                        />
                      </Box>

                      <Box hidden={activeTab !== "content"}>
                        <ContentTab
                          content={content}
                          onChange={(field, next) => setContent((prev) => ({ ...prev, [field]: next }))}
                        />
                      </Box>

                      <Box hidden={activeTab !== "faqs"}>
                        <FaqsTab faqs={faqs} onChange={setFaqs} />
                      </Box>

                      {/* Mounted only when active so it refetches on entry
                          rather than holding stale preview data in the DOM. */}
                      {activeTab === "preview" && <PreviewTab serviceId={id} refreshKey={previewKey} />}
                    </>
                  )}

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/MajorServices")}
                      disabled={isSubmitting}
                      sx={{ fontWeight: "bold" }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ fontWeight: "bold", minWidth: 160 }}>
                      {isSubmitting ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : isEdit ? (
                        "Save Changes"
                      ) : (
                        "Create Service"
                      )}
                    </Button>
                  </Box>
                </form>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default BaseServiceForm;
