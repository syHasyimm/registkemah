"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Flag,
  Flower2,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionStep } from "@/components/motion";
import { Field } from "./fields";
import {
  Confirm,
  Notice,
  PageHeading,
  ParticipantPhoto,
  RegistrationSummary,
  StatusBadge,
} from "./common";
import { useCamp } from "./workspace";
import {
  duplicateNames,
  editable,
  formatTime,
  registrationErrors,
  registrationOpen,
  totals,
  type Category,
  type Participant,
  type Patrol,
  type Registration,
  type School,
} from "@/lib/camp/types";

const newParticipant = (base: string): Participant => ({
  id: crypto.randomUUID(),
  name: "",
  base,
  className: "",
  photo: "",
  zoom: 1,
  x: 50,
  y: 50,
});

const registrationSteps = [
  { label: "Data sekolah", description: "Identitas & kontak" },
  { label: "Regu & peserta", description: "Anggota & foto" },
  { label: "Tinjau & kirim", description: "Periksa pendaftaran" },
];

function ParticipantEditor({
  participant,
  index,
  patrolName,
  leader,
  uploading,
  onDelete,
  children,
}: {
  participant: Participant;
  index: number;
  patrolName: string;
  leader: boolean;
  uploading: boolean;
  onDelete: () => void;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(
    index === 0 || !participant.name.trim() || !participant.base.trim(),
  );
  const bodyId = useId();
  return (
    <article className={`participant-editor ${expanded ? "is-expanded" : ""}`}>
      <div className="participant-editor-heading">
        <button
          className="participant-toggle"
          aria-expanded={expanded}
          aria-controls={bodyId}
          aria-label={`${expanded ? "Tutup" : "Buka"} data peserta ${index + 1} regu ${patrolName}: ${participant.name || "Peserta baru"}`}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="participant-index">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="participant-caption">
            <strong>{participant.name || "Peserta baru"}</strong>
            <small>
              {leader
                ? "Pemimpin regu"
                : participant.base || "Lengkapi data peserta"}
            </small>
          </span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          aria-label={`Hapus peserta ${index + 1} regu ${patrolName}`}
          disabled={uploading}
          onClick={onDelete}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="participant-editor-body" id={bodyId} hidden={!expanded}>
        {children}
      </div>
    </article>
  );
}

export function RegistrationForm() {
  const {
    data,
    href,
    saveRegistration,
    submitRegistration,
    uploadPhoto,
    notify,
    preview,
  } = useCamp();
  const [pending, setPending] = useState(false);
  const uploadControllers = useRef<Record<string, AbortController>>({});
  useEffect(() => {
    const controllers = uploadControllers.current;
    return () => {
      Object.values(controllers).forEach((controller) => controller.abort());
    };
  }, []);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const original = data.registrations.find((r) => r.id === data.operatorId)!;
  const [form, setForm] = useState<Registration>(() =>
    structuredClone(original),
  );
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [deletion, setDeletion] = useState<{
    title: string;
    description: string;
    run: () => void;
  } | null>(null);
  const [readingPhotos, setReadingPhotos] = useState<string[]>([]);
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);
  const locked = !editable(form.status);
  const count = totals([form]);
  const duplicates = duplicateNames(form);
  const open = registrationOpen(data.event);
  const schoolProblems = registrationErrors({ ...form, patrols: [] }).filter(
    (error) => !error.includes("Tambahkan minimal"),
  );
  const schoolReady = schoolProblems.length === 0;
  const patrolReady =
    form.patrols.length > 0 &&
    registrationErrors(form).every((error) => schoolProblems.includes(error));
  const readiness = [schoolReady, patrolReady, agreed];
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const beforeLink = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      if (
        anchor?.href &&
        !anchor.href.includes("#") &&
        !window.confirm(
          "Ada perubahan yang belum disimpan. Tinggalkan halaman ini?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [dirty]);
  const change = (update: (reg: Registration) => Registration) => {
    setForm((previous) => update(previous));
    setDirty(true);
    setAgreed(false);
  };
  const school = (key: keyof School, value: string) =>
    change((previous) => ({
      ...previous,
      school: { ...previous.school, [key]: value },
    }));
  const patrol = (id: string, update: (p: Patrol) => Patrol) =>
    change((previous) => ({
      ...previous,
      patrols: previous.patrols.map((p) => (p.id === id ? update(p) : p)),
    }));
  const member = (
    patrolId: string,
    participantId: string,
    updates: Partial<Participant>,
  ) =>
    patrol(patrolId, (p) => ({
      ...p,
      participants: p.participants.map((m) =>
        m.id === participantId ? { ...m, ...updates } : m,
      ),
    }));
  async function save(next = form): Promise<Registration | false> {
    if (pending) return false;
    const latest = data.registrations.find((reg) => reg.id === form.id);
    if (!latest || !editable(latest.status)) {
      notify(
        "Status pendaftaran sudah berubah. Muat ulang halaman sebelum melanjutkan; isian di halaman ini tetap tersedia untuk diperiksa.",
      );
      return false;
    }
    if (readingPhotos.length) {
      notify("Tunggu pemrosesan foto selesai sebelum menyimpan.");
      return false;
    }
    setPending(true);
    try {
      const updated = await saveRegistration({
        ...next,
        savedAt: new Date().toISOString(),
      });
      if (!updated) return false;
      setForm(updated);
      setDirty(false);
      return updated;
    } finally {
      setPending(false);
    }
  }
  function showErrors(next: string[]) {
    setErrors(next);
    setTimeout(() => errorRef.current?.focus(), 0);
  }
  async function nextStep() {
    setAttempted(true);
    const next =
      step === 0
        ? registrationErrors({ ...form, patrols: [] }).filter(
            (e) => !e.includes("Tambahkan minimal"),
          )
        : registrationErrors(form);
    if (next.length) {
      showErrors(next);
      return;
    }
    if (await save()) {
      setErrors([]);
      setStep(step + 1);
      setAttempted(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  function requestSubmit() {
    setAttempted(true);
    const next = registrationErrors(form);
    if (!open)
      next.push(
        "Pendaftaran sedang ditutup. Hubungi panitia untuk informasi periode pendaftaran.",
      );
    if (readingPhotos.length) next.push("Tunggu pemrosesan foto selesai.");
    if (!agreed) next.push("Centang pernyataan bahwa data sudah diperiksa.");
    if (next.length) {
      showErrors(next);
      return;
    }
    setSubmitOpen(true);
  }
  async function submit() {
    if (pending) return;
    const latest = data.registrations.find((r) => r.id === form.id);
    if (
      !latest ||
      !editable(latest.status) ||
      !registrationOpen(data.event) ||
      registrationErrors(form).length
    ) {
      setSubmitOpen(false);
      showErrors([
        "Status atau periode pendaftaran berubah. Muat ulang halaman dan periksa data.",
      ]);
      return;
    }
    if (!preview) {
      const stored = await save();
      if (!stored) return;
      setPending(true);
      try {
        const result = await submitRegistration(stored);
        if (result) {
          setForm(result);
          setDirty(false);
          setSubmitOpen(false);
          setErrors([]);
          notify(
            "Pendaftaran berhasil dikirim. Pantau pemeriksaan panitia dari beranda.",
          );
          window.scrollTo({ top: 0 });
        }
      } finally {
        setPending(false);
      }
      return;
    }
    const now = new Date().toISOString();
    const updated: Registration = {
      ...form,
      status: "Dikirim",
      school: Object.fromEntries(
        Object.entries(form.school).map(([key, value]) => [
          key,
          key === "phone"
            ? value.replace(/[\s()-]/g, "").replace(/^0/, "+62")
            : value.trim().replace(/\s+/g, " "),
        ]),
      ) as School,
      number: form.number || `DEMO-${Date.now().toString(36).toUpperCase()}`,
      submittedAt: now,
      history: [
        ...form.history,
        {
          status: "Dikirim",
          at: now,
          note: "Simulasi pengiriman pendaftaran. Data dikunci dalam pratinjau ini.",
          actor: "Operator",
        },
      ],
    };
    if (await save(updated)) {
      setSubmitOpen(false);
      setErrors([]);
      notify(
        "Simulasi berhasil. Pendaftaran contoh kini menunggu pemeriksaan panitia.",
      );
      window.scrollTo({ top: 0 });
    }
  }
  async function readPhoto(
    file: File | undefined,
    patrolId: string,
    participantId: string,
  ) {
    if (!file || readingPhotos.length || pending) return;
    setPhotoErrors((previous) => ({ ...previous, [participantId]: "" }));
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setPhotoErrors((previous) => ({
        ...previous,
        [participantId]: "Pilih JPG, PNG, atau WebP berukuran maksimal 5 MB.",
      }));
      return;
    }
    let stored: Registration | false = form;
    if (!preview) {
      stored = await save();
      if (!stored) return;
    }
    setReadingPhotos((previous) => [...previous, participantId]);
    const controller = new AbortController();
    uploadControllers.current[participantId] = controller;
    try {
      if (!preview) {
        const uploaded = await uploadPhoto(
          stored,
          participantId,
          file,
          (value) =>
            setUploadProgress((previous) => ({
              ...previous,
              [participantId]: value,
            })),
          controller.signal,
        );
        member(patrolId, participantId, { ...uploaded, zoom: 1, x: 50, y: 50 });
        return;
      }
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const photo = canvas.toDataURL("image/webp", 0.85);
      member(patrolId, participantId, { photo, zoom: 1, x: 50, y: 50 });
    } catch (error) {
      setPhotoErrors((previous) => ({
        ...previous,
        [participantId]:
          error instanceof Error
            ? error.message
            : "Foto tidak dapat dibaca. Pilih berkas gambar lain atau lanjutkan tanpa foto.",
      }));
    } finally {
      delete uploadControllers.current[participantId];
      setReadingPhotos((previous) =>
        previous.filter((id) => id !== participantId),
      );
    }
  }
  const schoolError = (key: keyof School) =>
    attempted &&
    !form.school[key].trim() &&
    ["name", "contact", "phone", "city"].includes(key)
      ? "Kolom ini wajib dilengkapi."
      : undefined;
  return (
    <fieldset disabled={pending} className="registration-form min-w-0">
      <legend className="sr-only">Pendaftaran sekolah</legend>
      <Link className="back-link" href={href("/app")}>
        <ArrowLeft size={14} />
        Kembali ke beranda
      </Link>
      <PageHeading
        title={locked ? "Data pendaftaran sekolah" : "Pendaftaran sekolah"}
        description={
          locked
            ? "Data sudah dikirim dan terkunci. Perubahan dapat dilakukan jika panitia meminta perbaikan."
            : "Siapkan sekolah dan regumu. Isi bertahap, simpan kapan saja."
        }
      >
        <StatusBadge status={form.status} />
      </PageHeading>
      {form.status === "Perlu perbaikan" && (
        <div className="mb-5">
          <Notice tone="warning" title="Catatan perbaikan dari panitia">
            {form.history.at(-1)?.note}
          </Notice>
        </div>
      )}
      {locked ? (
        <>
          <Notice
            title={
              form.status === "Terverifikasi"
                ? "Pendaftaran telah disetujui"
                : form.status === "Ditolak"
                  ? "Pendaftaran ditolak"
                  : "Menunggu pemeriksaan panitia"
            }
          >
            {form.history.at(-1)?.note ||
              "Pantau status pendaftaran dari beranda."}
          </Notice>
          <div className="panel mt-5">
            <div className="panel-body">
              <RegistrationSummary registration={form} />
            </div>
          </div>
          {form.status === "Terverifikasi" && (
            <Button asChild className="mt-5">
              <Link href={href("/app/pendaftaran/bukti")}>
                Buka formulir pendaftaran <ArrowRight />
              </Link>
            </Button>
          )}
        </>
      ) : (
        <>
          <nav className="wizard-steps" aria-label="Langkah pendaftaran">
            {registrationSteps.map(({ label, description }, index) => (
              <button
                key={label}
                className={`wizard-step ${index === step ? "active" : index < step && readiness[index] ? "complete" : ""}`}
                aria-label={label}
                onClick={() => {
                  setStep(index);
                  setErrors([]);
                  setAttempted(false);
                }}
                aria-current={index === step ? "step" : undefined}
              >
                <span>
                  {index < step && readiness[index] ? (
                    <Check size={15} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <span className="wizard-label">
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </button>
            ))}
          </nav>
          <div className="registration-stage-heading">
            <span>Langkah {step + 1} dari 3</span>
            <p>
              {
                [
                  "Mulai dari identitas dan kontak sekolah.",
                  "Susun regu, lalu lengkapi data setiap peserta.",
                  "Pastikan semua data benar sebelum dikirim.",
                ][step]
              }
            </p>
          </div>
          {errors.length > 0 && (
            <div ref={errorRef} tabIndex={-1} className="mb-5" role="alert">
              <Notice tone="error" title="Periksa kembali data berikut">
                <ul className="error-list">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </Notice>
            </div>
          )}
          <div className="form-layout">
            <MotionStep step={step}>
              {step === 0 && (
                <section className="panel">
                  <div className="panel-header">
                    <span className="registration-section-icon">
                      <Building2 size={21} />
                    </span>
                    <div>
                      <h2>Identitas sekolah</h2>
                      <p>Nama dan lokasi sekolah yang didaftarkan.</p>
                    </div>
                    <span className="registration-required-note">
                      * wajib diisi
                    </span>
                  </div>
                  <div className="panel-body">
                    <div className="form-fields">
                      <Field
                        wide
                        label="Nama sekolah"
                        value={form.school.name}
                        required
                        maxLength={180}
                        placeholder="Contoh: SMP Tunas Nusantara"
                        onChange={(e) => school("name", e.target.value)}
                        error={schoolError("name")}
                      />
                      <Field
                        label="NPSN"
                        optional
                        value={form.school.npsn}
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="8 digit NPSN"
                        onChange={(e) => school("npsn", e.target.value)}
                        hint="Dikosongkan jika belum tersedia."
                      />
                      <Field
                        label="Kabupaten/kota"
                        value={form.school.city}
                        required
                        maxLength={100}
                        placeholder="Contoh: Padang"
                        onChange={(e) => school("city", e.target.value)}
                        error={schoolError("city")}
                      />
                      <Field
                        label="Kecamatan"
                        optional
                        value={form.school.district}
                        maxLength={100}
                        placeholder="Nama kecamatan"
                        onChange={(e) => school("district", e.target.value)}
                      />
                      <Field
                        label="Alamat sekolah"
                        optional
                        wide
                        id="school-address"
                      >
                        <textarea
                          id="school-address"
                          value={form.school.address}
                          maxLength={500}
                          onChange={(e) => school("address", e.target.value)}
                          placeholder="Jalan, kelurahan, dan keterangan alamat sekolah"
                        />
                      </Field>
                    </div>
                    <div className="section-divider">
                      <div className="registration-section-heading">
                        <span className="registration-section-icon">
                          <UserRound size={20} />
                        </span>
                        <div>
                          <h3>Penanggung jawab sekolah</h3>
                          <p>Kontak utama yang dapat dihubungi panitia.</p>
                        </div>
                      </div>
                      <div className="form-fields">
                        <Field
                          wide
                          label="Nama penanggung jawab"
                          required
                          autoComplete="name"
                          maxLength={120}
                          value={form.school.contact}
                          onChange={(e) => school("contact", e.target.value)}
                          error={schoolError("contact")}
                          placeholder="Nama lengkap pembina atau perwakilan sekolah"
                        />
                        <Field
                          label="WhatsApp penanggung jawab"
                          required
                          type="tel"
                          autoComplete="tel"
                          value={form.school.phone}
                          maxLength={20}
                          onChange={(e) => school("phone", e.target.value)}
                          error={schoolError("phone")}
                          placeholder="08xxxxxxxxxx"
                          hint="Gunakan nomor aktif dengan awalan 08 atau +62."
                        />
                        <Field
                          label="Email akun"
                          type="email"
                          value={form.school.email}
                          disabled
                          hint="Diambil dari akun yang masuk. Menjadi tujuan pemberitahuan."
                        />
                      </div>
                    </div>
                    <div className="section-divider">
                      <div className="registration-section-heading">
                        <span className="registration-section-icon">
                          <Flag size={20} />
                        </span>
                        <div>
                          <h3>Gugus depan & catatan</h3>
                          <p>Tambahkan jika informasinya sudah tersedia.</p>
                        </div>
                      </div>
                      <div className="form-fields">
                        {form.patrols.some((p) => p.category === "Putri") && (
                          <Field
                            label="Nomor gugus depan putri"
                            optional
                            value={form.school.girlNumber}
                            maxLength={40}
                            onChange={(e) =>
                              school("girlNumber", e.target.value)
                            }
                            placeholder="Contoh: 01.101"
                          />
                        )}
                        {form.patrols.some((p) => p.category === "Putra") && (
                          <Field
                            label="Nomor gugus depan putra"
                            optional
                            value={form.school.boyNumber}
                            maxLength={40}
                            onChange={(e) =>
                              school("boyNumber", e.target.value)
                            }
                            placeholder="Contoh: 01.102"
                          />
                        )}
                        <Field
                          wide
                          label="Catatan untuk panitia"
                          optional
                          id="school-notes"
                          hint="Cukup informasi operasional. Hindari data sensitif peserta."
                        >
                          <textarea
                            id="school-notes"
                            maxLength={1000}
                            value={form.school.notes}
                            onChange={(e) => school("notes", e.target.value)}
                            placeholder="Ada informasi yang perlu diketahui panitia?"
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </section>
              )}
              {step === 1 && (
                <>
                  <div className="mb-5">
                    <Notice title="Setiap regu berisi 8–15 peserta">
                      Pemimpin termasuk anggota; pembina tidak dihitung.
                      Pangkalan wajib, foto opsional.
                    </Notice>
                  </div>
                  {(["Putri", "Putra"] as Category[]).map((category) => (
                    <section className="category-section" key={category}>
                      <div className="category-heading">
                        <h2>
                          {category === "Putri" ? <Flower2 /> : <Users />}Regu{" "}
                          {category}
                        </h2>
                        <span>
                          {
                            form.patrols.filter((p) => p.category === category)
                              .length
                          }{" "}
                          regu
                        </span>
                      </div>
                      {form.patrols
                        .filter((p) => p.category === category)
                        .map((p) => (
                          <details className="patrol-editor" key={p.id} open>
                            <summary>
                              <span className="patrol-icon">
                                {p.category === "Putri" ? (
                                  <Flower2 size={18} />
                                ) : (
                                  <Users size={18} />
                                )}
                              </span>
                              <div>
                                <strong>
                                  {p.name || `Regu ${category} baru`}
                                </strong>
                                <small>
                                  {
                                    p.participants.filter((m) => m.name.trim())
                                      .length
                                  }{" "}
                                  peserta · 8–15 per regu
                                </small>
                              </div>
                              <ChevronDown />
                            </summary>
                            <div className="panel-body">
                              <div className="form-fields">
                                <Field
                                  label="Nama regu"
                                  required
                                  value={p.name}
                                  maxLength={80}
                                  onChange={(e) =>
                                    patrol(p.id, (previous) => ({
                                      ...previous,
                                      name: e.target.value,
                                    }))
                                  }
                                  error={
                                    attempted && !p.name.trim()
                                      ? "Nama regu wajib diisi."
                                      : undefined
                                  }
                                  placeholder={
                                    category === "Putri"
                                      ? "Contoh: Melati"
                                      : "Contoh: Rajawali"
                                  }
                                />
                                <Field
                                  label="Pemimpin regu"
                                  optional
                                  id={`leader-${p.id}`}
                                >
                                  <select
                                    id={`leader-${p.id}`}
                                    value={p.leaderId}
                                    onChange={(e) =>
                                      patrol(p.id, (previous) => ({
                                        ...previous,
                                        leaderId: e.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">Belum dipilih</option>
                                    {p.participants
                                      .filter((m) => m.name.trim())
                                      .map((m) => (
                                        <option key={m.id} value={m.id}>
                                          {m.name}
                                        </option>
                                      ))}
                                  </select>
                                </Field>
                                <Field
                                  label="Pembina pendamping regu"
                                  optional
                                  value={p.companion}
                                  maxLength={120}
                                  onChange={(e) =>
                                    patrol(p.id, (previous) => ({
                                      ...previous,
                                      companion: e.target.value,
                                    }))
                                  }
                                  placeholder="Jika berbeda dari pembina utama"
                                />
                                <Field
                                  label="WhatsApp pembina pendamping"
                                  optional
                                  type="tel"
                                  value={p.phone}
                                  maxLength={20}
                                  onChange={(e) =>
                                    patrol(p.id, (previous) => ({
                                      ...previous,
                                      phone: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="patrol-actions">
                                <div>
                                  <strong>Anggota regu</strong>
                                  <small>
                                    Buka nama peserta untuk mengubah data.
                                  </small>
                                </div>
                                <span
                                  className={
                                    p.participants.filter((m) => m.name.trim())
                                      .length < 8
                                      ? "dirty"
                                      : ""
                                  }
                                >
                                  {
                                    p.participants.filter((m) => m.name.trim())
                                      .length
                                  }{" "}
                                  peserta bernama · minimal 8, maksimal 15
                                </span>
                              </div>
                              {p.participants.map((m, index) => (
                                <ParticipantEditor
                                  key={m.id}
                                  participant={m}
                                  index={index}
                                  patrolName={p.name}
                                  leader={p.leaderId === m.id}
                                  uploading={readingPhotos.includes(m.id)}
                                  onDelete={() =>
                                    setDeletion({
                                      title: "Hapus peserta ini?",
                                      description: `${m.name || "Peserta tanpa nama"} akan dihapus dari regu ${p.name || category}.`,
                                      run: () =>
                                        patrol(p.id, (previous) => ({
                                          ...previous,
                                          leaderId:
                                            previous.leaderId === m.id
                                              ? ""
                                              : previous.leaderId,
                                          participants:
                                            previous.participants.filter(
                                              (member) => member.id !== m.id,
                                            ),
                                        })),
                                    })
                                  }
                                >
                                  <div className="form-fields">
                                    <Field
                                      label="Nama lengkap peserta"
                                      required
                                      maxLength={150}
                                      value={m.name}
                                      onChange={(e) =>
                                        member(p.id, m.id, {
                                          name: e.target.value,
                                        })
                                      }
                                      error={
                                        attempted && !m.name.trim()
                                          ? "Nama peserta wajib diisi."
                                          : undefined
                                      }
                                      placeholder="Sesuai ejaan nama peserta"
                                    />
                                    <Field
                                      label="Pangkalan"
                                      required
                                      maxLength={180}
                                      value={m.base}
                                      onChange={(e) =>
                                        member(p.id, m.id, {
                                          base: e.target.value,
                                        })
                                      }
                                      error={
                                        attempted && !m.base.trim()
                                          ? "Pangkalan wajib diisi."
                                          : undefined
                                      }
                                    />
                                    <Field
                                      label="Kelas"
                                      optional
                                      maxLength={20}
                                      value={m.className}
                                      onChange={(e) =>
                                        member(p.id, m.id, {
                                          className: e.target.value,
                                        })
                                      }
                                      placeholder="Contoh: 7A"
                                    />
                                  </div>
                                  <div className="photo-controls">
                                    <ParticipantPhoto participant={m} large />
                                    <div>
                                      <div className="photo-actions">
                                        <label
                                          className="file-label"
                                          htmlFor={`photo-${m.id}`}
                                        >
                                          <Upload size={14} />
                                          {readingPhotos.includes(m.id)
                                            ? "Memproses foto…"
                                            : m.photo
                                              ? "Ganti foto"
                                              : "Pilih foto"}
                                        </label>
                                        <input
                                          className="sr-only"
                                          id={`photo-${m.id}`}
                                          aria-label={`Foto peserta ${index + 1} regu ${p.name}`}
                                          type="file"
                                          accept="image/jpeg,image/png,image/webp"
                                          disabled={readingPhotos.length > 0}
                                          onChange={(e) => {
                                            void readPhoto(
                                              e.target.files?.[0],
                                              p.id,
                                              m.id,
                                            );
                                            e.target.value = "";
                                          }}
                                        />
                                        {m.photo && (
                                          <button
                                            className="text-link min-h-11"
                                            onClick={() =>
                                              member(p.id, m.id, {
                                                photo: "",
                                                photoId: null,
                                                zoom: 1,
                                                x: 50,
                                                y: 50,
                                              })
                                            }
                                          >
                                            Hapus foto
                                          </button>
                                        )}
                                      </div>
                                      <span className="photo-help">
                                        Opsional · JPG, PNG, WebP · Maks. 5 MB
                                      </span>
                                      {readingPhotos.includes(m.id) && (
                                        <span
                                          role="status"
                                          className="photo-help"
                                        >
                                          {preview
                                            ? "Membaca dan menyesuaikan gambar di perangkat…"
                                            : `Mengunggah ${uploadProgress[m.id] || 0}%${uploadProgress[m.id] === 100 ? " · memproses gambar…" : ""}`}
                                          {!preview && (
                                            <button
                                              type="button"
                                              className="text-link ml-2"
                                              onClick={() =>
                                                uploadControllers.current[
                                                  m.id
                                                ]?.abort()
                                              }
                                            >
                                              Batalkan unggahan
                                            </button>
                                          )}
                                        </span>
                                      )}
                                      {photoErrors[m.id] && (
                                        <p
                                          role="alert"
                                          className="text-xs text-destructive mt-2"
                                        >
                                          {photoErrors[m.id]}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {m.photo && (
                                    <div className="crop-controls">
                                      <label>
                                        Pembesaran
                                        <input
                                          type="range"
                                          min="1"
                                          max="2.5"
                                          step="0.05"
                                          value={m.zoom}
                                          onChange={(e) =>
                                            member(p.id, m.id, {
                                              zoom: Number(e.target.value),
                                            })
                                          }
                                        />
                                      </label>
                                      <label>
                                        Posisi horizontal
                                        <input
                                          type="range"
                                          min="0"
                                          max="100"
                                          value={m.x}
                                          onChange={(e) =>
                                            member(p.id, m.id, {
                                              x: Number(e.target.value),
                                            })
                                          }
                                        />
                                      </label>
                                      <label>
                                        Posisi vertikal
                                        <input
                                          type="range"
                                          min="0"
                                          max="100"
                                          value={m.y}
                                          onChange={(e) =>
                                            member(p.id, m.id, {
                                              y: Number(e.target.value),
                                            })
                                          }
                                        />
                                      </label>
                                    </div>
                                  )}
                                </ParticipantEditor>
                              ))}
                              <Button
                                variant="outline"
                                className="full-button mt-4"
                                disabled={p.participants.length >= 15}
                                onClick={() =>
                                  patrol(p.id, (previous) => ({
                                    ...previous,
                                    participants: [
                                      ...previous.participants,
                                      newParticipant(form.school.name),
                                    ],
                                  }))
                                }
                              >
                                <Plus />
                                {p.participants.length >= 15
                                  ? "Batas 15 peserta tercapai"
                                  : "Tambah peserta"}
                              </Button>
                              <button
                                className="delete-patrol mt-4"
                                onClick={() =>
                                  setDeletion({
                                    title: `Hapus regu ${p.name || category}?`,
                                    description: `Sebanyak ${p.participants.length} baris peserta beserta foto lokalnya akan ikut dihapus.`,
                                    run: () =>
                                      change((previous) => ({
                                        ...previous,
                                        patrols: previous.patrols.filter(
                                          (item) => item.id !== p.id,
                                        ),
                                      })),
                                  })
                                }
                              >
                                <Trash2 size={14} />
                                Hapus regu
                              </button>
                            </div>
                          </details>
                        ))}
                      <button
                        className={`add-patrol ${form.patrols.some((p) => p.category === category) ? "" : "is-empty"}`}
                        aria-label={`Tambah regu ${category.toLowerCase()}`}
                        onClick={() =>
                          change((previous) => ({
                            ...previous,
                            patrols: [
                              ...previous.patrols,
                              {
                                id: crypto.randomUUID(),
                                category,
                                name: "",
                                companion: "",
                                phone: "",
                                leaderId: "",
                                participants: [
                                  newParticipant(previous.school.name),
                                ],
                              },
                            ],
                          }))
                        }
                      >
                        <Plus size={16} />
                        {form.patrols.some((p) => p.category === category) ? (
                          <>Tambah regu {category.toLowerCase()}</>
                        ) : (
                          <span>
                            <strong>
                              Tambah regu {category.toLowerCase()}
                            </strong>
                            <small>
                              Mulai dengan nama regu, lalu isi 8–15 peserta.
                            </small>
                          </span>
                        )}
                      </button>
                    </section>
                  ))}
                  {duplicates.length > 0 && (
                    <div className="mt-5">
                      <Notice tone="warning" title="Ada nama peserta yang sama">
                        Periksa kembali: {duplicates.join(", ")}. Nama sama
                        tidak otomatis ditolak jika memang dua orang berbeda.
                      </Notice>
                    </div>
                  )}
                </>
              )}
              {step === 2 && (
                <>
                  <section className="panel">
                    <div className="panel-header">
                      <span className="registration-section-icon">
                        <ClipboardCheck size={21} />
                      </span>
                      <div>
                        <h2>Periksa sebelum dikirim</h2>
                        <p>
                          Pastikan nama, pangkalan, dan anggota seluruh regu
                          sudah benar.
                        </p>
                      </div>
                    </div>
                    <div className="panel-body">
                      <RegistrationSummary registration={form} />
                    </div>
                  </section>
                  <div className="mt-5">
                    <Notice title="Setelah dikirim, data akan dikunci">
                      Panitia akan memeriksa pendaftaran. Perbaikan hanya dapat
                      dilakukan setelah panitia mengembalikan data dengan
                      catatan.
                    </Notice>
                  </div>
                  {duplicates.length > 0 && (
                    <div className="mt-4">
                      <Notice tone="warning" title="Periksa nama yang sama">
                        {duplicates.join(", ")}. Pastikan peserta berbeda
                        sebelum melanjutkan.
                      </Notice>
                    </div>
                  )}
                  <label
                    className={`checkbox-line registration-agreement mt-5 ${agreed ? "is-checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <span>
                      Saya sudah memeriksa data sekolah dan seluruh peserta
                      serta memahami bahwa formulir yang disetujui harus dicetak
                      dan dibawa ke panitia untuk mengambil kartu fisik.
                    </span>
                  </label>
                  {!open && (
                    <div className="mt-4">
                      <Notice tone="warning">
                        Periode pendaftaran belum dibuka atau sudah ditutup.
                        Draf tetap dapat disimpan.
                      </Notice>
                    </div>
                  )}
                </>
              )}
            </MotionStep>
            <aside className="form-sidebar panel">
              <div className="panel-body">
                <p className="registration-summary-caption">Pendaftaranmu</p>
                <h3>{form.school.name || "Sekolahmu"}</h3>
                <div className="registration-total">
                  <strong>{count.participants}</strong>
                  <span>
                    peserta
                    <br />
                    <small>dalam {count.patrols} regu</small>
                  </span>
                </div>
                <div className="registration-counts">
                  <div>
                    <Flower2 size={17} />
                    <strong>{count.girls}</strong>
                    <span>Peserta putri</span>
                  </div>
                  <div>
                    <Users size={17} />
                    <strong>{count.boys}</strong>
                    <span>Peserta putra</span>
                  </div>
                </div>
                <ol className="registration-checklist">
                  {["Identitas sekolah", "Susunan regu", "Pernyataan data"].map(
                    (label, index) => (
                      <li
                        key={label}
                        className={readiness[index] ? "is-ready" : ""}
                      >
                        <span>
                          {readiness[index] ? <Check size={13} /> : index + 1}
                        </span>
                        {label}
                      </li>
                    ),
                  )}
                </ol>
                <div className="registration-save-note">
                  <ShieldCheck size={17} />
                  <p>
                    Simpan draf sebelum berpindah halaman. Kamu bisa
                    melanjutkannya lagi nanti.
                  </p>
                </div>
              </div>
            </aside>
          </div>
          <div className="form-footer">
            <span className={`save-status ${dirty ? "dirty" : ""}`}>
              <span className="registration-save-icon">
                {readingPhotos.length || dirty ? (
                  <Clock3 size={16} />
                ) : (
                  <Check size={16} />
                )}
              </span>
              <span>
                <strong>
                  {readingPhotos.length
                    ? "Memproses foto…"
                    : pending
                      ? "Menyimpan…"
                      : dirty
                        ? "Perubahan belum disimpan"
                        : form.savedAt
                          ? "Draf tersimpan"
                          : "Draf belum disimpan"}
                </strong>
                {form.savedAt && !dirty && (
                  <small>{formatTime(form.savedAt)}</small>
                )}
              </span>
            </span>
            <div
              className={`registration-footer-actions ${step > 0 ? "has-back" : ""}`}
            >
              {step > 0 && (
                <Button
                  variant="ghost"
                  className="registration-back"
                  aria-label="Kembali"
                  onClick={() => {
                    setStep(step - 1);
                    setErrors([]);
                    setAttempted(false);
                  }}
                >
                  <ArrowLeft />
                  <span>Kembali</span>
                </Button>
              )}
              <Button
                variant="outline"
                disabled={readingPhotos.length > 0}
                onClick={async () => {
                  if (await save())
                    notify(
                      preview
                        ? "Draf tersimpan di browser ini."
                        : "Draf berhasil disimpan di server.",
                    );
                }}
              >
                <Save />
                Simpan draf
              </Button>
              {step < 2 ? (
                <Button
                  aria-label="Simpan & lanjutkan"
                  disabled={readingPhotos.length > 0}
                  onClick={nextStep}
                >
                  Lanjutkan <ArrowRight />
                </Button>
              ) : (
                <Button
                  onClick={requestSubmit}
                  disabled={readingPhotos.length > 0 || !open}
                >
                  <Send />
                  Kirim pendaftaran
                </Button>
              )}
            </div>
          </div>
        </>
      )}
      <Confirm
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onConfirm={submit}
        title={
          preview ? "Kirim simulasi pendaftaran?" : "Kirim pendaftaran sekolah?"
        }
        description={
          preview
            ? `${count.patrols} regu dengan ${count.participants} peserta akan dikunci dalam pratinjau. Tidak ada data yang dikirim ke server atau email ke panitia.`
            : `${count.patrols} regu dengan ${count.participants} peserta akan dikirim ke panitia. Data dan foto terkunci setelah pengiriman.`
        }
        label={preview ? "Ya, kirim simulasi" : "Ya, kirim pendaftaran"}
      />
      <Confirm
        open={!!deletion}
        onClose={() => setDeletion(null)}
        onConfirm={() => {
          deletion?.run();
          setDeletion(null);
        }}
        title={deletion?.title || "Hapus data?"}
        description={deletion?.description || ""}
        label="Ya, hapus"
        destructive
      />
    </fieldset>
  );
}
