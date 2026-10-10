# TaskPilot

Ứng dụng quản lý công việc cá nhân, xây dựng trên project MERN hiện có.

## Tính năng

- Đổi tên giao diện, tiêu đề trình duyệt và package thành TaskPilot.
- Đăng ký, đăng nhập, đăng xuất và xem tài khoản hiện tại.
- Mật khẩu hash bằng bcrypt (cost 12), không trả passwordHash trong API.
- JWT trong cookie HttpOnly, SameSite=Lax, Secure ở production; không lưu token vào localStorage.
- Phiên được lưu trong MongoDB và kiểm tra khi truy cập API. Logout thu hồi phiên hiện tại; cookie JWT đã sao chép không thể dùng lại.
- Bảo vệ route frontend và toàn bộ API task; danh sách, số lượng, đọc/sửa/xóa đều giới hạn theo người dùng.
- CRUD task đầy đủ: title, description, status (TODO/IN_PROGRESS/DONE), priority (LOW/MEDIUM/HIGH), dueDate.
- DONE tự đặt completedAt; mở lại xóa completedAt. Cập nhật đồng thời trả 409.
- Danh sách task phân trang ở server, tìm kiếm theo tiêu đề, lọc theo trạng thái/ưu tiên/khoảng ngày tạo.
- Kanban có ba cột, kéo thả bằng chuột hoặc bàn phím (Space → mũi tên → Space, Escape để hủy). Lưu trạng thái vào database, khôi phục vị trí cũ khi request thất bại. Kanban trả toàn bộ task phù hợp, bỏ qua phân trang.
- Dashboard tổng hợp: counts theo trạng thái, task sắp đến hạn và quá hạn (tối đa 5 mỗi nhóm).
- Migration quyền sở hữu có backup, có lịch sử, có thể chạy lại.
- Integration test backend, kiểm tra bản production và E2E trình duyệt (chi tiết bên dưới).
- Swagger UI tích hợp, đặc tả OpenAPI 3.0 đầy đủ, Try it out hỗ trợ cookie và header bảo vệ.
- Docker Compose local với MongoDB 8.0, healthcheck và volume persistent.
- GitHub Actions CI: lint, integration test, xác thực OpenAPI, build frontend, E2E, Docker smoke test.
- Cấu hình Render Blueprint cho demo HTTPS cùng MongoDB Atlas; cần push repo và tạo service để có URL demo.

## Công nghệ và cấu trúc

React, Vite, Tailwind CSS, Axios; Node.js, Express, MongoDB/Mongoose, bcrypt, JWT, swagger-ui-express.
JavaScript/JSX; không có TypeScript.

**Backend — `backend/src/`**

| Thư mục / file | Vai trò |
| --- | --- |
| `app.js` | Cấu hình Express, middleware, route, lỗi |
| `server.js` | Kiểm tra bản build production, kết nối DB, khởi tạo index, dừng HTTP/DB khi nhận SIGTERM/SIGINT |
| `config/env.js` | Đọc cấu hình, validate origin, cookie, cổng và JWT |
| `config/db.js` | Kết nối Mongoose |
| `models/` | User, Session, Task |
| `controllers/authController.js` | register, login, logout, me |
| `controllers/tasksControllers.js` | getAllTasks, getTaskSummary, getTask, createTask, updateTask, deleteTask |
| `routes/authRoutes.js` | Rate limit + auth endpoints |
| `routes/tasksRoutes.js` | requireAuth + task endpoints |
| `services/authService.js` | Hash, JWT, tạo/xác thực phiên |
| `services/migrateOwnership.js` | Migration quyền sở hữu task cũ |
| `services/migrateTaskFields.js` | Migration trường task từ schema cũ |
| `middleware/auth.js` | requireAuth — xác thực phiên từ cookie |
| `middleware/security.js` | protectWrites — CSRF/origin check; errorHandler |
| `validations/auth.js` | Validate đăng ký / đăng nhập |
| `validations/task.js` | Validate task body, query params, ObjectId |
| `docs/openapi.js` | Đặc tả OpenAPI 3.0 |
| `docs/router.js` | Swagger UI tại `/api/docs/`, JSON tại `/api/openapi.json` |
| `utils/http.js` | HttpError, asyncHandler |

