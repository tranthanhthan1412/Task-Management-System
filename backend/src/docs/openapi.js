const ref = name => ({ $ref: `#/components/schemas/${name}` });
const json = schema => ({ "application/json": { schema } });
const response = (description, schema) => ({ description, content: json(schema) });
const body = (schema, example) => ({ required: true, content: { "application/json": { schema, ...(example ? { example } : {}) } } });
const error = description => response(description, ref("Error"));
const writeHeader = { name: "X-Requested-With", in: "header", required: true, schema: { type: "string", enum: ["XMLHttpRequest"] } };
const id = { name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } };
const filter = { name: "filter", in: "query", description: "Khoảng ngày tạo task, theo múi giờ server.", schema: { type: "string", enum: ["all", "today", "week", "month"], default: "all" } };
const taskFields = {
  title: { type: "string", minLength: 1, maxLength: 200, description: "Không được chỉ chứa khoảng trắng.", example: "Hoàn thiện tài liệu API" },
  description: { type: "string", maxLength: 5000, default: "" },
  status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"], default: "TODO" },
  priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
  dueDate: { type: "string", nullable: true, description: "Ngày YYYY-MM-DD hoặc ISO datetime có múi giờ. null để xóa hạn.", example: "2027-02-28T17:30:00+07:00" },
};
const taskResponse = response("Task thuộc tài khoản đang đăng nhập", ref("Task"));
const protectedErrors = { 401: error("Chưa đăng nhập hoặc phiên hết hạn"), 500: error("Lỗi hệ thống") };
const writeErrors = { ...protectedErrors, 400: error("Dữ liệu không hợp lệ"), 403: error("Origin hoặc header bảo vệ request không hợp lệ"), 413: error("Body vượt 1 MB") };
const update = {
  tags: ["Tasks"], summary: "Cập nhật một phần task", parameters: [id, writeHeader],
  description: "PUT cũng cập nhật một phần như PATCH. Chỉ nhận các trường chỉnh sửa; không cho đổi chủ. DONE tự đặt completedAt, mở lại sẽ xóa completedAt.",
  requestBody: body(ref("TaskUpdate"), { status: "IN_PROGRESS", priority: "HIGH" }),
  responses: { 200: taskResponse, ...writeErrors, 404: error("Task không tồn tại hoặc thuộc tài khoản khác"), 409: error("Task vừa được cập nhật đồng thời") },
};

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "TaskPilot API", version: "1.0.0",
    description: "API quản lý công việc cá nhân.\n\n1. Dùng **Try it out → Execute** tại `/auth/register` hoặc `/auth/login` trước; trình duyệt tự lưu cookie HttpOnly. Không nhập JWT vào Authorize.\n2. Gọi API Tasks; Swagger tự thêm `X-Requested-With` cho request.\n3. Gọi `/auth/logout` để thu hồi phiên.\n\nMọi task và thống kê đều giới hạn theo tài khoản. Các thao tác thử gọi API sẽ thay đổi dữ liệu của tài khoản đang đăng nhập.\n\n[Tải đặc tả OpenAPI JSON](/api/openapi.json)",
  },
  servers: [{ url: "/api", description: "API trên cùng server" }],
  tags: [{ name: "Health" }, { name: "Auth" }, { name: "Tasks" }],
  security: [{ sessionCookie: [] }],
  paths: {
    "/health": { get: { tags: ["Health"], summary: "Kiểm tra API và kết nối MongoDB", security: [], responses: { 200: response("API và database sẵn sàng", ref("Message")), 503: error("Database chưa sẵn sàng hoặc không phản hồi") } } },
    "/auth/register": { post: {
      tags: ["Auth"], summary: "Đăng ký và tạo phiên đăng nhập", security: [], parameters: [writeHeader],
      requestBody: body(ref("Registration")), responses: { 201: response("Đã tạo tài khoản và cookie phiên", ref("AuthResult")),
        400: error("Tên, email hoặc mật khẩu không hợp lệ"), 403: writeErrors[403], 409: error("Email đã được sử dụng"), 429: error("Giới hạn 30 lần đăng ký/đăng nhập mỗi IP trong 15 phút") },
    } },
    "/auth/login": { post: {
      tags: ["Auth"], summary: "Đăng nhập", security: [], parameters: [writeHeader], requestBody: body(ref("Credentials")),
      responses: { 200: response("Đã tạo cookie phiên", ref("AuthResult")), 400: writeErrors[400], 401: error("Email hoặc mật khẩu không đúng"), 403: writeErrors[403], 429: error("Quá nhiều lần thử") },
    } },
    "/auth/logout": { post: { tags: ["Auth"], summary: "Thu hồi phiên và xóa cookie", security: [], parameters: [writeHeader], responses: { 200: response("Đã đăng xuất; cũng thành công nếu không có phiên", ref("Message")), 403: writeErrors[403] } } },
    "/auth/me": { get: { tags: ["Auth"], summary: "Tài khoản hiện tại", responses: { 200: response("Thông tin công khai, không có passwordHash", ref("AuthResult")), ...protectedErrors } } },
    "/tasks": {
      get: {
        tags: ["Tasks"], summary: "Danh sách task, tìm kiếm và lọc",
        description: "Danh sách phân trang ở server; trang vượt giới hạn được đưa về trang cuối. Kanban trả toàn bộ task phù hợp và pagination=null. page/limit nếu gửi vẫn phải hợp lệ nhưng không chia trang Kanban. counts tính trên toàn bộ kết quả lọc. Sắp xếp createdAt giảm dần rồi _id giảm dần.",
        parameters: [filter,
          { name: "search", in: "query", schema: { type: "string" }, description: "Tìm chuỗi trong tiêu đề, không phân biệt hoa thường; ký tự regex được coi là chữ." },
          ...["status", "priority"].map(name => ({ name, in: "query", schema: { type: "string", enum: taskFields[name].enum } })),
          { name: "view", in: "query", schema: { type: "string", enum: ["list", "kanban"], default: "list" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, maximum: 1000000, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 6 } },
        ], responses: { 200: response("Task và thống kê theo bộ lọc", ref("TaskList")), ...protectedErrors, 400: writeErrors[400] },
      },
      post: { tags: ["Tasks"], summary: "Tạo task", parameters: [writeHeader], requestBody: body(ref("TaskCreate")), responses: { 201: taskResponse, ...writeErrors } },
    },
    "/tasks/summary": { get: { tags: ["Tasks"], summary: "Dashboard và hạn hoàn thành", parameters: [filter],
      description: "Độc lập với trang, từ khóa và lọc trạng thái/ưu tiên. Hai nhóm upcoming và overdue riêng, mỗi nhóm tối đa 5 task chưa DONE theo dueDate tăng dần; tổng đếm không giới hạn 5. Không có hạn không thuộc nhóm nào.",
      responses: { 200: response("Thống kê trong khoảng ngày tạo đang chọn", ref("Summary")), ...protectedErrors, 400: writeErrors[400] },
    } },
    "/tasks/{id}": {
      get: { tags: ["Tasks"], summary: "Xem task", parameters: [id], responses: { 200: taskResponse, ...protectedErrors, 400: writeErrors[400], 404: error("Task không tồn tại hoặc thuộc tài khoản khác") } },
      patch: { ...update, operationId: "patchTask" }, put: { ...update, operationId: "putTask" },
      delete: { tags: ["Tasks"], summary: "Xóa task", parameters: [id, writeHeader], responses: { 200: response("Task vừa xóa", ref("Task")), ...writeErrors, 404: error("Task không tồn tại hoặc thuộc tài khoản khác") } },
    },
  },
  components: {
    securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: "taskpilot_session", description: "Cookie HttpOnly được tạo khi đăng nhập/đăng ký; trình duyệt tự gửi." } },
    schemas: {
      Error: { type: "object", required: ["success", "message"], properties: { success: { type: "boolean", enum: [false] }, message: { type: "string" } } },
      Message: { type: "object", required: ["success", "message"], properties: { success: { type: "boolean" }, message: { type: "string" } } },
      Credentials: { type: "object", required: ["email", "password"], properties: {
        email: { type: "string", format: "email", maxLength: 254, example: "demo@example.com" },
        password: { type: "string", format: "password", minLength: 8, description: "Tối đa 72 byte UTF-8, không phải 72 ký tự.", example: "Example-password-2026" },
      } },
      Registration: { allOf: [ref("Credentials"), { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 1, maxLength: 100, example: "Người dùng demo" } } }] },
      User: { type: "object", required: ["_id", "name", "email"], properties: {
        _id: { type: "string" }, name: { type: "string" }, email: { type: "string", format: "email" },
        createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
      } },
      AuthResult: { type: "object", required: ["success", "user"], properties: { success: { type: "boolean" }, user: ref("User") } },
      TaskCreate: { type: "object", required: ["title"], properties: taskFields },
      TaskUpdate: {
        type: "object", properties: taskFields,
        anyOf: Object.keys(taskFields).map(field => ({ required: [field] })),
        description: "Phải có ít nhất một trường chỉnh sửa. Trường khác như userId/createdAt được bỏ qua, không thay đổi quyền sở hữu.",
      },
      Task: { type: "object", required: ["_id", "userId", "title", "status", "priority"], properties: {
        ...taskFields, dueDate: { type: "string", format: "date-time", nullable: true },
        _id: { type: "string" }, userId: { type: "string", readOnly: true },
        completedAt: { type: "string", format: "date-time", nullable: true, readOnly: true },
        createdAt: { type: "string", format: "date-time", readOnly: true }, updatedAt: { type: "string", format: "date-time", readOnly: true },
      } },
      Counts: { type: "object", required: ["total", "TODO", "IN_PROGRESS", "DONE"], properties: Object.fromEntries(["total", "TODO", "IN_PROGRESS", "DONE"].map(key => [key, { type: "integer", minimum: 0 }])) },
      Pagination: { type: "object", nullable: true, required: ["page", "limit", "total", "totalPages"], properties: {
        page: { type: "integer", minimum: 1 }, limit: { type: "integer", minimum: 1 }, total: { type: "integer", minimum: 0 }, totalPages: { type: "integer", minimum: 1 },
      } },
      TaskList: { type: "object", required: ["tasks", "counts", "pagination"], properties: { tasks: { type: "array", items: ref("Task") }, counts: ref("Counts"), pagination: ref("Pagination") } },
      Summary: { type: "object", required: ["counts", "upcoming", "overdue", "upcomingCount", "overdueCount"], properties: {
        counts: ref("Counts"), upcoming: { type: "array", maxItems: 5, items: ref("Task") }, overdue: { type: "array", maxItems: 5, items: ref("Task") },
        upcomingCount: { type: "integer", minimum: 0 }, overdueCount: { type: "integer", minimum: 0 },
      } },
    },
  },
};
