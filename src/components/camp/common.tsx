"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  Check,
  Circle,
  Clock3,
  ClipboardList,
  Flower2,
  Info,
  ShieldCheck,
  TentTree,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatTime,
  totals,
  type Registration,
  type RegistrationStatus,
} from "@/lib/camp/types";

export function PageHeading({
  title,
  description,
  children,
  eyebrow,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function StatusBadge({ status }: { status: RegistrationStatus }) {
  const Icon =
    status === "Terverifikasi"
      ? ShieldCheck
      : status === "Dikirim"
        ? Clock3
        : status === "Draf"
          ? Circle
          : Info;
  return (
    <span
      className={`status-badge status-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      <Icon size={13} />
      {status}
    </span>
  );
}
export function Notice({
  title,
  children,
  tone = "info",
}: {
  title?: string;
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
}) {
  return (
    <div className={`notice notice-${tone}`}>
      <Info size={19} />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span>
        <TentTree size={30} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Stats({
  registrations,
  admin = false,
  values,
}: {
  registrations: Registration[];
  admin?: boolean;
  values?: ReturnType<typeof totals>;
}) {
  const all = values || totals(registrations);
  const stats = admin
    ? [
        {
          label: "Sekolah masuk",
          value: all.schools,
          hint: "Tidak termasuk draf",
          icon: ClipboardList,
        },
        {
          label: "Regu terdaftar",
          value: all.patrols,
          hint: "Putri & putra",
          icon: TentTree,
        },
        {
          label: "Peserta putri",
          value: all.girls,
          hint: "Berdasarkan nama peserta",
          icon: Flower2,
        },
        {
          label: "Peserta putra",
          value: all.boys,
          hint: "Berdasarkan nama peserta",
          icon: Users,
        },
      ]
    : [
        {
          label: "Total regu",
          value: all.patrols,
          hint: "Putri & putra",
          icon: TentTree,
        },
        {
          label: "Peserta putri",
          value: all.girls,
          hint: "Anggota regu putri",
          icon: Flower2,
        },
        {
          label: "Peserta putra",
          value: all.boys,
          hint: "Anggota regu putra",
          icon: Users,
        },
        {
          label: "Total peserta",
          value: all.participants,
          hint: "Tidak termasuk pembina",
          icon: ClipboardList,
        },
      ];
  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <div className="stat-card" key={stat.label}>
          <div>
            <span>{stat.label}</span>
            <stat.icon size={19} />
          </div>
          <strong>{stat.value.toLocaleString("id-ID")}</strong>
          <small>{stat.hint}</small>
        </div>
      ))}
    </div>
  );
}
export function Timeline({ registration }: { registration: Registration }) {
  return (
    <div className="timeline">
      {registration.history.length ? (
        [...registration.history].reverse().map((item, i) => (
          <div className="timeline-item" key={`${item.at}-${i}`}>
            <span className={i === 0 ? "current" : ""}>
              <Check size={12} />
            </span>
            <div>
              <strong>{item.status}</strong>
              <p>{item.note}</p>
              <small>
                {item.actor} · {formatTime(item.at)}
              </small>
            </div>
          </div>
        ))
      ) : (
        <div className="timeline-item">
          <span className="current">
            <Circle size={12} />
          </span>
          <div>
            <strong>Draf dibuat</strong>
            <p>
              Lengkapi data sekolah dan regu, lalu kirim untuk diperiksa
              panitia.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
export function RegistrationSummary({
  registration,
  showPhotos = true,
}: {
  registration: Registration;
  showPhotos?: boolean;
}) {
  const { school } = registration;
  return (
    <div className="registration-summary">
      <section>
        <h3>Data sekolah & penanggung jawab</h3>
        <dl className="detail-grid">
          {[
            ["Nama sekolah", school.name],
            ["NPSN", school.npsn],
            ["Kabupaten/kota", school.city],
            ["Kecamatan", school.district],
            ["Penanggung jawab", school.contact],
            ["WhatsApp", school.phone],
            ["Email akun", school.email],
            ...(registration.patrols.some((p) => p.category === "Putri")
              ? [["Gugus depan putri", school.girlNumber]]
              : []),
            ...(registration.patrols.some((p) => p.category === "Putra")
              ? [["Gugus depan putra", school.boyNumber]]
              : []),
            ["Alamat sekolah", school.address],
            ["Catatan", school.notes],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "Tidak diisi"}</dd>
            </div>
          ))}
        </dl>
      </section>
      {(["Putri", "Putra"] as const).map((category) => (
        <section key={category}>
          <h3>Regu {category}</h3>
          {registration.patrols.filter((p) => p.category === category)
            .length === 0 ? (
            <p className="muted">
              Tidak mendaftarkan regu {category.toLowerCase()}.
            </p>
          ) : (
            registration.patrols
              .filter((p) => p.category === category)
              .map((patrol) => (
                <div className="review-patrol" key={patrol.id}>
                  <div className="review-patrol-heading">
                    <strong>{patrol.name || "Regu belum diberi nama"}</strong>
                    <span>
                      {patrol.participants.filter((p) => p.name.trim()).length}{" "}
                      peserta
                    </span>
                  </div>
                  {patrol.companion && (
                    <p className="muted">
                      Pembina: {patrol.companion}{" "}
                      {patrol.phone && `· ${patrol.phone}`}
                    </p>
                  )}
                  <div className="review-participants">
                    {patrol.participants.map((participant, i) => (
                      <div className="review-participant" key={participant.id}>
                        <span className="row-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {showPhotos && (
                          <ParticipantPhoto participant={participant} />
                        )}
                        <div>
                          <strong>
                            {participant.name || "Nama belum diisi"}
                            {patrol.leaderId === participant.id && (
                              <span className="leader-badge">Pemimpin</span>
                            )}
                          </strong>
                          <p>{participant.base || "Pangkalan belum diisi"}</p>
                        </div>
                        <span className="participant-class">
                          {participant.className || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </section>
      ))}
    </div>
  );
}
export function ParticipantPhoto({
  participant,
  large = false,
}: {
  participant: {
    photo: string;
    zoom: number;
    x: number;
    y: number;
    name?: string;
  };
  large?: boolean;
}) {
  return (
    <span className={`participant-photo ${large ? "large" : ""}`}>
      {participant.photo ? (
        <span
          style={{
            backgroundImage: `url("${participant.photo}")`,
            backgroundPosition: `${participant.x}% ${participant.y}%`,
            transform: `scale(${participant.zoom})`,
          }}
          role="img"
          aria-label={`Foto ${participant.name || "peserta"}`}
        />
      ) : (
        <Users size={large ? 28 : 16} aria-label="Foto belum tersedia" />
      )}
    </span>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="camp-dialog"
      onCancel={onClose}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button onClick={onClose} aria-label="Tutup dialog">
          <X size={20} />
        </button>
      </div>
      {description && (
        <p id={descriptionId} className="muted">
          {description}
        </p>
      )}
      {children}
    </dialog>
  );
}
export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  description,
  label = "Lanjutkan",
  destructive = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  label?: string;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
    >
      <div className="dialog-actions">
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button
          variant={destructive ? "destructive" : "default"}
          onClick={onConfirm}
        >
          {label}
        </Button>
      </div>
    </Modal>
  );
}
