import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { logger } from "../utils/logger";

async function seed() {
  try {
    logger.info(`Connecting to MongoDB... ${env.MONGODB_URI}`);
    await mongoose.connect(env.MONGODB_URI);
    logger.info("Connected to MongoDB.");

    // Clean up specific seed data if it exists
    await User.deleteOne({ email: "seed_seller@nepon.local" });
    const passwordHash = await bcrypt.hash("Password123!", 12);

    const seller = await User.create({
      email: "seed_seller@nepon.local",
      passwordHash,
      displayName: "Nepal Threads (Seed)",
      role: "seller",
      status: "active",
      isEmailVerified: true,
      authProviders: ["password"]
    });
    logger.info(`Created seed seller: ${seller.email}`);

    let category = await Category.findOne({ slug: "traditional-wear" });
    if (!category) {
      category = await Category.create({
        name: "Traditional Wear",
        slug: "traditional-wear",
        description: "Authentic traditional Nepalese clothing."
      });
      logger.info(`Created category: ${category.name}`);
    }

    // Clear old seed products so re-seeding is idempotent
    await Product.deleteMany({ sellerId: seller._id });

    const productsToSeed = [
      {
        title: "Handwoven Dhaka Topi",
        slug: "handwoven-dhaka-topi-seed",
        description: "Authentic handwoven Dhaka Topi made from premium cotton threads. Perfect for cultural events and daily wear.",
        status: "published",
        images: [{ url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", publicId: "sample", altText: "Dhaka Topi" }],
        variants: [
          { sku: "TOP-01-S", size: "S", color: "Red/Black", price: 450, stock: 20 },
          { sku: "TOP-01-M", size: "M", color: "Red/Black", price: 450, stock: 35 },
          { sku: "TOP-01-L", size: "L", color: "Red/Black", price: 450, stock: 15 },
        ]
      },
      {
        title: "Modern Kurti with Dhaka Pattern",
        slug: "modern-kurti-dhaka-seed",
        description: "A comfortable cotton kurti featuring elegant traditional Dhaka patterns on the borders.",
        status: "published",
        images: [{ url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", publicId: "sample2", altText: "Kurti" }],
        variants: [
          { sku: "KUR-01-M", size: "M", color: "Blue", price: 1200, stock: 10 },
          { sku: "KUR-01-L", size: "L", color: "Blue", price: 1200, stock: 12 },
        ]
      },
      {
        title: "Pashmina Shawl",
        slug: "pashmina-shawl-seed",
        description: "Luxurious, lightweight, and incredibly warm 100% authentic Pashmina shawl.",
        status: "published",
        images: [{ url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", publicId: "sample3", altText: "Pashmina Shawl" }],
        variants: [
          { sku: "PAS-01", size: "Standard", color: "Cream", price: 3500, stock: 5 },
          { sku: "PAS-02", size: "Standard", color: "Maroon", price: 3500, stock: 8 },
        ]
      },
      {
        title: "Hemp Backpack",
        slug: "hemp-backpack-seed",
        description: "Durable and eco-friendly backpack made from wild Himalayan hemp.",
        status: "published",
        images: [{ url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", publicId: "sample4", altText: "Hemp Backpack" }],
        variants: [
          { sku: "BAG-01", size: "20L", color: "Natural", price: 1800, stock: 25 },
        ]
      }
    ];

    for (const pData of productsToSeed) {
      await Product.create({
        ...pData,
        status: pData.status as any,
        sellerId: seller._id,
        category: category._id
      });
      logger.info(`Created product: ${pData.title}`);
    }

    logger.info("Database seeding completed securely.");
    process.exit(0);
  } catch (error) {
    logger.error("Seeding failed", { error });
    process.exit(1);
  }
}

seed();
