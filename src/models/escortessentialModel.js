import mongoose from "mongoose";

const EscortessentialSchema = new mongoose.Schema({
    escortId: {
        type: String,
        required: true,
        index: true
    },
    height: Number,
    bustSize: String,
    hairColor: String,
    hairStyle: String,
    ethnicity: String,
    eyeColor: String,
    dressSize: String,
    speakingLanguage: [String],
}, {
    timestamps: true
})
const EscortessentialModel = mongoose.model("escortessential", EscortessentialSchema)
export default EscortessentialModel;