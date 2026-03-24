import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import EscortModel from "./models/escortModel.js";
import { encrypt } from "./utils/crypto.js";


const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const escorts = await EscortModel.find();

    for (let e of escorts) {
      if (e.mobile && !e.mobile.startsWith("a")) {
        e.mobile = encrypt(e.mobile);
        await e.save();
      }
    }

    console.log("✅ Migration Done");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

runMigration();