import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  name: {
    type: String,   // ES / CL
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 100,
  },
});

export default mongoose.model("Counter", counterSchema);
