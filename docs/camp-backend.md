# Backend Registrasi Kemah

Frontend aplikasi di `/app` dan `/admin` sekarang memakai PostgreSQL dan API nyata. `/preview` tetap memakai data contoh yang terpisah di browser. Draf frontend lama tidak otomatis diimpor ke database.

## Menjalankan secara lokal

1. Jalankan `npm run predev`, lalu `npm run doctor` untuk mempersiapkan database tanpa menghapus data.
2. Jalankan `npm run email:dev` untuk menyiapkan penampung email Mailpit lokal. Script memilih port bebas dan hanya menambah pengaturan SMTP yang belum tersedia. SMTP eksternal yang sudah diberikan tetap dipertahankan. Alamat kotak masuk ditampilkan oleh perintah tersebut.
3. Jalankan `npm run dev`. Jika server sudah berjalan ketika pengaturan SMTP berubah, mulai ulang server tersebut.
4. Daftar akun sendiri melalui `/sign-up`, buka tautan verifikasi dari kotak masuk lokal, lalu lanjutkan di `/app`.
5. Untuk menunjuk panitia, jalankan `npm run role:set -- email@example.com panitia`, atau gunakan seeder panitia di bawah. Pengguna tidak dapat memilih peran sendiri saat mendaftar.
6. Panitia melengkapi lokasi, jadwal kegiatan, periode pendaftaran, zona waktu, dan kontak melalui `/admin/kegiatan`. Jadwal awal sengaja belum diisi. Sebelum periode dibuka, draf dapat disimpan tetapi belum dapat dikirim.

Mailpit hanya menangkap email pengujian di komputer ini. Ia tidak mengirim pesan ke kotak masuk internet dan tidak dipakai sebagai SMTP produksi.

## Seeder panitia

Isi konfigurasi privat `.env.local` dengan email milik panitia, nama, dan password pilihan sendiri:

```dotenv
PANITIA_EMAIL=email-panitia@sekolah.sch.id
PANITIA_NAME="Panitia Perkemahan"
PANITIA_PASSWORD="isi-password-pilihan-Anda"
```

Jalankan `npm run seed:panitia`, lalu masuk melalui `/sign-in`. Akun panitia langsung diarahkan ke `/admin`. Database harus sudah dimigrasikan (`npm run predev`). Seeder tidak dijalankan otomatis saat aplikasi dimulai.

- Akun baru dibuat dengan peran `panitia`, email terverifikasi melalui provisioning CLI tepercaya, dan password 8–128 karakter yang di-hash memakai fungsi resmi Better Auth. Seeder tidak membutuhkan SMTP dan tidak membuat sesi login.
- Peran `panitia` dapat melihat/memeriksa pendaftaran dan foto, memberi keputusan, menyiapkan ulang PDF/kartu/email, mengunduh CSV/PDF, mencetak kartu, dan mengatur kegiatan. Peran ini tidak memberikan pengelolaan pengguna/sesi Better Auth atau akses Notes lintas akun.
- Untuk email yang sudah terdaftar, seeder mengganti peran lama menjadi tepat `panitia`, termasuk jika sebelumnya `admin`. Password, nama, metode Google/email, status verifikasi, larangan akun, dan data sekolah tetap dipertahankan. `PANITIA_PASSWORD` boleh dikosongkan untuk akun lama, termasuk akun Google. Akun lama yang belum terverifikasi tetap mengikuti alur verifikasi biasa.
- Perintah aman diulang dan dijalankan bersamaan: satu akun email tetap memiliki satu credential hasil seeding. Pembuatan pengguna dan credential berada dalam satu transaksi, sehingga tidak menyisakan akun setengah jadi jika gagal.
- Tidak tersedia email/password panitia bawaan. Nilai password tidak dicetak atau diterima melalui argumen command line. Kredensial dapat diberikan melalui environment deployment; jangan menyimpannya dalam Git. Jika password mengandung karakter `$`, tulis `\$` dalam berkas dotenv agar tidak dianggap ekspansi variabel.
- Gunakan `npm run seed:panitia -- --help` untuk petunjuk. Seeder bukan sarana reset password; gunakan pemulihan password yang tersedia untuk mengganti password.

