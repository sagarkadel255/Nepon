import mongoose, { Schema, Document } from "mongoose";

export type ProductStatus = "draft" | "published" | "unpublished" | "flagged";

export interface IProductVariant {
  sku: string;
  size: string;
  color: string;
  price: number;
  stock: number;
}

export interface IProductImage {
  url: string;
  publicId: string;
  altText: string;
}

export interface IProduct extends Document {
  sellerId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  category: mongoose.Types.ObjectId;
  images: IProductImage[];
  variants: IProductVariant[];
  status: ProductStatus;
  ratingAverage: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const productVariantSchema = new Schema<IProductVariant>(
  {
    sku: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const productImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    altText: { type: String, default: "" },
  },
  { _id: false },
);

const productSchema = new Schema<IProduct>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, maxlength: 5000 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    images: { type: [productImageSchema], default: [], validate: { validator: (v: IProductImage[]) => v.length <= 6, message: "Maximum 6 images" } },
    variants: { type: [productVariantSchema], required: true, minlength: 1 },
    status: {
      type: String,
      enum: ["draft", "published", "unpublished", "flagged"],
      default: "draft",
      required: true,
    },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, status: 1 });
productSchema.index({ title: "text", description: "text" });

export const Product = mongoose.model<IProduct>("Product", productSchema);
