import mongoose from "mongoose";

const EscortdetailsSchema = new mongoose.Schema({
    escortId: {
        type: String,
        required: true,
        index: true
    },
    gender: String,

    age: Number,

    sexuality: String,

    showAge: {
        type: Boolean,
        default: false
    },

    landline: String,

    displayLandNo: {
        type: Boolean,
        default: false
    },

    displayConatct: {
        type: Boolean,
        default: false
    },

    website: String,

    social: String,

    preferredContact: {
        phoneCall: { type: Boolean, default: false },
        sms: { type: Boolean, default: false }
    },

}, {
    timestamps: true
})

const EscortdetailsModel = mongoose.model("escortdetail", EscortdetailsSchema)
export default EscortdetailsModel;