## Penyimpanan dan validasi

Migrasi baru `0003` dan `0004` menambahkan tabel sekolah, kegiatan, pendaftaran, regu, peserta, foto, riwayat status, versi persetujuan, dokumen, kartu, pekerjaan latar, dan audit pekerjaan. Tabel akun dan Notes bawaan dipertahankan.

## Pemisahan role dan area aplikasi

| Role tersimpan | Jenis akun       | Tujuan login | Area yang diizinkan                                         |
| -------------- | ---------------- | ------------ | ----------------------------------------------------------- |
| `user`         | Operator sekolah | `/app`       | Halaman operator dan API milik sekolahnya                   |
| `panitia`      | Panitia          | `/admin`     | Pemeriksaan, dokumen/kartu, ekspor, dan pengaturan kegiatan |
| `admin`        | Admin            | `/admin`     | Area panitia dan pengelolaan akun administratif             |

Email/password, Google, verifikasi email, dan sesi yang sudah login memakai `/after-login` sebagai penentu tujuan di server. Pendaftaran publik selalu membuat operator; field role dari browser tidak dapat meningkatkan hak akses. Akun staf tidak otomatis dibuatkan sekolah/draf.

Halaman lintas area mengarahkan pengguna ke dashboard sesuai role. Seluruh API operator diperiksa melalui `withOperatorSession`; API staf memakai `withApiPermission` dengan role staf dan izin resource. Akses lintas area menghasilkan JSON 403. Sesi dibaca dari database tanpa cookie cache untuk memastikan perubahan role berlaku pada permintaan berikutnya. UI yang menerima `FORBIDDEN_ROLE` berpindah ke area baru.

Migrasi `0005` menormalkan role lama menjadi satu nilai: `admin` mengambil prioritas, kemudian `panitia`, lalu `user`; nilai kosong menjadi `user`. Migrasi berhenti jika menemukan token role yang tidak dikenal. Akun, sekolah, peserta, dan dokumen tetap disimpan. Constraint database menolak role gabungan/tidak dikenal/null. `role:set`, seeder, serta hook Better Auth juga memvalidasi satu role; `role:set ... user` mengembalikan akun menjadi operator.

## Validasi pendaftaran

- Satu akun memiliki satu sekolah dan satu pendaftaran untuk kegiatan aktif. NPSN yang diisi unik; benturan mengarahkan pengguna menghubungi panitia tanpa membuka data akun lain.
- Nama sekolah, penanggung jawab, WhatsApp, dan kabupaten/kota wajib sebelum pengiriman. NPSN/gudep serta kolom opsional tetap opsional.
- Draf dapat belum lengkap. Maksimal 15 baris peserta per regu berlaku juga pada draf. Pengiriman wajib memiliki minimal satu regu, masing-masing 8–15 peserta bernama dengan pangkalan lengkap. Jumlah dihitung dari baris database.
- Semua mutasi memakai sesi yang diverifikasi, pemeriksaan Origin, schema Zod strict, dan transaksi. Pemilik ditentukan dari sesi. Email sekolah diambil dari akun dan tidak diterima dari payload formulir.
- Simpan memakai `revision` untuk menolak penimpaan dari perangkat atau tab lain. Pengiriman dan keputusan mengunci baris induk dengan `FOR UPDATE`. Klik pengiriman/persetujuan ganda tidak membuat nomor atau pekerjaan ganda.
- Nama peserta sama menjadi peringatan. Nama regu sama dalam kategori yang sama ditolak saat pengiriman; nama regu sama lintas kategori diizinkan.
- API membatasi request JSON sampai 2 MB dan maksimal 100 regu per pendaftaran sebagai batas sumber daya. Semua regu yang disimpan diproses; ekspor tidak dibatasi oleh satu halaman daftar.

## Kontrak API

Semua endpoint di bawah kecuali informasi kegiatan memerlukan sesi. API panitia memerlukan izin tambahan; kegagalan akses menghasilkan JSON 401/403. Rekaman yang tidak ada dan yang bukan milik operator sama-sama menghasilkan 404. Respons privat memakai `Cache-Control: private, no-store`.

