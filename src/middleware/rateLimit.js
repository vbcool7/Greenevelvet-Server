const requestMap = new Map();

export const rateLimit = (limit = 5, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.user?._id || req.ip;
    const now = Date.now();

    if (!requestMap.has(key)) {
      requestMap.set(key, []);
    }

    const timestamps = requestMap
      .get(key)
      .filter((time) => now - time < windowMs);

    timestamps.push(now);
    requestMap.set(key, timestamps);

    if (timestamps.length > limit) {
      return res.status(429).json({
        success: false,
        message: "Too many requests, try later",
      });
    }

    next();
  };
};