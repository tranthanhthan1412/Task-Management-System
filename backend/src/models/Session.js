import mongoose from "mongoose";
const sessionSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });
export default mongoose.model("Session", sessionSchema);
