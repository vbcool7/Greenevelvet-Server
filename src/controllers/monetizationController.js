import ClientModel from "../models/clientModel.js";
import EscortModel from "../models/escortModel.js";
import StreamSessionModel from "../models/StreamSessionModel.js";
import BroadcasterStreamProfileModel from "../models/BroadcasterStreamProfileModel.js";
import LiveCamSubscriptionModel from "../models/LiveCamSubscriptionModel.js";
import LiveCamTransactionModel from "../models/LiveCamTransactionModel.js";
import LiveCamPayoutModel from "../models/LiveCamPayoutModel.js";
import {
  calculateSplit,
  verifyNowPaymentsSignature,
  createNowPaymentsInvoice,
} from "../service/nowpaymentsService.js";
import { sendLiveCamNotification } from "../service/auditService.js";

// Create NOWPayments invoice for wallet topup, paid stream, or monthly subscription
export const initiateNowPayment = async (req, res) => {
  try {
    const clientId = req.user._id;
    const {
      purpose = "wallet_topup", // "wallet_topup" | "paid_stream" | "subscription"
      amount,
      payCurrency = "",
      broadcasterId = null,
      sessionId = null,
    } = req.body || {};

    let chargeAmount = Number(amount || 0);
    let targetBroadcasterId = broadcasterId;

    if (purpose === "paid_stream") {
      const session = await StreamSessionModel.findById(sessionId).lean();
      if (!session || session.visibility !== "paid" || !session.entryFee) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid paid stream session.",
        });
      }
      chargeAmount = session.entryFee;
      targetBroadcasterId = session.broadcasterId;
    } else if (purpose === "subscription") {
      const bProfile = await BroadcasterStreamProfileModel.findOne({
        escortId: broadcasterId,
      }).lean();
      if (!bProfile || !bProfile.monthlyMembershipPrice) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Broadcaster monthly membership price is not configured.",
        });
      }
      chargeAmount = bProfile.monthlyMembershipPrice;
      targetBroadcasterId = broadcasterId;
    }

    if (!chargeAmount || chargeAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Valid positive payment amount is required.",
      });
    }

    const split =
      purpose === "wallet_topup"
        ? {
            grossAmount: chargeAmount,
            commissionRate: 0,
            commissionAmount: 0,
            netBroadcasterAmount: 0,
          }
        : calculateSplit(chargeAmount);

    const tx = await LiveCamTransactionModel.create({
      payerId: clientId,
      broadcasterId: targetBroadcasterId || null,
      type: purpose,
      provider: "nowpayments",
      payCurrency: (payCurrency || "").trim().toUpperCase(),
      priceAmount: chargeAmount,
      commissionRate: split.commissionRate,
      commissionAmount: split.commissionAmount,
      netBroadcasterAmount: split.netBroadcasterAmount,
      status: "waiting",
      meta: {
        sessionId: sessionId ? String(sessionId) : null,
        broadcasterId: targetBroadcasterId ? String(targetBroadcasterId) : null,
      },
    });

    tx.nowpaymentsOrderId = `gv_lc_${tx._id.toString()}`;
    await tx.save();

    if (purpose === "subscription" && targetBroadcasterId) {
      await LiveCamSubscriptionModel.create({
        viewerId: clientId,
        broadcasterId: targetBroadcasterId,
        priceAmount: chargeAmount,
        status: "pending",
        nowpaymentsInvoiceId: tx.nowpaymentsOrderId,
      });
    }

    const ipnUrl =
      process.env.NOWPAYMENTS_IPN_URL ||
      `${req.protocol}://${req.get("host")}/api/livecam/monetization/webhook/nowpayments`;

    const invoice = await createNowPaymentsInvoice({
      priceAmount: chargeAmount,
      priceCurrency: "USD",
      payCurrency: tx.payCurrency,
      orderId: tx.nowpaymentsOrderId,
      orderDescription: `Greene Velvet LiveCam - ${purpose}`,
      ipnCallbackUrl: ipnUrl,
      successUrl: process.env.LIVECAM_PAYMENT_SUCCESS_URL || "",
      cancelUrl: process.env.LIVECAM_PAYMENT_CANCEL_URL || "",
    });

    tx.nowpaymentsPaymentId = String(invoice.id || "");
    await tx.save();

    return res.status(201).json({
      success: true,
      error: false,
      transaction: tx,
      invoiceUrl: invoice.invoice_url || "",
      invoice,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: err.message || "Failed to initiate NOWPayments transaction.",
    });
  }
};

