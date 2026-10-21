import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvironment, availablePostgresPort, root } from "./lib.mjs";
await loadEnvironment();
if (process.env.SMTP_HOST && process.env.SMTP_HOST !== "127.0.0.1") {
  console.log(
    "External SMTP configuration is preserved. Local mail capture was not started.",
  );
  process.exit(0);
}
if (process.env.SMTP_HOST && !process.env.DEV_MAIL_PORT) {
  console.log(
    "Existing SMTP configuration is preserved. Local mail capture was not started.",
  );
  process.exit(0);
}
const smtpPort =
  process.env.DEV_SMTP_PORT || String(await availablePostgresPort());
let uiPort = process.env.DEV_MAIL_PORT || String(await availablePostgresPort());
while (uiPort === smtpPort) uiPort = String(await availablePostgresPort());
const proposed = {
  DEV_SMTP_PORT: smtpPort,
  DEV_MAIL_PORT: uiPort,
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: smtpPort,
  SMTP_SECURE: "false",
  MAIL_FROM: "Registrasi Kemah <noreply@kemah.test>",
};
const additions = Object.fromEntries(
  Object.entries(proposed).filter(([key]) => !process.env[key]),
);
const environment = { ...process.env, ...additions };
const result = spawnSync(
  "docker",
  [
    "compose",
    "-p",
    `${process.env.COMPOSE_PROJECT_NAME || "registkemah"}-mail`,
    "-f",
    "compose.mail.yaml",
    "up",
    "-d",
  ],
  { cwd: root, env: environment, stdio: "inherit" },
);
if (result.error || result.status !== 0)
  throw new Error(
    "Local email capture could not start. Start Docker, then retry npm run email:dev.",
  );
if (Object.keys(additions).length)
  writeFileSync(
    resolve(root, ".env.local"),
    "\n# Local email capture (not an external email service)\n" +
      Object.entries(additions)
        .map(
          ([key, value]) =>
            `${key}=${JSON.stringify(value).replace(/\$/g, "\\$")}`,
        )
        .join("\n") +
      "\n",
    { flag: "a", mode: 0o600 },
  );
console.log(
  `Local email inbox: http://localhost:${uiPort}. Restart the development server to load new settings.`,
);