**Frontend — `frontend/src/`**

| Thư mục / file | Vai trò |
| --- | --- |
| `context/AuthProvider.jsx` | Trạng thái đăng nhập, khôi phục phiên qua `/auth/me` |
| `components/ProtectedRoute.jsx` | Chặn route khi chưa đăng nhập |
| `lib/axios.js` | Cookie credentials, header bảo vệ request, xử lý 401 |
| `pages/AuthPage.jsx` | Form dùng chung cho `/login` và `/register` |
| `pages/HomePage.jsx` | Trang chính: danh sách, kanban, dashboard |
| `pages/NotFound.jsx` | Trang 404 |

**Cấu hình gốc**

| File | Vai trò |
| --- | --- |
| `Dockerfile` | Multi-stage: build frontend → prod deps → runtime (node:22-bookworm-slim) |
| `compose.yaml` | App + MongoDB 8.0, healthcheck, volume persistent |
| `.dockerignore` | Loại trừ node_modules, dist, .env, test, .git |
| `render.yaml` | Render Blueprint: build, start, env vars |
| `.github/workflows/ci.yml` | CI: job checks + job docker |
| `scripts/setup-docker.mjs` | Tạo `.env.docker` với JWT_SECRET ngẫu nhiên |
| `scripts/smoke-demo.mjs` | Smoke test end-to-end qua ứng dụng production |
| `backend/scripts/smoke-production.js` | Khởi chạy entrypoint production với MongoDB tạm để kiểm tra trước deploy |
| `backend/test/`, `frontend/e2e/` | Bộ test API và trình duyệt, cần giữ để CI chạy |

## Cài đặt và chạy

Yêu cầu Node.js 22.12+ (đã kiểm tra với Node 24), npm và MongoDB local hoặc Atlas.

Từ thư mục gốc TaskPilot:

~~~powershell
npm ci --prefix backend
npm ci --prefix frontend
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
~~~

Chỉ copy file mẫu khi chưa có `.env`; không ghi đè cấu hình local hiện có.
Điền `MONGODB_CONNECTIONSTRING` và tạo `JWT_SECRET` ngẫu nhiên:

~~~powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
~~~

Dán kết quả vào `JWT_SECRET` trong `backend/.env`. Không commit `.env`.

Terminal 1 — backend:

~~~powershell
npm run dev --prefix backend
~~~

Terminal 2 — frontend:

~~~powershell
npm run dev --prefix frontend
~~~

- Frontend: http://localhost:5173
- API: http://localhost:5001/api
- Swagger: http://localhost:5001/api/docs/

Server dùng `node --watch`, không cần nodemon.

## Biến môi trường

| Biến backend | Bắt buộc | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `NODE_ENV` | | `development` | `development`, `test` hoặc `production` |
| `PORT` | | `5001` | Cổng API |
| `CLIENT_URL` | | `http://localhost:5173` | Origin frontend, không có dấu `/` cuối |
| `MONGODB_CONNECTIONSTRING` | ✓ | — | URI MongoDB |
| `JWT_SECRET` | ✓ | — | Secret ngẫu nhiên tối thiểu 32 ký tự |
| `JWT_EXPIRES_IN` | | `7d` | Thời hạn phiên: `60s` đến `30d` |
| `COOKIE_SECURE` | | Theo `NODE_ENV` | `true`/`false`; mặc định `true` ở production |
| `TRUST_PROXY_HOPS` | | `0` | Số reverse proxy tin cậy (Render dùng `1`) |
| `API_PUBLIC_URL` | | Dev: `http://localhost:PORT`; production: `CLIENT_URL` | Origin backend được phép gửi request từ Swagger khi frontend khác origin |
| `RENDER_EXTERNAL_URL` | | — | Tự động từ Render, dùng làm fallback cho `CLIENT_URL` |
| `MIGRATION_USER_EMAIL` | | — | Email tài khoản nhận task cũ khi migration |
| `MIGRATION_USER_NAME` | | — | Tên dùng khi tạo tài khoản migration mới |
| `MIGRATION_USER_PASSWORD` | | — | Mật khẩu tài khoản migration mới; chỉ lưu local |

