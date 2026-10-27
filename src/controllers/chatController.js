import ChatMessageModel from "../models/chatMessageModel.js";
import ChatRoomModel from "../models/chatRoomModel.js";

// 1. Room Access ya Create karne ka Controller
export const accessChatRoom = async (request, response) => {
    try {
        const { clientId, clientModel, escortId, escortModel } = request.body;

        if (!clientId || !clientModel || !escortId || !escortModel) {
            return response.status(400).json({
                success: false,
                message: "Missing required fields",
                error: true
            });
        }

        // Check karo ki kya in dono ke beech pehle se koi room bana hai
        // $elemMatch se hum array ke andar dynamic id aur onModel dono check karenge
        let room = await ChatRoomModel.findOne({
            participants: {
                $all: [
                    { $elemMatch: { id: clientId, onModel: clientModel } },
                    { $elemMatch: { id: escortId, onModel: escortModel } }
                ]
            }
        }).populate('lastMessage');

        // Agar room nahi mila, to WhatsApp ki tarah naya room create karo
        if (!room) {
            room = await ChatRoomModel.create({
                participants: [
                    { id: clientId, onModel: clientModel },
                    { id: escortId, onModel: escortModel }
                ],
                unreadCounts: {
                    [clientId]: 0,
                    [escortId]: 0
                }
            });
        }

        return response.status(200).json({
            message: "room created",
            success: true,
            room,
            error: false
        });
    } catch (error) {
        console.log("create room error", error);

        return response.status(500).json({
            success: false,
            message: error.message,
            error: true
        });
    }
};

// 2. Chat History (Messages) Fetch karne ka Controller
export const getChatMessages = async (request, response) => {
    try {
        const { chatRoomId } = request.params;

        if (!chatRoomId) {
            return response.status(400).json({
                success: false,
                message: "Chat Room ID is required",
                error: true
            });
        }

        // Puraani chat history load karo (Oldest to Newest sorted)
        const messages = await ChatMessageModel.find({ chatRoomId })
            .sort({ createdAt: 1 }); // WhatsApp me purane message upar aur naye neeche hote hain

        return response.status(200).json({
            success: true,
            messages,
            error: false
        });
    } catch (error) {
        console.log("Chat History (Messages) Fetch error", error);

        return response.status(500).json({
            success: false,
            message: error.message,
            error: true
        });
    }
};

// 3. User ke saare active chats fetch karne ka Controller (Sidebar/Chat List ke liye)
export const getUserChatList = async (request, response) => {
    try {
        const { userId, userModel } = request.query; // Login user ki ID aur uska Model type

        // Woh saare rooms dhundo jisme yeh login user participant hai
        const chatLists = await ChatRoomModel.find({
            participants: {
                $elemMatch: { id: userId, onModel: userModel }
            }
        })
            .populate('lastMessage')
            .sort({ updatedAt: -1 }); // WhatsApp ki tarah naya message aane par room upar dikhega

        return response.status(200).json({
            success: true,
            chatLists,
            error: true
        });
    } catch (error) {
        console.log("active chats fetch error", error);

        return response.status(500).json({
            success: false,
            message: error.message,
            error: true
        });
    }
};