| Endpoint                                           | Perilaku                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `GET /api/camp/event`                              | Informasi kegiatan publik terkini.                                                      |
| `GET /api/camp/workspace`                          | Data operator dan pendaftaran miliknya.                                                 |
| `POST /api/registrations`                          | Membuat draf pertama secara idempoten.                                                  |
| `GET /api/registrations/:id`                       | Membaca pendaftaran milik operator.                                                     |
| `PUT /api/registrations/:id`                       | Menyimpan sekolah/regu/peserta dan crop foto dengan revisi terkini.                     |
| `POST /api/registrations/:id/submit`               | Validasi final, pernyataan data, pemberian nomor, dan status Dikirim.                   |
| `POST /api/registrations/:id/photos`               | Membuka unggahan foto untuk peserta yang sudah disimpan.                                |
| `PUT /api/registrations/:id/photos/:photoId`       | Menerima bytes foto dan memvalidasi isi gambar.                                         |
| `DELETE /api/registrations/:id/photos/:photoId`    | Membatalkan unggahan yang belum selesai.                                                |
| `GET /api/registrations/:id/photos/:photoId`       | Foto privat sekolah pemilik.                                                            |
| `GET /api/registrations/:id/document`              | PDF versi persetujuan aktif, hanya setelah siap.                                        |
| `GET /api/admin/camp/workspace`                    | Workspace dan agregat panitia.                                                          |
| `GET /api/admin/camp/overview`                     | Statistik masuk/terverifikasi, status, dan tanggal pengiriman.                          |
| `PUT /api/admin/camp/event`                        | Menyimpan konfigurasi kegiatan dengan revisi.                                           |
| `GET /api/admin/registrations`                     | Pencarian nama/nomor, filter status/wilayah, pagination server.                         |
| `GET /api/admin/registrations/export`              | CSV sekolah/peserta dari seluruh hasil filter, dengan perlindungan formula spreadsheet. |
| `GET /api/admin/registrations/:id`                 | Detail dan status operasional untuk panitia.                                            |
| `POST /api/admin/registrations/:id/decision`       | Persetujuan, penolakan, atau permintaan revisi dengan catatan.                          |
| `POST /api/admin/registrations/:id/retry`          | Ulang PDF/kartu/email aktif; pembatasan 60 detik dan audit.                             |
| `GET /api/admin/registrations/:id/document`        | PDF untuk panitia.                                                                      |
| `GET /api/admin/registrations/:id/photos/:photoId` | Foto privat untuk pemeriksaan.                                                          |
| `GET /api/admin/registrations/:id/cards`           | Daftar kartu versi aktif, hanya panitia.                                                |
| `GET /api/admin/registrations/:id/cards/:cardId`   | Gambar kartu privat, hanya panitia.                                                     |

Payload simpan hanya berisi `revision`, `school` tanpa email, dan daftar `patrols`. Setiap peserta membawa `photoId` privat atau `null`; data URL/URL asing tidak diterima sebagai identitas foto. Pengiriman menerima `{ revision, acknowledged: true }`. Keputusan menerima `{ revision, status, note }`. Pengaturan menerima `{ revision, settings }`.

## Foto dan berkas privat

Bytes gambar diperiksa melalui Sharp, bukan ekstensi berkas. Format JPEG/PNG/WebP hingga 5 MB dan 40 juta piksel diterima. Animasi ditolak. Server membetulkan orientasi, memperkecil gambar, dan membuang metadata saat membuat WebP. UI menampilkan progres, pembatalan, kesalahan, serta pilihan mengunggah ulang.

Unggahan dibuka sebelum transfer agar pengiriman dapat menolak unggahan yang masih berjalan. Unggahan yang terbengkalai kedaluwarsa setelah 20 menit. Hasil foto berupa versi immutable; mengganti atau melepaskan foto tidak menghapus versi yang masih diperlukan persetujuan lama.

Berkas disimpan di `PRIVATE_STORAGE_DIR`, default `.data/camp`, menggunakan nama UUID buatan server. Direktori ini tidak berada di `public`, diabaikan Git, dan dikecualikan dari build image. Jalur filesystem tidak dikirim ke browser. Untuk produksi gunakan volume persisten dan sertakan database serta direktori ini dalam rencana backup. Jika ada beberapa instance aplikasi, semuanya harus membaca penyimpanan privat bersama yang sama.