Biến frontend (trong `frontend/.env`):

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `VITE_API_URL` | Dev: `http://localhost:5001/api`; build: `/api` | Chỉ ghi đè khi cần API khác origin; Render/Docker để trống để dùng cùng origin |

Tất cả biến `VITE_` đều công khai trong bundle; không đặt secret vào frontend.

## API auth

| Method | Endpoint | Input / kết quả |
| --- | --- | --- |
| `POST` | `/api/auth/register` | `name`, `email`, `password` → HTTP 201, user + cookie phiên |
| `POST` | `/api/auth/login` | `email`, `password` → HTTP 200, user + cookie phiên |
| `POST` | `/api/auth/logout` | Thu hồi phiên, xóa cookie → HTTP 200 |
| `GET` | `/api/auth/me` | HTTP 200 + user, hoặc 401 |
| `GET` | `/api/health` | 200 khi API + MongoDB sẵn sàng; 503 khi DB chưa kết nối hoặc ping thất bại; không yêu cầu đăng nhập |

Đăng ký tự đăng nhập. Response user gồm `_id`, `name`, `email`, `createdAt`, `updatedAt`; không chứa `passwordHash`.
Email được trim/lowercase, có unique index. Tên 1–100 ký tự; mật khẩu tối thiểu 8 ký tự, tối đa 72 byte UTF-8.
Đăng ký trùng email → 409; thông tin đăng nhập sai → 401; validation lỗi → 400.
Register và login dùng chung giới hạn 30 request/IP trong 15 phút → 429.

## API task

Tất cả endpoint task yêu cầu đăng nhập. Mọi thao tác đọc/ghi/xóa đều lọc theo `userId` của phiên hiện tại.

### Danh sách, tìm kiếm và lọc

`GET /api/tasks`

| Query param | Giá trị | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `filter` | `all` / `today` / `week` / `month` | `all` | Lọc theo `createdAt` (múi giờ server) |
| `search` | chuỗi bất kỳ | — | Tìm trong `title`, không phân biệt hoa thường |
| `status` | `TODO` / `IN_PROGRESS` / `DONE` | — | Lọc theo trạng thái |
| `priority` | `LOW` / `MEDIUM` / `HIGH` | — | Lọc theo độ ưu tiên |
| `view` | `list` / `kanban` | `list` | `kanban` trả toàn bộ task phù hợp, bỏ phân trang |
| `page` | 1–1000000 | `1` | Trang hiện tại; trang vượt giới hạn tự giới hạn về trang cuối |
| `limit` | 1–100 | `6` | Task mỗi trang |

Response: `{ tasks, counts, pagination }`. `counts` tính trên toàn bộ kết quả lọc. Sắp xếp `createdAt` giảm dần rồi `_id` giảm dần.

### Các endpoint khác

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| `GET` | `/api/tasks/summary` | Dashboard: counts, upcoming/overdue (tối đa 5 mỗi nhóm), hỗ trợ `filter` |
| `GET` | `/api/tasks/:id` | Xem một task |
| `POST` | `/api/tasks` | Tạo task (`title` bắt buộc) |
| `PATCH` | `/api/tasks/:id` | Cập nhật một phần task |
| `PUT` | `/api/tasks/:id` | Cập nhật một phần (tương đương PATCH) |
| `DELETE` | `/api/tasks/:id` | Xóa task, trả về object task vừa xóa |

### Trường task

| Trường | Loại | Ràng buộc |
| --- | --- | --- |
| `title` | string | Bắt buộc khi tạo; 1–200 ký tự, không được chỉ chứa khoảng trắng |
| `description` | string | Tối đa 5000 ký tự; mặc định `""` |
| `status` | string | `TODO` / `IN_PROGRESS` / `DONE`; mặc định `TODO` |
| `priority` | string | `LOW` / `MEDIUM` / `HIGH`; mặc định `MEDIUM` |
| `dueDate` | string hoặc null | `YYYY-MM-DD` hoặc ISO datetime có múi giờ; `null` để xóa hạn |

