export async function verifyEmailcontroller(request, response) {
    try {
        const { token } = request.query;

        const pendingEscort = await PendingEscortModel.findOne({
            emailVerifyToken: token,
            emailVerifyExpiry: { $gt: Date.now() }
        }).select("+password");

        if (!pendingEscort) {

            const expiredEscort = await PendingEscortModel.findOne({
                emailVerifyToken: token
            });

            if (expiredEscort) {
                return response.redirect(
                    `https://www.greenevelvet.com/link-expired/${expiredEscort._id || ""}`
                );
            }

            return response.redirect(
                "https://www.greenevelvet.com/link-expired"
            );
        }

        // Safety check
        const existingEscort = await EscortModel.findOne({
            email: pendingEscort.email
        });

        if (existingEscort) {
            await PendingEscortModel.deleteOne({
                _id: pendingEscort._id
            });

            return response.status(409).json({
                message: "Escort already exists with this email",
                success: false,
                error: true
            });
        }

        const existingClient = await ClientModel.findOne({
            email: pendingEscort.email
        });

        if (existingClient) {
            await PendingEscortModel.deleteOne({
                _id: pendingEscort._id
            });

            return response.status(409).json({
                message: "This email is already registered as Client",
                success: false,
                error: true
            });
        }

        // Convert pending escort to plain object
        const escortData = pendingEscort.toObject();

        delete escortData._id;
        delete escortData.createdAt;
        delete escortData.updatedAt;

        escortData.isEmailVerified = true;
        escortData.emailVerifyToken = null;
        escortData.emailVerifyExpiry = null;
        escortData.lastCompletedStep = 2;

        // Id generate for new escort
        const escortId = await generatedescortId();

        escortData.escortId = escortId;

        // Create Escort
        const escort = await EscortModel.create(escortData);

        // Delete pending record
        await PendingEscortModel.deleteOne({
            _id: pendingEscort._id
        });

        if (!escort || !escort.escortId) {
            return response.status(400).json({
                message: "Failed to create escort account",
                success: false,
                error: true
            });
        }

        return response.redirect(
            `https://www.greenevelvet.com/confirmmobilenumber/${escort.escortId}`
        );

    } catch (error) {
        console.log("verifyEmailcontroller error", error);

        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        });
    }
}