## Persetujuan dan pekerjaan latar

Persetujuan menyimpan snapshot sekolah, peserta, referensi foto, dan konfigurasi kegiatan serta membuat pekerjaan PDF, kartu, dan email dalam satu transaksi. Snapshot menjadi sumber semua keluaran versi tersebut.

Worker dimulai dari `src/instrumentation.ts` pada proses Node Next.js. Ia mengambil pekerjaan dengan `FOR UPDATE SKIP LOCKED`, lease lima menit, token lease, dan maksimal tiga percobaan otomatis. Hasil baru hanya diaktifkan setelah versi/status diperiksa ulang. Pekerjaan persisten dapat dilanjutkan setelah proses aplikasi dimulai ulang. `CAMP_WORKER_DISABLED=true` tersedia untuk pemeliharaan; jika dipakai, pekerjaan menunggu sampai worker diaktifkan kembali.

- PDF dibuat aplikasi memakai PDFKit dengan font Noto Sans tertanam dan kop Gerakan Pramuka Kwartir Ranting Kepenuhan dari `assets/registration-letterhead.png`. Identitas sekolah hanya memuat nama sekolah dan penanggung jawab. Putra dan putri dicetak pada lembar A4 terpisah, masing-masing dengan tabel empat kolom (NO, Nama Lengkap, Pangkalan, Foto), rekap kategori 12 pt di bawah tabel, petunjuk pengambilan, dan ruang tanda tangan 90 pt. Nomor pendaftaran, status, versi, tanggal persetujuan, dan nomor halaman tidak dicetak pada isi PDF. Satu regu dengan 8–15 peserta berukuran teks normal muat satu lembar; tambahan regu atau teks panjang berlanjut di lembar kategori yang sama dengan kop dan header tabel berulang. Kategori yang tidak didaftarkan tidak menghasilkan lembar kosong. PDF tidak memuat kartu peserta. Unduhan persetujuan lama otomatis memakai tata letak terbaru dari snapshot yang disetujui, tanpa persetujuan ulang atau pengiriman email ulang.
- Kartu dibuat sebagai PNG dari desain referensi yang disimpan utuh. Lapisan dinamis menghapus isi contoh, memakai foto lingkaran/crop yang sama, serta nama dan pangkalan uppercase. Halaman panitia mencetak tiga kolom A4 pada ukuran CSS tepat 55 × 85 mm. Periksa skala 100% pada printer; identitas sangat panjang menyesuaikan ukuran teks.
- Kartu/formulir/email gagal diproses secara terpisah. Kegagalan email tidak membatalkan persetujuan atau unduhan PDF.
- Revisi menonaktifkan persetujuan lama dan membatalkan pekerjaan lama yang belum selesai. Endpoint berkas memeriksa versi aktif; mengetahui URL lama tidak memberikan akses kembali.
- Pekerjaan dan permintaan ulang diaudit di `camp_job_events`. Status SMTP “Diterima layanan email” tidak berarti pesan sudah dibaca atau pasti masuk kotak masuk.

SMTP menggunakan Message-ID stabil per pekerjaan. Duplikasi karena klik persetujuan dicegah melalui kunci unik pendaftaran/versi/jenis. Seperti SMTP pada umumnya, crash setelah layanan menerima pesan tetapi sebelum hasil dicatat dapat memerlukan pemeriksaan manual dan berpotensi menghasilkan pengiriman ulang; SMTP tidak menyediakan transaksi bersama database atau jaminan exactly-once.

## Akun dan konfigurasi produksi

Email/password membutuhkan verifikasi. Email verifikasi dan pemulihan password masuk antrean SMTP yang sama, dengan tautan kedaluwarsa; isi tautan tidak dicetak pada log. Login Google menggunakan konfigurasi yang sudah ada dan hanya aktif jika `GOOGLE_CLIENT_ID` serta `GOOGLE_CLIENT_SECRET` tersedia. Callback Google adalah `${BETTER_AUTH_URL}/api/auth/callback/google`.

