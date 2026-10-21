"use client";
import { useState, type FormEvent } from "react";
import { CalendarDays, Save, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionReveal } from "@/components/motion";
import { Field } from "./fields";
import { useCamp } from "./workspace";
import { Notice, PageHeading } from "./common";
import type { EventSettings } from "@/lib/camp/types";
export function EventSettingsForm() {
  const { data, commit, notify, preview } = useCamp();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState(data.event);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const change = (key: keyof EventSettings, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: string[] = [];
    if (!form.name.trim()) next.push("Nama kegiatan wajib diisi.");
    if (form.eventStart && form.eventEnd && form.eventEnd < form.eventStart)
      next.push(
        "Tanggal selesai harus sesudah atau sama dengan tanggal mulai.",
      );
    if (!!form.eventStart !== !!form.eventEnd)
      next.push("Isi kedua tanggal kegiatan atau kosongkan keduanya.");
    if (!!form.opens !== !!form.closes)
      next.push("Isi tanggal buka dan tutup pendaftaran secara lengkap.");
    if (form.opens && form.closes && form.closes <= form.opens)
      next.push("Penutupan pendaftaran harus setelah pembukaan.");
    if (
      form.contactPhone &&
      !/^(?:\+62|08)\d{7,13}$/.test(form.contactPhone.replace(/[\s()-]/g, ""))
    )
      next.push("Nomor kontak panitia belum valid.");
    if (form.contactPhone && !form.contactName.trim())
      next.push("Nama kontak panitia wajib diisi jika WhatsApp tersedia.");
    setErrors(next);
    if (next.length) return;
    if (pending) return;
    setPending(true);
    if (await commit({ ...data, event: form })) {
      setDirty(false);
      notify(
        preview
          ? "Pengaturan contoh tersimpan di browser. Informasi publik belum terhubung ke pengaturan ini."
          : "Pengaturan kegiatan tersimpan. Informasi publik mengikuti pengaturan terbaru.",
      );
    }
    setPending(false);
  }
  return (
    <>
      <PageHeading
        title="Pengaturan kegiatan"
        description="Satu sumber informasi untuk persiapan sekolah dan panitia."
      />
      <form onSubmit={save} noValidate>
        <fieldset disabled={pending} className="min-w-0">
          {errors.length > 0 && (
            <div role="alert" className="mb-5">
              <Notice tone="error" title="Periksa pengaturan">
                <ul className="error-list">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </Notice>
            </div>
          )}
          <div className="review-layout">
            <div className="stack">
              <MotionReveal as="section" delay={0.0} className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Identitas kegiatan</h2>
                    <p>
                      Gunakan informasi resmi yang telah ditetapkan panitia.
                    </p>
                  </div>
                </div>
                <div className="panel-body form-fields">
                  <Field
                    wide
                    label="Nama kegiatan"
                    required
                    maxLength={160}
                    value={form.name}
                    onChange={(e) => change("name", e.target.value)}
                  />
                  <Field wide label="Deskripsi kegiatan" id="event-description">
                    <textarea
                      id="event-description"
                      value={form.description}
                      maxLength={1000}
                      onChange={(e) => change("description", e.target.value)}
                    />
                  </Field>
                  <Field
                    wide
                    label="Lokasi perkemahan"
                    value={form.location}
                    maxLength={250}
                    placeholder="Diisi setelah lokasi ditetapkan"
                    onChange={(e) => change("location", e.target.value)}
                  />
                  <Field
                    label="Tanggal mulai kegiatan"
                    type="date"
                    value={form.eventStart}
                    onChange={(e) => change("eventStart", e.target.value)}
                  />
                  <Field
                    label="Tanggal selesai kegiatan"
                    type="date"
                    value={form.eventEnd}
                    onChange={(e) => change("eventEnd", e.target.value)}
                  />
                </div>
              </MotionReveal>
              <MotionReveal as="section" delay={0.06} className="panel">
                <div className="panel-header">
                  <h2>Periode pendaftaran</h2>
                  <CalendarDays size={17} className="text-muted-foreground" />
                </div>
                <div className="panel-body">
                  <div className="form-fields">
                    <Field
                      label="Pendaftaran dibuka"
                      type="datetime-local"
                      value={form.opens}
                      onChange={(e) => change("opens", e.target.value)}
                    />
                    <Field
                      label="Pendaftaran ditutup"
                      type="datetime-local"
                      value={form.closes}
                      onChange={(e) => change("closes", e.target.value)}
                    />
                    <Field label="Zona waktu" id="event-timezone" wide>
                      <select
                        id="event-timezone"
                        value={form.timezone}
                        onChange={(e) => change("timezone", e.target.value)}
                      >
                        <option value="Asia/Jakarta">
                          WIB · Asia/Jakarta (UTC+7)
                        </option>
                        <option value="Asia/Makassar">
                          WITA · Asia/Makassar (UTC+8)
                        </option>
                        <option value="Asia/Jayapura">
                          WIT · Asia/Jayapura (UTC+9)
                        </option>
                      </select>
                    </Field>
                  </div>
                  <div className="mt-5">
                    <Notice>
                      Di luar periode pendaftaran, sekolah dapat membaca dan
                      menyimpan draf. Pengiriman baru dan pengiriman ulang
                      ditutup sampai periode diperpanjang.
                    </Notice>
                  </div>
                </div>
              </MotionReveal>
              <MotionReveal as="section" delay={0.12} className="panel">
                <div className="panel-header">
                  <h2>Kontak & pengambilan kartu</h2>
                </div>
                <div className="panel-body form-fields">
                  <Field
                    label="Nama kontak panitia"
                    maxLength={100}
                    value={form.contactName}
                    onChange={(e) => change("contactName", e.target.value)}
                    placeholder="Nama atau bagian kepanitiaan"
                  />
                  <Field
                    label="WhatsApp panitia"
                    maxLength={20}
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => change("contactPhone", e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                  <Field
                    wide
                    label="Petunjuk registrasi fisik"
                    id="event-pickup"
                  >
                    <textarea
                      id="event-pickup"
                      value={form.pickup}
                      maxLength={1000}
                      onChange={(e) => change("pickup", e.target.value)}
                    />
                  </Field>
                </div>
              </MotionReveal>
            </div>
            <aside className="stack">
              <MotionReveal as="section" delay={0.0} className="panel">
                <div className="panel-header">
                  <h2>Ketentuan tetap</h2>
                  <ShieldCheck size={17} />
                </div>
                <div className="panel-body">
                  <div className="event-detail">
                    <Users />
                    <div>
                      <small>Anggota per regu</small>
                      <strong>Minimal 8, maksimal 15</strong>
                    </div>
                  </div>
                  <p className="muted">
                    Berlaku untuk putri dan putra. Pemimpin regu dihitung
                    sebagai peserta, pembina pendamping tidak.
                  </p>
                  <div className="section-divider">
                    <h3>Data peserta</h3>
                    <p className="muted">
                      Nama dan pangkalan wajib. Foto dan kelas opsional.
                    </p>
                  </div>
                  <div className="section-divider">
                    <h3>Kartu peserta</h3>
                    <p className="muted">
                      Hanya dilihat dan dicetak panitia. Operator mengambil
                      kartu fisik saat menyerahkan formulir.
                    </p>
                  </div>
                </div>
              </MotionReveal>
              <Notice
                title={
                  preview
                    ? "Informasi kegiatan masih berupa contoh"
                    : "Gunakan jadwal resmi panitia"
                }
              >
                Jangan mengambil jadwal kegiatan dari gambar desain kartu.
                Jadwal resmi harus ditetapkan oleh panitia.
              </Notice>
            </aside>
          </div>
          <div className="form-footer">
            <span className={`save-status ${dirty ? "dirty" : ""}`}>
              {dirty
                ? "Ada perubahan belum disimpan"
                : preview
                  ? "Pengaturan contoh tersimpan di browser ini"
                  : "Pengaturan tersimpan di server"}
            </span>
            <Button type="submit">
              <Save />
              {pending ? "Menyimpan..." : "Simpan pengaturan"}
            </Button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