`DONE` tự đặt `completedAt`; chuyển về trạng thái khác xóa `completedAt` (giữ giá trị cũ nếu đã là DONE).
Nếu hai request đọc cùng phiên bản `__v` trước khi ghi, request ghi sau trả 409. Cơ chế này không phát hiện bản chỉnh sửa cũ được client gửi sau khi request trước đã hoàn tất.
ID không đúng định dạng ObjectId → 400. Task không tồn tại hoặc thuộc tài khoản khác → 404.

### Bảo vệ request ghi

Mọi request `POST`, `PUT`, `PATCH`, `DELETE` phải có header `X-Requested-With: XMLHttpRequest`.
Frontend và Swagger UI tự thêm header này. Origin nếu có phải khớp `CLIENT_URL` (hoặc `API_PUBLIC_URL`).
Khi dùng curl/Postman: lưu cookie phiên và thêm header trên.

`userId` lấy từ phiên đã xác thực. `userId` client gửi không được dùng để cấp quyền hoặc đổi chủ.

## Swagger / OpenAPI

Chạy backend rồi mở http://localhost:5001/api/docs/

- Đặc tả JSON: http://localhost:5001/api/openapi.json
- Dùng **Try it out** ở `/auth/register` hoặc `/auth/login` trước. Cookie HttpOnly được trình duyệt lưu; Swagger tự thêm `X-Requested-With` cho request ghi.
- Không cần nhập JWT hay mật khẩu database vào Authorize. API không trả `passwordHash`.
- Khi backend và frontend khác origin, đặt `API_PUBLIC_URL` thành origin của backend để Swagger được phép ghi.

## Docker Compose (local)

Yêu cầu Docker Engine/Desktop với Compose v2 và Node.js 22.12+:

~~~powershell
npm run docker:up
~~~

Lệnh này tạo `.env.docker` với JWT_SECRET ngẫu nhiên nếu chưa có, sau đó build image, khởi động app + MongoDB và đợi healthcheck. Không dùng hay ghi đè `backend/.env` và database hiện tại.

| URL | Mục đích |
| --- | --- |
| http://localhost:3000 | Ứng dụng |
| http://localhost:3000/api/docs/ | Swagger UI |
| http://localhost:3000/api/health | Health check |

~~~powershell
npm run smoke:demo            # Tạo tài khoản test, kiểm tra CRUD rồi xóa task/logout
npm run docker:down           # Dừng container, giữ nguyên volume
~~~

Dữ liệu vẫn còn trong volume `mongo-data` sau khi dừng. Compose này dùng cho demo local: cổng app chỉ bind loopback, MongoDB không công bố cổng, cookie HTTP chỉ được phép trên localhost.

Nếu đổi `APP_PORT` trong `.env.docker`, đặt `SMOKE_BASE_URL` theo cổng đó trước khi chạy smoke test. Mỗi lần smoke test để lại một tài khoản test ngẫu nhiên trong database đang kiểm tra.

## Kiểm thử

~~~powershell
npm test                         # 15 test backend (MongoDB tạm)
npm run lint                     # ESLint frontend
npm run build --prefix frontend  # Build kiểm tra lỗi
npm run smoke:local              # Kiểm tra server production với MongoDB tạm, cần build trước
npm run test:e2e                 # 5 kịch bản E2E Playwright
# Hoặc chạy toàn bộ các bước trên:
npm run check
~~~

Integration test, E2E và `smoke:local` dùng `mongodb-memory-server`, không kết nối database thật. Lần đầu cần mạng để tải MongoDB binary.
E2E Windows mặc định dùng Edge đã cài (`msedge`); Linux/macOS/CI dùng Chromium. Backend test ở cổng 5002, frontend ở 5174; các cổng phải đang trống. `smoke:local` tự chọn cổng tạm, chạy `backend/src/server.js` với `NODE_ENV=production`, rồi tự dừng server/database.

Nếu không có Edge, cài Chromium và chọn channel trong PowerShell:

~~~powershell
npm exec --prefix frontend -- playwright install chromium
$env:PLAYWRIGHT_CHANNEL = "chromium"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_CHANNEL
~~~

