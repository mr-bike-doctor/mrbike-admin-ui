import { computeDealerProgress } from "./dealerProgressHelper";

describe("dealerProgressHelper", () => {
  test("identifies fresh signup with pending basic info and documents", () => {
    const dealer = {
      phone: "+919876543210",
      registrationStatus: "Pending",
      isActive: false,
      formProgress: {
        completedSteps: {
          basicInfo: false,
          locationInfo: false,
          shopDetails: false,
          documents: false,
          liveVerification: false,
          bankDetails: false,
        },
      },
    };

    const progress = computeDealerProgress(dealer, []);
    expect(progress.isApproved).toBe(false);
    expect(progress.completedCount).toBeLessThan(4);
    expect(progress.canApprove).toBe(false);
    expect(progress.firstPendingStep).toBeTruthy();
    expect(progress.firstPendingStep.id).toBe("basicInfo");
  });

  test("flags rejected document as action_required with blocking reason", () => {
    const dealer = {
      ownerName: "John Doe",
      phone: "+919876543210",
      email: "john@example.com",
      shopName: "John Garage",
      city: "Bhopal",
      latitude: 23.25,
      longitude: 77.41,
      shopImages: ["img1.jpg"],
      registrationStatus: "Pending",
      documentVerification: {
        aadharFront: "rejected",
        pan: "verified",
      },
      formProgress: {
        completedSteps: {
          basicInfo: true,
          locationInfo: true,
          shopDetails: true,
          documents: true,
        },
      },
    };

    const progress = computeDealerProgress(dealer, []);
    expect(progress.hasActionRequired).toBe(true);
    const docStep = progress.steps.find((s) => s.id === "documents");
    expect(docStep.status).toBe("action_required");
    expect(progress.statusBanner.type).toBe("error");
  });

  test("flags missing minimum wallet amount before approval", () => {
    const dealer = {
      ownerName: "John Doe",
      phone: "+919876543210",
      email: "john@example.com",
      shopName: "John Garage",
      city: "Bhopal",
      latitude: 23.25,
      longitude: 77.41,
      shopImages: ["img1.jpg"],
      registrationStatus: "Pending",
      documentVerification: {
        aadharFront: "verified",
        aadharBack: "verified",
        pan: "verified",
        shop: "verified",
        face: "verified",
        passbook: "verified",
      },
      bankDetails: {
        accountNumber: "123456789",
        ifscCode: "SBIN0001234",
      },
      minWalletAmount: 0, // Not set
      commission: 10,
      formProgress: {
        completedSteps: {
          basicInfo: true,
          locationInfo: true,
          shopDetails: true,
          documents: true,
          liveVerification: true,
          bankDetails: true,
        },
      },
    };

    const progress = computeDealerProgress(dealer, []);
    const settingsStep = progress.steps.find((s) => s.id === "businessSettings");
    expect(settingsStep.isCompleted).toBe(false);
    expect(progress.canApprove).toBe(false);
  });

  test("marks ready for approval when all prerequisites are met", () => {
    const dealer = {
      ownerName: "John Doe",
      phone: "+919876543210",
      email: "john@example.com",
      shopName: "John Garage",
      city: "Bhopal",
      latitude: 23.25,
      longitude: 77.41,
      shopImages: ["img1.jpg"],
      registrationStatus: "Pending",
      documentVerification: {
        aadharFront: "verified",
        aadharBack: "verified",
        pan: "verified",
        shop: "verified",
        face: "verified",
        passbook: "verified",
      },
      bankDetails: {
        accountNumber: "123456789",
        ifscCode: "SBIN0001234",
      },
      minWalletAmount: 500,
      commission: 10,
      formProgress: {
        completedSteps: {
          basicInfo: true,
          locationInfo: true,
          shopDetails: true,
          documents: true,
          liveVerification: true,
          bankDetails: true,
        },
      },
    };

    const progress = computeDealerProgress(dealer, [{ _id: "s1" }]);
    expect(progress.canApprove).toBe(true);
    expect(progress.statusBanner.type).toBe("success");
    expect(progress.statusBanner.title).toContain("Ready for Approval");
  });

  test("marks fully approved and active dealer", () => {
    const dealer = {
      ownerName: "John Doe",
      phone: "+919876543210",
      email: "john@example.com",
      shopName: "John Garage",
      city: "Bhopal",
      latitude: 23.25,
      longitude: 77.41,
      shopImages: ["img1.jpg"],
      registrationStatus: "Approved",
      status: {
        adminApproved: true,
        isActive: true,
      },
      isActive: true,
      online: true,
      minWalletAmount: 500,
      commission: 10,
    };

    const progress = computeDealerProgress(dealer, [{ _id: "s1" }]);
    expect(progress.isApproved).toBe(true);
    expect(progress.isActive).toBe(true);
    expect(progress.isOnline).toBe(true);
    expect(progress.statusBanner.type).toBe("success");
  });
});

