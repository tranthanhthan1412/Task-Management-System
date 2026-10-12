import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";

const api = "http://localhost:5002/api";
const writeHeaders = { "X-Requested-With": "XMLHttpRequest" };

async function register(page) {
  const credentials = { email: `${randomUUID()}@example.com`, password: randomUUID() };
  await page.goto("/register");
  await page.getByLabel("Họ tên", { exact: true }).fill("Browser test");
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
  await expect(page.getByLabel("Nội dung nhiệm vụ mới")).toBeEnabled();
  return credentials;
}

async function createTask(page, title) {
  await page.getByLabel("Nội dung nhiệm vụ mới").fill(title);
  const response = page.waitForResponse(res => res.url() === `${api}/tasks` && res.request().method() === "POST");
  await page.getByRole("button", { name: "Thêm", exact: true }).click();
  const created = await response;
  expect(created.status()).toBe(201);
  const task = await created.json();
  await expect(page.getByTestId(`task-${task._id}`)).toBeVisible();
  await expect(page.getByLabel("Nội dung nhiệm vụ mới")).toBeEnabled();
  return task;
}

test("dragging a task between Kanban columns persists after reload", async ({ page }) => {
  await register(page);
  const task = await createTask(page, "Move between columns");
  const handle = page.getByRole("button", { name: `Kéo ${task.title}`, exact: true });
  const source = await handle.boundingBox();
  const target = await page.getByTestId("column-IN_PROGRESS").boundingBox();
  expect(source).not.toBeNull();
  expect(target).not.toBeNull();
  const saved = page.waitForResponse(res => res.url() === `${api}/tasks/${task._id}` && res.request().method() === "PATCH");
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2 + 12, source.y + source.height / 2, { steps: 3 });
  await page.mouse.move(target.x + target.width / 2, target.y + 90, { steps: 15 });
  await page.mouse.up();
  expect((await saved).status()).toBe(200);
  await expect(page.getByTestId("column-IN_PROGRESS").getByTestId(`task-${task._id}`)).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("column-IN_PROGRESS").getByTestId(`task-${task._id}`)).toBeVisible();
});

test("a failed status update rolls back the optimistic move and can be retried", async ({ page }) => {
  await register(page);
  const task = await createTask(page, "Retry a failed update");
  let releaseResponse;
  const responseGate = new Promise(resolve => { releaseResponse = resolve; });
  await page.route(`${api}/tasks/${task._id}`, async route => {
    if (route.request().method() !== "PATCH") return route.continue();
    await responseGate;
    await route.fulfill({ status: 500, json: { message: "Simulated update failure" } });
  });
  try {
    await page.getByLabel(`Trạng thái của ${task.title}`, { exact: true }).selectOption("DONE");
    await expect(page.getByTestId("column-DONE").getByTestId(`task-${task._id}`)).toBeVisible();
    await expect(page.getByLabel(`Trạng thái của ${task.title}`, { exact: true })).toBeDisabled();
  } finally {
    releaseResponse();
  }
  await expect(page.getByText("Simulated update failure", { exact: true })).toBeVisible();
  await expect(page.getByTestId("column-TODO").getByTestId(`task-${task._id}`)).toBeVisible();
  await expect(page.getByLabel(`Trạng thái của ${task.title}`, { exact: true })).toBeEnabled();
  await page.unroute(`${api}/tasks/${task._id}`);
  await page.reload();
  await expect(page.getByTestId("column-TODO").getByTestId(`task-${task._id}`)).toBeVisible();
  await page.getByLabel(`Trạng thái của ${task.title}`, { exact: true }).selectOption("DONE");
  await expect(page.getByLabel(`Trạng thái của ${task.title}`, { exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByTestId("column-DONE").getByTestId(`task-${task._id}`)).toBeVisible();
});

test("logout protects the workspace and another account cannot access private tasks", async ({ page }) => {
  const owner = await register(page);
  const task = await createTask(page, "Owner's private task");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get(`${api}/tasks`)).status()).toBe(401);

  await register(page);
  await expect(page.getByTestId(`task-${task._id}`)).toHaveCount(0);
  expect((await page.request.get(`${api}/tasks/${task._id}`)).status()).toBe(404);
  expect((await page.request.patch(`${api}/tasks/${task._id}`, {
    headers: writeHeaders, data: { title: "Unauthorized edit" },
  })).status()).toBe(404);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(owner.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(owner.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByTestId(`task-${task._id}`).getByRole("heading", { name: task.title, exact: true })).toBeVisible();
});

test("a 390px mobile viewport supports creating, editing and deleting a task", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page);
  await page.getByRole("button", { name: "Tạo chi tiết", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tiêu đề", { exact: true }).fill("Mobile task");
  await dialog.getByLabel("Mô tả", { exact: true }).fill("Created on a narrow screen");
  await dialog.getByLabel("Độ ưu tiên", { exact: true }).selectOption("HIGH");
  await dialog.getByRole("button", { name: "Tạo công việc", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Sửa Mobile task", exact: true }).click();
  await dialog.getByLabel("Tiêu đề", { exact: true }).fill("Updated mobile task");
  await dialog.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByLabel("Trạng thái của Updated mobile task", { exact: true }).selectOption("DONE");
  await expect(page.getByLabel("Trạng thái của Updated mobile task", { exact: true })).toBeEnabled();
  await expect(page.getByTestId("column-DONE").getByRole("heading", { name: "Updated mobile task", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Xóa Updated mobile task", exact: true }).click();
  await dialog.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Updated mobile task", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Nội dung nhiệm vụ mới")).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Updated mobile task", exact: true })).toHaveCount(0);
});

test("list pagination and search include tasks outside the current page", async ({ page }) => {
  await register(page);
  // Seed through the authenticated API so the test focuses on browsing and filtering.
  for (let index = 0; index < 8; index++) {
    const response = await page.request.post(`${api}/tasks`, {
      headers: writeHeaders,
      data: { title: index === 0 ? "Needle outside first page" : `Pagination task ${index}`, priority: index === 0 ? "HIGH" : "LOW" },
    });
    expect(response.status()).toBe(201);
  }
  await page.reload();
  await expect(page.getByTestId(/^task-/)).toHaveCount(8);
  await page.getByRole("button", { name: "Danh sách", exact: true }).click();
  await expect(page.getByTestId(/^task-/)).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Needle outside first page", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Go to next page", exact: true }).click();
  await expect(page.getByTestId(/^task-/)).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Needle outside first page", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Go to previous page", exact: true }).click();
  await expect(page.getByTestId(/^task-/)).toHaveCount(6);
  await page.getByLabel("Tìm kiếm theo tiêu đề công việc", { exact: true }).fill("Needle");
  await expect(page.getByTestId(/^task-/)).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Needle outside first page", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to next page", exact: true })).toBeDisabled();
  await page.getByLabel("Lọc theo mức ưu tiên", { exact: true }).selectOption("LOW");
  await expect(page.getByTestId(/^task-/)).toHaveCount(0);
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect(page.getByTestId(/^task-/)).toHaveCount(6);
});
