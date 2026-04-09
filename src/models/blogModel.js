import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
    escortId: {
        type: String,
        required: true,
        index: true
    },

    userId: {
        type: String,
        required: true,
        refPath: "userType"
    },

    userType: {
        type: String,
        required: true,
        enum: ["Client", "Escort"]
    },

    country: {
        type: String,
        index: true
    },

    city: String,

    name: {
        type: String,
        required: true,
        trim: true,
    },

    title: {
        type: String,
        required: true,
        trim: true,
    },

    description: {
        type: String,
        required: true,
        trim: true,
    },

    media: [
        {
            url: {
                type: String,
                required: true
            },
            public_id: { 
                type: String,
                required: true
            },
            type: {
                type: String,
                enum: ["image", "video"],
                required: true
            }
        }
    ],

    blogComments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "blogComments",
        },
    ],

    isCommentsBlocked: {
        type: Boolean,
        default: false,
    },

    blogLikes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "blogLikes",
        }
    ],

    status: {
        type: String,
        enum: ["active", "inactive", "blocked"],
        default: "active",
    },
}, {
    timestamps: true,
})

const BlogModel = mongoose.model("blog", blogSchema);

export default BlogModel;