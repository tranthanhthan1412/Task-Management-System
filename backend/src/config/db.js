import mongoose from "mongoose";

export const connectDB = async () => {
  if (!process.env.MONGODB_CONNECTIONSTRING) {
    throw new Error("Thiếu biến môi trường MONGODB_CONNECTIONSTRING");
  }
  await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING, { serverSelectionTimeoutMS: 10000 });
  console.log("Liên kết CSDL thành công!");
};
