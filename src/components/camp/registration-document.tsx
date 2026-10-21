"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileCheck2,
  FileClock,
  Printer,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionReveal } from "@/components/motion";
import { useCamp, useRegistration } from "./workspace";
import {
  EmptyState,
  Notice,
  PageHeading,
  ParticipantPhoto,
  RegistrationSummary,
  StatusBadge,
} from "./common";
import { totals } from "@/lib/camp/types";

export function RegistrationDocument({
  registrationId,
  admin = false,
}: {
  registrationId?: string;
  admin?: boolean;
}) {
  const { data, href, notify, preview, refresh } = useCamp();
  const { registration: reg } = useRegistration(
    registrationId || data.operatorId,
  );
  const [downloading, setDownloading] = useState(false);
  async function download() {
    if (!reg || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(
        `${admin ? "/api/admin/registrations" : "/api/registrations"}/${reg.id}/document`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message || "Formulir belum dapat diunduh.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `formulir-${reg.number}-v${reg.version}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unduhan gagal. Coba lagi.",
      );
    } finally {
      setDownloading(false);
    }
  }
  if (!reg)
    return (
      <EmptyState title="Formulir tidak ditemukan">
        Pilih pendaftaran yang tersedia untuk melihat formulirnya.
      </EmptyState>
    );
  const verified = reg.status === "Terverifikasi";
  const ready = verified && reg.documentStatus === "Siap";
  const count = totals([reg]);
  return (
    <>
      <div className="document-screen">
        {!admin && (
          <>
            <Link href={href("/app")} className="back-link">
              <ArrowLeft size={14} />
              Kembali ke beranda
            </Link>
            <PageHeading
              title="Formulir pendaftaran"
              description="Dokumen yang perlu dicetak dan dibawa saat registrasi di lokasi."
            />
          </>
        )}
        {!verified ? (
          <MotionReveal as="section" delay={0.0} className="panel">
            <EmptyState
              title="Formulir menunggu persetujuan"
              action={
                <Button asChild variant="outline">
                  <Link
                    href={href(
                      admin
                        ? `/admin/pendaftaran/${reg.id}`
                        : "/app/pendaftaran",
                    )}
                  >
                    Lihat pendaftaran
                  </Link>
                </Button>
              }
            >
              Formulir resmi tersedia setelah status Terverifikasi.{" "}
              {reg.status === "Perlu perbaikan"
                ? "Versi formulir sebelumnya sudah dinonaktifkan. Perbaiki data dan tunggu persetujuan terbaru."
                : "Selesaikan pendaftaran dan pantau pemeriksaan panitia dari beranda."}
            </EmptyState>
          </MotionReveal>
        ) : (
          <div className="dashboard-columns">
            <div className="stack">
              <MotionReveal as="section" delay={0.06} className="panel">
                <div className="panel-header">
                  <h2>Formulir sekolah</h2>
                  <StatusBadge status={reg.status} />
                </div>
                <div className="panel-body">
                  <div className="document-cover">
                    {ready ? <FileCheck2 /> : <FileClock />}
                    <h2>{reg.school.name}</h2>
                    <p>
                      {reg.number}
                      <br />
                      Versi persetujuan {reg.version} · {count.patrols} regu ·{" "}
                      {count.participants} peserta
                    </p>
                    <div className="mt-5">
                      <span className="status-badge">
                        {reg.documentStatus === "Menyiapkan"
                          ? "Formulir sedang disiapkan"
                          : reg.documentStatus === "Gagal"
                            ? "Penyiapan formulir belum berhasil"
                            : preview
                              ? "Contoh tampilan tersedia"
                              : "Formulir siap diunduh"}
                      </span>
                    </div>
                  </div>
                  {reg.documentStatus === "Gagal" && (
                    <div className="mt-4">
                      <Notice
                        tone="error"
                        title="Formulir belum dapat disiapkan"
                      >
                        Data pendaftaran tetap tersimpan. Hubungi panitia atau
                        coba periksa status kembali.
                      </Notice>
                    </div>
                  )}
                  {reg.documentStatus === "Menyiapkan" && (
                    <div className="mt-4">
                      <Notice title="Menunggu proses dokumen">
                        Formulir hanya tersedia untuk versi persetujuan yang
                        sedang berlaku.{" "}
                        {preview
                          ? "Pada pratinjau, status dapat diubah di detail panitia."
                          : "Status diperbarui otomatis. Anda dapat memeriksa kembali beberapa saat lagi."}
                      </Notice>
                    </div>
                  )}
                  <div className="document-actions">
                    <Button
                      disabled={preview || !ready || downloading}
                      onClick={download}
                    >
                      <Download />
                      Unduh Formulir Pendaftaran (PDF)
                    </Button>
                    {ready && preview ? (
                      <Button variant="outline" onClick={() => window.print()}>
                        <Printer />
                        Cetak contoh tampilan
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (preview)
                            notify(
                              `Status formulir saat ini: ${reg.documentStatus}. Layanan PDF resmi belum terhubung dalam pratinjau.`,
                            );
                          else {
                            await refresh();
                            notify("Status formulir telah diperiksa kembali.");
                          }
                        }}
                      >
                        <RotateCcw />
                        Periksa status
                      </Button>
                    )}
                  </div>
                  <p className="muted mt-3">
                    {preview
                      ? "PDF resmi belum terhubung dalam pratinjau. Cetak pratinjau hanya menampilkan contoh tata letak A4."
                      : "Unduh PDF, cetak seluruh halaman pada kertas A4, lalu bawa formulir versi terbaru ke panitia."}
                  </p>
                </div>
              </MotionReveal>
              {ready && (
                <MotionReveal as="section" delay={0.12} className="panel">
                  <div className="panel-header">
                    <h2>Isi formulir</h2>
                    <span className="muted">Versi {reg.version}</span>
                  </div>
                  <div className="panel-body">
                    <RegistrationSummary registration={reg} />
                  </div>
                </MotionReveal>
              )}
            </div>
            <aside className="stack">
              <MotionReveal as="section" delay={0.0} className="panel">
                <div className="panel-header">
                  <h2>Sebelum mengambil kartu</h2>
                </div>
                <div className="panel-body">
                  <Notice
                    tone="success"
                    title="Bawa formulir, ambil kartu fisik"
                  >
                    Kartu peserta disiapkan dan dicetak oleh panitia.
                  </Notice>
                  <div className="numbered-guide">
                    <div>
                      <span>1</span>
                      <p>Unduh formulir PDF versi terbaru setelah tersedia.</p>
                    </div>
                    <div>
                      <span>2</span>
                      <p>
                        Cetak seluruh halaman formulir dan lengkapi tanda tangan
                        penanggung jawab.
                      </p>
                    </div>
                    <div>
                      <span>3</span>
                      <p>
                        Bawa dan serahkan formulir kepada panitia di lokasi
                        untuk menerima kartu fisik peserta.
                      </p>
                    </div>
                  </div>
                  <p className="muted mt-5">{data.event.pickup}</p>
                  <div className="section-divider">
                    <p className="muted">
                      <strong>Lokasi & waktu registrasi</strong>
                      <br />
                      {data.event.location || "Akan diumumkan panitia."}
                      <br />
                      {data.event.contactName &&
                        `Kontak: ${data.event.contactName} ${data.event.contactPhone}`}
                    </p>
                  </div>
                </div>
              </MotionReveal>
              <Notice title="Pemberitahuan persetujuan">
                Email ditujukan ke {reg.school.email}. Status email tidak
                menentukan akses formulir di aplikasi.
              </Notice>
            </aside>
          </div>
        )}
      </div>
      {ready && preview && (
        <article className="print-registration">
          <header>
            <p>CONTOH TAMPILAN FRONTEND · BUKAN DOKUMEN RESMI</p>
            <h1>Formulir Pendaftaran Perkemahan</h1>
            <h2>{data.event.name}</h2>
          </header>
          <h2>Identitas sekolah</h2>
          <dl className="detail-grid">
            {Object.entries({
              "Nama sekolah": reg.school.name,
              "Penanggung jawab": reg.school.contact,
            }).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "Tidak diisi"}</dd>
              </div>
            ))}
          </dl>
          {(["Putri", "Putra"] as const).map((category) => (
            <section key={category}>
              <h2>Regu {category}</h2>
              {reg.patrols.filter((p) => p.category === category).length ===
                0 && <p>Tidak mendaftarkan regu {category.toLowerCase()}.</p>}
              {reg.patrols
                .filter((p) => p.category === category)
                .map((p) => (
                  <section key={p.id}>
                    <h3>
                      {p.name} ·{" "}
                      {p.participants.filter((m) => m.name.trim()).length}{" "}
                      peserta
                    </h3>
                    <p>
                      Pembina: {p.companion || "Penanggung jawab utama"}{" "}
                      {p.phone}
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>NO</th>
                          <th>Nama Lengkap</th>
                          <th>Pangkalan</th>
                          <th>Foto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.participants.map((m, index) => (
                          <tr key={m.id}>
                            <td>{index + 1}</td>
                            <td>{m.name}</td>
                            <td>{m.base}</td>
                            <td>
                              <ParticipantPhoto
                                participant={m}
                                category={p.category}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
            </section>
          ))}
          <h2>Rekap peserta</h2>
          <p>
            {reg.patrols.filter((p) => p.category === "Putri").length} regu
            putri · {count.girls} peserta putri ·{" "}
            {reg.patrols.filter((p) => p.category === "Putra").length} regu
            putra · {count.boys} peserta putra
          </p>
          <p>
            Total: {count.patrols} regu, {count.participants} peserta. Pembina
            tidak termasuk jumlah peserta.
          </p>
          <p className="mt-4">
            Saya telah memeriksa kebenaran data sekolah dan peserta. Formulir
            ini dibawa serta diserahkan kepada panitia untuk pengambilan kartu
            fisik peserta.
          </p>
          <div className="print-signatures">
            <div>
              Penanggung jawab sekolah
              <br />
              {reg.school.contact}
            </div>
            <div>
              Penerima / panitia
              <br />
              (diisi manual di lokasi)
            </div>
          </div>
        </article>
      )}
    </>
  );
}
