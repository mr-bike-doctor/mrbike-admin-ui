/**
 * Dealer Onboarding & Approval Lifecycle Progress Helper
 *
 * Single source of truth for computing which onboarding & verification steps
 * are completed, which step is currently pending/blocking, and what action
 * is required before a dealer can log in, be reviewed, and accept bookings.
 */

export const DEALER_STEPS_CONFIG = [
  {
    id: "basicInfo",
    stepNumber: 1,
    title: "Basic & Owner Information",
    shortTitle: "Basic Info",
    description: "Owner name, mobile phone, and contact email.",
    tabIndex: 0, // Overview tab
    actionLabel: "Verify Basic Info",
  },
  {
    id: "locationInfo",
    stepNumber: 2,
    title: "Shop Location & GPS Coordinates",
    shortTitle: "Location & GPS",
    description: "Physical address, city, state, pincode, and map pin.",
    tabIndex: 1, // ShopLocationTab
    actionLabel: "Verify Location",
  },
  {
    id: "shopDetails",
    stepNumber: 3,
    title: "Storefront & Workshop Media",
    shortTitle: "Storefront Media",
    description: "Shop name, opening hours, and workshop photos.",
    tabIndex: 1, // ShopLocationTab
    actionLabel: "Check Storefront",
  },
  {
    id: "documents",
    stepNumber: 4,
    title: "KYC Documents Verification",
    shortTitle: "KYC Documents",
    description: "Aadhaar Card, PAN Card, and Shop Certificate.",
    tabIndex: 2, // DocumentsTab
    actionLabel: "Review KYC Documents",
  },
  {
    id: "liveVerification",
    stepNumber: 5,
    title: "Live Shop Geo-Verification",
    shortTitle: "Live Verification",
    description: "Real-time camera photo with GPS capture & face verification.",
    tabIndex: 4, // LiveVerificationTab
    actionLabel: "Check Live Verification",
  },
  {
    id: "bankDetails",
    stepNumber: 6,
    title: "Banking & Passbook Verification",
    shortTitle: "Bank & Payout",
    description: "Account number, IFSC code, and passbook/cheque verification.",
    tabIndex: 3, // BankingTab
    actionLabel: "Review Bank Details",
  },
  {
    id: "businessSettings",
    stepNumber: 7,
    title: "Platform Settings & Minimum Wallet",
    shortTitle: "Settings & Wallet",
    description: "Commission %, GST, service radius, and Min Wallet threshold.",
    tabIndex: 5, // BusinessSettingsTab
    actionLabel: "Configure Business Settings",
  },
  {
    id: "services",
    stepNumber: 8,
    title: "Services & Bike Pricing Catalog",
    shortTitle: "Services Catalog",
    description: "Active dealer services configured with bike CC & rates.",
    tabIndex: 6, // DealerServicesManager
    actionLabel: "Configure Services",
  },
  {
    id: "finalApproval",
    stepNumber: 9,
    title: "Admin Approval & Live Activation",
    shortTitle: "Approval & Activation",
    description: "Official admin approval and activating booking acceptance.",
    tabIndex: 0, // Header / Overview
    actionLabel: "Approve Dealer",
  },
];

const readFormStep = (completedSteps, key) => {
  if (!completedSteps) return false;
  if (typeof completedSteps.get === "function") return completedSteps.get(key) === true;
  return completedSteps[key] === true;
};

/**
 * Computes end-to-end progress, pending step details, and readiness for a dealer.
 *
 * @param {Object} dealer - Dealer object from backend
 * @param {Array} dealerServices - Optional array of services for this dealer
 * @returns {Object} Structured progress evaluation
 */