Trên Linux/macOS: cài bằng `npm exec --prefix frontend -- playwright install --with-deps chromium`, sau đó chạy `npm run test:e2e`.

Test cover: đăng ký, email trùng, bcrypt, validation, login/logout, JWT sai/hết hạn, thu hồi phiên, CRUD theo chủ, chống userId giả, thống kê, CSRF, OpenAPI, healthcheck mất DB, xung đột cập nhật, backup/migration chạy lại; kéo thả chuột/bàn phím, rollback khi API lỗi, phân quyền trình duyệt, mobile 390px, thêm task bằng Enter, tìm kiếm/phân trang và Swagger Try it out.

Screenshot/trace nằm trong `frontend/test-results`, được gitignore.

Backend là JavaScript thuần nên không có bước compile. Kiểm tra cú pháp:

~~~powershell
Get-ChildItem backend/src,backend/scripts,backend/test -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
~~~

## CI — GitHub Actions

`.github/workflows/ci.yml` chạy khi push, pull request hoặc chạy thủ công. Hai job:

**`checks`**

1. Cài dependency theo lockfile
2. Lint frontend
3. Integration test backend + xác thực đặc tả OpenAPI
4. Build frontend
5. Chạy smoke test entrypoint production bằng MongoDB tạm
6. Cài Chromium, chạy E2E Playwright
7. Upload traces khi fail (giữ 7 ngày)

**`docker`**

1. Tạo `.env.docker`
2. Validate `compose.yaml`
3. Build và khởi động container, đợi healthcheck
4. Chạy `scripts/smoke-demo.mjs`
5. In log khi fail, dọn volume sau khi xong

Không cần secret GitHub để chạy CI.

## Deploy Render + MongoDB Atlas

`render.yaml` cấu hình một web service Node: Express phục vụ cả frontend đã build và API cùng origin. Render tự cấp JWT_SECRET; biến `MONGODB_CONNECTIONSTRING` phải được nhập qua dashboard khi tạo Blueprint.

### 1. Đưa code lên GitHub

Với bản tải về chưa có `.git`, tạo một repo GitHub rỗng (chưa tạo README/license trên GitHub). Chạy tại thư mục gốc, thay URL mẫu bằng repo của bạn:

~~~powershell
git init -b main
git add .
git diff --cached --stat
git status --short
git commit -m "Prepare TaskPilot demo with tests and deployment configuration"
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
git push -u origin main
~~~

Kiểm tra danh sách staged trước commit: `.env`, `.env.docker`, `node_modules`, `dist`, kết quả test không được có trong đó. Giữ cả hai `package-lock.json`, thư mục test, `Dockerfile`, `compose.yaml` và `.github/workflows/ci.yml`.
Nếu dùng repo đã có lịch sử thì clone repo đó và đưa thay đổi vào nhánh phù hợp; không dùng `push --force`.

Trong tab **Actions**, chờ cả `checks` và `docker` thành công trước lần deploy đầu. Workflow chỉ thực sự chạy sau khi push lên GitHub có bật Actions.

### 2. Chuẩn bị database và tạo service

1. Tạo cluster/database demo trên Atlas và database user có quyền đọc/ghi database đó. Lấy connection string trong **Connect → Drivers**, điền database name (ví dụ `taskpilot_demo`); URL-encode ký tự đặc biệt trong mật khẩu.
2. Vào Render → **New → Blueprint**, kết nối repo và nhánh chứa `render.yaml`; thư mục gốc service là thư mục chứa file này.
3. Điền `MONGODB_CONNECTIONSTRING` trong mục secret. Blueprint đã đặt `NODE_ENV=production`, `COOKIE_SECURE=true`, `TRUST_PROXY_HOPS=1` và tự tạo `JWT_SECRET`. Không đưa connection string vào code/chat/README.
4. Thêm các dải IP outbound của service Render vào Atlas **Network Access**. Nếu lần khởi động đầu thất bại khi chưa mở IP, cập nhật allowlist rồi deploy lại.
5. Chờ service healthy; kiểm tra bằng bước 3 bên dưới rồi mới ghi URL thật vào phần **Trạng thái bàn giao**.

