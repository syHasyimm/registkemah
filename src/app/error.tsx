"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="mx-auto max-w-lg px-6 py-24">
      <h1 className="text-2xl font-semibold">Halaman belum dapat dimuat</h1>
      <p className="my-4 leading-7 text-muted-foreground">
        Coba muat kembali. Jika masalah berlanjut, hubungi pengelola kegiatan.
      </p>
      <Button onClick={reset}>Coba lagi</Button>
    </main>
  );
}
