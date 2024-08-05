import mongoose from "mongoose";
const { Schema, ObjectId, model } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: true,
      min: 6,
      max: 64,
    },
    role: {
      type: [String],
      default: ["Buyer"],
      enum: ["Buyer", "Seller", "Admin", "Author"],
    },
    photo: {},
    logo: {},
    company: { type: String, default: "" },
    enquiredProperties: [{ type: ObjectId, ref: "Ad" }],
    wishlist: [{ type: ObjectId, ref: "Ad" }],
    about: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default model("User", userSchema);
