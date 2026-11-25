import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

function getRoomService() {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LiveKit environment variables are not configured");
  }
  return new RoomServiceClient(
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
  );
}

export async function createLiveKitToken({
  identity,
  name,
  roomName,
  role = "viewer", // "broadcaster" | "viewer" | "private_participant"
  ttl = "2h",
}) {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LiveKit API credentials missing");
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: String(identity),
    name: name || String(identity),
    ttl,
  });

  const canPublish = role === "broadcaster" || role === "private_participant";

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
    roomRecord: false, // Recording disabled by compliance policy
  });

  return {
    token: await at.toJwt(),
    url: LIVEKIT_URL,
    roomName,
  };
}

export async function createRoomIfNeeded(roomName, emptyTimeout = 300) {
  const svc = getRoomService();
  try {
    await svc.createRoom({
      name: roomName,
      emptyTimeout,
    });
  } catch (err) {
    // Ignore if room already exists
  }
}

export async function terminateLiveKitRoom(roomName) {
  const svc = getRoomService();
  try {
    await svc.deleteRoom(roomName);
    return true;
  } catch (err) {
    return false;
  }
}
