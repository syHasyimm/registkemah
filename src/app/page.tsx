import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Users,
  ClipboardList,
  FileCheck2,
  TentTree,
  ChevronDown,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { getEvent } from "@/services/camp.service";
import { registrationOpen } from "@/lib/camp/types";
export const dynamic = "force-dynamic";

const questions = [
  [
    "Siapa yang dapat mendaftarkan sekolah?",
    "Pembina atau perwakilan sekolah dapat membuat satu akun untuk mengelola pendaftaran sekolah, seluruh regu, dan peserta.",
  ],
  [
    "Berapa peserta dalam satu regu?",
    "Setiap regu putri maupun putra terdiri dari 8–15 peserta, termasuk pemimpin regu. Pembina pendamping tidak dihitung sebagai peserta. Sekolah boleh mendaftarkan beberapa regu.",
  ],
  [
    "Apakah foto peserta wajib diunggah?",
    "Tidak. Nama lengkap dan pangkalan wajib diisi, sedangkan foto dan kelas bersifat opsional. Peserta tanpa foto tetap dapat mengikuti pendaftaran.",
  ],
  [
    "Bagaimana cara mengambil kartu peserta?",
    "Setelah pendaftaran terverifikasi, unduh dan cetak formulir pendaftaran. Bawa serta serahkan formulir kepada panitia di lokasi untuk menerima kartu fisik peserta.",
  ],
  [
    "Apakah formulir harus selesai sekaligus?",
    "Tidak. Pada aplikasi yang terhubung, Anda dapat menyimpan draf pada setiap langkah dan melanjutkannya sebelum pendaftaran ditutup. Mode pratinjau menyimpan contoh draf di browser ini.",
  ],
];

