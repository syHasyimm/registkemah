"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Download,
  School,
  ShieldCheck,
  TentTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCamp } from "./workspace";
import { EmptyState, PageHeading, Stats, StatusBadge } from "./common";
import { exportCsv } from "@/lib/camp/export";
import { statuses, type Registration } from "@/lib/camp/types";

export function AdminDashboard() {
  const { data, href, preview } = useCamp();
  const [scope, setScope] = useState("masuk");
  const incoming = data.registrations.filter((r) => r.status !== "Draf");
  const scoped =
    scope === "masuk"
      ? incoming
      : incoming.filter((r) => r.status === "Terverifikasi");
  const awaiting =
    data.overview?.pending || incoming.filter((r) => r.status === "Dikirim");
  const incomingCount = data.overview?.all.schools ?? incoming.length;
  const awaitingCount =
    data.overview?.statuses.find((s) => s.status === "Dikirim")?.total ??
    awaiting.length;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    const dateKey = date.toLocaleDateString("en-CA", {
      timeZone: data.event.timezone,
    });
    return {
      label: date.toLocaleDateString("id-ID", { weekday: "short" }),
      count: data.overview
        ? data.overview.dates.find((d) => d.day === dateKey)?.total || 0
        : incoming.filter(
            (r) =>
              r.submittedAt &&
              new Date(r.submittedAt).toLocaleDateString("en-CA", {
                timeZone: data.event.timezone,
              }) === dateKey,
          ).length,
    };
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <>
      <PageHeading
        title="Semua persiapan, dalam satu pandangan."
        description="Pantau pendaftaran sekolah dan bantu setiap regu bersiap."
        eyebrow="RUANG PANITIA"
      >
        <Button
          variant="outline"
          onClick={() => {
            if (preview) exportCsv(incoming, false);
            else {
              const anchor = document.createElement("a");
              anchor.href = "/api/admin/registrations/export?kind=schools";
              anchor.click();
            }
          }}
          disabled={!incomingCount}
        >
          <Download />
          Ekspor rekap
        </Button>
      </PageHeading>
      <div className="status-tabs">
        <button
          className={scope === "masuk" ? "active" : ""}
          onClick={() => setScope("masuk")}
        >
          Pendaftaran masuk
        </button>
        <button
          className={scope === "verified" ? "active" : ""}
          onClick={() => setScope("verified")}
        >
          Hanya terverifikasi
        </button>
      </div>
      <Stats
        registrations={scoped}
        admin
        values={
          scope === "masuk" ? data.overview?.all : data.overview?.verified
        }
      />
      <div className="welcome-banner">
        <div>
          <h2>
            {awaitingCount
              ? `${awaitingCount} sekolah menunggu pemeriksaanmu.`
              : "Semua pendaftaran masuk sudah ditinjau."}
          </h2>
          <p>
            {awaiting.length
              ? "Periksa kelengkapan sekolah, jumlah anggota regu, dan pangkalan peserta. Foto yang belum diunggah tidak menghalangi persetujuan."
              : "Pendaftaran baru akan tampil di sini. Informasi kegiatan dan periode pendaftaran dapat diatur melalui pengaturan."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={href("/admin/pendaftaran")}>
            Periksa pendaftaran <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Pendaftaran 7 hari terakhir</h2>
              <p>Jumlah sekolah berdasarkan waktu pengiriman</p>
            </div>
            <Clock3 size={17} className="text-muted-foreground" />
          </div>
          <div className="panel-body">
            <div
              className="chart-bars"
              role="img"
              aria-label={days
                .map((d) => `${d.label}: ${d.count} pendaftaran`)
                .join(", ")}
            >
              {days.map((d, i) => (
                <div className="chart-bar" key={i}>
                  <strong>{d.count}</strong>
                  <div
                    style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                  />
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span>{incomingCount} sekolah masuk</span>
              <span>·</span>
              <span>
                {data.overview?.verified.schools ??
                  incoming.filter((r) => r.status === "Terverifikasi")
                    .length}{" "}
                terverifikasi
              </span>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Status pendaftaran</h2>
            <ShieldCheck size={17} className="text-muted-foreground" />
          </div>
          <div className="panel-body status-distribution">
            {statuses
              .filter((s) => s !== "Draf")
              .map((status) => {
                const count =
                  data.overview?.statuses.find((s) => s.status === status)
                    ?.total ??
                  incoming.filter((r) => r.status === status).length;
                return (
                  <div className="distribution-row" key={status}>
                    <div>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="progress-track">
                      <div
                        style={{
                          width: `${incomingCount ? (count / incomingCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>
      <section className="panel mt-6">
        <div className="panel-header">
          <div>
            <h2>Perlu ditinjau</h2>
            <p>Mulai dari pendaftaran yang menunggu persetujuan</p>
          </div>
          <Link href={href("/admin/pendaftaran")} className="panel-title-link">
            Lihat semua <ArrowRight size={13} />
          </Link>
        </div>
        {awaiting.length ? (
          <RegistrationTable registrations={awaiting.slice(0, 5)} />
        ) : (
          <EmptyState title="Belum ada antrean pemeriksaan">
            Sekolah yang mengirim pendaftaran akan muncul di sini.
          </EmptyState>
        )}
      </section>
      <div className="mt-6 notice">
        <TentTree size={21} />
        <div>
          <strong>Jadwal kegiatan masih perlu dilengkapi</strong>
          <p>
            {data.event.location && data.event.eventStart
              ? `Kegiatan di ${data.event.location}, mulai ${data.event.eventStart}.`
              : "Pastikan lokasi, waktu kegiatan, jadwal registrasi fisik, dan kontak panitia ditetapkan sebelum aplikasi dipublikasikan."}
          </p>
          <Link
            className="panel-title-link mt-2"
            href={href("/admin/kegiatan")}
          >
            Buka pengaturan kegiatan <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </>
  );
}

export function RegistrationTable({
  registrations,
}: {
  registrations: Registration[];
}) {
  const { href } = useCamp();
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Sekolah</th>
          <th className="secondary-column">Wilayah</th>
          <th>Regu</th>
          <th>Peserta</th>
          <th>Status</th>
          <th>
            <span className="sr-only">Tindakan</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {registrations.map((r) => (
          <tr key={r.id}>
            <td>
              <div className="school-cell">
                <span className="school-emblem">
                  <School size={18} />
                </span>
                <div>
                  <Link href={href(`/admin/pendaftaran/${r.id}`)}>
                    <strong>{r.school.name || "Sekolah tanpa nama"}</strong>
                  </Link>
                  <small>{r.number || "Draf belum dikirim"}</small>
                </div>
              </div>
            </td>
            <td className="secondary-column">
              {r.school.city || "Belum diisi"}
            </td>
            <td className="mobile-labeled" data-label="Regu">
              {r.patrols.length}
            </td>
            <td className="mobile-labeled" data-label="Peserta">
              {
                r.patrols
                  .flatMap((p) => p.participants)
                  .filter((p) => p.name.trim()).length
              }
            </td>
            <td>
              <StatusBadge status={r.status} />
            </td>
            <td>
              <Link
                className="icon-button"
                href={href(`/admin/pendaftaran/${r.id}`)}
                aria-label={`Periksa ${r.school.name}`}
              >
                <ArrowUpRight size={16} />
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
