import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const file = new URL("../.env.docker", import.meta.url);
try {
  writeFileSync(file, `APP_PORT=3000\nJWT_SECRET=${randomBytes(48).toString("hex")}\n`, { flag: "wx", mode: 0o600 });
  console.log("Created local .env.docker (ignored by Git). Existing backend/.env is unchanged.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Using existing .env.docker.");
}
