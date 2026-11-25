import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ["Admin", "Escort", "Client", "Moderator", "System"],
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
    },
    targetId: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });

const AuditLogModel = mongoose.model("AuditLog", AuditLogSchema);

export default AuditLogModel;
