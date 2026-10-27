import Counter from "../models/counterModel.js";

export const generatedescortId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "ES" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `ES-${counter.seq}`;
};

export const generatedclientId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "CL" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `CL-${counter.seq}`;
};
