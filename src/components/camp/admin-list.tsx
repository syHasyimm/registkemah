"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCamp } from "./workspace";
import { EmptyState, PageHeading } from "./common";
import { RegistrationTable } from "./admin-dashboard";
import { statuses } from "@/lib/camp/types";
import { exportCsv } from "@/lib/camp/export";
import { LiveRegistrationList } from "./live-registration-list";

export function AdminRegistrationList() {
  const { preview } = useCamp();
  return preview ? <PreviewRegistrationList /> : <LiveRegistrationList />;
}
function PreviewRegistrationList() {
  const { data } = useCamp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Semua status");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const incoming = data.registrations.filter((r) => r.status !== "Draf");
  const filtered = incoming.filter(
    (r) =>
      (!query ||
        `${r.school.name} ${r.number}`
          .toLocaleLowerCase("id")
          .includes(query.trim().toLocaleLowerCase("id"))) &&
      (status === "Semua status" || r.status === status) &&
      (!city || r.school.city === city),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const results = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  return (
    <>
      <PageHeading
        title="Pendaftaran sekolah"
        description="Temukan sekolah, periksa data, dan kelola keputusan pendaftaran."
      >
        <div className="export-menu">
          <Button
            variant="outline"
            disabled={!filtered.length}
            onClick={() => exportCsv(filtered, false)}
          >
            <Download />
            CSV sekolah
          </Button>
          <Button
            variant="outline"
            disabled={!filtered.length}
            onClick={() => exportCsv(filtered, true)}
          >
            <Users />
            CSV peserta
          </Button>
        </div>
      </PageHeading>
      <div className="filter-bar">
        <div className="search-field">
          <Search />
          <Input
            aria-label="Cari sekolah atau nomor pendaftaran"
            placeholder="Cari sekolah atau nomor pendaftaran…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="filter-select"
          aria-label="Filter status pendaftaran"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option>Semua status</option>
          {statuses
            .filter((s) => s !== "Draf")
            .map((s) => (
              <option key={s}>{s}</option>
            ))}
        </select>
        <select
          className="filter-select"
          aria-label="Filter kabupaten atau kota"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua wilayah</option>
          {[...new Set(incoming.map((r) => r.school.city))]
            .filter(Boolean)
            .sort()
            .map((city) => (
              <option key={city}>{city}</option>
            ))}
        </select>
      </div>
      <section className="panel">
        <div className="panel-header">
          <h2>
            Daftar pendaftaran{" "}
            <span className="text-muted-foreground font-normal">
              ({filtered.length})
            </span>
          </h2>
          <span className="muted">Draf belum termasuk</span>
        </div>
        {results.length ? (
          <RegistrationTable registrations={results} />
        ) : (
          <EmptyState
            title={
              incoming.length
                ? "Sekolah belum ditemukan"
                : "Belum ada pendaftaran masuk"
            }
            action={
              incoming.length ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setCity("");
                    setStatus("Semua status");
                    setPage(1);
                  }}
                >
                  <RotateCcw />
                  Hapus filter
                </Button>
              ) : undefined
            }
          >
            {incoming.length
              ? "Coba nama sekolah, nomor pendaftaran, atau filter yang berbeda."
              : "Pendaftaran tampil setelah operator mengirim data sekolahnya."}
          </EmptyState>
        )}
        <div className="table-footer">
          <p>
            {filtered.length
              ? `Menampilkan ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} dari ${filtered.length} sekolah`
              : "0 pendaftaran"}
          </p>
          <nav className="pagination" aria-label="Halaman daftar pendaftaran">
            <button
              aria-label="Halaman sebelumnya"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: pages }, (_, index) => (
              <button
                key={index}
                className={currentPage === index + 1 ? "active" : ""}
                aria-label={`Halaman ${index + 1}`}
                aria-current={currentPage === index + 1 ? "page" : undefined}
                onClick={() => setPage(index + 1)}
              >
                {index + 1}
              </button>
            ))}
            <button
              aria-label="Halaman berikutnya"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </nav>
        </div>
      </section>
      <p className="muted mt-4">
        Ekspor mengikuti seluruh hasil pencarian dan filter, termasuk halaman
        berikutnya. File pratinjau berisi data contoh.
      </p>
    </>
  );
}
