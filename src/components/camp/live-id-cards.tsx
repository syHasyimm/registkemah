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
type Card = {
  id: string;
  patrolId: string;
  patrolName: string;
  category: string;
  name: string;
  base: string;
  imageUrl: string;
};
type Cards = {
  version: number;
  status: string;
  data: Card[];
};
type CardKind = "participants" | "companions";
type CardRow = Card & { key: string; kind: CardKind };
export function LiveIdCards({ id }: { id: string }) {
  const { href } = useCamp();
  const { registration: reg, error: registrationError } = useRegistration(id);
  const [participants, setParticipants] = useState<Cards | null>(null);
  const [companions, setCompanions] = useState<Cards | null>(null);
  const [patrolId, setPatrolId] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      void Promise.all([
        campRequest<Cards>(
          `/api/admin/registrations/${id}/cards?kind=participants`,
          { signal: controller.signal },
        ),
        campRequest<Cards>(
          `/api/admin/registrations/${id}/cards?kind=companions`,
          { signal: controller.signal },
        ),
      ])
        .then(([members, leaders]) => {
          if (controller.signal.aborted) return;
          setParticipants(members);
          setCompanions(leaders);
          setError("");
        })
        .catch((cause) => {
          if (!controller.signal.aborted)
            setError(
              cause instanceof Error
                ? cause.message
                : "Kartu belum dapat dimuat.",
            );
        });
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [id]);
  const active =
    reg?.status === "Terverifikasi" &&
    participants?.status === "Siap" &&
    companions?.status === "Siap" &&
    participants.version === reg.version &&
    companions.version === reg.version;
  const allRows: CardRow[] = [
    ...(participants?.data || []).map((card) => ({
      ...card,
      key: `participants:${card.id}`,
      kind: "participants" as const,
    })),
    ...(companions?.data || []).map((card) => ({
      ...card,
      key: `companions:${card.id}`,
      kind: "companions" as const,
    })),
  ];
  const rows = active
    ? allRows.filter((c) => !patrolId || c.patrolId === patrolId)
    : [];
  const participantCount = rows.filter(
    (c) => c.kind === "participants",
  ).length;
  const companionCount = rows.filter((c) => c.kind === "companions").length;
  const readyToPrint =
    active && rows.length > 0 && rows.every((c) => loaded.includes(c.key));
  return (
    <>
      <Link className="back-link" href={href(`/admin/pendaftaran/${id}`)}>
        <ArrowLeft size={14} />
        Kembali ke pemeriksaan
      </Link>
      <PageHeading
        title="ID card peserta & pembina"
        description={
          reg
            ? `${reg.school.name} · ${reg.number} · Versi ${reg.version}`
            : "Memuat kartu…"
        }
      >
        <Button
          onClick={() => window.print()}
          disabled={!readyToPrint}
        >
          <Printer />
          Cetak semua kartu
        </Button>
      </PageHeading>
      <div className="no-print">
        <Notice title="Khusus panitia · ukuran cetak 55 × 85 mm">
          Gunakan kertas A4, skala 100%, dan aktifkan grafik latar. Kartu peserta
          dan pembina tercetak bersamaan. Berikan kartu fisik kepada operator
          setelah formulir pendaftaran diterima.
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
              {participantCount} kartu peserta · {companionCount} kartu pembina ·
              versi {participants.version} · tiga kolom A4
            </p>
          </div>
          {!rows.length && (
            <EmptyState title="Belum ada kartu sesuai filter">
              Kartu peserta tampil setelah data disetujui. Kartu pembina tampil
              bila nama pembina sudah diisi.
            </EmptyState>
          )}
          <div className="idcard-grid">
            {rows.map((c, index) => (
              <MotionReveal
                className="idcard-wrap"
                key={c.key}
                delay={(index % 3) * 0.05}
              >
                <div className="participant-idcard">
                  <Image
                    unoptimized
                    loading="eager"
                    src={c.imageUrl}
                    alt={`ID card ${c.kind === "companions" ? "pembina" : "peserta"} ${c.name}, ${c.base}`}
                    width={650}
                    height={1005}
                    style={{ width: "100%", height: "100%", objectFit: "fill" }}
                    onLoad={() =>
                      setLoaded((ids) =>
                        ids.includes(c.key) ? ids : [...ids, c.key],
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
                  {c.kind === "companions" ? "Pembina" : "Peserta"} ·{" "}
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
