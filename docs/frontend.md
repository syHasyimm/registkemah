# Frontend Registrasi Kemah

Seluruh halaman pada peta PRD tersedia. Jalankan `npm run dev`, lalu buka `http://localhost:3000`.

## Pratinjau tanpa akun

Gunakan `/preview` untuk operator dan `/preview/admin` untuk panitia. Tombol di header berpindah antarperan pratinjau. Semua identitas, peserta, tanggal periode, keputusan, serta nomor pendaftaran pada mode ini adalah data contoh. Tidak ada akun yang dibuat atau peran yang diberikan melalui pratinjau.

| Tampilan                      | Alamat pratinjau                               |
| ----------------------------- | ---------------------------------------------- |
| Beranda operator              | `/preview`                                     |
| Formulir tiga langkah         | `/preview/pendaftaran`                         |
| Formulir yang disetujui       | `/preview/pendaftaran/bukti`                   |
| Ringkasan panitia             | `/preview/admin`                               |
| Pencarian, filter, ekspor CSV | `/preview/admin/pendaftaran`                   |
| Pemeriksaan sekolah           | `/preview/admin/pendaftaran/harapan-bangsa`    |
| Sekolah disetujui             | `/preview/admin/pendaftaran/al-hikmah`         |
| ID card 55 × 85 mm            | `/preview/admin/pendaftaran/al-hikmah/id-card` |
| Pengaturan kegiatan           | `/preview/admin/kegiatan`                      |

Setelah menyetujui sekolah contoh, gunakan **Skenario pratinjau berkas** pada detail sekolah untuk menguji status Menyiapkan, Siap, dan Gagal. Operator contoh menggunakan ID `sekolah-saya`; kirim formulirnya, periksa melalui area panitia, lalu kembali ke operator untuk mencoba seluruh perjalanan. Mengembalikan sekolah ke Perlu perbaikan menonaktifkan formulir dan kartu lama.

## Halaman aplikasi dan akun

Halaman `/app`, `/app/pendaftaran`, dan `/app/pendaftaran/bukti` khusus operator sekolah (`user`). `/admin` khusus admin/panitia dengan izin resource yang sesuai. Login diarahkan melalui `/after-login`; membuka area role lain mengarah kembali ke dashboard sendiri, sedangkan API menolak dengan 403. Hak panitia diberikan melalui `npm run seed:panitia` atau `npm run role:set -- email@example.com panitia`; penetapan mengganti role sebelumnya.

Pada layar di bawah 768 piksel, navigasi memakai navbar tetap di bawah layar: Beranda/Pendaftaran/Formulir untuk operator dan Ringkasan/Pendaftaran/Pengaturan untuk panitia. Menu aktif mengikuti halaman, termasuk detail pendaftaran. Logo pada header tetap membuka halaman kegiatan. Konten, tombol simpan, dan notifikasi diberi ruang di atas navbar serta area aman perangkat. Pada tablet/desktop mulai 768 piksel, navigasi memakai sidebar. Navbar tidak ikut dicetak.

Formulir pendaftaran memakai tiga langkah dengan penanda posisi, kelompok isian berikon, dan ringkasan jumlah peserta di desktop. Kartu peserta dapat dibuka-tutup tanpa menghapus isian; peserta pertama, peserta baru, dan data yang belum lengkap terbuka saat pertama ditampilkan. Tombol simpan/lanjut tetap tersedia di atas navbar mobile. Tanda centang pada langkah dan ringkasan mengikuti kelengkapan data yang sebenarnya.

Peserta yang tidak mengunggah foto otomatis memakai ilustrasi vektor pramuka putra atau putri sesuai kategori regu, termasuk pada formulir, ringkasan, pratinjau cetak, PNG kartu resmi, dan PDF. Foto yang diunggah selalu didahulukan; menghapus foto mengembalikan ilustrasi. Ilustrasi tidak disimpan sebagai unggahan peserta dan tidak mengubah kelengkapan pendaftaran. Kedua SVG tersedia di `public/images/participants/`; sumber dan lisensinya dapat dibuka melalui **Kredit ilustrasi** di footer ruang kerja.

