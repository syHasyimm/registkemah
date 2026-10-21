"use client";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionReveal } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { statuses, type Registration } from "@/lib/camp/types";
import { campRequest } from "@/lib/camp/http-client";
import { EmptyState, Notice, PageHeading } from "./common";
import { RegistrationTable } from "./admin-dashboard";
type Result = {
  data: Registration[];
  meta: { total: number; cities: string[] };
};
export function LiveRegistrationList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result>({
    data: [],
    meta: { total: 0, cities: [] },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const limit = 10;
  const query = new URLSearchParams({
    q,
    city,
    ...(status ? { status } : {}),
  }).toString();
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void campRequest<Result>(
        `/api/admin/registrations?${query}&limit=${limit}&offset=${(page - 1) * limit}`,
        { signal: controller.signal },
      )
        .then((value) => {
          setResult(value);
          setError("");
        })
        .catch((error) => {
          if (!controller.signal.aborted) setError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, reload]);
  const reset = () => {
    setQ("");
    setStatus("");
    setCity("");
    setPage(1);
  };
  const pages = Math.max(1, Math.ceil(result.meta.total / limit));
  return (
    <>
      <PageHeading
        title="Pendaftaran sekolah"
        description="Temukan sekolah, periksa data, dan kelola keputusan pendaftaran."
      >
        <div className="export-menu">
          <Button asChild variant="outline">
            <a href={`/api/admin/registrations/export?${query}&kind=schools`}>
              <Download />
              CSV sekolah
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={`/api/admin/registrations/export?${query}&kind=participants`}
            >
              <Users />
              CSV peserta
            </a>
          </Button>
        </div>
      </PageHeading>
      <div className="filter-bar">
        <div className="search-field">
          <Search />
          <Input
            aria-label="Cari sekolah atau nomor pendaftaran"
            placeholder="Cari sekolah atau nomor pendaftaran…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
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
          <option value="">Semua status</option>
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
          {result.meta.cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      {error && (
        <div className="mb-4" role="alert">
          <Notice tone="error">
            {error}{" "}
            <button
              className="text-link"
              onClick={() => setReload((r) => r + 1)}
            >
              Coba lagi
            </button>
          </Notice>
        </div>
      )}
      <MotionReveal
        as="section"
        delay={0.0}
        className="panel"
        aria-busy={loading}
      >
        <div className="panel-header">
          <h2>Daftar pendaftaran ({result.meta.total})</h2>
          <span className="muted">
            {loading ? "Memuat…" : "Draf belum termasuk"}
          </span>
        </div>
        {result.data.length ? (
          <RegistrationTable registrations={result.data} />
        ) : loading ? (
          <p className="panel-body muted" role="status">
            Memuat daftar sekolah…
          </p>
        ) : (
          <EmptyState
            title="Belum ada pendaftaran yang sesuai"
            action={
              <Button variant="outline" onClick={reset}>
                <RotateCcw />
                Hapus filter
              </Button>
            }
          >
            Coba pencarian atau filter yang berbeda.
          </EmptyState>
        )}
        <div className="table-footer">
          <p>
            {result.meta.total} sekolah · Halaman {page} dari {pages}
          </p>
          <nav className="pagination" aria-label="Halaman daftar pendaftaran">
            <button
              aria-label="Halaman sebelumnya"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <button className="active" aria-current="page">
              {page}
            </button>
            <button
              aria-label="Halaman berikutnya"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </nav>
        </div>
      </MotionReveal>
      <p className="muted mt-4">
        Ekspor mencakup seluruh hasil pencarian dan filter, termasuk halaman
        berikutnya.
      </p>
    </>
  );
}
