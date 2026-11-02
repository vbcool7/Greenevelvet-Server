import mongoose from "mongoose";

const partnerApplicationSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
    },

    contactNumber: {
      type: String,
      trim: true,
      default: "",
    },

    websiteUrl: {
      type: String,
      required: [true, "Website URL is required"],
      trim: true,
    },

    websiteCategory: {
      type: String,
      required: [true, "Website category is required"],
      enum: [
        "Escort Directory",
        "Adult Entertainment",
        "Lifestyle & Blog",
        "Advertising / Marketing Agency",
        "Other",
      ],
    },

    partnershipType: {
      type: String,
      required: [true, "Partnership type is required"],
      enum: [
        "Banner Exchange",
        "Website Promotion",
        "Affiliate Partnership",
        "Business Collaboration",
        "Other",
      ],
    },

    message: {
      type: String,
      trim: true,
      default: "",
    },

    agreedToTerms: {
      type: Boolean,
      required: true,
      validate: {
        validator: (value) => value === true,
        message: "You must agree to the partnership terms and privacy policy",
      },
    },

    status: {
      type: String,
      enum: ["Pending", "Under Review", "Approved", "Rejected"],
      default: "Pending",
    },

    adminReply: [
      {
        text: {
          type: String,
          required: true,
          trim: true,
        },
        sender: {
          type: String,
          default: "Admin",
        },
        time: {
          type: String,
          default: () => new Date().toLocaleString(),
        },
      },
    ],
    repliedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

const PartnerApplicationModel = mongoose.model(
  "PartnerApplication",
  partnerApplicationSchema,
);

export default PartnerApplicationModel;
