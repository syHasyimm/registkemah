import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, TentTree } from "lucide-react";
import { Brand } from "@/components/brand";
import { siteConfig } from "@/config/site";
import { MotionPage, MotionReveal } from "@/components/motion";
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <aside className="auth-visual">
        <Image
          src="/images/camp-forest.jpg"
          alt="Suasana tenda perkemahan di tengah alam"
          fill
          priority
          sizes="46vw"
        />
        <Brand />
        <MotionReveal className="auth-visual-copy" delay={0.15} onView={false}>
          <TentTree />
          <h2>
            Satu regu.
            <br />
            Banyak cerita.
            <br />
            Kenangan selamanya.
          </h2>
          <p>
            Mulai persiapan sekolahmu. Petualangan, persaudaraan, dan pelajaran
            baru menunggu di luar sana.
          </p>
        </MotionReveal>
        <div className="auth-visual-footer">
          <span>Registrasi Perkemahan Sekolah</span>
          <span>Bertumbuh bersama.</span>
        </div>
      </aside>
      <div className="auth-content">
        <header className="auth-topbar">
          <Brand />
          <Link href="/" className="inline-flex items-center gap-2">
            <ArrowLeft size={13} />
            Kembali ke kegiatan
          </Link>
          <Link href="/preview" className="hidden md:inline">
            Jelajahi pratinjau
          </Link>
        </header>
        <main id="main-content" className="auth-form-container">
          <MotionPage>{children}</MotionPage>
        </main>
        <footer className="auth-content-footer">
          © 2026 {siteConfig.name} · Bersiap bersama. Bertumbuh bersama.
        </footer>
      </div>
    </div>
  );
}