export default async function HomePage() {
  const { settings: event } = await getEvent();
  return (
    <>
      <header className="public-header">
        <div className="public-container public-nav">
          <Brand />
          <nav aria-label="Navigasi utama" className="public-links">
            <a href="#tentang">Tentang kegiatan</a>
            <a href="#alur">Alur pendaftaran</a>
            <a href="#faq">Tanya jawab</a>
          </nav>
          <Button asChild variant="outline">
            <Link href="/sign-in">
              Masuk <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </header>
      <main id="main-content">
        <section className="public-container landing-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Compass size={16} /> DARI SEKOLAH, UNTUK PETUALANGAN
            </span>
            <h1>
              Langkah kecil.
              <br />
              <span>Petualangan besar.</span>
            </h1>
            <p>
              Siapkan regumu, temukan kawan baru, dan tumbuh bersama di alam.
              Daftarkan gugus depan sekolahmu di sini.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Daftarkan sekolah <ArrowRight />
                </Link>
              </Button>
              <Link href="/preview" className="text-link">
                Jelajahi aplikasi <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          <div className="hero-photo">
            <Image
              src="/images/camp-forest.jpg"
              alt="Pemandangan hutan dari dalam tenda perkemahan"
              fill
              priority
              sizes="(max-width: 767px) 100vw, 52vw"
            />
            <div className="hero-photo-shade" />
            <div className="photo-message">
              <TentTree size={32} />
              <p>
                Lebih dari berkemah.
                <br />
                <strong>Tentang tumbuh bersama.</strong>
              </p>
            </div>
          </div>
        </section>
        <section
          className="public-container event-strip"
          aria-label="Informasi kegiatan"
        >
          <div>
            <CalendarDays />
            <span>
              <small>Jadwal kegiatan</small>
              <strong>
                {event.eventStart
                  ? `${event.eventStart} s.d. ${event.eventEnd}`
                  : "Akan diumumkan panitia"}
              </strong>
            </span>
          </div>
          <div>
            <MapPin />
            <span>
              <small>Lokasi perkemahan</small>
              <strong>{event.location || "Menunggu informasi resmi"}</strong>
            </span>
          </div>
          <div>
            <Users />
            <span>
              <small>Terbuka untuk</small>
              <strong>Regu putri & regu putra</strong>
            </span>
          </div>
          <a href="#tentang" aria-label="Lihat informasi kegiatan">
            <ArrowRight />
          </a>
        </section>
        <section id="tentang" className="public-container about-section">
          <div>
            <h2>{event.name}</h2>
            <p>{event.description}</p>
            <a href="#alur" className="text-link">
              Mulai dari pendaftaran yang mudah <ArrowRight size={17} />
            </a>
          </div>
          <div className="principles">
            <div>
              <span>01</span>
              <h3>Satu akun, satu sekolah</h3>
              <p>Kelola data sekolah dan seluruh regu dalam satu tempat.</p>
            </div>
            <div>
              <span>02</span>
              <h3>8–15 peserta per regu</h3>
              <p>
                Daftarkan regu putri, putra, atau keduanya. Jumlah dihitung
                otomatis.
              </p>
            </div>
            <div>
              <span>03</span>
              <h3>Siap sebelum berangkat</h3>
              <p>
                Pantau verifikasi dan bawa formulir untuk mengambil kartu di
                lokasi.
              </p>
            </div>
          </div>
        </section>
        <section id="alur" className="steps-section">
          <div className="public-container">
            <h2>Dari layar, menuju alam.</h2>
            <p className="section-intro">
              Empat langkah sederhana menyiapkan petualangan sekolahmu.
            </p>
            <div className="landing-steps">
              {[
                {
                  icon: Users,
                  title: "Buat akun sekolah",
                  text: "Daftar dengan email, lalu lengkapi identitas sekolah dan penanggung jawab.",
                },
                {
                  icon: TentTree,
                  title: "Siapkan regumu",
                  text: "Tambahkan regu, nama peserta, dan pangkalan. Foto peserta opsional.",
                },
                {
                  icon: ShieldCheck,
                  title: "Kirim & pantau",
                  text: "Periksa kembali data dan kirim untuk diverifikasi oleh panitia.",
                },
                {
                  icon: FileCheck2,
                  title: "Cetak & berangkat",
                  text: "Bawa formulir yang disetujui untuk menerima kartu fisik di lokasi.",
                },
              ].map((item, i) => (
                <div key={item.title}>
                  <div className="step-icon">
                    <item.icon />
                    <span>0{i + 1}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="faq" className="public-container faq-section">
          <div>
            <span className="eyebrow">SEBELUM BERANGKAT</span>
            <h2>
              Ada yang ingin
              <br />
              kamu ketahui?
            </h2>
            <p>
              Beberapa hal yang sering ditanyakan pembina dan operator sekolah.
            </p>
            <div className="contact-note">
              <ClipboardList />
              <span>
                {event.contactName
                  ? `Kontak panitia: ${event.contactName} ${event.contactPhone}`
                  : "Kontak panitia akan ditampilkan setelah informasi kegiatan ditetapkan."}
              </span>
            </div>
          </div>
          <div className="faq-list">
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="public-container closing-cta">
          <TentTree size={40} />
          <h2>
            Cerita berikutnya
            <br />
            dimulai dari regumu.
          </h2>
          <Button asChild size="lg">
            <Link href="/sign-up">
              Mulai pendaftaran <ArrowUpRight />
            </Link>
          </Button>
          <p>
            {registrationOpen(event)
              ? `Pendaftaran dibuka sampai ${event.closes.replace("T", " ")} (${event.timezone}).`
              : event.opens
                ? "Periode pendaftaran sedang ditutup. Draf dapat disimpan setelah masuk."
                : "Jadwal pendaftaran akan diumumkan oleh panitia."}
          </p>
        </section>
      </main>
      <footer className="public-container public-footer">
        <Brand />
        <p>Bersiap bersama. Bertumbuh bersama.</p>
        <Link href="/preview">
          Pratinjau frontend <ArrowUpRight size={14} />
        </Link>
        <span>© 2026 {siteConfig.name}</span>
      </footer>
    </>
  );
}
