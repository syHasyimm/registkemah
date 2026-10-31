"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Download,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampApiError, campRequest } from "@/lib/camp/http-client";
import {
  CERTIFICATE_NUMBER,
  MAX_CERTIFICATE_EXCEL_BYTES,
  MAX_CERTIFICATES_PER_PDF,
  type CertificateImport,
  type CertificateRecipient,
} from "@/lib/camp/certificates";
import { EmptyState, Notice, PageHeading } from "./common";

type Kind = "participants" | "committee";

async function certificatePdf(kind: Kind, people: CertificateRecipient[]) {
  const response = await fetch("/api/admin/certificates/generate", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      kind === "participants"
        ? { kind, ids: people.map((person) => person.key) }
        : {
            kind,
            recipients: people.map(({ name, position }) => ({
              name,
              position,
            })),
          },
    ),
  });
  if (!response.ok) {
    const body = await response.json();
    throw new CampApiError(
      body.error?.message || "Sertifikat belum berhasil dibuat. Coba lagi.",
      response.status,
      body.error?.code || "CERTIFICATE_FAILED",
    );
  }
  return response.blob();
}

export function Certificates() {
  const router = useRouter();
  const previewRef = useRef<HTMLElement>(null);
  const [kind, setKind] = useState<Kind>("participants");
  const [participants, setParticipants] = useState<CertificateRecipient[]>([]);
  const [committee, setCommittee] = useState<CertificateImport>({
    recipients: [],
    issues: [],
  });
  const [participantSelection, setParticipantSelection] = useState<Set<string>>(
    new Set(),
  );
  const [committeeSelection, setCommitteeSelection] = useState<Set<string>>(
    new Set(),
  );
  const [school, setSchool] = useState("");
  const [patrol, setPatrol] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState<"import" | "preview" | "download" | null>(
    null,
  );
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(
    null,
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void campRequest<{ data: CertificateRecipient[] }>(
      "/api/admin/certificates/participants",
      { signal: controller.signal },
    )
      .then(({ data }) => {
        setParticipants(data);
        setParticipantSelection(
          (previous) =>
            new Set(data.filter((p) => previous.has(p.key)).map((p) => p.key)),
        );
        setLoadError("");
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "Daftar peserta belum dapat dimuat.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview]);

  const people = kind === "participants" ? participants : committee.recipients;
  const selection =
    kind === "participants" ? participantSelection : committeeSelection;
  const setSelection =
    kind === "participants" ? setParticipantSelection : setCommitteeSelection;
  const schools = useMemo(
    () =>
      [
        ...new Map(
          participants.map((p) => [p.registrationId!, p.school!]),
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1], "id")),
    [participants],
  );
  const patrols = useMemo(
    () => [
      ...new Map(
        participants
          .filter((p) => !school || p.registrationId === school)
          .map((p) => [
            p.patrolId!,
            `${p.patrol} · ${p.category}${school ? "" : ` · ${p.school}`}`,
          ]),
      ).entries(),
    ],
    [participants, school],
  );
  const filtered = people.filter(
    (p) =>
      (kind !== "participants" ||
        ((!school || p.registrationId === school) &&
          (!patrol || p.patrolId === patrol))) &&
      `${p.name} ${p.position} ${p.school || ""} ${p.patrol || ""}`
        .toLocaleLowerCase("id")
        .includes(q.trim().toLocaleLowerCase("id")),
  );
  const selected = people.filter((p) => selection.has(p.key));
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const invalidImport = kind === "committee" && committee.issues.length > 0;
  const unavailable =
    busy !== null || (kind === "participants" && (loading || !!loadError));
  const duplicateCount =
    people.length -
    new Set(people.map((p) => p.name.toLocaleLowerCase("id"))).size;

  function changeKind(next: Kind) {
    setKind(next);
    setQ("");
    setPage(1);
    setError("");
    setPreview(null);
    setMessage("");
  }

  function chooseFiltered() {
    const next = new Set([...selection, ...filtered.map((p) => p.key)]);
    if (next.size > MAX_CERTIFICATES_PER_PDF) {
      setError(
        `Maksimal ${MAX_CERTIFICATES_PER_PDF} sertifikat per PDF. Persempit filter atau pilih peserta secara bertahap.`,
      );
      return;
    }
    setSelection(next);
    setError("");
  }

  async function upload(file?: File) {
    if (!file) return;
    setCommittee({ recipients: [], issues: [] });
    setCommitteeSelection(new Set());
    setPreview(null);
    setError("");
    setMessage("");
    setFilename(file.name);
    setQ("");
    setPage(1);
    if (
      !file.name.toLowerCase().endsWith(".xlsx") ||
      file.size > MAX_CERTIFICATE_EXCEL_BYTES
    ) {
      setError("Gunakan file Excel .xlsx berukuran maksimal 2 MB.");
      return;
    }
    setBusy("import");
    try {
      const result = await campRequest<{ data: CertificateImport }>(
        "/api/admin/certificates/import",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
          body: file,
        },
      );
      setCommittee(result.data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Excel belum dapat dibaca.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function generate(person?: CertificateRecipient) {
    setBusy(person ? "preview" : "download");
    setError("");
    setMessage("");
    try {
      const blob = await certificatePdf(kind, person ? [person] : selected);
      const url = URL.createObjectURL(blob);
      if (person) {
        setPreview({ url, name: person.name });
        if (window.matchMedia("(max-width: 1200px)").matches)
          requestAnimationFrame(() =>
            previewRef.current?.scrollIntoView({ block: "start" }),
          );
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `sertifikat-${kind === "participants" ? "peserta" : "panitia"}-${selected.length}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setMessage(`PDF berisi ${selected.length} sertifikat siap diunduh.`);
      }
    } catch (cause) {
      if (cause instanceof CampApiError) {
        if (cause.status === 401) router.replace("/sign-in");
        else if (cause.code === "FORBIDDEN_ROLE")
          router.replace("/after-login");
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Sertifikat belum dapat dibuat.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="certificates-page">
      <PageHeading
        eyebrow="PIAGAM PENGHARGAAN"
        title="Sertifikat"
        description="Siapkan penghargaan untuk peserta dan panitia dalam satu tempat."
      >
        <span className="certificate-number">
          <Award size={16} /> {CERTIFICATE_NUMBER}
        </span>
      </PageHeading>
      <div
        className="status-tabs certificate-tabs"
        role="group"
        aria-label="Jenis sertifikat"
      >
        <button
          className={kind === "participants" ? "active" : ""}
          aria-pressed={kind === "participants"}
          disabled={!!busy}
          onClick={() => changeKind("participants")}
        >
          Sertifikat peserta
        </button>
        <button
          className={kind === "committee" ? "active" : ""}
          aria-pressed={kind === "committee"}
          disabled={!!busy}
          onClick={() => changeKind("committee")}
        >
          Sertifikat panitia
        </button>
      </div>
      <div className="certificate-source panel">
        {kind === "participants" ? (
          <>
            <div className="certificate-source-heading">
              <div>
                <h2>Dari registrasi terverifikasi</h2>
                <p>
                  Nama diambil dari data yang telah disetujui. Jabatan pada
                  sertifikat: Peserta.
                </p>
              </div>
              <Button
                variant="outline"
                disabled={!!busy || loading}
                onClick={() => {
                  setLoading(true);
                  setPreview(null);
                  setReload((n) => n + 1);
                }}
              >
                <RefreshCw /> Muat ulang
              </Button>
            </div>
            <div className="certificate-filters">
              <label>
                Sekolah
                <select
                  className="filter-select"
                  value={school}
                  onChange={(e) => {
                    setSchool(e.target.value);
                    setPatrol("");
                    setPage(1);
                  }}
                >
                  <option value="">Semua sekolah</option>
                  {schools.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Regu
                <select
                  className="filter-select"
                  value={patrol}
                  onChange={(e) => {
                    setPatrol(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua regu</option>
                  {patrols.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : (
          <>
            <div className="certificate-source-heading">
              <div>
                <h2>Unggah daftar panitia</h2>
                <p>
                  Kolom Nama dan Jabatan di baris pertama lembar pertama.
                  Maksimal 1.000 baris, 2 MB.
                </p>
              </div>
              <Button asChild variant="outline">
                <a href="/api/admin/certificates/template">
                  <FileSpreadsheet /> Unduh template Excel
                </a>
              </Button>
            </div>
            <label className="certificate-upload">
              File Excel panitia
              <Input
                type="file"
                accept=".xlsx"
                disabled={!!busy}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <small>
                {busy === "import"
                  ? "Memeriksa Excel…"
                  : filename || "Pilih file .xlsx dari perangkat Anda."}
              </small>
            </label>
            <p className="certificate-hint">
              Daftar panitia hanya digunakan untuk unduhan saat ini. Unggah
              ulang Excel jika halaman ditutup.
            </p>
          </>
        )}
      </div>
      {(error || (kind === "participants" && loadError)) && (
        <div role="alert">
          <Notice tone="error">{error || loadError}</Notice>
        </div>
      )}
      {invalidImport && (
        <div role="alert">
          <Notice
            tone="error"
            title={`${committee.issues.length} baris perlu diperbaiki`}
          >
            Perbaiki file Excel lalu unggah kembali sebelum mengunduh
            sertifikat.
            <ul>
              {committee.issues.slice(0, 20).map((issue) => (
                <li key={issue.row}>
                  Baris {issue.row}: {issue.message}
                </li>
              ))}
            </ul>
            {committee.issues.length > 20 && (
              <p>Dan {committee.issues.length - 20} baris lainnya.</p>
            )}
          </Notice>
        </div>
      )}
      {message && (
        <div role="status">
          <Notice tone="success">{message}</Notice>
        </div>
      )}
      <div className="certificate-layout">
        <section
          className="panel certificate-recipients"
          aria-busy={unavailable}
        >
          <div className="panel-header">
            <div>
              <h2>Penerima sertifikat</h2>
              <p>
                {filtered.length} penerima sesuai filter · {selected.length}{" "}
                dipilih
              </p>
            </div>
          </div>
          <div className="certificate-list-tools">
            <div className="search-field">
              <Search />
              <Input
                aria-label="Cari penerima sertifikat"
                placeholder="Cari nama atau jabatan…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="certificate-select-actions">
              <button
                className="text-link"
                disabled={unavailable || !filtered.length}
                onClick={chooseFiltered}
              >
                Pilih hasil filter
              </button>
              <button
                className="text-link"
                disabled={unavailable || !selection.size}
                onClick={() => {
                  setSelection(new Set());
                  setError("");
                }}
              >
                Hapus pilihan
              </button>
            </div>
          </div>
          {loading && kind === "participants" ? (
            <p className="panel-body muted" role="status">
              Memuat peserta terverifikasi…
            </p>
          ) : visible.length ? (
            <div className="certificate-table-wrap">
              <table className="admin-table certificate-table">
                <thead>
                  <tr>
                    <th scope="col">Pilih</th>
                    <th scope="col">
                      Nama & {kind === "participants" ? "sekolah" : "jabatan"}
                    </th>
                    <th scope="col">
                      <span className="sr-only">Pratinjau</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((person) => (
                    <tr key={person.key}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${person.name}${person.row ? ` baris ${person.row}` : ` ${person.school} ${person.patrol}`}`}
                          checked={selection.has(person.key)}
                          disabled={
                            unavailable ||
                            (!selection.has(person.key) &&
                              selection.size >= MAX_CERTIFICATES_PER_PDF)
                          }
                          onChange={(e) => {
                            const next = new Set(selection);
                            if (e.target.checked) next.add(person.key);
                            else next.delete(person.key);
                            setSelection(next);
                          }}
                        />
                      </td>
                      <td>
                        <strong>{person.name}</strong>
                        <small>
                          {kind === "participants"
                            ? `${person.school} · ${person.patrol} (${person.category})`
                            : person.position}
                        </small>
                        {person.row && <small>Baris {person.row}</small>}
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Pratinjau ${person.name}${person.row ? ` baris ${person.row}` : ""}`}
                          disabled={unavailable}
                          onClick={() => void generate(person)}
                        >
                          <Eye />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={
                kind === "participants"
                  ? "Belum ada peserta yang sesuai"
                  : "Belum ada data panitia"
              }
            >
              {kind === "participants"
                ? "Peserta tampil setelah pendaftaran sekolah terverifikasi. Coba sesuaikan filter pencarian."
                : "Unggah Excel berisi Nama dan Jabatan untuk menyiapkan sertifikat."}
            </EmptyState>
          )}
          {filtered.length > 20 && (
            <div className="table-footer">
              <p>
                Halaman {currentPage} dari {pages}
              </p>
              <div className="certificate-pagination">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || unavailable}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pages || unavailable}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
          {duplicateCount > 0 && (
            <p className="certificate-hint certificate-duplicates">
              Ada nama yang sama. Setiap baris tetap dihitung sebagai penerima
              berbeda.
            </p>
          )}
          <div className="certificate-download">
            <p>
              {selected.length} sertifikat dipilih, termasuk pilihan di halaman
              atau filter lain. Maksimal {MAX_CERTIFICATES_PER_PDF} per PDF.
            </p>
            <Button
              disabled={unavailable || invalidImport || !selected.length}
              onClick={() => void generate()}
            >
              <Download />
              {busy === "download"
                ? "Menyiapkan PDF…"
                : `Unduh PDF (${selected.length})`}
            </Button>
          </div>
        </section>
        <section
          ref={previewRef}
          className="panel certificate-preview"
          aria-label="Pratinjau sertifikat"
        >
          <div className="panel-header">
            <div>
              <h2>Pratinjau sertifikat</h2>
              <p>
                {busy === "preview"
                  ? "Menyiapkan pratinjau…"
                  : preview?.name ||
                    "Pilih ikon mata pada salah satu penerima."}
              </p>
            </div>
            <Eye size={19} />
          </div>
          {preview ? (
            <>
              <iframe
                title={`Sertifikat ${preview.name}`}
                src={`${preview.url}#toolbar=0&navpanes=0&view=Fit`}
              />
              <div className="certificate-preview-caption">
                <a
                  className="text-link"
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buka pratinjau PDF di tab baru
                </a>
              </div>
            </>
          ) : (
            <div className="certificate-template">
              <Image
                src="/images/Template%20Sertifikat.png"
                alt="Contoh template piagam penghargaan dengan pita nama dan jabatan"
                width={2000}
                height={1414}
                sizes="(max-width: 1100px) 100vw, 45vw"
              />
              <p>
                Template contoh. Nama dan jabatan akan disesuaikan dengan
                penerima yang dipilih.
              </p>
            </div>
          )}
          <div className="certificate-preview-note">
            <Award size={18} />
            <p>
              A4 landscape · 1 penerima per halaman
              <br />
              Nomor tetap {CERTIFICATE_NUMBER}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
