/**
 * Seed script — tạo dữ liệu mẫu cho môi trường development/demo.
 *
 * Chạy:
 *   npm run seed --prefix backend
 *
 * Yêu cầu: backend/.env có MONGODB_CONNECTIONSTRING hợp lệ.
 * Nếu email demo đã tồn tại, tài khoản được tái sử dụng và
 * các task cũ của tài khoản đó sẽ bị xóa trước khi tạo lại.
 * Chạy lại seed sẽ không tạo user trùng.
 *
 * Xóa toàn bộ dữ liệu seed:
 *   npm run seed:clear --prefix backend
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const SEED_EMAIL = "demo@taskpilot.dev";
const SEED_PASSWORD = "Demo@12345";
const SEED_NAME = "Demo User";

// ── models (inline để script độc lập) ────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);
const User = mongoose.models.User || mongoose.model("User", userSchema);

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 5000 },
    status: { type: String, enum: ["TODO", "IN_PROGRESS", "DONE"], default: "TODO" },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

// ── helpers ───────────────────────────────────────────────────────────────────

const days = (n) => new Date(Date.now() + n * 86_400_000);

// ── seed data ─────────────────────────────────────────────────────────────────

const TASKS = [
  // TODO
  {
    title: "Thiết kế wireframe trang chủ",
    description: "Phác thảo layout, xác định các thành phần UI cần xây dựng.",
    status: "TODO",
    priority: "HIGH",
    dueDate: days(3),
  },
  {
    title: "Viết unit test cho AuthService",
    description: "Bao phủ register, login, logout và edge case token hết hạn.",
    status: "TODO",
    priority: "HIGH",
    dueDate: days(5),
  },
  {
    title: "Cập nhật README hướng dẫn deploy",
    description: "Bổ sung bước cấu hình MongoDB Atlas và biến môi trường Render.",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: days(7),
  },
  {
    title: "Tối ưu query pagination MongoDB",
    description: "Dùng cursor-based pagination thay offset để tránh skip lớn.",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: null,
  },
  {
    title: "Nghiên cứu thư viện biểu đồ",
    description: "So sánh Recharts, Chart.js và Victory để chọn cho dashboard.",
    status: "TODO",
    priority: "LOW",
    dueDate: null,
  },
  // IN_PROGRESS
  {
    title: "Xây dựng Kanban board drag & drop",
    description: "Dùng @dnd-kit/core, hỗ trợ cả chuột và bàn phím. Lưu trạng thái vào DB sau mỗi lần thả.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: days(1),
  },
  {
    title: "Tích hợp Swagger UI",
    description: "Đặc tả OpenAPI 3.0, Try it out hỗ trợ cookie session và header CSRF.",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    dueDate: days(2),
  },
  {
    title: "Thiết lập GitHub Actions CI",
    description: "Pipeline chạy lint, test backend, build frontend, E2E Playwright và Docker smoke test.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: days(0),
  },
  {
    title: "Cấu hình Docker Compose",
    description: "App + MongoDB 8.0 với healthcheck và volume persistent. Không dùng root.",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    dueDate: days(-1),
  },
  {
    title: "Review Pull Request #12 — refactor task controller",
    description: "Kiểm tra logic phân quyền, validation và error handling trước khi merge.",
    status: "IN_PROGRESS",
    priority: "LOW",
    dueDate: days(4),
  },
  // DONE
  {
    title: "Triển khai xác thực JWT + cookie HttpOnly",
    description: "Cookie SameSite=Lax, Secure ở production. Phiên lưu MongoDB, logout thu hồi phiên.",
    status: "DONE",
    priority: "HIGH",
    dueDate: days(-10),
    completedAt: days(-9),
  },
  {
    title: "Xây dựng CRUD task đầy đủ",
    description: "title, description, status, priority, dueDate. DONE tự đặt completedAt.",
    status: "DONE",
    priority: "HIGH",
    dueDate: days(-7),
    completedAt: days(-6),
  },
  {
    title: "Tích hợp integration test với MongoMemoryServer",
    description: "15 test case bao phủ auth, CRUD, phân quyền, pagination, CSRF.",
    status: "DONE",
    priority: "MEDIUM",
    dueDate: days(-5),
    completedAt: days(-4),
  },
  {
    title: "Phân trang server-side và bộ lọc task",
    description: "Lọc theo trạng thái, ưu tiên, khoảng ngày tạo; tìm kiếm tiêu đề không phân biệt hoa thường.",
    status: "DONE",
    priority: "MEDIUM",
    dueDate: days(-3),
    completedAt: days(-2),
  },
  {
    title: "Dashboard: upcoming và overdue tasks",
    description: "Tối đa 5 task mỗi nhóm, tổng đếm không giới hạn 5. Lọc theo khoảng ngày tạo.",
    status: "DONE",
    priority: "LOW",
    dueDate: days(-2),
    completedAt: days(-1),
  },
];

// ── main ──────────────────────────────────────────────────────────────────────

async function seed() {
  const uri = process.env.MONGODB_CONNECTIONSTRING;
  if (!uri) {
    console.error("❌  MONGODB_CONNECTIONSTRING chưa được đặt trong backend/.env");
    process.exit(1);
  }

  console.log("🔌 Đang kết nối MongoDB…");
  await mongoose.connect(uri);
  console.log("✅ Đã kết nối:", uri.replace(/:\/\/[^@]+@/, "://<credentials>@"));

  let user = await User.findOne({ email: SEED_EMAIL });
  if (user) {
    console.log(`👤 Tài khoản demo đã tồn tại: ${SEED_EMAIL}`);
    const deleted = await Task.deleteMany({ userId: user._id });
    console.log(`🗑  Đã xóa ${deleted.deletedCount} task cũ của tài khoản demo`);
  } else {
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
    user = await User.create({ name: SEED_NAME, email: SEED_EMAIL, passwordHash });
    console.log(`👤 Đã tạo tài khoản demo: ${SEED_EMAIL}`);
  }

  const docs = TASKS.map((t) => ({ ...t, userId: user._id }));
  await Task.insertMany(docs);

  const counts = TASKS.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
  console.log(`\n🌱 Đã tạo ${TASKS.length} tasks mẫu:`);
  console.log(`   TODO        : ${counts.TODO}`);
  console.log(`   IN_PROGRESS : ${counts.IN_PROGRESS}`);
  console.log(`   DONE        : ${counts.DONE}`);

  console.log("\n📋 Thông tin đăng nhập demo:");
  console.log(`   Email   : ${SEED_EMAIL}`);
  console.log(`   Password: ${SEED_PASSWORD}`);
  console.log("\n🚀 Mở http://localhost:5173 và đăng nhập để xem dữ liệu mẫu.");

  await mongoose.disconnect();
}

async function clear() {
  const uri = process.env.MONGODB_CONNECTIONSTRING;
  if (!uri) {
    console.error("❌  MONGODB_CONNECTIONSTRING chưa được đặt trong backend/.env");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const user = await User.findOne({ email: SEED_EMAIL });
  if (!user) {
    console.log("ℹ️  Không tìm thấy tài khoản demo, không có gì để xóa.");
  } else {
    const deleted = await Task.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
    console.log(`🗑  Đã xóa tài khoản demo và ${deleted.deletedCount} tasks.`);
  }
  await mongoose.disconnect();
}

const command = process.argv[2];
if (command === "clear") {
  clear().catch((err) => { console.error(err); process.exit(1); });
} else {
  seed().catch((err) => { console.error(err); process.exit(1); });
}
