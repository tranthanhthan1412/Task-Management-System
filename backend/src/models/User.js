import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
}, {
  timestamps: true,
  toJSON: { transform(_doc, value) { delete value.passwordHash; delete value.__v; return value; } },
});
export default mongoose.model("User", userSchema);
