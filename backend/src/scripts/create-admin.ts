import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../.env") });

async function createAdmin() {
  const email = process.argv[2] || "admin@nepon.com";
  const password = process.argv[3] || "Admin@123!Secure";
  const displayName = process.argv[4] || "Super Admin";

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const { User } = await import("../models/User");

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`Admin account already exists: ${email}`);
    console.log(`Role: ${existing.role}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    displayName,
    role: "admin",
    status: "active",
    isEmailVerified: true,
    mfaEnabled: false,
    authProviders: ["password"],
    failedLoginCount: 0,
    passwordHistory: [],
    trustedDevices: [],
  });

  console.log("Admin account created successfully:");
  console.log(`  Email:    ${admin.email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role:     ${admin.role}`);
  console.log("\nNext steps:");
  console.log("  1. Login at /login");
  console.log("  2. Set up MFA (required for admin access)");
  console.log("  3. Access /admin dashboard");

  await mongoose.disconnect();
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("Failed to create admin:", err);
  process.exit(1);
});