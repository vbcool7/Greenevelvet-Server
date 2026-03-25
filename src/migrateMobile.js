import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import EscortModel from "./models/escortModel.js";
import { encrypt } from "./utils/crypto.js";

const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ DB Connected");

    const escorts = await EscortModel.find();

    let updated = 0;
    let skipped = 0;

    for (let e of escorts) {
      if (!e.mobile) {
        skipped++;
        continue;
      }

      let mobileStr = String(e.mobile);

      // 🔒 Already encrypted → skip
      if (mobileStr.startsWith("enc:")) {
        skipped++;
        continue;
      }

      // ❗ Only numbers allowed → extra safety
      if (!/^\d+$/.test(mobileStr)) {
        console.log("⚠️ Invalid mobile skipped:", mobileStr);
        skipped++;
        continue;
      }

      // 🔐 Encrypt & add prefix
      e.mobile = "enc:" + encrypt(mobileStr);
      await e.save();

      updated++;
      console.log("✔️ Encrypted:", mobileStr);
    }

    console.log("\n🎯 Migration Summary:");
    console.log("Updated:", updated);
    console.log("Skipped:", skipped);

    console.log("\n✅ Migration Done");
    process.exit();

  } catch (err) {
    console.error("❌ Migration Error:", err);
    process.exit(1);
  }
};

runMigration();