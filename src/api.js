import axios from "axios";
import Swal from "sweetalert2";
import {
  getApiErrorMessage,
  normalizeApiError,
} from "./utils/apiError";

axios.defaults.withCredentials = true;

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://api.mrbikedoctor.cloud/bikedoctor";

// New backend surface — same host, but under /api/v1 instead of /bikedoctor.
// Service Categories, Bike Compatibility (read-only) and Home Insights
// (read-only) all live here.
export const API_V1_BASE_URL =
  API_BASE_URL.replace(/\/bikedoctor\/?$/, "") + "/api/v1";

export const IMAGE_BASE_URL = "https://api.mrbikedoctor.cloud";

const getAuthToken = () => localStorage.getItem("adminToken");

const apiRequest = async (
  method,
  endpoint,
  data = {},
  showAlert = true,
  requiresAuth = true,
) => {
  try {
    const headers = {};

    if (requiresAuth) {
      const token = getAuthToken();
      if (token) headers["token"] = token;
    }

    const response = await axios({
      method,
      url: `${API_BASE_URL}${endpoint}`,
      data,
      headers,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);

    if (requiresAuth && error.response?.status === 401) {
      Swal.fire({
        icon: "warning",
        title: "Session Expired",
        text: "Please log in again.",
      });
      localStorage.removeItem("adminToken");
    }

    if (showAlert) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: getApiErrorMessage(error),
      });
    }

    // Callers that suppress the alert (showAlert = false) still need the real
    // reason, so carry it on the rejection instead of only in the dialog.
    throw normalizeApiError(error);
  }
};

// Same conventions as apiRequest() above (token header, sweetalert2 error
// surfacing, {status, message, data} response shape) but targeting the new
// /api/v1 surface instead of /bikedoctor.
const apiRequestV1 = async (
  method,
  endpoint,
  data = {},
  showAlert = true,
  requiresAuth = true,
) => {
  try {
    const headers = {};

    if (requiresAuth) {
      const token = getAuthToken();
      if (token) headers["token"] = token;
    }

    const response = await axios({
      method,
      url: `${API_V1_BASE_URL}${endpoint}`,
      data,
      headers,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);

    if (requiresAuth && error.response?.status === 401) {
      Swal.fire({
        icon: "warning",
        title: "Session Expired",
        text: "Please log in again.",
      });
      localStorage.removeItem("adminToken");
    }

    if (showAlert) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: getApiErrorMessage(error),
      });
    }

    // Callers that suppress the alert (showAlert = false) still need the real
    // reason, so carry it on the rejection instead of only in the dialog.
    throw normalizeApiError(error);
  }
};

export const loginUser = (email, password) =>
  apiRequest(
    "POST",
    "/adminauth/suadminLogin",
    { email, password },
    true,
    false,
  );

export const createUser = (userData) =>
  apiRequest("POST", "/adminauth/subadminsignup", userData);

export const getAdmins = () =>
  apiRequest("GET", "/adminauth/getalladmin", {}, false);

export const deleteAdmin = (adminId) =>
  apiRequest("DELETE", `/adminauth/deleteadmin/${adminId}`, {
    admin_id: adminId,
  });

// Deliberately silent about success/failure: all three callers (DealerForm,
// CreateDealerAI, updateDealer) render their own outcome UI, so alerting here
// too produced two stacked dialogs on success and let the caller's generic
// catch block paint over the real server message on failure. The rejection
// carries `userMessage` instead.
export const addDealer = async (dealerData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/dealer/addDealer`,
      dealerData,
      {
        headers: {
          token: getAuthToken(),
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error adding dealer:",
      error.response?.data || error.message,
    );

    throw normalizeApiError(error, "Failed to add the dealer. Please try again.");
  }
};

export const updateDealer = async (formData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/dealer/editDealer`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          token: getAuthToken(),
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error updating dealer:",
      error.response?.data || error.message,
    );

    throw normalizeApiError(
      error,
      "Failed to update the dealer. Please try again.",
    );
  }
};

export const getDealerList = () =>
  apiRequest("GET", "/dealer/dealerList", {}, false);

export const getDashboardCounts = () =>
  apiRequest("GET", "/adminauth/dashboard-counts", {}, false);

export const getAllDealersWithVerifyFalse = () =>
  apiRequest("GET", "/dealer/dealersWithVerifyFalse", {}, false);

export const getAllDealersWithDocFalse = () =>
  apiRequest("GET", "/dealer/dealersWithDocFalse", {}, false);

