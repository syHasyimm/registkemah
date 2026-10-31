export const CERTIFICATE_NUMBER = "001/0803/KBP/2026";
export const MAX_CERTIFICATES_PER_PDF = 200;
export const MAX_CERTIFICATE_EXCEL_BYTES = 2 * 1024 * 1024;
export const MAX_CERTIFICATE_EXCEL_ROWS = 1000;

export function formatCertificateName(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("id-ID")
    .replace(/\p{L}[\p{L}\p{M}]*/gu, (word) =>
      word.replace(/^\p{L}/u, (initial) => initial.toLocaleUpperCase("id-ID")),
    );
}

export type CertificateRecipient = {
  key: string;
  name: string;
  position: string;
  registrationId?: string;
  school?: string;
  patrolId?: string;
  patrol?: string;
  category?: string;
  row?: number;
};

export type CertificateImport = {
  recipients: CertificateRecipient[];
  issues: { row: number; message: string }[];
};
