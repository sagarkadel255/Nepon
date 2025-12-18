import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  quantity: number;
  priceAtAdd: number;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId | null;
  guestToken: string | null;
  items: ICartItem[];
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    priceAtAdd: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const cartSchema = new Schema<ICart>(
  {
    // Only ONE of these is set on any given cart — the other stays absent from the
    // document (not null). Partial-filter unique indexes below enforce uniqueness
    // *only* on carts that actually carry the field, so multiple guest carts and
    // multiple as-yet-unclaimed carts can coexist without E11000 collisions.
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    guestToken: { type: String },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

cartSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } },
);
cartSchema.index(
  { guestToken: 1 },
  { unique: true, partialFilterExpression: { guestToken: { $type: 'string' } } },
);

const Cart = mongoose.model<ICart>('Cart', cartSchema);
export default Cart;