export function computeDealerProgress(dealer = {}, dealerServices = []) {
  if (!dealer || typeof dealer !== "object") {
    dealer = {};
  }

  const formSteps = dealer.formProgress?.completedSteps || {};
  const docVerif = dealer.documentVerification || {};
  const isApproved =
    dealer.registrationStatus === "Approved" ||
    dealer.status?.adminApproved === true;
  const isRejected = dealer.registrationStatus === "Rejected";
  const isBlocked = !!dealer.isBlocked;
  const isActive = !!(dealer.status?.isActive ?? dealer.isActive);
  const isOnline = !!dealer.online;

  // 1. Basic Info
  const basicInfoComplete =
    readFormStep(formSteps, "basicInfo") ||
    !!(
      dealer.ownerName &&
      dealer.phone &&
      (dealer.email || dealer.personalEmail || dealer.shopEmail)
    );

  // 2. Location Info
  const hasAddress = !!(
    dealer.fullAddress ||
    dealer.permanentAddress?.address ||
    dealer.presentAddress?.address ||
    dealer.locality
  );
  const hasCity = !!(dealer.city || dealer.permanentAddress?.city || dealer.presentAddress?.city);
  const hasCoords = !!(
    (dealer.latitude != null && dealer.longitude != null) ||
    (dealer.liveVerification?.latitude != null && dealer.liveVerification?.longitude != null)
  );
  const locationInfoComplete =
    readFormStep(formSteps, "locationInfo") ||
    (hasAddress && hasCity && (hasCoords || dealer.shopPincode));

  // 3. Shop Details & Media
  const hasShopName = !!dealer.shopName;
  const hasShopImages =
    Array.isArray(dealer.shopImages) && dealer.shopImages.length > 0;
  const shopDetailsComplete =
    readFormStep(formSteps, "shopDetails") ||
    (hasShopName && (hasShopImages || isApproved));

  // 4. KYC Documents
  const kycKeys = ["aadharFront", "aadharBack", "pan", "shop"];
  const kycLabels = {
    aadharFront: "Aadhaar Card (Front)",
    aadharBack: "Aadhaar Card (Back)",
    pan: "PAN Card",
    shop: "Shop Certificate",
  };
  const rejectedKyc = kycKeys.filter((k) => docVerif[k] === "rejected");
  const requestedKyc = kycKeys.filter((k) => docVerif[k] === "requested");
  const verifiedKyc = kycKeys.filter((k) => docVerif[k] === "verified");
  const hasUploadedDocs =
    readFormStep(formSteps, "documents") ||
    !!(
      dealer.documents?.aadharFront ||
      dealer.documents?.panCardFront ||
      dealer.documents?.shopCertificate ||
      dealer.aadharCardNo ||
      dealer.panCardNo
    );

  let documentsStatus = "pending_dealer";
  let documentsComplete = false;
  let documentsBlockingReason = "";

  if (rejectedKyc.length > 0) {
    documentsStatus = "action_required";
    documentsBlockingReason = `Rejected document(s): ${rejectedKyc.map((k) => kycLabels[k]).join(", ")}. Dealer must re-upload in the app.`;
  } else if (requestedKyc.length > 0) {
    documentsStatus = "requested";
    documentsBlockingReason = `Document re-upload requested: ${requestedKyc.map((k) => kycLabels[k]).join(", ")}. Waiting for dealer.`;
  } else if (isApproved || verifiedKyc.length === kycKeys.length) {
    documentsStatus = "completed";
    documentsComplete = true;
  } else if (hasUploadedDocs) {
    documentsStatus = "pending_admin";
    const pendingNames = kycKeys
      .filter((k) => docVerif[k] !== "verified")
      .map((k) => kycLabels[k]);
    documentsBlockingReason = `Awaiting Admin verification for: ${pendingNames.join(", ")}. Review and approve/reject each document.`;
  } else {
    documentsStatus = "pending_dealer";
    documentsBlockingReason = "KYC documents (Aadhaar, PAN, Shop License) have not been uploaded by dealer.";
  }

  // 5. Live Shop Geo-Verification
  const hasLivePhoto = !!(dealer.liveVerification?.shopLivePhoto || dealer.documents?.faceVerificationImage);
  const liveVerified =
    isApproved ||
    docVerif.face === "verified" ||
    dealer.isVerify === true ||
    dealer.status?.isVerified === true;
  let liveStatus = "pending_dealer";
  let liveComplete = false;
  let liveBlockingReason = "";

  if (docVerif.face === "rejected") {
    liveStatus = "action_required";
    liveBlockingReason = "Face verification image was rejected. Dealer must retake live selfie.";
  } else if (liveVerified) {
    liveStatus = "completed";
    liveComplete = true;
  } else if (hasLivePhoto) {
    liveStatus = "pending_admin";
    liveBlockingReason = "Live geo-tagged shop photo or selfie captured. Awaiting Admin verification.";
  } else {
    liveStatus = "pending_dealer";
    liveBlockingReason = "Live geo-tagged shop photo or face selfie not uploaded by dealer.";
  }

  // 6. Bank Account & Passbook
  const hasBankAcc = !!(
    dealer.bankDetails?.accountNumber &&
    dealer.bankDetails?.ifscCode
  );
  const passbookStatus = docVerif.passbook;
  let bankStatus = "pending_dealer";
  let bankComplete = false;
  let bankBlockingReason = "";

  if (passbookStatus === "rejected") {
    bankStatus = "action_required";
    bankBlockingReason = "Bank passbook/cheque image rejected. Dealer must upload clear bank proof.";
  } else if (isApproved || (hasBankAcc && passbookStatus === "verified")) {
    bankStatus = "completed";
    bankComplete = true;
  } else if (hasBankAcc) {
    bankStatus = "pending_admin";
    bankBlockingReason = "Bank account numbers provided. Passbook image is pending Admin verification.";
  } else {
    bankStatus = "pending_dealer";
    bankBlockingReason = "Bank account details and passbook document not provided.";
  }

  // 7. Business Settings & Minimum Wallet
  const hasMinWallet =
    dealer.minWalletAmount !== undefined &&
    dealer.minWalletAmount !== null &&
    dealer.minWalletAmount !== "" &&
    Number(dealer.minWalletAmount) > 0;
  const hasCommission =
    dealer.commission !== undefined &&
    dealer.commission !== null &&
    dealer.commission !== "";
  let businessStatus = "pending_admin";
  let businessComplete = false;
  let businessBlockingReason = "";

  if (isApproved || (hasMinWallet && hasCommission)) {
    businessStatus = "completed";
    businessComplete = true;
  } else if (!hasMinWallet) {
    businessStatus = "pending_admin";
    businessBlockingReason = "Minimum Wallet threshold (minWalletAmount) is not set. Admin must configure Min Wallet amount before approving dealer.";
  } else if (!hasCommission) {
    businessStatus = "pending_admin";
    businessBlockingReason = "Platform commission percentage is not configured.";
  }

  // 8. Services & Bike Catalog
  const servicesCount =
    (Array.isArray(dealer.services) ? dealer.services.length : 0) ||
    (Array.isArray(dealerServices) ? dealerServices.length : 0);
  let servicesStatus = "pending_admin";
  let servicesComplete = false;
  let servicesBlockingReason = "";

  if (servicesCount > 0) {
    servicesStatus = "completed";
    servicesComplete = true;
  } else {
    servicesStatus = isApproved ? "action_required" : "pending_admin";
    servicesBlockingReason = "0 services configured! Dealer cannot receive customer bookings without configured services and bike pricing.";
  }

  // 9. Admin Final Approval & Activation
  let approvalStatus = "upcoming";
  let approvalComplete = false;
  let approvalBlockingReason = "";

  if (isBlocked) {
    approvalStatus = "action_required";
    approvalBlockingReason = `Dealer is currently Blocked. Reason: ${dealer.blockedReason || "Admin action"}. Unblock required to restore operations.`;
  } else if (isRejected) {
    approvalStatus = "action_required";
    approvalBlockingReason = `Application Rejected. Reason: ${dealer.adminNotes || dealer.rejectionReason || "Admin decision"}.`;
  } else if (isApproved && isActive) {
    approvalStatus = "completed";
    approvalComplete = true;
  } else if (isApproved && !isActive) {
    approvalStatus = "action_required";
    approvalBlockingReason = "Dealer is Approved but Inactive. Toggle 'Activate' in header to enable dealer login.";
  } else {
    const readyForApproval =
      basicInfoComplete &&
      locationInfoComplete &&
      shopDetailsComplete &&
      documentsComplete &&
      liveComplete &&
      bankComplete &&
      businessComplete;

    if (readyForApproval) {
      approvalStatus = "pending_admin";
      approvalBlockingReason = "All prerequisites completed! Ready for Admin Final Approval.";
    } else {
      approvalStatus = "upcoming";
      approvalBlockingReason = "Complete the prerequisite pending steps above to enable dealer approval.";
    }
  }

  // Assemble Step Objects
  const steps = [
    {
      ...DEALER_STEPS_CONFIG[0],
      isCompleted: basicInfoComplete,
      status: basicInfoComplete ? "completed" : "pending_dealer",
      statusLabel: basicInfoComplete ? "Completed" : "Pending Submission",
      blockingReason: basicInfoComplete ? null : "Owner contact details incomplete.",
      consequence: "Dealer registration cannot proceed without basic contact details.",
    },
    {
      ...DEALER_STEPS_CONFIG[1],
      isCompleted: locationInfoComplete,
      status: locationInfoComplete ? "completed" : "pending_dealer",
      statusLabel: locationInfoComplete ? "Completed" : "Pending Location",
      blockingReason: locationInfoComplete ? null : "Shop address or GPS coordinates missing.",
      consequence: "Customer discovery and service radius calculations require valid location coordinates.",
    },
    {
      ...DEALER_STEPS_CONFIG[2],
      isCompleted: shopDetailsComplete,
      status: shopDetailsComplete ? "completed" : "pending_dealer",
      statusLabel: shopDetailsComplete ? "Completed" : "Pending Photos",
      blockingReason: shopDetailsComplete ? null : "Storefront images or workshop info missing.",
      consequence: "Workshop pictures are needed to display to customers.",
    },
    {
      ...DEALER_STEPS_CONFIG[3],
      isCompleted: documentsComplete,
      status: documentsStatus,
      statusLabel:
        documentsStatus === "completed"
          ? "Verified"
          : documentsStatus === "action_required"
          ? "Documents Rejected"
          : documentsStatus === "requested"
          ? "Re-upload Requested"
          : "Awaiting Verification",
      blockingReason: documentsComplete ? null : documentsBlockingReason,
      consequence: "KYC documents must be fully verified before dealer can be approved. Dealer login remains restricted if rejected.",
      rejectedList: rejectedKyc,
      requestedList: requestedKyc,
      verifiedCount: verifiedKyc.length,
      totalCount: kycKeys.length,
    },
    {
      ...DEALER_STEPS_CONFIG[4],
      isCompleted: liveComplete,
      status: liveStatus,
      statusLabel: liveComplete ? "Verified" : liveStatus === "action_required" ? "Selfie Rejected" : "Pending Verification",
      blockingReason: liveComplete ? null : liveBlockingReason,
      consequence: "Live shop verification confirms real garage physical presence.",
    },
    {
      ...DEALER_STEPS_CONFIG[5],
      isCompleted: bankComplete,
      status: bankStatus,
      statusLabel: bankComplete ? "Verified" : bankStatus === "action_required" ? "Passbook Rejected" : "Pending Verification",
      blockingReason: bankComplete ? null : bankBlockingReason,
      consequence: "Verified bank details required for dealer payouts and transaction security.",
    },
    {
      ...DEALER_STEPS_CONFIG[6],
      isCompleted: businessComplete,
      status: businessStatus,
      statusLabel: businessComplete ? "Configured" : "Wallet/Commission Missing",
      blockingReason: businessComplete ? null : businessBlockingReason,
      consequence: "Dealer cannot accept customer bookings without minimum wallet balance threshold.",
      minWalletAmount: dealer.minWalletAmount,
      commission: dealer.commission,
    },
    {
      ...DEALER_STEPS_CONFIG[7],
      isCompleted: servicesComplete,
      status: servicesStatus,
      statusLabel: servicesComplete ? `${servicesCount} Services Active` : "No Services Added",
      blockingReason: servicesComplete ? null : servicesBlockingReason,
      consequence: "Customers cannot book service with this garage if no services are mapped.",
      servicesCount,
    },
    {
      ...DEALER_STEPS_CONFIG[8],
      isCompleted: approvalComplete,
      status: approvalStatus,
      statusLabel:
        approvalComplete
          ? "Approved & Active"
          : isBlocked
          ? "Blocked"
          : isRejected
          ? "Rejected"
          : approvalStatus === "pending_admin"
          ? "Ready to Approve"
          : "Pending Prerequisites",
      blockingReason: approvalComplete ? null : approvalBlockingReason,
      consequence: "Dealer login, review, and booking remain locked until official Admin Approval.",
    },
  ];

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  // Find the first blocking/pending step
  const firstPendingStep = steps.find((s) => !s.isCompleted) || null;
  const hasActionRequired = steps.some((s) => s.status === "action_required");
  const allPrerequisitesMet = steps.slice(0, 7).every((s) => s.isCompleted);
  const canApprove = allPrerequisitesMet && !isApproved && !isBlocked && !isRejected;

  // Determine overall status banner
  let statusBanner = {
    type: "info",
    title: "Pending Steps",
    message: "Dealer onboarding in progress.",
    blockingReason: firstPendingStep?.blockingReason || "",
    consequence: firstPendingStep?.consequence || "",
  };

  if (isBlocked) {
    statusBanner = {
      type: "error",
      title: "Dealer Blocked",
      message: `This garage is currently blocked (${dealer.blockedReason || "Admin action"}). Login and customer bookings are disabled.`,
      blockingReason: dealer.blockedReason || "Dealer account is blocked.",
      consequence: "Dealer cannot login or receive bookings.",
    };
  } else if (isRejected) {
    statusBanner = {
      type: "error",
      title: "Registration Rejected",
      message: `Dealer application was rejected (${dealer.adminNotes || dealer.rejectionReason || "Admin decision"}).`,
      blockingReason: dealer.adminNotes || "Registration rejected.",
      consequence: "Dealer access restricted.",
    };
  } else if (hasActionRequired) {
    const rejectedStep = steps.find((s) => s.status === "action_required");
    statusBanner = {
      type: "error",
      title: "Action Required by Dealer",
      message: rejectedStep?.blockingReason || "Documents need dealer correction.",
      blockingReason: rejectedStep?.blockingReason,
      consequence: "Dealer cannot log in to dashboard until rejected documents are re-uploaded.",
    };
  } else if (canApprove) {
    statusBanner = {
      type: "success",
      title: "Ready for Approval! 🚀",
      message: "All registration & verification steps are complete! Click 'Approve Dealer' to activate login & bookings.",
      blockingReason: null,
      consequence: null,
    };
  } else if (isApproved && isActive && servicesCount === 0) {
    statusBanner = {
      type: "warning",
      title: "Approved — Services Missing",
      message: "Dealer is approved, but 0 services are configured. Add services so customers can place bookings.",
      blockingReason: "No services configured.",
      consequence: "Customer app cannot place bookings with this dealer without services.",
    };
  } else if (isApproved && isActive) {
    statusBanner = {
      type: "success",
      title: "Verified & Active Dealer ✅",
      message: isOnline
        ? "Dealer is Active, Online, and Receiving Customer Bookings & Reviews!"
        : "Dealer is Active and Verified (Currently Offline in app).",
      blockingReason: null,
      consequence: null,
    };
  } else if (firstPendingStep) {
    statusBanner = {
      type: "warning",
      title: `Step ${firstPendingStep.stepNumber} Pending: ${firstPendingStep.shortTitle}`,
      message: firstPendingStep.blockingReason,
      blockingReason: firstPendingStep.blockingReason,
      consequence: firstPendingStep.consequence,
    };
  }

  return {
    steps,
    totalSteps,
    completedCount,
    progressPercent,
    firstPendingStep,
    hasActionRequired,
    allPrerequisitesMet,
    canApprove,
    isApproved,
    isActive,
    isBlocked,
    isRejected,
    isOnline,
    servicesCount,
    statusBanner,
  };
}

