import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function fixAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) { console.error("Failed to connect to database"); process.exit(1); }
  const users = db.collection("users");

  const existing = await users.findOne({ email: "admin@nepon.com" });

  if (existing) {
    console.log("Admin account found in database");
    console.log("  Role:", existing.role);
    console.log("  Status:", existing.status);
    console.log("  MFA enabled:", existing.mfaEnabled);

    const hash = existing.passwordHash;
    if (typeof hash === "string") {
      console.log("  Hash length:", hash.length);
      console.log("  Hash preview:", hash.substring(0, 20) + "...");

      const match = bcrypt.compareSync("Admin@123Secure", hash);
      console.log("  Password 'Admin@123Secure' matches:", match);

      if (!match) {
        console.log("\nHash is corrupted. Replacing...");
        const newHash = await bcrypt.hash("Admin@123Secure", 12);
        await users.updateOne(
          { email: "admin@nepon.com" },
          {
            $set: {
              passwordHash: newHash,
              failedLoginCount: 0,
              lockedUntil: null,
            },
          }
        );
        console.log("Hash replaced. Try logging in now.");
      }

      if (existing.lockedUntil && new Date(existing.lockedUntil) > new Date()) {
        console.log("\nAccount is LOCKED. Unlocking...");
        await users.updateOne(
          { email: "admin@nepon.com" },
          { $set: { failedLoginCount: 0, lockedUntil: null } }
        );
        console.log("Account unlocked.");
      }
    }
  } else {
    console.log("No admin account found. Creating one...");
    const hash = await bcrypt.hash("Admin@123Secure", 12);
    await users.insertOne({
      email: "admin@nepon.com",
      passwordHash: hash,
      displayName: "Super Admin",
      role: "admin",
      status: "active",
      isEmailVerified: true,
      mfaEnabled: false,
      authProviders: ["password"],
      failedLoginCount: 0,
      passwordHistory: [],
      trustedDevices: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Admin account CREATED successfully.");
    console.log("  Email:    admin@nepon.com");
    console.log("  Password: Admin@123Secure");
  }

  console.log("\nNext: Login at /login then set up MFA at /mfa/setup");
  await mongoose.disconnect();
}

fixAdmin().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});