Không cần đặt `CLIENT_URL` cho domain mặc định của Render: app lấy `RENDER_EXTERNAL_URL`.
Nếu dùng custom domain: đặt `CLIENT_URL` thành HTTPS origin đó, không có dấu `/` cuối.
`TRUST_PROXY_HOPS=1` cho reverse proxy của Render.
Không đặt `VITE_API_URL` trỏ localhost trên Render. Để trống để frontend dùng `/api` cùng origin; không copy `backend/.env` lên host.
`autoDeployTrigger: checksPass` cấu hình các lần tự động deploy tiếp theo đợi CI thành công. Xem [Render Blueprint](https://render.com/docs/blueprint-spec) và [CI checks trước deploy](https://render.com/docs/deploys#automatic-deploys).

### 3. Xác minh bản demo

Mở URL Render, đăng ký/đăng nhập, tạo/sửa task, kéo qua cả ba trạng thái, reload kiểm tra dữ liệu và đăng xuất. Mở `/api/docs/` để kiểm tra Swagger. `/api/health` phải trả 200.

Smoke test tự động (dùng database demo vì lệnh tạo tài khoản test):

~~~powershell
$env:SMOKE_BASE_URL = "https://YOUR_SERVICE.onrender.com"
npm run smoke:demo
Remove-Item Env:SMOKE_BASE_URL
~~~

Script kiểm tra HTML/bundle, route `/tasks`, health, Swagger, đăng ký/đăng nhập, CRUD, thống kê và thu hồi phiên. Task được xóa sau khi kiểm tra; tài khoản test vẫn còn.

Khi cần quay lại phiên bản cũ, chọn một deploy đã thành công trong Render và rollback; không xóa database. Xem [hướng dẫn deploy/rollback của Render](https://render.com/docs/deploys).

## Seed dữ liệu mẫu

Script tạo một tài khoản demo và 15 task mẫu phân bố đều ba trạng thái, đa dạng về priority và dueDate (quá hạn, hôm nay, tương lai, không có hạn).

~~~powershell
npm run seed --prefix backend
~~~

Thông tin đăng nhập sau khi seed:

| Trường   | Giá trị              |
| -------- | -------------------- |
| Email    | demo@taskpilot.dev   |
| Password | Demo@12345           |

Chạy lại seed an toàn: task cũ của tài khoản demo bị xóa trước khi tạo lại; tài khoản không bị trùng lặp.

~~~powershell
npm run seed:clear --prefix backend   # Xóa tài khoản demo và toàn bộ task mẫu
~~~

Không seed lên database production. Tài khoản demo dùng mật khẩu cố định, chỉ phù hợp cho môi trường development/demo local.

Task thiếu `userId` không hiện cho user nào trước khi migration.
Database mới không cần migration. Với dữ liệu cũ, backup database và dừng API ghi trước khi chạy; dùng đúng cấu hình của database cần chuyển đổi.
Điền `MIGRATION_USER_EMAIL` trong `backend/.env`. Nếu tài khoản chưa tồn tại, thêm `MIGRATION_USER_NAME` và `MIGRATION_USER_PASSWORD`.

~~~powershell
npm run migrate:ownership --prefix backend   # Gán task cũ cho tài khoản được chỉ định
npm run migrate:tasks --prefix backend       # Migration trường task từ schema cũ
~~~

Migration quyền sở hữu backup vào `migration_task_backups`; migration schema backup vào `migration_task_fields_backups`. Lịch sử ở `migrations`; chạy lại không đổi chủ hay ghi đè bản backup cũ.
Không tự gán task cho người đầu tiên đăng ký.

## Trạng thái bàn giao

### Chức năng đã hoàn thành

| Chức năng | Chi tiết |
| --- | --- |
| Xác thực người dùng | Đăng ký, đăng nhập, đăng xuất; JWT trong cookie HttpOnly, SameSite=Lax; phiên lưu MongoDB |
| Bảo mật | bcrypt cost 12, CSRF header check, rate limit 30 req/15 phút, helmet, CORS cấu hình |
| CRUD task | Tạo, đọc, cập nhật (PATCH/PUT), xóa; đầy đủ title/description/status/priority/dueDate |
| Kanban + kéo thả | Ba cột TODO/IN\_PROGRESS/DONE; kéo chuột và bàn phím; rollback khi API thất bại |
| Phân trang server-side | Phân trang, tìm kiếm tiêu đề, lọc trạng thái/ưu tiên/khoảng ngày tạo |
| Dashboard | Counts theo trạng thái, task sắp đến hạn và quá hạn (tối đa 5 mỗi nhóm) |
| Swagger / OpenAPI | Đặc tả OpenAPI 3.0 đầy đủ, Try it out hỗ trợ cookie; JSON tại `/api/openapi.json` |
| Integration test | 8 test suite, 15 assertion nhóm; MongoDB in-memory; bao phủ auth, CRUD, CSRF, phân quyền |
| E2E test | 5 kịch bản Playwright: kéo thả, rollback, phân quyền, mobile 390px, tìm kiếm/phân trang |
| Docker Compose | App + MongoDB 8.0, healthcheck, volume persistent, image multi-stage |
| CI GitHub Actions | Lint → backend test → build → smoke → E2E → Docker validate; upload trace khi fail |
| Seed dữ liệu mẫu | `npm run seed --prefix backend`; 1 user demo + 15 tasks đủ trạng thái/priority/dueDate |
| Migration dữ liệu cũ | `migrate:ownership` và `migrate:tasks`; có backup, có lịch sử, chạy lại an toàn |
| Cấu hình deploy | `render.yaml` Blueprint cho Render; auto-deploy khi CI xanh |

### Chức năng chưa hoàn thành

| Chức năng | Lý do / ghi chú |
| --- | --- |
| URL demo được xác minh | Deploy Render chưa thành công (lỗi `MongooseServerSelectionError` — cần whitelist IP Atlas) |
| Biểu đồ thống kê | Không có chart tiến độ theo tuần/tháng; dashboard chỉ có số đếm và danh sách |
| Nhãn / tag task | Không có hệ thống nhãn; lọc chỉ theo status/priority/date |
| Thông báo / nhắc nhở | Không có push notification, email reminder hay in-app alert khi task sắp đến hạn |
| Tìm kiếm nâng cao | Chỉ tìm theo tiêu đề; không hỗ trợ tìm theo mô tả, dueDate hoặc full-text search |
| Chia sẻ / cộng tác | Mỗi task thuộc một user; không có workspace chung hay phân công task cho người khác |
| TypeScript | Toàn bộ backend và frontend dùng JavaScript; không có type safety tĩnh |
| Refresh token | Phiên hết hạn sau `JWT_EXPIRES_IN`; không có silent refresh — cần đăng nhập lại |
| Phân trang Kanban | Kanban trả toàn bộ task phù hợp; có thể chậm khi dữ liệu rất lớn |
| Video demo | Chưa có file video; cần quay và đính kèm link (Loom hoặc YouTube) |

### Kiểm tra local (10/10/2026, Windows, Node.js 24.19.0)

- Lint, build frontend, 15 test backend, 5 E2E trên Edge và smoke production với MongoDB tạm đều pass.
- Manifest khớp lockfile; các import frontend đều trỏ tới file còn tồn tại.
- CI trên GitHub chưa được xác minh ở lần rà soát này (code local chưa push).
- Docker cần được xác minh trên máy có Docker Engine hoặc qua job `docker` trong CI.


## Tài liệu tham khảo

- [Express cookie API](https://expressjs.com/en/4x/api.html#res.cookie)
- [bcrypt và giới hạn 72 byte](https://www.npmjs.com/package/bcrypt)
- [MongoDB reference consistency](https://www.mongodb.com/docs/manual/data-modeling/data-consistency/)
- [Swagger UI configuration](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/)
- [Docker Compose healthchecks](https://docs.docker.com/compose/how-tos/startup-order/)
- [Playwright CI](https://playwright.dev/docs/ci)
- [Render Blueprint](https://render.com/docs/blueprint-spec)
- [Render environment variables](https://render.com/docs/environment-variables)
