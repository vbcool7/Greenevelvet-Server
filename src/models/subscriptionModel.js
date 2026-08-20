import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
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

  permissions: {
    messaging: {
      type: Boolean,
      default: false
    },
    reviews: {
      type: Boolean,
      default: false
    },
    analytics: {
      type: Boolean,
      default: false
    },
    prioritySearch: {
      type: Boolean,
      default: false
    },
  },

  limits: {
    photos: {
      type: Number,
      default: 0
    },
    baseLocations: {
      type: Number,
      default: 0
    },
    manualBoosts: {
      type: Number,
      default: 0
    },
    boostCycleDays: {
      type: Number,
      default: 0
    },
  },

  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

const SubscriptionModel = mongoose.model("Subscription", subscriptionSchema);
export default SubscriptionModel;