export const updateDealerVerification = async (dealerId) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/dealer/updateVerification`,
      { id: dealerId },
      {
        headers: {
          "Content-Type": "application/json",
          token: getAuthToken(), // Pass token in headers
        },
      },
    );

    return response;
  } catch (error) {
    console.error(
      "Error updating dealer:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const updateDealerDocStatus = async (dealerId) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/dealer/updateDocStatus`,
      { id: dealerId },
      {
        headers: {
          "Content-Type": "application/json",
          token: getAuthToken(), // Pass token in headers
        },
      },
    );

    return response;
  } catch (error) {
    console.error(
      "Error updating dealer:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const getCustomerList = () =>
  apiRequest("GET", "/customers/customerlist", {}, false);

export const getCustomerById = (id) =>
  apiRequest("GET", `/customers/view/${id}`, {}, false);

export const getAllBookings = () =>
  apiRequest("GET", "/bookings/getallbookings", {}, false);

// Completion photos are an ADMIN-INTERNAL service record the garage uploads
// before marking a service complete. They are deliberately NOT part of the
// booking payload (the field is `select: false` on the Booking schema so it can
// never leak into a customer response), so the details dialog fetches them
// on demand from this dealer/admin-only endpoint.
export const getBookingCompletionPhotos = (bookingId) =>
  apiRequest("GET", `/bookings/${bookingId}/completion-photos`, {}, false);

// Set/revise the towing charge on a single booking. The backend re-runs the
// whole pricing engine from this one number (subtotal, tax, customer total,
// commission, dealer payout) and rejects the call once the booking is billed
// or paid — nothing is computed admin-side.
export const updateBookingTowingCharge = (bookingId, towingCharge) =>
  apiRequest("POST", `/bookings/${bookingId}/towing-charge`, { towingCharge });

export const getAllPayment = () =>
  apiRequest("GET", "/payment/all-payments", {}, false);

// Same unified endpoint the User App and Dealer App call — one invoice per
// booking, one shared shape, rendered identically across all three surfaces.
export const getBookingInvoice = (bookingId) =>
  apiRequest("GET", `/invoice/booking/${bookingId}`, {}, false);

export const addBikeCompany = (data) =>
  apiRequest("POST", "/bike/add-bike-company", data, true, true);

export const addBikeModel = (data) =>
  apiRequest("POST", "/bike/add-bike-model", data, true, true);

export const addBikeVariant = (data) =>
  apiRequest("POST", "/bike/add-bike-variant", data, true, true);

// ✅ Fetch all bike companies (for dropdown)
export const getBikeCompanies = () =>
  apiRequest("GET", "/bike/get-bike-companies", {}, false);

// ✅ Fetch all bike models for a selected company (for dropdown)
export const getBikeModels = (companyId) =>
  apiRequest("GET", `/bike/get-bike-models/${companyId}`, {}, false);

// ✅ Fetch all bike variants for a selected model (for dropdown)
export const getBikeVariants = (modelId) =>
  apiRequest("GET", `/bike/get-bike-variants/${modelId}`, {}, false);

// ✅ Fetch all bikes
export const getBikes = () => apiRequest("GET", "/bike/bikes", {}, false);

// ✅ Fetch all CC list for a selected company
export const getCCListByCompany = (companyId) =>
  apiRequest("GET", `/bike/bikes/cc-by-company/${companyId}`, {}, false);

export const filterBikesByCompaniesMultiple = (companyIds) => {
  // Ensure we have a safe array to work with
  const safeIds = Array.isArray(companyIds) ? [...companyIds] : [companyIds];
  const queryString = safeIds.join(",");
  return apiRequest(
    "GET",
    `/bike/bikes/filter-by-company?companyIds=${queryString}`,
    {},
    false,
  );
};

export const deleteBike = async (bikeId) => {
  try {
    const token = getAuthToken();
    const response = await axios.delete(
      `${API_BASE_URL}/bike/deleteBike/${bikeId}`,
      {
        headers: {
          token: token,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error("Delete failed:", error.response?.data || error.message);

    const errorMessage =
      error.response?.data?.message || "Could not delete Bike";

    Swal.fire({
      icon: "error",
      title: "Deletion Failed",
      text: errorMessage,
    });

    throw error;
  }
};

export const deleteBikeModel = async (modelId) => {
  try {
    const token = getAuthToken();
    const response = await axios.delete(
      `${API_BASE_URL}/bike/deleteBikeModel/${modelId}`,
      {
        headers: {
          token: token,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Delete model failed:",
      error.response?.data || error.message,
    );

    const errorMessage =
      error.response?.data?.message || "Could not delete Bike Model";

    Swal.fire({
      icon: "error",
      title: "Deletion Failed",
      text: errorMessage,
    });

    throw error;
  }
};

export const deleteBikeCompany = async (companyId) => {
  try {
    const token = getAuthToken();
    const response = await axios.delete(
      `${API_BASE_URL}/bike/deleteBikeCompany/${companyId}`,
      {
        headers: {
          token: token,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Delete company failed:",
      error.response?.data || error.message,
    );

    const errorMessage =
      error.response?.data?.message || "Could not delete Bike Company";

    Swal.fire({
      icon: "error",
      title: "Deletion Failed",
      text: errorMessage,
    });

    throw error;
  }
};

export const addService = async (serviceData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/service/adminservices/create`,
      serviceData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          token: getAuthToken(),
        },
      },
    );

    Swal.fire({
      icon: "success",
      title: "Service Added Successfully!",
      text: response.data.message || "The service has been created.",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error adding service:",
      error.response?.data || error.message,
    );

    Swal.fire({
      icon: "error",
      title: "Failed to Add Service",
      text: getApiErrorMessage(error),
    });

    throw error;
  }
};

// ✅ Updated getServiceList to use the new admin services endpoint and fixed duplicate exports
export const getServiceList = () =>
  apiRequest("GET", "/service/adminservices", {}, false);
export const getAdditionalServiceList = () =>
  apiRequest("GET", "/additional-service/admin/additional-services", {}, false);

// Base Services and Additional Services for dropdowns
export const getBaseServices = () =>
  apiRequest("GET", "/service/admin/base-services", {}, false);
export const getBaseAdditionalServices = () =>
  apiRequest("GET", "/base-additional-service", {}, false);

// Update Admin Service

export const deleteAdminService = async (serviceId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/service/admin/services/${serviceId}`,
      {
        headers: {
          token: getAuthToken(),
        },
      },
    );

    Swal.fire({
      icon: "success",
      title: "Success!",
      text: response.data.message || "Admin service deleted successfully",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error("Delete failed:", error.response?.data || error.message);

    Swal.fire({
      icon: "error",
      title: "Deletion Failed",
      text: error.response?.data?.message || "Could not delete admin service",
    });

    throw error;
  }
};

export const deleteService = async (serviceId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/service/deleteService`,
      {
        data: { service_id: serviceId }, // DELETE with body
        headers: {
          "Content-Type": "application/json", // Not multipart/form-data
          token: getAuthToken(),
        },
      },
    );

    Swal.fire({
      icon: "success",
      title: "Success!",
      text: response.data.message || "Service deleted successfully",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error("Delete failed:", error.response?.data || error.message);

    Swal.fire({
      icon: "error",
      title: "Deletion Failed",
      text: error.response?.data?.message || "Could not delete service",
    });

    throw error;
  }
};

export const addBanner = async (bannerData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/banner/addbanner`, // ✅ API base URL
      bannerData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          token: getAuthToken(), // ✅ Ensure correct token header
        },
      },
    );

    // ✅ Show success message
    Swal.fire({
      icon: "success",
      title: "Banner Added Successfully!",
      text: response.data.message || "The banner has been created.",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error adding banner:",
      error.response?.data || error.message,
    );

    // ✅ Show proper error message
    Swal.fire({
      icon: "error",
      title: "Failed to Add Banner",
      text: getApiErrorMessage(error),
    });

    throw error;
  }
};

// ✅ Fetch all banners
export const getBannerList = () =>
  apiRequest("GET", "/banner/bannerlist", {}, false);

// ✅ Update banner. Pass a FormData (with the new file under "images") to also
// replace the artwork, or a plain object to update just the text fields.
export const updateBanner = async (bannerId, bannerData) => {
  try {
    const isMultipart = typeof FormData !== "undefined" && bannerData instanceof FormData;
    let payload;
    if (isMultipart) {
      payload = bannerData;
      payload.append("banner_id", bannerId);
    } else {
      payload = { banner_id: bannerId, ...bannerData };
    }

    const response = await axios.put(
      `${API_BASE_URL}/banner/editbanner`,
      payload,
      {
        headers: {
          "Content-Type": isMultipart ? "multipart/form-data" : "application/json",
          token: getAuthToken(),
        },
      },
    );

    Swal.fire({
      icon: "success",
      title: "Banner Updated Successfully!",
      text: response.data.message || "The banner has been updated.",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error updating banner:",
      error.response?.data || error.message,
    );

    Swal.fire({
      icon: "error",
      title: "Failed to Update Banner",
      text: getApiErrorMessage(error),
    });

    throw error;
  }
};

export const deleteBanner = async (bannerId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/banner/deletebanner`, {
      data: { banner_id: bannerId }, // DELETE with body
      headers: {
        "Content-Type": "application/json", // Not multipart/form-data
        token: getAuthToken(),
      },
    });

    Swal.fire({
      icon: "success",
      title: "Success!",
      text: response.data.message || "Banner deleted successfully",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error("Delete failed:", error.response?.data || error.message);

    Swal.fire({
      icon: "error",
      title: "Deletion Failed",
      text: error.response?.data?.message || "Could not delete banner",
    });

    throw error;
  }
};

export const getAllRewards = () =>
  apiRequest("GET", "/reward/rewards", {}, false);

export const getOffers = () => apiRequest("GET", "/offer/offerlist", {}, false);

export const deleteOffers = async (offerId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/offer/deleteoffer`, {
      data: { offer_id: offerId }, // DELETE with body
      headers: {
        "Content-Type": "application/json", // Not multipart/form-data
        token: getAuthToken(),
      },
    });

    Swal.fire({
      icon: "success",
      title: "Success!",
      text: response.data.message || "Offer deleted successfully",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error("Delete failed:", error.response?.data || error.message);

    Swal.fire({
      icon: "error",
      title: "Deletion Failed",
      text: error.response?.data?.message || "Could not delete Offer",
    });

    throw error;
  }
};

export const editDealer = async (dealerData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/dealer/editDealer`,
      dealerData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          token: getAuthToken(),
        },
      },
    );

    Swal.fire({
      icon: "success",
      title: "Dealer Updated Successfully!",
      text: response.data.message || "Dealer info has been updated.",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error updating dealer:",
      error.response?.data || error.message,
    );

    Swal.fire({
      icon: "error",
      title: "Failed to Update Dealer",
      text: getApiErrorMessage(error),
    });

    throw error;
  }
};

export const deleteDealer = async (dealerId) => {
  try {
    console.log("Deleaer id", dealerId);

    const response = await axios.delete(`${API_BASE_URL}/dealer/deleteDealer`, {
      data: { dealer_id: dealerId },
      headers: {
        "Content-Type": "application/json",
        token: getAuthToken(),
      },
    });

    Swal.fire({
      icon: "success",
      title: "Success!",
      text: response.data.message || "Dealer deleted successfully",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error("Delete failed:", error.response?.data || error.message);

    Swal.fire({
      icon: "error",
      title: "Deletion Failed",
      text: error.response?.data?.message || "Could not delete dealer",
    });

    throw error;
  }
};

export const deleteCustomer = async (customerId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/customers/deletecustomer`,
      {
        data: { customer_id: customerId }, // DELETE with body
        headers: {
          "Content-Type": "application/json",
          token: getAuthToken(),
        },
      },
    );

    Swal.fire({
      icon: "success",
      title: "Success!",
      text: response.data.message || "Customer deleted successfully",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error("Delete failed:", error.response?.data || error.message);

    Swal.fire({
      icon: "error",
      title: "Deletion Failed",
      text: error.response?.data?.message || "Could not delete customer",
    });

    throw error;
  }
};

export const getDealerPayouts = () =>
  apiRequest("GET", "/dealer/pending", {}, false);

export const approveDealerPayout = (orderId, status = "APPROVED") =>
  apiRequest("POST", "/payment/approvePayout", { orderId, status });

export const updateWithdrawalStatus = (walletId, status) =>
  apiRequest("PUT", `/dealer/updatepending/${walletId}`, { wallet_id: walletId, new_status: status });

export const getDealerWallet = (dealerId) =>
  apiRequest("GET", `/dealer/dealerWallet/${dealerId}`, {}, false);

export const adminDepositToDealer = async ({ dealerId, walletId, amount, reason, note, reference, idempotencyKey }) => {
  const token = getAuthToken();
  const targetId = walletId || dealerId;
  const response = await axios.post(
    `${API_BASE_URL}/finance/wallets/${targetId}/adjustments`,
    {
      amount,
      direction: "Credit",
      reason: reason || note,
      reference,
      // Newer servers use this explicit intent; older servers safely ignore it
      // while still creating the required credit ledger entry.
      transactionType: "deposit",
    },
    { headers: { ...(token ? { token } : {}), "x-idempotency-key": idempotencyKey }, withCredentials: true },
  );
  return response.data;
};

// ─── Finance APIs (Phase 1) ──────────────────────────────────────────────────
// Backend endpoints: /finance/summary and /dealer/payouts?status=ALL

export const getFinanceSummary = () =>
  apiRequest("GET", "/finance/summary", {}, false);

// Fetches ALL withdrawal records regardless of status.
// Query param: status=ALL|PENDING|IN_PROGRESS|APPROVED|REJECTED
// Falls back to legacy /dealer/pending endpoint when status=PENDING.
export const getAllPayouts = (status = "ALL") =>
  apiRequest("GET", `/dealer/payouts?status=${status}`, {}, false);

// ─── Finance APIs (Phase 2 — Dealer Wallets & Transactions) ─────────────────

export const getDealerWallets = (params = {}) =>
  apiRequest("GET", `/finance/wallets?${new URLSearchParams(params).toString()}`, {}, false);

export const getDealerWalletDetails = (id) =>
  apiRequest("GET", `/finance/wallets/${id}`, {}, false);

export const getFinanceTransactions = (params = {}) =>
  apiRequest("GET", `/finance/transactions?${new URLSearchParams(params).toString()}`, {}, false);

export const getFinanceTransactionDetails = (id) =>
  apiRequest("GET", `/finance/transactions/${id}`, {}, false);

export const addOffer = async (offerData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/offer/addoffer`,
      offerData,
      {
        headers: {
          "Content-Type": "application/json",
          token: getAuthToken(),
        },
      },
    );

    Swal.fire({
      icon: "success",
      title: "Offer Added Successfully!",
      text: response.data.message || "The offer has been created.",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error("Error adding offer:", error.response?.data || error.message);

    Swal.fire({
      icon: "error",
      title: "Failed to Add Offer",
      text: getApiErrorMessage(error),
    });

    throw error;
  }
};

export const getOfferById = async (id) =>
  apiRequest("GET", `/offer/Singleoffer/${id}`, {}, false);

export const editOffer = async (id, offerData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/offer/editoffer/${id}`,
      offerData,
      {
        headers: {
          "Content-Type": "application/json",
          token: getAuthToken(),
        },
      },
    );

    Swal.fire({
      icon: "success",
      title: "Offer Updated Successfully!",
      text: response.data.message || "The offer has been updated.",
      timer: 2000,
      showConfirmButton: false,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error updating offer:",
      error.response?.data || error.message,
    );

    Swal.fire({
      icon: "error",
      title: "Failed to Update Offer",
      text: getApiErrorMessage(error),
    });

    throw error;
  }
};

export const getDealersVerify = () =>
  apiRequest("GET", "/dealerAuth/pending-registrations", {}, false);

export const approveDealer = (dealerId) =>
  apiRequest("PUT", `/dealerAuth/approve/${dealerId}`, {});

export const rejectDealer = (dealerId, reason) =>
  apiRequest("PUT", `/dealerAuth/reject/${dealerId}`, reason ? { reason } : {});

export const verifyDealerDocument = (dealerId, docType, status, reason) =>
  apiRequest("PUT", `/dealerAuth/verify-document/${dealerId}`, {
    docType,
    status,
    ...(reason ? { reason } : {}),
  });

export const requestDealerDocuments = (dealerId, docTypes, reason) =>
  apiRequest("PUT", `/dealerAuth/verify-document/${dealerId}`, {
    docType: docTypes,
    status: "requested",
    reason,
  });

export const getDealerActivityHistory = (dealerId) =>
  apiRequest("GET", `/dealer/activity-history/${dealerId}`, {}, false);

export const getDealerNotifications = (dealerId) =>
  apiRequest("GET", `/notification/${dealerId}`, {}, false);

export const updateDealerField = (dealerId, fields) =>
  apiRequest("PUT", "/dealer/editDealer", { id: dealerId, ...fields });

// Dedicated dealer status endpoint (block/unblock/activate/deactivate).
// PUT /dealer/editDealer intentionally ignores isBlocked/isActive/blockedReason,
// so status changes must go through /dealer/update_status instead.
export const updateDealerStatus = (dealerId, statusFields) =>
  apiRequest("POST", "/dealer/update_status", {
    dealer_id: dealerId,
    ...statusFields,
  });

export const getAdminServiceById = (serviceId) =>
  apiRequest("GET", `/service/admin/services/${serviceId}`, {}, false);

export const updateAdminService = async (serviceId, serviceData) => {
  try {
    const token = getAuthToken();
    const dataToSend =
      typeof serviceData === "string" ? JSON.parse(serviceData) : serviceData;

    const response = await axios.put(
      `${API_BASE_URL}/service/admin/services/${serviceId}`,
      dataToSend,
      {
        headers: {
          "Content-Type": "application/json",
          token: token ? token : "",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error updating admin service:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

// Uses the admin-only /dealer/view/:id route (requireAdmin) rather than
// /dealer/dealer/:id, which is gated by verifyDealerToken + requireOwnDealer
// for the dealer app's own-profile lookup and rejects admin tokens with 403.
export const getDealerById = async (id) => {
  const res = await apiRequest("GET", `/dealer/view/${id}`, {}, false);
  return res?.data || res?.dealer || res;
};

export const getBaseServiceList = () =>
  apiRequest("GET", "/service/admin/base-services", {}, false);

export const createBaseService = async (serviceData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/service/admin/base-services`,
      serviceData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          token: getAuthToken(),
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error creating base service:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const getBaseServiceById = (serviceId) =>
  apiRequest("GET", `/service/admin/base-services/${serviceId}`, {}, false);
export const updateBaseService = async (serviceId, serviceData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/service/admin/base-services/${serviceId}`,
      serviceData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          token: getAuthToken(),
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error updating base service:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const deleteBaseService = async (
  serviceId,
  force = false,
  deactivate = false,
) => {
  try {
    let url = `${API_BASE_URL}/service/admin/base-services/${serviceId}`;
    const params = [];
    if (force) params.push("force=true");
    if (deactivate) params.push("deactivate=true");
    if (params.length > 0) url += `?${params.join("&")}`;

    const response = await axios.delete(url, {
      headers: {
        token: getAuthToken(),
      },
    });

    return response.data;
  } catch (error) {
    console.error("Delete failed:", error.response?.data || error.message);
    throw error;
  }
};

// --- Dealer Services Configuration ---

// ✅ Fetch all base additional services
export const getBaseAdditionalServiceList = () =>
  apiRequest("GET", "/base-additional-service", {}, false);

// ✅ Save dealer services configuration
export const saveDealerServices = (payload) =>
  apiRequest("POST", "/dealer/admin/services", payload, false, true);

// Request cache for dealer services to prevent duplicate calls
const dealerServicesCache = new Map();
const dealerServicesRequests = new Map();

// ✅ Fetch dealer services configuration with caching
export const getDealerServices = async (dealerId) => {
  if (!dealerId) {
    throw new Error("Dealer ID is required");
  }

  const cacheKey = `dealer-services-${dealerId}`;
  const now = Date.now();
  const cacheTime = 3 * 60 * 1000; // 3 minutes cache

  // Check cache first
  const cached = dealerServicesCache.get(cacheKey);
  if (cached && now - cached.timestamp < cacheTime) {
    return cached.data;
  }

  // Check if request is already in progress
  const existingRequest = dealerServicesRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  // Make new request
  const requestPromise = apiRequest(
    "GET",
    `/dealer/services?dealerId=${dealerId}`,
    {},
    false,
    true,
  )
    .then((data) => {
      // Cache the result
      dealerServicesCache.set(cacheKey, {
        data,
        timestamp: now,
      });

      // Remove from active requests
      dealerServicesRequests.delete(cacheKey);

      return data;
    })
    .catch((error) => {
      // Remove from active requests on error
      dealerServicesRequests.delete(cacheKey);
      throw error;
    });

  // Store the request promise
  dealerServicesRequests.set(cacheKey, requestPromise);

  return requestPromise;
};

// Clear dealer services cache (useful for testing or forced refresh)
export const clearDealerServicesCache = (dealerId = null) => {
  if (dealerId) {
    const cacheKey = `dealer-services-${dealerId}`;
    dealerServicesCache.delete(cacheKey);
    dealerServicesRequests.delete(cacheKey);
  } else {
    dealerServicesCache.clear();
    dealerServicesRequests.clear();
  }
};

// --- Location Based Featured Categories ---

export const getLocationFeaturedCategories = (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);
  if (params.search) query.append("search", params.search);
  if (params.status) query.append("status", params.status);
  const qs = query.toString();
  return apiRequest(
    "GET",
    `/location-featured-categories${qs ? `?${qs}` : ""}`,
    {},
    false,
  );
};

export const getLocationFeaturedCategoryById = (id) =>
  apiRequest("GET", `/location-featured-categories/${id}`, {}, false);

export const searchLocationSuggestions = (query) =>
  apiRequest(
    "GET",
    `/location-featured-categories/location-search?q=${encodeURIComponent(query)}`,
    {},
    false,
  );

export const createLocationFeaturedCategory = async (formData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/location-featured-categories`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          token: getAuthToken(),
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error creating location featured category:",
      error.response?.data || error.message,
    );
    Swal.fire({
      icon: "error",
      title: "Failed to Create Category",
      text: getApiErrorMessage(error),
    });
    throw error;
  }
};

export const updateLocationFeaturedCategory = async (id, formData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/location-featured-categories/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          token: getAuthToken(),
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error updating location featured category:",
      error.response?.data || error.message,
    );
    Swal.fire({
      icon: "error",
      title: "Failed to Update Category",
      text: getApiErrorMessage(error),
    });
    throw error;
  }
};

export const deleteLocationFeaturedCategory = async (id) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/location-featured-categories/${id}`,
      {
        headers: {
          token: getAuthToken(),
        },
      },
    );
    Swal.fire({
      icon: "success",
      title: "Deleted!",
      text: response.data.message || "Location featured category deleted successfully.",
      timer: 2000,
      showConfirmButton: false,
    });
    return response.data;
  } catch (error) {
    console.error("Delete failed:", error.response?.data || error.message);
    Swal.fire({
      icon: "error",
      title: "Deletion Failed",
      text: error.response?.data?.message || "Could not delete category.",
    });
    throw error;
  }
};

export const toggleLocationFeaturedCategoryStatus = async (id) => {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/location-featured-categories/${id}/status`,
      {},
      {
        headers: {
          token: getAuthToken(),
        },
      },
    );
    Swal.fire({
      icon: "success",
      title: "Status Updated!",
      text: response.data.message || "Status has been updated successfully.",
      timer: 2000,
      showConfirmButton: false,
    });
    return response.data;
  } catch (error) {
    console.error("Status toggle failed:", error.response?.data || error.message);
    Swal.fire({
      icon: "error",
      title: "Failed to Update Status",
      text: getApiErrorMessage(error),
    });
    throw error;
  }
};

// ─── Ticket / Support ───────────────────────────────────────────────────────
// Same endpoints AllTicket.jsx/NewTicket.jsx have always called directly via
// axios — centralized here so ticketService.js has one place to import from.
// showAlert is false because ticketService.js/useTicketConversation already
// surface their own success/error Swal messages for these calls.
export const getTicketList = () => apiRequest("GET", "/ticket/user-dealer", {}, false);

export const getTicketById = (ticketId) =>
  apiRequest("GET", `/ticket/tickets/${ticketId}`, {}, false);

export const updateTicketStatus = (ticketId, status) =>
  apiRequest("POST", `/ticket/status/${ticketId}`, { status }, false);

export const replyToTicket = (ticketId, { message, sender_id, sender_type }) =>
  apiRequest("POST", `/ticket/reply/${ticketId}`, { message, sender_id, sender_type }, false);

export const getSupportUnreadCount = () => apiRequest("GET", "/ticket/unread-count", {}, false);

export const markTicketRead = (ticketId) =>
  apiRequest("POST", `/ticket/mark-read/${ticketId}`, {}, false);

// ─── Service Categories (admin-gated, /api/v1) ──────────────────────────────
// Full CRUD + reorder + status toggle for the ServiceCategory master list
// used to group Base Services. sortOrder is server-assigned (append on
// create, or recomputed from array index on /reorder).

export const getServiceCategories = () =>
  apiRequestV1("GET", "/admin/service-categories", {}, false);

export const createServiceCategory = (data) =>
  apiRequestV1("POST", "/admin/service-categories", data);

export const updateServiceCategory = (id, data) =>
  apiRequestV1("PUT", `/admin/service-categories/${id}`, data);

export const updateServiceCategoryStatus = (id, isActive) =>
  apiRequestV1("PATCH", `/admin/service-categories/${id}/status`, { isActive });

// order = full ordered array of ALL category ids in their new display order
export const reorderServiceCategories = (order) =>
  apiRequestV1("PATCH", "/admin/service-categories/reorder", { order }, false);

export const deleteServiceCategory = async (id) => {
  try {
    const response = await axios.delete(
      `${API_V1_BASE_URL}/admin/service-categories/${id}`,
      { headers: { token: getAuthToken() } },
    );
    return response.data;
  } catch (error) {
    // Deliberately no Swal here — callers surface the inUseCount block
    // message inline (delete is blocked while services still reference it).
    console.error("Delete category failed:", error.response?.data || error.message);
    throw error;
  }
};

// ─── Serviceable Areas (admin-gated, /api/v1) ──────────────────────────────
// Controls which cities/areas the customer app is live in. type="city" areas
// match on cityName; type="radius" areas are a lat/lng point + radiusKm
// geofence (location.coordinates is [lng, lat] GeoJSON on the way back).
// status drives customer-app visibility: "live" (bookable now), "coming_soon"
// (visible but not bookable, optional estimatedLiveDate), or "paused"
// (temporarily hidden — pausedReason is mandatory and shown to customers,
// e.g. rain/festival/staff shortage). /status is the fast quick-toggle used
// from the list row; POST/PUT cover the full create/edit form.

export const getServiceableAreas = (params = {}) => {
  const normalizedParams = { ...params };
  if (normalizedParams.limit !== undefined && normalizedParams.limit !== null) {
    const requestedLimit = Number(normalizedParams.limit);
    if (Number.isFinite(requestedLimit)) {
      normalizedParams.limit = Math.min(100, Math.max(1, Math.trunc(requestedLimit)));
    }
  }
  const query = new URLSearchParams(
    Object.entries(normalizedParams).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ).toString();
  return apiRequestV1(
    "GET",
    `/admin/serviceable-areas${query ? `?${query}` : ""}`,
    {},
    false,
  );
};

export const getServiceableAreaById = (id) =>
  apiRequestV1("GET", `/admin/serviceable-areas/${id}`, {}, false);

export const createServiceableArea = (data) =>
  apiRequestV1("POST", "/admin/serviceable-areas", data);

export const updateServiceableArea = (id, data) =>
  apiRequestV1("PUT", `/admin/serviceable-areas/${id}`, data);

export const deleteServiceableArea = (id) =>
  apiRequestV1("DELETE", `/admin/serviceable-areas/${id}`);

// data = { status, pausedReason? (required iff status="paused"), estimatedLiveDate? }
export const updateServiceableAreaStatus = (id, data) =>
  apiRequestV1("PATCH", `/admin/serviceable-areas/${id}/status`, data);

// ─── Bike Compatibility (read-only cross-reference, /api/v1) ───────────────
// NOT an editable mapping — the actual brand<->service assignment still
// lives per-dealer in AdminService.companies[], edited via the dealer's own
// service configuration wizard. These two calls only surface what the
// algorithm currently sees, network-wide, for admin sanity-checking.

export const getBikeCompatibilityByService = (serviceId) =>
  apiRequestV1("GET", `/admin/bike-compatibility/by-service/${serviceId}`, {}, false);

export const getBikeCompatibilityByBrand = (companyId) =>
  apiRequestV1("GET", `/admin/bike-compatibility/by-brand/${companyId}`, {}, false);

// ─── Home Algorithm Insights (read-only, city-scoped, /api/v1) ────────────
// Sanity-check views mirroring what the live user-app Home screen algorithm
// would surface for a given city — no lat/lng (admin has no live GPS), and
// no pin/feature override capability by deliberate product decision.

export const getMostBookedForCity = (city, days = 7) =>
  apiRequestV1(
    "GET",
    `/admin/home/most-booked?city=${encodeURIComponent(city)}&days=${days}`,
    {},
    false,
  );

export const getTopGaragesForCity = (city, serviceId) => {
  const params = new URLSearchParams({ city });
  if (serviceId) params.append("serviceId", serviceId);
  return apiRequestV1("GET", `/admin/home/top-garages?${params.toString()}`, {}, false);
};

// ─── Service Detail CMS (admin-gated, /api/v1) ─────────────────────────────
// Rich content for the user app's Service Detail screen. Stored in the
// separate `servicedetails` collection, so none of these touch the existing
// base-service CRUD above — that remains the sole writer of
// name/image/description/basePrice/duration/warranty/category.

export const getServiceDetail = (serviceId) =>
  apiRequestV1("GET", `/admin/services/${serviceId}/detail`, {}, false);

// Renders exactly what GET /api/v1/services/:id would return for the app,
// but including unpublished content, plus a publishBlockers checklist.
export const getServiceDetailPreview = (serviceId) =>
  apiRequestV1("GET", `/admin/services/${serviceId}/detail/preview`, {}, false);

// Partial upsert — fields left out are preserved server-side, so saving one
// tab never clears another.
export const saveServiceDetail = (serviceId, data) =>
  apiRequestV1("PUT", `/admin/services/${serviceId}/detail`, data, false);

// Publishing is gated server-side; a 400 carries a `blockers` array naming
// every missing requirement, which the editor renders as a checklist.
export const setServiceDetailPublished = (serviceId, isPublished) =>
  apiRequestV1("PATCH", `/admin/services/${serviceId}/detail/publish`, { isPublished }, false);

export const uploadServiceDetailMedia = async (serviceId, formData) => {
  try {
    const response = await axios.post(
      `${API_V1_BASE_URL}/admin/services/${serviceId}/detail/media`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          token: getAuthToken(),
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Service media upload failed:", error.response?.data || error.message);
    throw error;
  }
};

// Deletes the gallery entry and its S3 object. The service's main `image` is
// protected server-side and cannot be removed through this route.
export const deleteServiceDetailMedia = async (serviceId, url) => {
  try {
    const response = await axios.delete(
      `${API_V1_BASE_URL}/admin/services/${serviceId}/detail/media`,
      { headers: { token: getAuthToken() }, data: { url } },
    );
    return response.data;
  } catch (error) {
    console.error("Service media delete failed:", error.response?.data || error.message);
    throw error;
  }
};
