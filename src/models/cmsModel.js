import mongoose from "mongoose";

const cmsSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String, // HTML content
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

const CmsModel = mongoose.model("cms", cmsSchema);

export default CmsModel;