import cron from "node-cron";
import EscortModel from "../models/escortModel.js";

export const runAutoBoostScheduler = async () => {
    try {
        const now = new Date();

        const eligibleEscorts = await EscortModel.find({
            "boost.subscriptionPlanBoost": {
                $gt: 0
            },
            "boost.totalBoost": {
                $gt: 0
            },
            "boost.subscriptionPlanBoostExpiry": {
                $gt: now
            },
            "boost.subscriptionBoostIntervalDays": {
                $gt: 0
            },
            $or: [{
                    "boost.nextSubscriptionBoostAt": null
                },
                {
                    "boost.nextSubscriptionBoostAt": {
                        $lte: now
                    }
                }
            ]
        }).select("_id boost");

        for (const escort of eligibleEscorts) {
            const intervalDays = Number(
                escort.boost.subscriptionBoostIntervalDays
            );

            const nextBoostAt = new Date(
                now.getTime() +
                intervalDays * 24 * 60 * 60 * 1000
            );

            const updatedEscort = await EscortModel.findOneAndUpdate({
                _id: escort._id,
                "boost.subscriptionPlanBoost": {
                    $gt: 0
                },
                "boost.totalBoost": {
                    $gt: 0
                },
                "boost.subscriptionPlanBoostExpiry": {
                    $gt: now
                },
                $or: [{
                        "boost.nextSubscriptionBoostAt": null
                    },
                    {
                        "boost.nextSubscriptionBoostAt": {
                            $lte: now
                        }
                    }
                ]
            }, {
                $inc: {
                    "boost.subscriptionPlanBoost": -1,
                    "boost.totalBoost": -1
                },
                $set: {
                    "boost.nextSubscriptionBoostAt": nextBoostAt,
                    "boost.profileBoostExpiry": null,
                    boostSource: "subscription",
                    isBoosted: true,
                    boostedAt: now,
                    boostExpiry: null
                }
            }, {
                new: true
            });

            if (updatedEscort) {
                console.log(
                    `Auto boost applied: ${updatedEscort._id}`
                );
            }
        }
    } catch (error) {
        console.error("AUTO BOOST SCHEDULER ERROR:", error?.message);
    }
};

export const startAutoBoostScheduler = () => {
    cron.schedule("* * * * *", runAutoBoostScheduler);

    console.log("Auto boost scheduler started");
};