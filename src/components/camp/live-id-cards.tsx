"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionReveal } from "@/components/motion";
import { campRequest } from "@/lib/camp/http-client";
import { useCamp, useRegistration } from "./workspace";
import { EmptyState, Notice, PageHeading } from "./common";
type Cards = {
  version: number;
  status: string;
  data: {
    id: string;
    patrolId: string;
    patrolName: string;
    category: string;
    name: string;
    base: string;
    imageUrl: string;
  }[];
};
export function LiveIdCards({ id }: { id: string }) {
  const { href } = useCamp();
  const { registration: reg, error: registrationError } = useRegistration(id);
  const [cards, setCards] = useState<Cards | null>(null);
  const [patrolId, setPatrolId] = useState("");
  const [kind, setKind] = useState<"participants" | "companions">(
    "participants",
  );
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      void campRequest<Cards>(
        `/api/admin/registrations/${id}/cards?kind=${kind}`,
        {
          signal: controller.signal,
        },
      )
        .then((data) => {
          if (controller.signal.aborted) return;
          setCards(data);
          setError("");
        })
        .catch((error) => {
          if (!controller.signal.aborted) setError(error.message);
        });
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [id, kind]);
  const active =
    reg?.status === "Terverifikasi" &&
    cards?.status === "Siap" &&
    cards.version === reg.version;
  const rows = active
    ? cards.data.filter((c) => !patrolId || c.patrolId === patrolId)
    : [];
  return (
    <>
      <Link className="back-link" href={href(`/admin/pendaftaran/${id}`)}>
        <ArrowLeft size={14} />
        Kembali ke pemeriksaan
      </Link>
      <PageHeading
        title={kind === "companions" ? "ID card pembina" : "ID card peserta"}
        description={
          reg
            ? `${reg.school.name} · ${reg.number} · Versi ${reg.version}`
            : "Memuat kartu…"
        }
      >
        <Button
          onClick={() => window.print()}
          disabled={
            !active || !rows.length || rows.some((c) => !loaded.includes(c.id))
          }
        >
          <Printer />
          Cetak kartu {kind === "companions" ? "pembina" : "peserta"}
        </Button>
      </PageHeading>
      <div className="no-print">
        <div className="status-tabs" role="group" aria-label="Jenis ID card">
          <button
            className={kind === "participants" ? "active" : ""}
            aria-pressed={kind === "participants"}
            onClick={() => {
              setKind("participants");
              setCards(null);
              setLoaded([]);
            }}
          >
            Peserta
          </button>
          <button
            className={kind === "companions" ? "active" : ""}
            aria-pressed={kind === "companions"}
            onClick={() => {
              setKind("companions");
              setCards(null);
              setLoaded([]);
            }}
          >
            Pembina
          </button>
        </div>
        <Notice title="Khusus panitia · ukuran cetak 55 × 85 mm">
          Gunakan kertas A4, skala 100%, dan aktifkan grafik latar. Berikan
          kartu fisik kepada operator setelah formulir pendaftaran diterima.
        </Notice>
        {(error || registrationError) && (
          <div className="mt-4" role="alert">
            <Notice tone="warning">{error || registrationError}</Notice>
          </div>
        )}
      </div>
      {!active ? (
        <MotionReveal as="section" delay={0.0} className="panel mt-5">
          <EmptyState
            title={
              reg?.status === "Terverifikasi"
                ? "Kartu masih diproses"
                : "Kartu belum aktif"
            }
          >
            Periksa status kartu atau coba ulang proses melalui halaman detail
            pendaftaran.
          </EmptyState>
        </MotionReveal>
      ) : (
        <>
          <div className="idcard-toolbar no-print">
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
              {rows.length} kartu · versi {cards.version} · tiga kolom A4
            </p>
          </div>
          {!rows.length && (
            <EmptyState title="Belum ada kartu sesuai filter">
              {kind === "companions"
                ? "Pembina tampil dari data pendaftaran yang sudah disetujui."
                : "Coba pilih regu lain atau semua regu."}
            </EmptyState>
          )}
          <div className="idcard-grid">
            {rows.map((c, index) => (
              <MotionReveal
                className="idcard-wrap"
                key={c.id}
                delay={(index % 3) * 0.05}
              >
                <div className="participant-idcard">
                  <Image
                    unoptimized
                    loading="eager"
                    src={c.imageUrl}
                    alt={`ID card ${c.name}, ${c.base}`}
                    width={650}
                    height={1005}
                    style={{ width: "100%", height: "100%", objectFit: "fill" }}
                    onLoad={() =>
                      setLoaded((ids) =>
                        ids.includes(c.id) ? ids : [...ids, c.id],
                      )
                    }
                    onError={() =>
                      setError(
                        "Salah satu kartu belum dapat dimuat. Muat ulang sebelum mencetak.",
                      )
                    }
                  />
                </div>
                <p>
                  {c.patrolName} · {c.category}
                </p>
              </MotionReveal>
            ))}
          </div>
        </>
      )}
    </>
  );
}
