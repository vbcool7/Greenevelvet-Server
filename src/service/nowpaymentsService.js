import crypto from "crypto";

const NOWPAYMENTS_API_URL =
  process.env.NOWPAYMENTS_API_URL || "https://api.nowpayments.io/v1";
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";
const PLATFORM_COMMISSION_RATE = Number(
  process.env.LIVECAM_COMMISSION_RATE || 20,
); // default 20%

export function calculateSplit(amount, customRate = null) {
  const gross = Math.max(0, Number(amount) || 0);
  const rate =
    typeof customRate === "number" && customRate >= 0
      ? customRate
      : PLATFORM_COMMISSION_RATE;
  const commissionAmount = Number(((gross * rate) / 100).toFixed(2));
  const netBroadcasterAmount = Number((gross - commissionAmount).toFixed(2));

  return {
    grossAmount: gross,
    commissionRate: rate,
    commissionAmount,
    netBroadcasterAmount,
  };
}

export function verifyNowPaymentsSignature(
  rawBodyBufferOrString,
  signatureHeader,
) {
  if (!NOWPAYMENTS_IPN_SECRET || !signatureHeader) return false;

  const rawString = Buffer.isBuffer(rawBodyBufferOrString)
    ? rawBodyBufferOrString.toString("utf8")
    : typeof rawBodyBufferOrString === "string"
      ? rawBodyBufferOrString
      : JSON.stringify(rawBodyBufferOrString);

  let sortedPayloadString = rawString;
  try {
    const parsed = JSON.parse(rawString);
    const sortObject = (obj) => {
      if (Array.isArray(obj)) return obj.map(sortObject);
      if (obj && typeof obj === "object") {
        return Object.keys(obj)
          .sort()
          .reduce((acc, key) => {
            acc[key] = sortObject(obj[key]);
            return acc;
          }, {});
      }
      return obj;
    };
    sortedPayloadString = JSON.stringify(sortObject(parsed));
  } catch (_) {
    // Fallback to raw string if already formatted
  }

  const expectedSig = crypto
    .createHmac("sha512", NOWPAYMENTS_IPN_SECRET)
    .update(sortedPayloadString)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig, "utf8"),
      Buffer.from(String(signatureHeader), "utf8"),
    );
  } catch (_) {
    return false;
  }
}

export async function createNowPaymentsInvoice({
  priceAmount,
  priceCurrency = "USD",
  payCurrency = "",
  orderId,
  orderDescription,
  ipnCallbackUrl,
  successUrl = "",
  cancelUrl = "",
}) {
  if (!NOWPAYMENTS_API_KEY) {
    throw new Error("NOWPAYMENTS_API_KEY is not configured");
  }

  const payload = {
    price_amount: Number(priceAmount),
    price_currency: priceCurrency,
    order_id: String(orderId),
    order_description: orderDescription || "Greene Velvet Live Cam Payment",
    ipn_callback_url: ipnCallbackUrl,
  };

  if (payCurrency) payload.pay_currency = payCurrency;
  if (successUrl) payload.success_url = successUrl;
  if (cancelUrl) payload.cancel_url = cancelUrl;

  const response = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
    method: "POST",
    headers: {
      "x-api-key": NOWPAYMENTS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Failed to create NOWPayments invoice");
  }

  return data;
}
