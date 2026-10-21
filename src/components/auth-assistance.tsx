"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/camp/fields";
import { Notice } from "@/components/camp/common";

export function AuthAssistance({
  mode,
  token = "",
  email = "",
  mailEnabled = false,
}: {
  mode: "verify" | "forgot" | "reset";
  token?: string;
  email?: string;
  mailEnabled?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);
  const [info, setInfo] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    if (mode !== "reset") {
      if (!mailEnabled) {
        setMessage(
          "Layanan email belum dikonfigurasi pengelola. Hubungi panitia untuk bantuan akun.",
        );
        return;
      }
      setPending(true);
      setInfo("");
      try {
        const email = String(form.get("email")).trim();
        const result =
          mode === "forgot"
            ? await authClient.requestPasswordReset({
                email,
                redirectTo: "/reset-password",
              })
            : await authClient.sendVerificationEmail({
                email,
                callbackURL: "/after-login",
              });
        if (result.error)
          setMessage(
            "Permintaan belum dapat diproses. Periksa alamat email atau coba beberapa saat lagi.",
          );
        else
          setInfo(
            mode === "forgot"
              ? "Jika alamat tersebut terdaftar, tautan pemulihan dijadwalkan ke email akun. Periksa kotak masuk dan spam."
              : "Jika akun memerlukan verifikasi, tautan verifikasi dijadwalkan ke email tersebut. Periksa kotak masuk dan spam.",
          );
      } catch {
        setMessage("Server belum dapat dihubungi. Coba lagi.");
      } finally {
        setPending(false);
      }
      return;
    }
    const password = String(form.get("password"));
    if (password !== String(form.get("confirmation"))) {
      setMessage("Konfirmasi password belum sama.");
      return;
    }
    if (!token) {
      setMessage(
        "Tautan pemulihan tidak lengkap atau sudah tidak berlaku. Minta tautan baru melalui halaman lupa password.",
      );
      return;
    }
    setPending(true);
    try {
      const result = await authClient.resetPassword({
        token,
        newPassword: password,
      });
      if (result.error)
        setMessage(
          "Password belum dapat diubah. Tautan mungkin kedaluwarsa atau tidak valid. Minta tautan pemulihan baru.",
        );
      else setDone(true);
    } catch {
      setMessage("Server belum dapat dihubungi. Coba lagi.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <span className="mail-icon">
        {done ? <CheckCircle2 /> : mode === "reset" ? <KeyRound /> : <Mail />}
      </span>
      <h1>
        {done
          ? "Password diperbarui."
          : mode === "forgot"
            ? "Lupa password?"
            : mode === "verify"
              ? "Verifikasi emailmu."
              : "Buat password baru."}
      </h1>
      <p>
        {done
          ? "Gunakan password baru untuk masuk dan melanjutkan persiapan sekolahmu."
          : mode === "forgot"
            ? "Masukkan email akun sekolah untuk meminta tautan pemulihan password."
            : mode === "verify"
              ? "Email yang terverifikasi membantu memastikan kabar persetujuan sampai ke alamat yang benar."
              : "Pilih password yang aman dan mudah kamu ingat. Minimal 8 karakter."}
      </p>
      {done ? (
        <Button asChild className="full-button mt-6">
          <Link href="/sign-in">
            Masuk sekarang <ArrowRight />
          </Link>
        </Button>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <fieldset disabled={pending} className="contents">
            <legend className="sr-only">
              {mode === "reset" ? "Atur password baru" : "Alamat email akun"}
            </legend>
            {mode === "reset" ? (
              <>
                <div className="field">
                  <label htmlFor="new-password">
                    Password baru<span className="required">*</span>
                  </label>
                  <div className="password-input">
                    <Input
                      id="new-password"
                      name="password"
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={128}
                    />
                    <button
                      type="button"
                      aria-label={
                        show ? "Sembunyikan password" : "Tampilkan password"
                      }
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Field
                  label="Konfirmasi password baru"
                  name="confirmation"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
                {!token && (
                  <Notice tone="warning">
                    Tautan pemulihan belum tersedia. Buka halaman ini melalui
                    tautan dari email pemulihan yang masih berlaku.
                  </Notice>
                )}
              </>
            ) : (
              <Field
                label="Email akun"
                name="email"
                defaultValue={email}
                type="email"
                autoComplete="email"
                placeholder="nama@sekolah.sch.id"
                required
                maxLength={254}
              />
            )}
            {message && (
              <div role="alert">
                <Notice tone="warning">{message}</Notice>
              </div>
            )}
            {info && (
              <div role="status">
                <Notice tone="success">{info}</Notice>
              </div>
            )}
            <Button type="submit" className="full-button" disabled={pending}>
              {pending
                ? "Memproses…"
                : mode === "forgot"
                  ? "Minta tautan pemulihan"
                  : mode === "verify"
                    ? "Kirim ulang email verifikasi"
                    : "Simpan password baru"}
              {mode === "verify" ? <RefreshCw /> : <ArrowRight />}
            </Button>
          </fieldset>
        </form>
      )}
      {mode === "verify" && (
        <div className="mt-5">
          <Notice title="Periksa folder spam juga">
            Tautan verifikasi berlaku selama satu jam. Jangan membagikan tautan
            tersebut kepada orang lain.
          </Notice>
        </div>
      )}
      <p className="auth-bottom">
        <Link
          href={mode === "reset" ? "/forgot-password" : "/sign-in"}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft size={13} />
          {mode === "reset" ? "Minta tautan baru" : "Kembali ke halaman masuk"}
        </Link>
      </p>
    </>
  );
}
