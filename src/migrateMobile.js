import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import EscortModel from "./models/escortModel.js";
import { encrypt , decrypt } from "./utils/crypto.js";

const isNumber = (val) => /^\d{6,15}$/.test(val);

const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const escorts = await EscortModel.find();

    for (let e of escorts) {
      if (!e.mobile) continue;

      let mobileStr = String(e.mobile);

      // ✅ skip correct
      if (mobileStr.startsWith("enc:")) continue;

      let finalMobile = null;

      // 🔥 try decrypt
      try {
        const decrypted = decrypt(mobileStr);
        if (isNumber(decrypted)) {
          finalMobile = decrypted;
        }
      } catch {}

      // 🔥 plain number
      if (!finalMobile && isNumber(mobileStr)) {
        finalMobile = mobileStr;
      }

      // 🔥 save clean
      if (finalMobile) {
        e.mobile = "enc:" + encrypt(finalMobile);
        await e.save();
        console.log("✔️ Fixed:", finalMobile);
      } else {
        console.log("⚠️ Skipped:", mobileStr);
      }
    }

    console.log("✅ CLEAN DONE");
    process.exit();

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

runMigration();