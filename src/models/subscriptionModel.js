import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    duration: {
      type: String,
      required: true
    },

    originalPrice: {
      type: Number,
      required: true
    },

    discountedPrice: {
      type: Number,
      required: true,
      default: 0
    },

    currency: {
      type: String,
      default: "AUD"
    },

    features: {
      type: [String],
      default: []
    },

    totalSpots: {
      type: Number,
      default: 100
    },

    isFeatureHide: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    }

  },
  { timestamps: true }
);

const SubscriptionModel = mongoose.model("Subscription", subscriptionSchema);
export default SubscriptionModel;