import mongoose, { Schema, Document } from "mongoose";

/**
 * Records user–product interaction events (views, clicks, searches) that feed
 * the collaborative filtering model. Purchase and review signals are derived
 * from the orders and reviews collections instead.
 */

export type InteractionType = "view" | "click" | "search";

export interface IAIInteraction extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  type: InteractionType;
  metadata: Record<string, any>;
  createdAt: Date;
}

const aiInteractionSchema = new Schema<IAIInteraction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    type: {
      type: String,
      enum: ["view", "click", "search"],
      required: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

aiInteractionSchema.index({ userId: 1, productId: 1, type: 1 });
aiInteractionSchema.index({ createdAt: -1 });

export const AIInteraction = mongoose.model<IAIInteraction>("AIInteraction", aiInteractionSchema);
