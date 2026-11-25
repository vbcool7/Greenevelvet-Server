import BroadcasterStreamProfileModel from "../models/BroadcasterStreamProfileModel.js";
import ViewerLiveProfileModel from "../models/ViewerLiveProfileModel.js";

function getClientCountry(req) {
  return (
    req.headers["cf-ipcountry"] ||
    req.headers["x-country-code"] ||
    req.query?.country ||
    ""
  )
    .toString()
    .trim()
    .toUpperCase();
}

export function checkGeoRestriction(req, res, next) {
  const blockedRaw = process.env.LIVECAM_BLOCKED_COUNTRIES || "";
  const blockedList = blockedRaw
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (!blockedList.length) return next();

  const country = getClientCountry(req);
  console.log("[ComplianceGuard] checkGeoRestriction", {
    path: req.originalUrl,
    country,
    blockedList,
  });

  if (country && blockedList.includes(country)) {
    console.warn("[ComplianceGuard] Geo restriction blocked request:", {
      path: req.originalUrl,
      country,
    });
    return res.status(451).json({
      success: false,
      error: true,
      message: "Live streaming is restricted in your region.",
    });
  }

  return next();
}

export async function requireAgeAssurance(req, res, next) {
  console.log("[ComplianceGuard] requireAgeAssurance called", {
    path: req.originalUrl,
    userId: req.user?._id,
    role: req.role,
  });

  try {
    if (!req.user || req.role === "Guest") {
      console.warn("[ComplianceGuard] requireAgeAssurance 401: Guest/No user");
      return res.status(401).json({
        success: false,
        error: true,
        message: "Login required.",
      });
    }

    if (req.role === "Admin" || req.role === "Escort") {
      return next();
    }

    if (req.role === "Client") {
      const viewerProfile = await ViewerLiveProfileModel.findOne({
        clientId: req.user._id,
      }).lean();

      if (!viewerProfile?.isAgeAssured) {
        console.warn("[ComplianceGuard] requireAgeAssurance 403:", {
          clientId: req.user._id,
          code: "AGE_ASSURANCE_REQUIRED",
          isAgeAssured: Boolean(viewerProfile?.isAgeAssured),
        });
        return res.status(403).json({
          success: false,
          error: true,
          code: "AGE_ASSURANCE_REQUIRED",
          message: "Please confirm 18+ age assurance to access Live Cams.",
        });
      }
      req.viewerProfile = viewerProfile;
      return next();
    }

    console.warn("[ComplianceGuard] requireAgeAssurance 403: Invalid role", {
      role: req.role,
    });
    return res.status(403).json({
      success: false,
      error: true,
      message: "Invalid account role.",
    });
  } catch (err) {
    console.error("[ComplianceGuard] requireAgeAssurance error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Compliance check failed.",
    });
  }
}

export async function requireApprovedBroadcaster(req, res, next) {
  console.log("[ComplianceGuard] requireApprovedBroadcaster called", {
    path: req.originalUrl,
    userId: req.user?._id,
    role: req.role,
  });

  try {
    if (!req.user || req.role !== "Escort") {
      console.warn(
        "[ComplianceGuard] requireApprovedBroadcaster 403: Not Escort",
      );
      return res.status(403).json({
        success: false,
        error: true,
        message: "Only broadcaster accounts can perform this action.",
      });
    }

    if (req.user.status === "Suspended") {
      console.warn(
        "[ComplianceGuard] requireApprovedBroadcaster 403: Suspended",
        {
          escortId: req.user._id,
        },
      );
      return res.status(403).json({
        success: false,
        error: true,
        message: "Your account is currently suspended.",
      });
    }

    const profile =
      req.broadcasterProfile ||
      (await BroadcasterStreamProfileModel.findOne({
        escortId: req.user._id,
      }).lean());

    if (!profile) {
      console.warn(
        "[ComplianceGuard] requireApprovedBroadcaster 403: BROADCASTER_PROFILE_MISSING",
        { escortId: req.user._id },
      );
      return res.status(403).json({
        success: false,
        error: true,
        code: "BROADCASTER_PROFILE_MISSING",
        message: "Complete broadcaster onboarding and verification first.",
      });
    }

    if (
      !profile.isIdentityVerified ||
      !profile.hasAcceptedBroadcastConsent ||
      profile.broadcastEligibility !== "approved"
    ) {
      const details = {
        isIdentityVerified: profile.isIdentityVerified,
        hasAcceptedBroadcastConsent: profile.hasAcceptedBroadcastConsent,
        broadcastEligibility: profile.broadcastEligibility,
      };
      console.warn(
        "[ComplianceGuard] requireApprovedBroadcaster 403: BROADCASTER_NOT_APPROVED",
        { escortId: req.user._id, details },
      );
      return res.status(403).json({
        success: false,
        error: true,
        code: "BROADCASTER_NOT_APPROVED",
        message:
          "Broadcaster requires ID verification, consent acceptance, and admin approval.",
        details,
      });
    }

    req.broadcasterProfile = profile;
    return next();
  } catch (err) {
    console.error("[ComplianceGuard] requireApprovedBroadcaster error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Broadcaster verification check failed.",
    });
  }
}
