import cron from "node-cron";
import TourModel from "../models/tourModel.js";

export const autoTourStatusCron = () => {

  // ⏰ Runs every day at 12:00 AM
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("⏰ Running Tour Status Cron...");

      const today = new Date();
      today.setHours(0, 0, 0, 0); // 🔴 VERY IMPORTANT

      // ✅ 1. Completed tours
      const completed = await TourModel.updateMany(
        {
          endDate: { $lt: today },
          status: { $ne: "completed" },
        },
        {
          $set: { status: "completed" },
        }
      );

      // ✅ 2. Ongoing tours
      const ongoing = await TourModel.updateMany(
        {
          startDate: { $lte: today },
          endDate: { $gte: today },
          status: { $ne: "ongoing" },
        },
        {
          $set: { status: "ongoing" },
        }
      );

      // ✅ 3. Upcoming tours (optional but safe)
      const upcoming = await TourModel.updateMany(
        {
          startDate: { $gt: today },
          status: { $ne: "upcoming" },
        },
        {
          $set: { status: "upcoming" },
        }
      );

      console.log(`✅ Completed: ${completed.modifiedCount}`);
      console.log(`🟡 Ongoing: ${ongoing.modifiedCount}`);
      console.log(`🔵 Upcoming: ${upcoming.modifiedCount}`);

    } catch (error) {
      console.error("❌ Cron Error:", error);
    }
  });

};