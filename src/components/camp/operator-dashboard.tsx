"use client";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Download,
  Flower2,
  MapPin,
  School,
  TentTree,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCamp } from "./workspace";
import {
  EmptyState,
  Notice,
  PageHeading,
  Stats,
  StatusBadge,
  Timeline,
} from "./common";
import {
  editable,
  formatTime,
  registrationErrors,
  registrationOpen,
} from "@/lib/camp/types";

export function OperatorDashboard() {
  const { data, href, preview } = useCamp();
  const reg = data.registrations.find((r) => r.id === data.operatorId)!;
  const errors = registrationErrors(reg);
  const checkpoints = [
    {
      label: "Data sekolah & penanggung jawab",
      done: !!(
        reg.school.name &&
        reg.school.contact &&
        reg.school.phone &&
        reg.school.city
      ),
    },
    {
      label: "Regu & data peserta",
      done:
        !!reg.patrols.length &&
        errors.filter((e) => !e.includes("wajib diisi") || e.includes("regu"))
          .length === 0,
    },
    {
      label: "Pendaftaran dikirim ke panitia",
      done: reg.status !== "Draf" && reg.status !== "Perlu perbaikan",
    },
  ];
  const completion = Math.round(
    (checkpoints.filter((c) => c.done).length / 3) * 100,
  );
  return (
    <>
      <PageHeading
        title="Selamat datang, Pembina!"
        description="Satu langkah lebih dekat menuju petualangan bersama."
        eyebrow="RUANG SEKOLAH"
      >
        <Button asChild>
          <Link href={href("/app/pendaftaran")}>
            {editable(reg.status)
              ? "Lanjutkan pendaftaran"
              : "Lihat pendaftaran"}
            <ArrowRight />
          </Link>
        </Button>
      </PageHeading>
      <div className="welcome-banner">
        <div>
          <h2>Regu hebat dimulai dari persiapan yang baik.</h2>
          <p>
            Lengkapi data sekolah, siapkan anggota regu, dan pantau status
            pendaftaranmu. Kami bantu agar semuanya tertata sebelum berangkat.
          </p>
        </div>
        <TentTree className="welcome-illustration" />
      </div>
      <Stats registrations={[reg]} />
      {reg.status === "Perlu perbaikan" && (
        <Notice tone="warning" title="Ada data yang perlu diperbaiki">
          {reg.history.at(-1)?.note} Silakan perbaiki dan kirim kembali selama
          pendaftaran dibuka.
        </Notice>
      )}
      {reg.status === "Terverifikasi" && (
        <Notice tone="success" title="Pendaftaranmu telah terverifikasi!">
          Unduh dan cetak formulir pendaftaran. Bawa serta serahkan kepada
          panitia di lokasi untuk menerima kartu fisik peserta.{" "}
          <Link href={href("/app/pendaftaran/bukti")} className="underline">
            Buka formulir pendaftaran
          </Link>
          .
        </Notice>
      )}
      {reg.status === "Ditolak" && (
        <Notice tone="error" title="Pendaftaran belum dapat diterima">
          {reg.history.at(-1)?.note} Hubungi panitia untuk penjelasan lebih
          lanjut.
        </Notice>
      )}
      <div className="dashboard-columns">
        <div className="stack">
          <section className="panel">
            <div className="panel-header">
              <h2>Pendaftaran sekolahmu</h2>
              <StatusBadge status={reg.status} />
            </div>
            <div className="panel-body">
              <div className="school-profile">
                <span className="school-emblem">
                  <School size={23} />
                </span>
                <div>
                  <h3>{reg.school.name || "Sekolah belum dilengkapi"}</h3>
                  <p>
                    {reg.school.city || "Wilayah belum diisi"}
                    {reg.number ? ` · ${reg.number}` : " · Belum dikirim"}
                  </p>
                </div>
              </div>
              <div className="completion-row">
                <span>Kelengkapan pendaftaran</span>
                <strong>{completion}%</strong>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={completion}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Kelengkapan pendaftaran"
              >
                <div style={{ width: `${completion}%` }} />
              </div>
              <div className="checklist">
                {checkpoints.map((checkpoint) => (
                  <div
                    key={checkpoint.label}
                    className={checkpoint.done ? "" : "pending"}
                  >
                    {checkpoint.done ? <CheckCircle2 /> : <Circle />}
                    <span>{checkpoint.label}</span>
                    <small>
                      {checkpoint.done ? "Selesai" : "Belum selesai"}
                    </small>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="full-button">
                <Link href={href("/app/pendaftaran")}>
                  {editable(reg.status)
                    ? "Lengkapi pendaftaran"
                    : "Tinjau data pendaftaran"}
                  <ArrowRight />
                </Link>
              </Button>
              <p className="save-status mt-3">
                {reg.savedAt
                  ? `Draf ${preview ? "lokal" : "server"} tersimpan ${formatTime(reg.savedAt)}`
                  : "Belum ada draf yang disimpan"}
              </p>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2>Regu yang disiapkan</h2>
              <Link
                className="panel-title-link"
                href={href("/app/pendaftaran")}
              >
                Lihat regu <ArrowRight size={13} />
              </Link>
            </div>
            {reg.patrols.length ? (
              <div className="panel-body">
                {reg.patrols.map((p) => (
                  <div className="patrol-row" key={p.id}>
                    <span className="patrol-icon">
                      {p.category === "Putri" ? (
                        <Flower2 size={20} />
                      ) : (
                        <TentTree size={20} />
                      )}
                    </span>
                    <div>
                      <strong>{p.name || "Regu belum diberi nama"}</strong>
                      <p>
                        Regu {p.category} ·{" "}
                        {p.companion || "Pembina utama sekolah"}
                      </p>
                    </div>
                    <span>
                      {p.participants.filter((p) => p.name.trim()).length}{" "}
                      peserta
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Regumu belum ditambahkan">
                Mulai dengan satu regu putri atau putra berisi 8–15 peserta.
              </EmptyState>
            )}
          </section>
        </div>
        <div className="stack">
          <section className="panel">
            <div className="panel-header">
              <h2>Informasi kegiatan</h2>
              <TentTree size={17} className="text-muted-foreground" />
            </div>
            <div className="panel-body">
              <h3 className="text-sm font-semibold">{data.event.name}</h3>
              <div className="event-detail">
                <CalendarDays />
                <div>
                  <small>Tanggal kegiatan</small>
                  <strong>
                    {data.event.eventStart
                      ? `${data.event.eventStart} s.d. ${data.event.eventEnd}`
                      : "Akan diumumkan panitia"}
                  </strong>
                </div>
              </div>
              <div className="event-detail">
                <MapPin />
                <div>
                  <small>Lokasi</small>
                  <strong>
                    {data.event.location || "Menunggu informasi resmi"}
                  </strong>
                </div>
              </div>
              <div className="event-detail">
                <Users />
                <div>
                  <small>Ketentuan regu</small>
                  <strong>8–15 peserta per regu</strong>
                </div>
              </div>
              <Notice
                title={
                  registrationOpen(data.event)
                    ? preview
                      ? "Periode simulasi sedang dibuka"
                      : "Pendaftaran sedang dibuka"
                    : "Jadwal pendaftaran belum dibuka"
                }
              >
                {registrationOpen(data.event)
                  ? preview
                    ? "Tanggal pada pratinjau adalah contoh. Jadwal resmi mengikuti pengumuman panitia."
                    : "Lengkapi data dan kirim sebelum batas penutupan."
                  : "Draf dapat disimpan. Pengiriman menunggu periode pendaftaran dari panitia."}
              </Notice>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2>Perjalanan pendaftaran</h2>
              <ClipboardCheck size={17} className="text-muted-foreground" />
            </div>
            <div className="panel-body">
              <Timeline registration={reg} />
            </div>
          </section>
          <Link href={href("/app/pendaftaran/bukti")} className="notice">
            <Download size={19} />
            <div>
              <strong>Formulir untuk dibawa ke lokasi</strong>
              <p>Formulir resmi tersedia setelah persetujuan panitia.</p>
            </div>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </>
  );
}