Animasi memakai `motion/react` melalui komponen bersama di `src/components/motion.tsx`. Halaman akun dan ruang kerja memakai transisi masuk singkat; bagian halaman publik, statistik, serta panel muncul sekali saat memasuki layar. Pergantian langkah formulir dan dialog memberi umpan balik visual, sedangkan kartu statistik terangkat sedikit saat disorot dengan mouse. Preferensi pengurangan gerak menampilkan konten langsung tanpa animasi. Gaya cetak meniadakan opacity dan transform animasi agar formulir serta kartu tetap utuh, termasuk bagian yang belum digulir. Fallback `noscript` meniadakan gaya animasi pada HTML server jika JavaScript dinonaktifkan; mekanisme streaming Next.js tetap mengikuti perilaku aplikasi yang sudah ada.

Halaman akun tersedia di `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`, dan `/reset-password`. Pendaftaran email, login, sesi, logout, serta penggantian password dengan token valid memakai Better Auth yang tersedia. Pendaftaran baru meminta konfirmasi password. Google hanya aktif jika `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` disediakan di lingkungan privat server. Konfigurasi callback Google harus mengikuti origin aplikasi dengan path `/api/auth/callback/google`.

Verifikasi email wajib untuk akun email/password. Verifikasi dan pemulihan password memakai antrean SMTP persisten. Untuk mencoba secara lokal, jalankan `npm run email:dev` dan buka kotak masuk Mailpit yang ditampilkan. Tautan verifikasi mengaktifkan akun dan sesi. Rincian pengaturan, endpoint, penyimpanan, serta konfigurasi produksi ada di [panduan backend](camp-backend.md).

## Data aplikasi dan pratinjau

- `/app` dan `/admin` memakai API serta PostgreSQL. Draf tersedia kembali setelah login dari browser lain. Data localStorage dari implementasi frontend lama tidak otomatis diimpor.
- Validasi server meliputi kepemilikan, NPSN unik, jumlah anggota 8–15 saat kirim, kelengkapan pangkalan, pemimpin dari regu yang sama, periode pendaftaran, dan status yang boleh diedit. Revisi penyimpanan mencegah tab lama menimpa perubahan baru.
- Foto aplikasi diunggah secara privat dengan progres dan pembatalan. Server memvalidasi isi JPEG/PNG/WebP hingga 5 MB, membetulkan orientasi, menghapus metadata, dan menyimpan versi foto/crop. Gagal menyimpan mempertahankan isian.
- Daftar panitia memakai pencarian, filter, dan pagination server. CSV memuat seluruh hasil filter dengan perlindungan formula spreadsheet.
- Persetujuan panitia menghasilkan PDF formulir A4 lengkap dengan foto opsional, font Unicode, header tabel berulang, nomor halaman, rekap, serta tanda tangan manual. Operator hanya dapat mengunduh formulir miliknya.
- PNG kartu dibuat server dari template referensi yang tetap utuh, dengan nama/pangkalan uppercase serta foto lingkaran atau ilustrasi pramuka sesuai kategori regu. Kartu hanya tersedia untuk panitia. Cetak A4 memakai tiga kolom berukuran 55 × 85 mm; gunakan skala printer 100% dan lakukan uji cetak fisik sebelum distribusi.
- PDF, kartu, dan email diproses terpisah melalui antrean persisten. UI memuat status terbaru secara berkala dan menyediakan percobaan ulang untuk panitia. Permintaan revisi menonaktifkan keluaran versi lama.
- Pengaturan `/admin/kegiatan` memperbarui informasi publik, kontak, dan periode pendaftaran. Jadwal/lokasi awal belum ditetapkan dan tidak diambil dari gambar kartu.
- Semua operasi di `/preview` tetap simulasi localStorage: tidak membuat akun, mengirim email, atau menulis database. Jangan memakai mode pratinjau untuk data peserta sungguhan.

## Verifikasi

`npm run check`, `npm run build`, dan `npm run test:e2e` memeriksa kualitas, akun, izin server, API bawaan, dan perjalanan frontend. Tes memakai PostgreSQL Docker terpisah dari database aplikasi. Tes frontend juga memeriksa lebar 320, 360, 390, 430, 768, dan 1280 piksel.

Dokumentasi Next.js, React, Better Auth, dan Playwright diambil melalui Context7 serta dicocokkan dengan paket terpasang. Panduan Next.js lokal di `node_modules/next/dist/docs` juga dibaca sebelum implementasi.

Keenam lebar layar PRD diperiksa tanpa gulir horizontal, termasuk langkah peserta. Pemeriksaan gaya cetak memastikan tiga kolom kartu dengan ukuran 55 × 85 mm. Hasil pengujian integrasi backend dan batas pengujian platform dicatat di [panduan backend](camp-backend.md).
