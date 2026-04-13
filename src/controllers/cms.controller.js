import CmsModel from "../models/cmsModel.js";


// create and update new slug /page content
export const saveCms = async (request, response) => {
    try {
        const { slug, title, content, status } = request.body;

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

        return response.status(200).json({
            message: "CMS saved successfully",
            success: true,
            error: true,
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

//  get selected slug/ page content
export const getCmsBySlug = async (request, response) => {
    try {
        const { slug } = request.params;

        const cms = await CmsModel.findOne({ slug });

        if (!cms) {
            return response.status(404).json({
                message: "CMS page not found",
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

// delete slug / page content
export const deleteCms = async (request, response) => {
    try {
        const { id } = request.params;

        await CmsModel.findByIdAndDelete(id);

        response.status(200).json({
            message: "CMS deleted successfully",
            success: true,
            error: true
        });

    } catch (error) {
        response.status(500).json({
            message: error.message,
            success: false,
            error: false
        });
    }
};
