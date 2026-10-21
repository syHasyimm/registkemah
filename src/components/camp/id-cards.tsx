"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionReveal } from "@/components/motion";
import template from "@/components/image/Olivia Wilson.png";
import { useCamp } from "./workspace";
import { EmptyState, Notice, PageHeading, ParticipantPhoto } from "./common";
import { LiveIdCards } from "./live-id-cards";
export function IdCards({ id }: { id: string }) {
  const { preview } = useCamp();
  return preview ? <PreviewIdCards id={id} /> : <LiveIdCards id={id} />;
}
function PreviewIdCards({ id }: { id: string }) {
  const { data, href } = useCamp();
  const reg = data.registrations.find((r) => r.id === id);
  const [patrolId, setPatrolId] = useState("");
  if (!reg)
    return (
      <EmptyState title="Pendaftaran tidak ditemukan">
        Kembali ke daftar dan pilih sekolah yang tersedia.
      </EmptyState>
    );
  if (reg.status !== "Terverifikasi" || reg.cardStatus !== "Siap")
    return (
      <>
        <Link className="back-link" href={href(`/admin/pendaftaran/${id}`)}>
          <ArrowLeft size={14} />
          Kembali ke pemeriksaan
        </Link>
        <PageHeading
          title="ID card peserta"
          description="Kartu hanya tersedia untuk versi persetujuan yang masih aktif."
        />
        <MotionReveal as="section" delay={0.0} className="panel">
          <EmptyState
            title={
              reg.status !== "Terverifikasi"
                ? "Kartu belum aktif"
                : reg.cardStatus === "Gagal"
                  ? "Penyiapan kartu gagal"
                  : "Kartu sedang disiapkan"
            }
            action={
              <Button asChild variant="outline">
                <Link href={href(`/admin/pendaftaran/${id}`)}>
                  Kembali ke detail pendaftaran
                </Link>
              </Button>
            }
          >
            {reg.status !== "Terverifikasi"
              ? "Sekolah belum terverifikasi atau sedang direvisi. Kartu versi lama dinonaktifkan."
              : "Periksa status proses pada detail pendaftaran. Pada mode pratinjau, ubah skenario berkas menjadi Siap untuk melihat kartu contoh."}
          </EmptyState>
        </MotionReveal>
      </>
    );
  const participants = reg.patrols
    .filter((p) => !patrolId || p.id === patrolId)
    .flatMap((p) =>
      p.participants.map((m) => ({
        ...m,
        patrolName: p.name,
        category: p.category,
      })),
    );
  return (
    <>
      <Link
        className="back-link no-print"
        href={href(`/admin/pendaftaran/${id}`)}
      >
        <ArrowLeft size={14} />
        Kembali ke pemeriksaan
      </Link>
      <PageHeading
        title="ID card peserta"
        description={`${reg.school.name} · ${reg.number} · Versi ${reg.version}`}
      >
        <Button onClick={() => window.print()}>
          <Printer />
          Cetak kartu contoh
        </Button>
      </PageHeading>
      <div className="no-print">
        <Notice title="Khusus panitia · ukuran cetak 55 × 85 mm">
          Gunakan kertas A4, skala 100%, dan aktifkan grafik latar pada dialog
          cetak. Kartu ini menggunakan data contoh frontend. Pastikan semua nama
          dan pangkalan terbaca sebelum dicetak.
        </Notice>
        <div className="idcard-toolbar">
          <select
            className="filter-select"
            aria-label="Filter kartu berdasarkan regu"
            value={patrolId}
            onChange={(e) => setPatrolId(e.target.value)}
          >
            <option value="">Semua regu</option>
            {reg.patrols.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.category}
              </option>
            ))}
          </select>
          <p>
            {participants.length} kartu · 3 kolom per lembar A4 · 55 × 85 mm
          </p>
        </div>
      </div>
      <div className="idcard-grid">
        {participants.map((m, index) => (
          <MotionReveal
            className="idcard-wrap"
            key={m.id}
            delay={(index % 3) * 0.05}
          >
            <div
              className="participant-idcard"
              style={{ backgroundImage: `url("${template.src}")` }}
              role="img"
              aria-label={`Kartu peserta ${m.name.toLocaleUpperCase("id")}, pangkalan ${m.base.toLocaleUpperCase("id")}`}
            >
              <div className="idcard-photo">
                <ParticipantPhoto participant={m} category={m.category} />
              </div>
              <div
                className="idcard-name"
                style={{
                  fontSize: `${Math.min(12, Math.max(6, 16 - m.name.length * 0.18))}px`,
                }}
              >
                {m.name.toLocaleUpperCase("id")}
              </div>
              <div
                className="idcard-base"
                style={{
                  fontSize: `${Math.min(8.5, Math.max(5.5, 11 - m.base.length * 0.08))}px`,
                }}
              >
                {m.base.toLocaleUpperCase("id")}
              </div>
            </div>
            <p>
              {m.patrolName} · {m.category}
            </p>
          </MotionReveal>
        ))}
      </div>
    </>
  );
}