Set `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`, dan kredensial `SMTP_USER`/`SMTP_PASSWORD` bila diperlukan. `SMTP_SECURE=true` untuk implicit TLS, umumnya port 465; koneksi eksternal lain mewajibkan STARTTLS. Verifikasi sertifikat TLS tidak dinonaktifkan. SMTP lokal loopback dipakai khusus Mailpit pengujian.

Tidak ada akun panitia yang dibuat saat startup. Pemilik dapat menjalankan seeder panitia secara eksplisit, atau menunjuk akun terdaftar melalui perintah role. Google OAuth dan pengiriman ke kotak masuk internet tetap membutuhkan kredensial milik pengelola. Tidak ada deployment atau layanan berbayar yang dibuat.

Masa retensi peserta/foto/dokumen, jadwal penghapusan, serta kebijakan backup perlu ditetapkan pengelola sebelum peluncuran. Implementasi mempertahankan versi lama untuk audit dan tidak menghapus data secara otomatis.

## Hasil verifikasi

- Perubahan formulir berkepala surat Kepenuhan: build, lint, dan TypeScript lolos; empat tes `e2e/camp.spec.ts` lolos, termasuk 15 putra dan 15 putri tepat dua halaman serta unduhan format lama oleh operator/panitia tanpa persetujuan ulang. Hasil PDF dirender dan diperiksa untuk kategori tunggal, beberapa regu, dan teks panjang; identitas sekolah hanya dua kolom, tanpa baris terpotong atau halaman kosong tambahan. Dua tes unit derivative tetap gagal karena izin symlink Windows (`EPERM`).
- Build produksi, lint, TypeScript, dan seluruh 30 tes Playwright lolos. Tes memakai PostgreSQL dan SMTP Mailpit terpisah dari data aplikasi.
- Pengujian akses memastikan login/admin/verifikasi diarahkan sesuai role; admin/panitia tidak dapat memakai halaman atau API operator dan tidak otomatis dibuatkan sekolah/draf; operator tidak bisa masuk area staf; signup tidak bisa menyisipkan role staf; API administratif juga menolak role gabungan. Perubahan role pada sesi aktif langsung menolak area lama dan mempertahankan draf ketika akun dikembalikan menjadi operator.
- Tiga tes seeder panitia membuktikan pembuatan bersamaan tetap satu akun, password ter-hash dengan fungsi Better Auth, login sampai halaman panitia/pengaturan kegiatan, pengulangan mempertahankan kredensial, akun Google/verifikasi/larangan tetap dipertahankan, serta input tidak valid tidak membuat pengguna atau membocorkan password. Peran panitia terbukti mendapat respons 403 saat mencoba daftar pengguna, menetapkan dirinya sebagai admin, atau mengakses Notes lintas akun. Alur persetujuan/foto/PDF/kartu/email/ekspor juga diuji memakai peran panitia.
- Integrasi mencakup verifikasi/pemulihan email melalui SMTP nyata lokal, simpan dan muat ulang formulir asli, isolasi antar akun, validasi 7/8/15/16 anggota, unggah foto, persetujuan ganda, PDF/kartu privat, ekspor/filter, pemulihan lease worker, pembatasan serta audit kirim ulang, dan pencabutan versi lama saat revisi.
- PDF hasil worker dirender dan diperiksa per halaman: A4, font Unicode, peserta terakhir, foto, header tabel berulang, tanda tangan, serta nomor halaman tanpa halaman kosong tambahan. PNG kartu hasil worker juga diperiksa.
- `npm run test:setup` lolos, termasuk pengulangan setup dan data tetap tersedia setelah container dibuat ulang. `npm run doctor` lolos. Audit dependensi runtime tidak menemukan kerentanan.
- `npm run check` lolos pada lint, TypeScript, dan tujuh tes, termasuk migrasi role dari skema lama dengan pemeriksaan pelestarian data. Dua tes penyalinan derivative gagal karena Windows menolak pembuatan symlink (`EPERM`); tes tersebut tetap dipertahankan dan tidak dilewati.
- Permintaan OAuth Google sudah diperiksa sampai halaman masuk Google; login lengkap dan pertukaran token dengan akun pengguna belum diuji. SMTP internet, cetak fisik, dan build image Docker produksi belum diuji.