// NOWPayments IPN Webhook handler (requires raw body buffer if available)
export const handleNowPaymentsWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-nowpayments-sig"];
    const rawSource = req.rawBody || req.body;

    if (!verifyNowPaymentsSignature(rawSource, signature)) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Invalid IPN signature",
      });
    }

    const payload = req.body || {};
    const orderId = String(payload.order_id || "");
    const paymentStatus = String(payload.payment_status || "").toLowerCase();

    const tx = await LiveCamTransactionModel.findOne({
      $or: [
        { nowpaymentsOrderId: orderId },
        ...(payload.payment_id
          ? [{ nowpaymentsPaymentId: String(payload.payment_id) }]
          : []),
      ],
    });

    if (!tx) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Transaction not found",
      });
    }

    const prevStatus = tx.status;
    const mappedStatus = [
      "waiting",
      "confirming",
      "confirmed",
      "finished",
      "failed",
      "expired",
      "refunded",
    ].includes(paymentStatus)
      ? paymentStatus
      : tx.status;

    tx.status = mappedStatus;
    if (payload.pay_currency) {
      tx.payCurrency = String(payload.pay_currency).toUpperCase();
    }
    if (["failed", "expired"].includes(mappedStatus)) {
      tx.failureReason = `NOWPayments status: ${mappedStatus}`;
    }
    await tx.save();

    const isSettledNow =
      ["finished", "confirmed"].includes(mappedStatus) &&
      !["finished", "confirmed"].includes(prevStatus);

    if (isSettledNow) {
      if (tx.type === "wallet_topup" && tx.payerId) {
        await ClientModel.findByIdAndUpdate(tx.payerId, {
          $inc: { walletBalance: tx.priceAmount },
        });
      }

      if (
        ["paid_stream", "subscription"].includes(tx.type) &&
        tx.broadcasterId
      ) {
        await BroadcasterStreamProfileModel.findOneAndUpdate(
          { escortId: tx.broadcasterId },
          {
            $inc: {
              "statsSummary.totalEarnings": tx.netBroadcasterAmount || 0,
              "statsSummary.availableBalance": tx.netBroadcasterAmount || 0,
            },
          },
          { upsert: true },
        );
      }

      if (tx.type === "subscription" && tx.payerId && tx.broadcasterId) {
        const startsAt = new Date();
        const expiresAt = new Date(
          startsAt.getTime() + 30 * 24 * 60 * 60 * 1000,
        );
        await LiveCamSubscriptionModel.findOneAndUpdate(
          {
            viewerId: tx.payerId,
            broadcasterId: tx.broadcasterId,
            nowpaymentsInvoiceId: tx.nowpaymentsOrderId,
          },
          {
            $set: {
              status: "active",
              startsAt,
              expiresAt,
            },
          },
        );
      }
    }

    if (["failed", "expired"].includes(mappedStatus) && tx.payerId) {
      await sendLiveCamNotification({
        recipientId: tx.payerId,
        recipientModel: "Client",
        type: "livecam_payment_update",
        title: "Payment Update",
        message: `Your payment (${tx.nowpaymentsOrderId}) is marked as ${mappedStatus}.`,
        link: "/livecam/wallet",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Webhook processing error",
    });
  }
};

// Viewer transaction history & active subscriptions
export const getViewerBillingHistory = async (req, res) => {
  try {
    const clientId = req.user._id;
    const [transactions, subscriptions, clientDoc] = await Promise.all([
      LiveCamTransactionModel.find({ payerId: clientId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      LiveCamSubscriptionModel.find({ viewerId: clientId })
        .populate("broadcasterId", "name escortId avatar")
        .sort({ createdAt: -1 })
        .lean(),
      ClientModel.findById(clientId).select("walletBalance").lean(),
    ]);

    return res.status(200).json({
      success: true,
      error: false,
      walletBalance: clientDoc?.walletBalance || 0,
      transactions,
      subscriptions,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to fetch billing history.",
    });
  }
};

// Broadcaster earnings dashboard & payout request
export const getBroadcasterEarnings = async (req, res) => {
  try {
    const broadcasterId = req.user._id;
    const [profile, transactions, payouts] = await Promise.all([
      BroadcasterStreamProfileModel.findOne({ escortId: broadcasterId }).lean(),
      LiveCamTransactionModel.find({
        broadcasterId,
        status: { $in: ["finished", "confirmed"] },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      LiveCamPayoutModel.find({ broadcasterId })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      error: false,
      summary: {
        totalEarnings: profile?.statsSummary?.totalEarnings || 0,
        availableBalance: profile?.statsSummary?.availableBalance || 0,
        payoutCurrency: profile?.payoutCurrency || "USDTTRC20",
        payoutWalletAddress: profile?.payoutWalletAddress || "",
      },
      transactions,
      payouts,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load earnings dashboard.",
    });
  }
};

export const requestBroadcasterPayout = async (req, res) => {
  try {
    const broadcasterId = req.user._id;
    const { amount, currency, walletAddress } = req.body || {};
    const withdrawAmount = Number(amount || 0);

    if (withdrawAmount <= 0 || !walletAddress?.trim()) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Valid amount and crypto walletAddress are required.",
      });
    }

    const updatedProfile = await BroadcasterStreamProfileModel.findOneAndUpdate(
      {
        escortId: broadcasterId,
        "statsSummary.availableBalance": { $gte: withdrawAmount },
      },
      {
        $inc: { "statsSummary.availableBalance": -withdrawAmount },
        $set: {
          payoutCurrency: (currency || "USDTTRC20").trim().toUpperCase(),
          payoutWalletAddress: walletAddress.trim(),
        },
      },
      { new: true },
    );

    if (!updatedProfile) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Insufficient available balance for payout.",
      });
    }

    const payout = await LiveCamPayoutModel.create({
      broadcasterId,
      amount: withdrawAmount,
      currency: (currency || "USDTTRC20").trim().toUpperCase(),
      walletAddress: walletAddress.trim(),
      status: "requested",
    });

    await LiveCamTransactionModel.create({
      broadcasterId,
      type: "payout",
      provider: "nowpayments",
      payCurrency: payout.currency,
      priceAmount: withdrawAmount,
      netBroadcasterAmount: withdrawAmount,
      status: "waiting",
      meta: {
        payoutId: payout._id.toString(),
        walletAddress: payout.walletAddress,
      },
    });

    return res.status(201).json({
      success: true,
      error: false,
      payout,
      availableBalance: updatedProfile.statsSummary.availableBalance,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to submit payout request.",
    });
  }
};
