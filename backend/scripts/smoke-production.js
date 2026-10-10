import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { access } from "node:fs/promises";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

// Test the actual production entrypoint without loading the user's database settings.
await access(new URL("../../frontend/dist/index.html", import.meta.url));
const portProbe = net.createServer();
portProbe.listen(0, "127.0.0.1");
await once(portProbe, "listening");
const port = portProbe.address().port;
await new Promise(resolve => portProbe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const mongo = await MongoMemoryServer.create({ binary: { downloadDir: fileURLToPath(new URL("../node_modules/.cache/mongodb-memory-server", import.meta.url)) } });
let server, closed;
try {
  server = spawn(process.execPath, [fileURLToPath(new URL("../src/server.js", import.meta.url))], {
    windowsHide: true,
    env: { ...process.env, NODE_ENV: "production", PORT: String(port), CLIENT_URL: base, API_PUBLIC_URL: base,
      COOKIE_SECURE: "false", TRUST_PROXY_HOPS: "0", JWT_SECRET: randomBytes(48).toString("hex"), JWT_EXPIRES_IN: "7d",
      MONGODB_CONNECTIONSTRING: mongo.getUri("taskpilot_smoke") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  closed = once(server, "close");
  let output = "";
  server.stdout.on("data", chunk => { output += chunk; });
  server.stderr.on("data", chunk => { output += chunk; });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("Production server stopped: " + output);
    try { ready = (await fetch(base + "/api/health", { signal: AbortSignal.timeout(1000) })).ok; }
    catch { /* The process may still be connecting and creating indexes. */ }
    if (ready) break;
    await delay(500);
  }
  assert.ok(ready, "Production server did not become ready: " + output);
  const smoke = spawn(process.execPath, [fileURLToPath(new URL("../../scripts/smoke-demo.mjs", import.meta.url))], {
    windowsHide: true, env: { ...process.env, SMOKE_BASE_URL: base }, stdio: "inherit",
  });
  const [code] = await once(smoke, "close");
  assert.equal(code, 0, "Production smoke test failed");
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    const timeout = setTimeout(() => server.kill("SIGKILL"), 12000);
    try {
      const [code] = await closed;
      // Windows terminates the process directly instead of delivering POSIX signals.
      if (process.platform !== "win32") assert.equal(code, 0, "Server must shut down gracefully");
    } finally { clearTimeout(timeout); await mongo.stop(); }
  } else {
    await mongo.stop();
  }
}
