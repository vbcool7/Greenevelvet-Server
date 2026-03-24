import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });


const SECRET = process.env.CRYPTO_SECRET;

if (!SECRET) {
    throw new Error("CRYPTO_SECRET is missing in .env");
}


const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = crypto
    .createHash("sha256")
    .update(SECRET)
    .digest("base64")
    .substring(0, 32);

const IV = Buffer.alloc(16, 0); // simple IV (can randomize later)

export const encrypt = (text) => {
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, IV);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
};

export const decrypt = (encryptedText) => {
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, IV);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
};