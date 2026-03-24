import EscortModel from "../models/escortModel.js";
import { encrypt } from "../utils/crypto.js";

const migrateMobile = async () => {
  const escorts = await EscortModel.find();

  for (let e of escorts) {
    if (e.mobile && !e.mobile.startsWith("a")) {
      e.mobile = encrypt(e.mobile);
      await e.save();
    }
  }

  console.log("✅ Migration Done");
};

migrateMobile();