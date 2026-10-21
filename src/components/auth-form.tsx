"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Leaf, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/camp/fields";
import { Notice } from "@/components/camp/common";

export function AuthForm({
  mode,
  googleEnabled = false,
}: {
  mode: "sign-in" | "sign-up";
  googleEnabled?: boolean;
}) {
  const signingUp = mode === "sign-up";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setError("");
    const credentials = {
      email: String(data.get("email")).trim(),
      password: String(data.get("password")),
    };
    if (
      signingUp &&
      credentials.password !== String(data.get("confirmPassword"))
    ) {
      setError(
        "Konfirmasi password belum sama. Periksa kembali kedua kolom password.",
      );
      return;
    }
    setPending(true);
    try {
      const result = signingUp
        ? await authClient.signUp.email({
            ...credentials,
            name: String(data.get("name")).trim(),
            callbackURL: "/after-login",
          })
        : await authClient.signIn.email(credentials);
      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          router.replace(
            `/verify-email?email=${encodeURIComponent(credentials.email)}`,
          );
          return;
        }
        setError(
          signingUp
            ? "Akun belum dapat dibuat. Periksa email dan password, atau masuk jika email sudah terdaftar."
            : "Belum berhasil masuk. Periksa email dan password, lalu coba lagi.",
        );
        return;
      }
      router.replace(
        signingUp
          ? `/verify-email?email=${encodeURIComponent(credentials.email)}`
          : "/after-login",
      );
      router.refresh();
    } catch {
      setError(
        "Server belum dapat dihubungi. Periksa koneksi dan coba lagi. Isianmu tetap ada.",
      );
    } finally {
      setPending(false);
    }
  }
  async function google() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/after-login",
        errorCallbackURL: "/sign-in",
      });
      if (result.error) {
        setError(
          "Google belum dapat digunakan. Silakan masuk menggunakan email dan password.",
        );
        setPending(false);
      }
    } catch {
      setError(
        "Belum dapat terhubung ke Google. Coba lagi atau gunakan email.",
      );
      setPending(false);
    }
  }
  return (
    <>
      <span className="auth-kicker">
        <Leaf size={13} /> PETUALANGAN DIMULAI DI SINI
      </span>
      <h1>{signingUp ? "Mari siapkan regumu." : "Selamat datang kembali."}</h1>
      <p>
        {signingUp
          ? "Buat akun untuk mengelola pendaftaran sekolah dan seluruh regumu."
          : "Masuk untuk melanjutkan persiapan dan melihat kabar pendaftaran sekolahmu."}
      </p>
      <Button
        className="google-button"
        variant="outline"
        disabled={pending || !googleEnabled}
        onClick={google}
      >
        <span className="google-letter" aria-hidden="true">
          G
        </span>
        {signingUp ? "Daftar dengan Google" : "Masuk dengan Google"}
      </Button>
      {!googleEnabled && (
        <p className="text-center !text-[10px] !mt-2">
          Google belum diaktifkan panitia. Gunakan email untuk melanjutkan.
        </p>
      )}
      <div className="or-divider">atau gunakan email</div>
      <form className="auth-form" onSubmit={onSubmit} aria-busy={pending}>
        <fieldset disabled={pending} className="contents">
          <legend className="sr-only">
            {signingUp ? "Buat akun sekolah" : "Masuk ke akun"}
          </legend>
          {signingUp && (
            <Field
              id="name"
              label="Nama lengkap"
              name="name"
              autoComplete="name"
              placeholder="Nama pembina atau perwakilan sekolah"
              required
              minLength={1}
              maxLength={100}
              pattern=".*\S.*"
            />
          )}
          <Field
            label="Email"
            name="email"
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@sekolah.sch.id"
            required
            maxLength={254}
          />
          <div className="field">
            <label htmlFor="password">
              Password<span className="required">*</span>
            </label>
            <div className="password-input">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={signingUp ? "new-password" : "current-password"}
                required
                minLength={8}
                maxLength={128}
                placeholder={
                  signingUp ? "Minimal 8 karakter" : "Masukkan password"
                }
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {signingUp && (
              <small>Gunakan minimal 8 karakter untuk menjaga akunmu.</small>
            )}
          </div>
          {signingUp ? (
            <div className="field">
              <label htmlFor="confirm-password">
                Konfirmasi password<span className="required">*</span>
              </label>
              <div className="password-input">
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmation ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Ketik ulang password"
                  required
                  minLength={8}
                  maxLength={128}
                />
                <button
                  type="button"
                  aria-label={
                    showConfirmation
                      ? "Sembunyikan konfirmasi password"
                      : "Tampilkan konfirmasi password"
                  }
                  aria-pressed={showConfirmation}
                  onClick={() => setShowConfirmation(!showConfirmation)}
                >
                  {showConfirmation ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ) : (
            <Link className="forgot-link" href="/forgot-password">
              Lupa password?
            </Link>
          )}
          {error && (
            <div role="alert">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
          <Button className="full-button" type="submit" disabled={pending}>
            {pending && (
              <LoaderCircle className="animate-spin motion-reduce:animate-none" />
            )}
            {pending ? "Mohon tunggu…" : signingUp ? "Buat akun" : "Masuk"}
            {!pending && <ArrowRight />}
          </Button>
        </fieldset>
      </form>
      <p className="auth-bottom">
        {signingUp ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
        <Link href={signingUp ? "/sign-in" : "/sign-up"}>
          {signingUp ? "Masuk di sini" : "Daftarkan sekolahmu"}
        </Link>
      </p>
    </>
  );
}
