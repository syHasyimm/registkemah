export type JobStage =
  | "claim"
  | "load-approval"
  | "validate-approval"
  | "read-photos"
  | "render-pdf"
  | "render-card"
  | "write-pdf"
  | "write-card"
  | "save-result"
  | "send-email"
  | "save-mail-status";
export type JobFailureDetails = {
  stage: JobStage | "unknown";
  code: string;
  responseCode?: number;
  command?: string;
  smtpStatus?: string;
  errorType?: string;
  frames?: string[];
};
export function jobFailureDetails(
  error: unknown,
  stage: JobStage,
): JobFailureDetails;
export function jobFailureMessage(
  details: JobFailureDetails,
  kind: string,
): string;
