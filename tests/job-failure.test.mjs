import test from "node:test";
import assert from "node:assert/strict";
import {
  jobFailureDetails,
  jobFailureMessage,
} from "../src/lib/camp/job-failure.mjs";

test("SMTP diagnostics expose only codes, never recipients, credentials or raw responses", () => {
  const error = Object.assign(
    new Error("Recipient private@example.com denied; password=top-secret"),
    {
      code: "EENVELOPE",
      command: "RCPT TO",
      responseCode: 550,
      response: "550 5.7.1 private@example.com denied; token=secret-token",
    },
  );
  const details = jobFailureDetails(error, "send-email");
  assert.equal(details.code, "EENVELOPE");
  assert.equal(details.responseCode, 550);
  assert.equal(details.smtpStatus, "5.7.1");
  assert.equal(details.command, "RCPT TO");
  const output = JSON.stringify(details) + jobFailureMessage(details, "email");
  for (const secret of [
    "private@example.com",
    "top-secret",
    "secret-token",
    "Recipient",
  ])
    assert.equal(output.includes(secret), false);
});

test("database failure after mail dispatch is identified as a database stage", () => {
  const error = new Error("Failed query with private parameters", {
    cause: { code: "42501", detail: "private@example.com" },
  });
  const details = jobFailureDetails(error, "save-mail-status");
  assert.equal(details.code, "42501");
  assert.match(jobFailureMessage(details, "email"), /database/);
  assert.doesNotMatch(JSON.stringify(details), /private|query/);
});

test("storage and crop failures give an actionable safe message", () => {
  const details = jobFailureDetails(
    Object.assign(new Error("/private/user/foto.webp"), { code: "EACCES" }),
    "write-pdf",
  );
  assert.match(jobFailureMessage(details, "document"), /izin volume/);
  assert.doesNotMatch(JSON.stringify(details), /private|foto.webp/);
  const crop = jobFailureDetails(
    new Error("Expected integer for left but received NaN; private-name"),
    "render-card",
  );
  assert.equal(crop.code, "PHOTO_CROP_INVALID");
  assert.match(jobFailureMessage(crop, "cards"), /atur ulang foto/);
});

test("unknown errors and cyclic causes cannot leak arbitrary code or command text", () => {
  const error = {
    code: "SUPERSECRET",
    command: "AUTH LOGIN private@example.com",
    message: "password=secret",
  };
  error.cause = error;
  const details = jobFailureDetails(error, "send-email");
  assert.equal(details.code, "UNKNOWN");
  assert.equal(details.command, undefined);
  assert.doesNotMatch(JSON.stringify(details), /SUPERSECRET|private|password/);
});
