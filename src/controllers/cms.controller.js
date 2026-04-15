import CmsLocationModel from "../models/cmsLocationContentModel.js";
import CmsModel from "../models/cmsModel.js";


// create and update new slug /page content
export const saveCms = async (request, response) => {
    try {
        const { slug, title, content, status } = request.body;

        console.log("request body save: ", request.body);

        if (!slug || !title || !content) {
            return response.status(400).json({
                message: "All fields are required",
                success: false,
                error: true
            });
        }

        const cms = await CmsModel.findOneAndUpdate(
            { slug },
            { title, content, status },
            { new: true, upsert: true }
        );

        return response.status(201).json({
            message: "CMS saved successfully",
            success: true,
            error: false,
            data: cms,
        });
    } catch (error) {
        response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// get all slug/ pages content
export const getAllCms = async (request, response) => {
    try {
        const cmsList = await CmsModel.find().
            sort({ createdAt: -1 });

        return response.status(200).json({
            message: "All cms page fetched successfully",
            success: true,
            error: false,
            data: cmsList,
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// toggle slug status 
export const updateStatus = async (request, response) => {
    try {
        const { slug, status } = request.body;

        // ✅ validation
        if (!slug || !status) {
            return response.status(400).json({
                message: "slug and status are required",
                success: false,
                error: true
            });
        }
        const cleanStatus = status.toLowerCase().trim();

        // ✅ allow only valid values
        if (!["active", "inactive"].includes(cleanStatus)) {
            return response.status(400).json({
                message: "Invalid status value",
                success: false,
                error: true
            });
        }

        const updated = await CmsModel.findOneAndUpdate(
            { slug },
            { status },
            { new: true }
        );

        // ❗ not found case
        if (!updated) {
            return response.status(404).json({
                message: "CMS page not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: `Status updated to ${cleanStatus}`,
            success: true,
            error: false,
            data: updated
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

//  get selected slug/ page content
export const getCmsBySlug = async (request, response) => {
    try {
        const { slug } = request.params;

        const cms = await CmsModel.findOne({ slug });

        if (!cms) {
            return response.status(404).json({
                message: "CMS page .... not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "fetched success",
            success: true,
            error: false,
            data: cms,
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// get active slug
export const getActiveSlug = async (request, response) => {
    try {
        const { slug } = request.params;

        const cms = await CmsModel.findOne({
            slug,
            status: "active"
        });

        if (!cms) {
            return response.status(404).json({
                message: "Active CMS page not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Fetched success",
            success: true,
            error: false,
            data: cms,
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// delete slug / page content
export const deleteCms = async (request, response) => {
    try {
        const { id } = request.params;

        // ✅ Check valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return response.status(400).json({
                message: "Invalid CMS ID",
                success: false,
                error: true
            });
        }

        // ✅ Find & Delete
        const deletedCms = await CmsModel.findByIdAndDelete(id);

        // ✅ If not found
        if (!deletedCms) {
            return response.status(404).json({
                message: "CMS not found",
                success: false,
                error: true
            });
        }

        // ✅ Success response
        return response.status(200).json({
            message: "CMS deleted successfully",
            success: true,
            error: false
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// ===========================================< Add location content >===============================================

// slug genrator helper
export const generateSlug = (country, city) => {
    return `${country}-${city}`
        .toLowerCase()
        .replace(/\s+/g, "-");
};

// create location content 
export const addLocationContentCms = async (request, response) => {
    try {
        const { country, city, title, content, status } = request.body;

        console.log("request body save: ", request.body);

        if (!country || !city || !title || !content) {
            return response.status(400).json({
                message: "All fields are required",
                success: false,
                error: true
            });
        }

        const slug = generateSlug(country, city);

        const existing = await CmsLocationModel.findOne({ slug });
        if (existing) {
            return response.status(400).json({
                message: "Content already exists for this location",
                success: false,
                error: true
            });
        }

        const cms = await CmsLocationModel.create({
            country,
            city,
            slug,
            title,
            content,
            status: status || "active",
        });

        return response.status(201).json({
            message: "Location content created successfully",
            success: true,
            error: false,
            data: cms,
        });
    } catch (error) {
        response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// get all location contents content
export const fetchAllLocations = async (request, response) => {
    try {
        const fetchList = await CmsLocationModel.find()
            .sort({ createdAt: -1 });

        return response.status(200).json({
            message: "All location content fetched successfully",
            success: true,
            error: false,
            data: fetchList,
        });

    } catch (error) {
        console.log("ERROR ", error)
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// toggle slug status 
export const updateLocationContentStatus = async (request, response) => {
    try {
        const { slug, status } = request.body;

        // ✅ validation
        if (!slug || !status) {
            return response.status(400).json({
                message: "slug and status are required",
                success: false,
                error: true
            });
        }

        const cleanStatus = status.toLowerCase().trim();

        // ✅ allow only valid values
        if (!["active", "inactive"].includes(cleanStatus)) {
            return response.status(400).json({
                message: "Invalid status value",
                success: false,
                error: true
            });
        }

        const updated = await CmsLocationModel.findOneAndUpdate(
            { slug },
            { status },
            { new: true }
        );

        // ❗ not found case
        if (!updated) {
            return response.status(404).json({
                message: "Location content not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: `Status updated to ${cleanStatus}`,
            success: true,
            error: false,
            data: updated
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

//  get selected slug/ page content
export const getLocationContentBySlug = async (request, response) => {
    try {
        const { slug } = request.params;

        const cms = await CmsLocationModel.findOne({ slug });

        if (!cms) {
            return response.status(404).json({
                message: "Location content not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "fetched success",
            success: true,
            error: false,
            data: cms,
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// get active slug
export const getActiveLocaionContent = async (request, response) => {
    try {
        const { slug } = request.params;

        const cms = await CmsLocationModel.findOne({
            slug,
            status: "active"
        });

        if (!cms) {
            return response.status(404).json({
                message: "Active location content not found",
                success: false,
                error: true
            });
        }

        return response.status(200).json({
            message: "Fetched success",
            success: true,
            error: false,
            data: cms,
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};

// delete slug / page content
export const deleteLocationContent = async (request, response) => {
    try {
        const { id } = request.params;

        // ✅ Check valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return response.status(400).json({
                message: "Invalid CMS ID",
                success: false,
                error: true
            });
        }

        // ✅ Find & Delete
        const deletedCms = await CmsLocationModel.findByIdAndDelete(id);

        // ✅ If not found
        if (!deletedCms) {
            return response.status(404).json({
                message: "CMS not found",
                success: false,
                error: true
            });
        }

        // ✅ Success response
        return response.status(200).json({
            message: "Location content deleted successfully",
            success: true,
            error: false
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message,
            success: false,
            error: true
        });
    }
};
