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
  if (country && blockedList.includes(country)) {
    return res.status(451).json({
      success: false,
      error: true,
      message: "Live streaming is restricted in your region.",
    });
  }

  return next();
}

export async function requireAgeAssurance(req, res, next) {
  try {
    if (!req.user || req.role === "Guest") {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Login required.",
      });
    }

    if (req.role === "Admin") return next();

    if (req.role === "Escort") {
      const profile = await BroadcasterStreamProfileModel.findOne({
        escortId: req.user._id,
      }).lean();

      if (!profile?.isAgeVerified) {
        return res.status(403).json({
          success: false,
          error: true,
          code: "AGE_VERIFICATION_REQUIRED",
          message: "Age verification (18+) is required to use Live Cams.",
        });
      }
      req.broadcasterProfile = profile;
      return next();
    }

    if (req.role === "Client") {
      const viewerProfile = await ViewerLiveProfileModel.findOne({
        clientId: req.user._id,
      }).lean();

      if (!viewerProfile?.isAgeAssured) {
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

    return res.status(403).json({
      success: false,
      error: true,
      message: "Invalid account role.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Compliance check failed.",
    });
  }
}

export async function requireApprovedBroadcaster(req, res, next) {
  try {
    if (!req.user || req.role !== "Escort") {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Only broadcaster accounts can perform this action.",
      });
    }

    if (req.user.status === "Suspended") {
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
      return res.status(403).json({
        success: false,
        error: true,
        code: "BROADCASTER_PROFILE_MISSING",
        message: "Complete broadcaster onboarding and verification first.",
      });
    }

    if (
      !profile.isAgeVerified ||
      !profile.isIdentityVerified ||
      !profile.hasAcceptedBroadcastConsent ||
      profile.broadcastEligibility !== "approved"
    ) {
      return res.status(403).json({
        success: false,
        error: true,
        code: "BROADCASTER_NOT_APPROVED",
        message:
          "Broadcaster requires age verification, ID verification, consent acceptance, and admin approval.",
        details: {
          isAgeVerified: profile.isAgeVerified,
          isIdentityVerified: profile.isIdentityVerified,
          hasAcceptedBroadcastConsent: profile.hasAcceptedBroadcastConsent,
          broadcastEligibility: profile.broadcastEligibility,
        },
      });
    }

    req.broadcasterProfile = profile;
    return next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Broadcaster verification check failed.",
    });
  }
}
