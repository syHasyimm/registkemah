"use client";
import Image from "next/image";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "./fields";
import {
  MAX_COMPANIONS_PER_PATROL,
  patrolCompanions,
  type Companion,
  type Patrol,
} from "@/lib/camp/types";

export function CompanionPhoto({
  companion,
  large = false,
}: {
  companion: Companion;
  large?: boolean;
}) {
  return (
    <span className={`participant-photo ${large ? "large" : ""}`}>
      {companion.photo ? (
        <span
          style={{
            backgroundImage: `url("${companion.photo}")`,
            backgroundPosition: `${companion.x}% ${companion.y}%`,
            transform: `scale(${companion.zoom})`,
          }}
          role="img"
          aria-label={`Foto pembina ${companion.name || "pendamping"}`}
        />
      ) : (
        <Image
          src="/images/companions/pembina.svg"
          width={large ? 70 : 35}
          height={large ? 70 : 35}
          alt="Ikon pembina pengganti foto"
          unoptimized
        />
      )}
    </span>
  );
}

export function CompanionEditor({
  patrol,
  onChange,
  onPhoto,
  reading,
  progress,
  errors,
  onCancel,
}: {
  patrol: Patrol;
  onChange: (companions: Companion[]) => void;
  onPhoto: (file: File | undefined, id: string) => void;
  reading: string[];
  progress: Record<string, number>;
  errors: Record<string, string>;
  onCancel: (id: string) => void;
}) {
  const companions = patrolCompanions(patrol);
  const update = (id: string, changes: Partial<Companion>) =>
    onChange(companions.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  return (
    <section
      className="companion-section"
      aria-label={`Pembina pendamping regu ${patrol.name}`}
    >
      <div className="companion-section-heading">
        <div>
          <h3>Pembina pendamping</h3>
          <p>
            Tambahkan pembina yang mendampingi regu ini. Foto dan WhatsApp
            opsional.
          </p>
        </div>
        <span>{companions.length} pembina</span>
      </div>
      {companions.map((c, i) => (
        <article className="companion-editor" key={c.id}>
          <div className="companion-editor-heading">
            <strong>Pembina {i + 1}</strong>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Hapus pembina ${i + 1} regu ${patrol.name}`}
              disabled={reading.length > 0}
              onClick={() =>
                onChange(companions.filter((other) => other.id !== c.id))
              }
            >
              <Trash2 />
            </Button>
          </div>
          <div className="companion-fields">
            <Field
              label={`Nama pembina ${i + 1}`}
              value={c.name}
              maxLength={150}
              onChange={(e) => update(c.id, { name: e.target.value })}
            />
            <Field
              label={`WhatsApp pembina ${i + 1}`}
              value={c.phone}
              optional
              type="tel"
              maxLength={24}
              onChange={(e) => update(c.id, { phone: e.target.value })}
            />
          </div>
          <div className="companion-photo-row">
            <CompanionPhoto companion={c} large />
            <div className="photo-controls">
              <label
                className="photo-upload"
                htmlFor={`companion-photo-${c.id}`}
              >
                <Upload size={14} />
                {reading.includes(c.id)
                  ? "Memproses foto…"
                  : c.photo
                    ? "Ganti foto pembina"
                    : "Pilih foto pembina"}
              </label>
              <input
                className="sr-only"
                id={`companion-photo-${c.id}`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={`Foto pembina ${i + 1} regu ${patrol.name}`}
                disabled={reading.length > 0}
                onChange={(e) => {
                  onPhoto(e.target.files?.[0], c.id);
                  e.target.value = "";
                }}
              />
              {c.photo && (
                <button
                  className="text-link min-h-11"
                  disabled={reading.length > 0}
                  onClick={() =>
                    update(c.id, {
                      photo: "",
                      photoId: null,
                      zoom: 1,
                      x: 50,
                      y: 50,
                    })
                  }
                >
                  Hapus foto pembina
                </button>
              )}
              <span className="photo-help">
                Opsional · JPG, PNG, WebP · Maks. 5 MB. Tanpa foto memakai ikon
                pembina.
              </span>
              {reading.includes(c.id) && (
                <span className="photo-help" role="status">
                  Mengunggah {progress[c.id] || 0}%{" "}
                  <button
                    className="text-link ml-2"
                    onClick={() => onCancel(c.id)}
                  >
                    Batalkan unggahan
                  </button>
                </span>
              )}
              {errors[c.id] && (
                <p role="alert" className="text-xs text-destructive">
                  {errors[c.id]}
                </p>
              )}
            </div>
          </div>
          {c.photo && (
            <div className="crop-controls">
              {(
                [
                  ["Pembesaran", "zoom", 1, 2.5, 0.05],
                  ["Posisi horizontal", "x", 0, 100, 1],
                  ["Posisi vertikal", "y", 0, 100, 1],
                ] as const
              ).map(([label, key, min, max, step]) => (
                <label key={key}>
                  {label}
                  <input
                    aria-label={`${label} foto pembina ${i + 1}`}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={c[key]}
                    onChange={(e) =>
                      update(c.id, { [key]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
            </div>
          )}
        </article>
      ))}
      <Button
        variant="outline"
        className="full-button mt-3"
        disabled={
          companions.length >= MAX_COMPANIONS_PER_PATROL || reading.length > 0
        }
        onClick={() =>
          onChange([
            ...companions,
            {
              id: crypto.randomUUID(),
              name: "",
              phone: "",
              photo: "",
              photoId: null,
              zoom: 1,
              x: 50,
              y: 50,
            },
          ])
        }
      >
        <Plus />
        Tambah pembina
      </Button>
      <p className="photo-help mt-2">
        Maksimal {MAX_COMPANIONS_PER_PATROL} pembina per regu. Pembina tidak
        dihitung sebagai anggota regu.
      </p>
    </section>
  );
}
