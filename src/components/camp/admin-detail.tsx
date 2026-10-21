"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Mail,
  RotateCcw,
  ShieldCheck,
  SquarePen,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "./fields";
import { useCamp, useRegistration } from "./workspace";
import {
  EmptyState,
  Modal,
  Notice,
  PageHeading,
  RegistrationSummary,
  StatusBadge,
  Timeline,
} from "./common";
import {
  duplicateNames,
  formatTime,
  registrationErrors,
  type Registration,
  type RegistrationStatus,
} from "@/lib/camp/types";
import { RegistrationDocument } from "./registration-document";

export function AdminRegistrationDetail({ id }: { id: string }) {
  const {
    href,
    saveRegistration,
    decideRegistration,
    retryJob,
    notify,
    preview,
  } = useCamp();
  const { registration: reg, error: loadError } = useRegistration(id);
  const [pending, setPending] = useState(false);
  const [decision, setDecision] = useState<RegistrationStatus | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("data");
  if (!reg)
    return (
      <EmptyState
        title="Pendaftaran tidak ditemukan"
        action={
          <Button asChild variant="outline">
            <Link href={href("/admin/pendaftaran")}>Kembali ke daftar</Link>
          </Button>
        }
      >
        {loadError || "Memuat detail pendaftaran…"}
      </EmptyState>
    );
  const validation = registrationErrors(reg);
  const duplicates = duplicateNames(reg);
  const verified = reg.status === "Terverifikasi";
  async function decide() {
    if (pending) return;
    if (!reg || !decision) return;
    if (decision !== "Terverifikasi" && !note.trim()) {
      setError("Catatan wajib diisi agar operator memahami tindak lanjutnya.");
      return;
    }
    if (decision === "Terverifikasi" && validation.length) {
      setError("Data belum memenuhi ketentuan. Kembalikan untuk diperbaiki.");
      return;
    }
    if (!preview) {
      setPending(true);
      if (await decideRegistration(reg, decision, note)) {
        notify(
          "Keputusan berhasil disimpan. Status dokumen dan email diperbarui otomatis.",
        );
        setDecision(null);
        setNote("");
      }
      setPending(false);
      return;
    }
    const now = new Date().toISOString();
    const updated: Registration = {
      ...reg,
      status: decision,
      version: decision === "Terverifikasi" ? reg.version + 1 : reg.version,
      documentStatus: "Menyiapkan",
      cardStatus: "Menyiapkan",
      emailStatus: "Menunggu",
      emailAttemptAt: "",
      history: [
        ...reg.history,
        {
          status: decision,
          at: now,
          note:
            note.trim() ||
            "Data pendaftaran telah diperiksa dan disetujui dalam simulasi.",
          actor: "Panitia",
        },
      ],
    };
    if (await saveRegistration(updated)) {
      notify(
        decision === "Terverifikasi"
          ? "Simulasi persetujuan tersimpan. Formulir dan kartu contoh dapat ditandai siap pada panel proses. Tidak ada email yang dikirim."
          : "Keputusan contoh tersimpan. Versi dokumen sebelumnya dinonaktifkan pada pratinjau.",
      );
      setDecision(null);
      setNote("");
    }
  }
  function choose(value: RegistrationStatus) {
    setDecision(value);
    setNote("");
    setError("");
  }
  return (
    <>
      <Link className="back-link" href={href("/admin/pendaftaran")}>
        <ArrowLeft size={14} />
        Semua pendaftaran
      </Link>
      <PageHeading
        title={reg.school.name || "Pendaftaran sekolah"}
        description={`${reg.number || "Draf belum dikirim"} · ${reg.school.city || "Wilayah belum diisi"} · ${reg.submittedAt ? formatTime(reg.submittedAt) : "Belum dikirim"}`}
      >
        <StatusBadge status={reg.status} />
      </PageHeading>
      <div className="status-tabs">
        <button
          className={tab === "data" ? "active" : ""}
          onClick={() => setTab("data")}
        >
          Data & peserta
        </button>
        <button
          className={tab === "document" ? "active" : ""}
          onClick={() => setTab("document")}
        >
          Formulir pendaftaran
        </button>
      </div>
      {tab === "document" ? (
        <RegistrationDocument registrationId={id} admin />
      ) : (
        <div className="review-layout">
          <div className="stack">
            {validation.length > 0 && (
              <Notice tone="warning" title="Ada data yang belum lengkap">
                <ul className="error-list">
                  {validation.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Notice>
            )}
            {duplicates.length > 0 && (
              <Notice tone="warning" title="Nama yang perlu diperiksa">
                {duplicates.join(", ")}. Nama sama dapat dimiliki peserta yang
                berbeda; pastikan kembali kepada operator.
              </Notice>
            )}
            <section className="panel">
              <div className="panel-header">
                <h2>Periksa data sekolah dan peserta</h2>
                <span className="muted">
                  {
                    reg.patrols
                      .flatMap((p) => p.participants)
                      .filter((p) => p.name.trim()).length
                  }{" "}
                  peserta
                </span>
              </div>
              <div className="panel-body">
                <RegistrationSummary registration={reg} />
              </div>
            </section>
          </div>
          <aside className="stack">
            <section className="panel">
              <div className="panel-header">
                <h2>Keputusan panitia</h2>
                <ShieldCheck size={17} className="text-muted-foreground" />
              </div>
              <div className="panel-body">
                <div className="decision-options">
                  {reg.status === "Dikirim" ? (
                    <>
                      <Button
                        onClick={() => choose("Terverifikasi")}
                        disabled={validation.length > 0}
                      >
                        <CheckCircle2 />
                        Setujui pendaftaran
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => choose("Perlu perbaikan")}
                      >
                        <SquarePen />
                        Minta perbaikan
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => choose("Ditolak")}
                      >
                        <XCircle />
                        Tolak pendaftaran
                      </Button>
                    </>
                  ) : verified || reg.status === "Ditolak" ? (
                    <Button
                      variant="outline"
                      onClick={() => choose("Perlu perbaikan")}
                    >
                      <RotateCcw />
                      {verified
                        ? "Kembalikan untuk revisi"
                        : "Buka kembali untuk revisi"}
                    </Button>
                  ) : (
                    <p className="muted">
                      {reg.status === "Draf"
                        ? "Operator belum mengirim pendaftaran ini."
                        : "Menunggu operator memperbaiki dan mengirim ulang data."}
                    </p>
                  )}
                </div>
                <p className="muted mt-4">
                  Foto peserta bersifat opsional. Kekosongan foto tidak
                  menghalangi persetujuan.
                </p>
              </div>
            </section>
            {verified && (
              <section className="panel">
                <div className="panel-header">
                  <h2>Dokumen & pemberitahuan</h2>
                  <span className="muted">v{reg.version}</span>
                </div>
                <div className="panel-body">
                  <div className="operational-status">
                    <span>Formulir PDF</span>
                    <strong>{reg.documentStatus}</strong>
                  </div>
                  <div className="operational-status">
                    <span>ID card panitia</span>
                    <strong>{reg.cardStatus}</strong>
                  </div>
                  {!preview && (
                    <div className="decision-options mt-3">
                      {(reg.documentError ||
                        reg.cardError ||
                        reg.emailError) && (
                        <Notice
                          tone="warning"
                          title="Penyebab proses belum berhasil"
                        >
                          {[reg.documentError, reg.cardError, reg.emailError]
                            .filter(Boolean)
                            .join(" ")}
                        </Notice>
                      )}
                      {reg.documentStatus === "Gagal" && (
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (await retryJob(id, "document"))
                              notify("Formulir dijadwalkan ulang.");
                          }}
                        >
                          Coba ulang formulir
                        </Button>
                      )}
                      {reg.cardStatus === "Gagal" && (
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (await retryJob(id, "cards"))
                              notify("Kartu dijadwalkan ulang.");
                          }}
                        >
                          Coba ulang kartu
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="operational-status">
                    <span>Email persetujuan</span>
                    <strong>{reg.emailStatus}</strong>
                  </div>
                  <p className="muted mt-3">
                    Tujuan: {reg.school.email}.{" "}
                    {preview
                      ? "Layanan dokumen dan email belum terhubung dalam pratinjau."
                      : "Status diterima layanan email bukan bukti pesan telah masuk kotak masuk penerima."}
                  </p>
                  <div className="decision-options mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setTab("document")}
                    >
                      <FileText />
                      Buka formulir
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={href(`/admin/pendaftaran/${id}/id-card`)}>
                        Lihat ID card <ArrowRight />
                      </Link>
                    </Button>
                    <EmailRetry registration={reg} />
                  </div>
                  {reg.emailAttemptAt && (
                    <p className="muted mt-3">
                      Percobaan simulasi: {formatTime(reg.emailAttemptAt)}
                    </p>
                  )}
                  {preview && (
                    <div className="section-divider">
                      <h3>Skenario pratinjau berkas</h3>
                      <p className="muted mb-3">
                        Ubah untuk memeriksa tampilan menyiapkan, siap, atau
                        gagal. Ini tidak menghasilkan dokumen resmi.
                      </p>
                      <div className="form-fields">
                        <Field label="Status formulir" id="document-scenario">
                          <select
                            id="document-scenario"
                            value={reg.documentStatus}
                            onChange={(e) =>
                              saveRegistration({
                                ...reg,
                                documentStatus: e.target
                                  .value as Registration["documentStatus"],
                              })
                            }
                          >
                            {["Menyiapkan", "Siap", "Gagal"].map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Status kartu" id="card-scenario">
                          <select
                            id="card-scenario"
                            value={reg.cardStatus}
                            onChange={(e) =>
                              saveRegistration({
                                ...reg,
                                cardStatus: e.target
                                  .value as Registration["cardStatus"],
                              })
                            }
                          >
                            {["Menyiapkan", "Siap", "Gagal"].map((status) => (
                              <option key={status}>{status}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
            <section className="panel">
              <div className="panel-header">
                <h2>Riwayat keputusan</h2>
              </div>
              <div className="panel-body">
                <Timeline registration={reg} />
              </div>
            </section>
          </aside>
        </div>
      )}
      <Modal
        open={!!decision}
        onClose={() => setDecision(null)}
        title={
          decision === "Terverifikasi"
            ? "Setujui pendaftaran ini?"
            : decision === "Ditolak"
              ? "Tolak pendaftaran?"
              : "Minta perbaikan data?"
        }
        description={
          decision === "Terverifikasi"
            ? "Persetujuan simulasi mengunci data dan membuka alur dokumen, kartu panitia, serta status email contoh."
            : "Catatan akan tampil di beranda operator. Formulir dan kartu versi sebelumnya akan dinonaktifkan."
        }
      >
        <div className="mt-5">
          <Field
            label="Catatan untuk operator"
            required={decision !== "Terverifikasi"}
            optional={decision === "Terverifikasi"}
            id="decision-note"
          >
            <textarea
              id="decision-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              placeholder="Jelaskan data yang perlu diperbaiki atau alasan keputusan…"
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive mt-3">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setDecision(null)}>
            Batal
          </Button>
          <Button
            onClick={decide}
            disabled={pending}
            variant={decision === "Ditolak" ? "destructive" : "default"}
          >
            Simpan keputusan
          </Button>
        </div>
      </Modal>
    </>
  );
}

function EmailRetry({ registration }: { registration: Registration }) {
  const { saveRegistration, retryJob, notify, preview } = useCamp();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = registration.emailAttemptAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(registration.emailAttemptAt).getTime() + 60_000 - now) /
            1000,
        ),
      )
    : 0;
  return (
    <Button
      variant="ghost"
      disabled={remaining > 0}
      onClick={async () => {
        if (
          registration.emailAttemptAt &&
          Date.now() - new Date(registration.emailAttemptAt).getTime() < 60_000
        )
          return;
        if (!preview) {
          if (await retryJob(registration.id, "email"))
            notify(
              "Pemberitahuan dijadwalkan ulang. Pantau status penerimaan layanan email.",
            );
          return;
        }
        if (
          await saveRegistration({
            ...registration,
            emailStatus: "Menunggu",
            emailAttemptAt: new Date().toISOString(),
          })
        ) {
          setNow(Date.now());
          notify(
            "Simulasi antrean ulang tercatat. Email belum dikirim karena layanan email belum terhubung. Coba ulang tersedia setelah 60 detik.",
          );
        }
      }}
    >
      <Mail />
      {remaining > 0
        ? `Coba ulang dalam ${remaining} detik`
        : preview
          ? "Simulasi kirim ulang email"
          : "Kirim ulang email"}
    </Button>
  );
}
