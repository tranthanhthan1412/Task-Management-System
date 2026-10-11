import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const target = new URL(process.env.SMOKE_BASE_URL || "http://localhost:3000");
assert.ok(["http:", "https:"].includes(target.protocol) && target.pathname === "/" && !target.search && !target.hash && !target.username && !target.password, "SMOKE_BASE_URL must be an HTTP(S) origin");
const base = target.origin;
const timedFetch = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
const html = await timedFetch(base);
assert.equal(html.status, 200);
const markup = await html.text();
assert.match(markup, /<div id="root">/);
const bundle = markup.match(/src="([^\"]+\.js)"/);
assert.ok(bundle, "Production HTML must reference a JavaScript bundle");
const asset = await timedFetch(new URL(bundle[1], base));
assert.equal(asset.status, 200);
assert.match(asset.headers.get("content-type"), /javascript/);
const deepLink = await timedFetch(base + "/tasks");
assert.equal(deepLink.status, 200);
assert.match(await deepLink.text(), /<div id="root">/);
assert.equal((await timedFetch(base + "/api/health")).status, 200);
assert.equal((await timedFetch(base + "/api/docs/")).status, 200);
assert.equal((await timedFetch(base + "/api/openapi.json")).status, 200);
let cookie;
async function api(path, method = "GET", data) {
  const res = await timedFetch(base + "/api" + path, { method, headers: {
    "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", Origin: base,
    ...(cookie ? { Cookie: cookie } : {}),
  }, body: data ? JSON.stringify(data) : undefined });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    if (target.protocol === "https:") assert.match(setCookie, /; Secure/i);
    cookie = setCookie.split(";")[0];
  }
  return { status: res.status, body: await res.json() };
}
assert.equal((await api("/tasks")).status, 401);
assert.equal((await api("/unknown")).status, 404);
const credentials = { email: `${randomUUID()}@example.com`, password: randomUUID() };
const account = await api("/auth/register", "POST", { name: "Deployment smoke test", ...credentials });
assert.equal(account.status, 201);
assert.equal((await api("/auth/me")).status, 200);
const task = await api("/tasks", "POST", { title: "Container task" });
assert.equal(task.status, 201);
assert.equal((await api("/tasks/" + task.body._id)).body.title, "Container task");
assert.equal((await api("/tasks/" + task.body._id, "PATCH", { status: "IN_PROGRESS" })).body.status, "IN_PROGRESS");
assert.equal((await api("/tasks/" + task.body._id, "PATCH", { status: "DONE" })).body.status, "DONE");
assert.equal((await api("/tasks/summary")).body.counts.DONE, 1);
assert.equal((await api("/tasks/" + task.body._id, "DELETE")).status, 200);
const copiedCookie = cookie;
assert.equal((await api("/auth/logout", "POST")).status, 200);
assert.equal((await api("/auth/me")).status, 401);
cookie = copiedCookie;
assert.equal((await api("/auth/me")).status, 401);
assert.equal((await api("/auth/login", "POST", credentials)).status, 200);
assert.equal((await api("/auth/me")).body.user.email, credentials.email);
assert.equal((await api("/auth/logout", "POST")).status, 200);
console.log("Production smoke test passed: frontend assets/deep links, health, Swagger, auth, task CRUD, summary and session revocation.");
