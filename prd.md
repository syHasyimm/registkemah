# PRD — Aplikasi Registrasi Perkemahan Gugus Depan Sekolah

Tanggal: 20 Oktober 2026  
Status: Rencana versi 1.2 — dua metode akun, desain kartu tetap, PDF formulir, dan pengambilan kartu di lokasi  
Lokasi proyek: `D:\Sites\registkemah`  
Nama kerja aplikasi: **Registrasi Kemah**

## 1. Ringkasan proyek

Aplikasi membantu pembina atau perwakilan sekolah mendaftarkan gugus depan beserta regu putri dan putra ke sebuah kegiatan perkemahan. Pendaftaran dilakukan melalui browser HP: daftar/masuk dengan Google atau email dan password, mengisi data sekolah, menambahkan regu dan nama peserta, lalu mengirim pendaftaran untuk diperiksa panitia.

Panitia dapat melihat pendaftaran, memeriksa kelengkapan, meminta perbaikan, menyetujui pendaftaran, dan mengunduh rekap. Persetujuan admin memicu penyiapan ID card untuk dicetak panitia, PDF formulir pendaftaran untuk operator, serta email pemberitahuan pengambilan kartu. Operator mencetak dan membawa formulir ke panitia di lokasi perkemahan, kemudian menerima kartu fisik saat menyerahkan formulir tersebut. Aplikasi menggunakan template Next.js yang sudah terpasang di folder proyek ini.

Dokumen ini berisi rencana produk. Pembaruan autentikasi, formulir perkemahan, unggah foto, ID card, PDF formulir, email pemberitahuan, dan halaman panitia belum diimplementasikan dalam pekerjaan penyusunan PRD ini.

## 2. Kebutuhan utama dan hasil yang dituju

### Kebutuhan yang diminta

- Input nama sekolah.
- Input regu perempuan/putri: nama regu, nama setiap peserta, dan jumlah peserta.
- Input regu laki-laki/putra: nama regu, nama setiap peserta, dan jumlah peserta.
- Setiap regu putri maupun putra beranggotakan **8–15 peserta**, termasuk pemimpin regu dan tidak termasuk pembina pendamping.
- Input **pangkalan wajib** dan **foto peserta opsional** pada data setiap peserta.
- ID card peserta disiapkan setelah admin menyetujui pendaftaran sekolah; memuat **NAMA dan PANGKALAN dalam HURUF KAPITAL (UPPERCASE)** serta foto opsional di dalam lingkaran.
- Desain kartu memakai [gambar referensi yang diberikan](src/components/image/Olivia%20Wilson.png), ukuran pasti **lebar 5,5 cm × tinggi 8,5 cm (55 × 85 mm)**, orientasi potret.
- **ID card hanya diakses dan dicetak panitia. Operator tidak menerima pratinjau, unduhan, atau lampiran kartu digital.**
- Operator menerima **email otomatis setelah persetujuan admin** berisi petunjuk pengambilan kartu fisik saat menyerahkan formulir di lokasi perkemahan.
- Dokumen PDF untuk operator adalah **formulir pendaftaran lengkap** yang dicetak dan dibawa ke panitia.
- Usulan kolom tambahan pada versi sebelumnya disetujui, dengan status wajib/opsional sebagaimana ditetapkan pada bagian 5.
- Pendaftaran akun dan login tersedia melalui **Google maupun email dan password**.
- Tampilan mengutamakan penggunaan melalui HP dan tetap nyaman di tablet serta komputer.

### Hasil yang dituju

- Sekolah dapat menyelesaikan pendaftaran tanpa mengirim ulang daftar peserta melalui chat.
- Jumlah peserta selalu sesuai dengan nama yang tercatat.
- Pengguna dapat menyimpan draf dan melanjutkan pengisian pada kunjungan berikutnya.
- Panitia memiliki rekap sekolah, regu, dan peserta putri/putra yang konsisten.
- Sekolah dapat melihat status pendaftarannya dan catatan perbaikan dalam aplikasi.
- Setelah disetujui, operator menerima email, mengunduh PDF formulir, mencetaknya, dan menyerahkannya kepada panitia untuk mengambil kartu fisik peserta.
- Panitia mencetak ID card dengan desain seragam; nama dan pangkalan selalu uppercase dan ukuran fisik konsisten.

## 3. Batas awal dan asumsi perencanaan

Rencana ini mencakup keputusan terbaru: 8–15 peserta per regu, pangkalan wajib, foto opsional, dua metode daftar/login, desain kartu 55 × 85 mm, serta penyerahan kartu fisik di lokasi. PDF formulir untuk operator menggantikan alur lama unduhan ID card oleh operator.

| Hal               | Rencana versi pertama                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kegiatan          | Satu kegiatan perkemahan aktif; struktur data menyimpan identitas kegiatan agar dapat dikembangkan kemudian.                                                 |
| Pengelola sekolah | Satu akun aplikasi mewakili satu sekolah, dibuat melalui Google atau email/password. Pengelolaan bersama oleh beberapa akun menjadi pengembangan berikutnya. |
| Pendaftaran       | Satu pendaftaran sekolah untuk satu kegiatan, berisi seluruh regu yang didaftarkan.                                                                          |
| Kategori regu     | Putri dan Putra; sekolah boleh mendaftarkan salah satu atau keduanya.                                                                                        |
| Banyak regu       | Sekolah boleh menambahkan beberapa regu pada setiap kategori.                                                                                                |
| Jumlah anggota    | **Minimal 8 dan maksimal 15 peserta per regu**, berlaku sama untuk Putri dan Putra. Draf boleh kurang dari 8; pengiriman akhir wajib memenuhi batas.         |
| Peserta           | Peserta tidak membutuhkan akun; pembina/perwakilan sekolah mengisi datanya.                                                                                  |
| Persetujuan       | Status Terverifikasi memicu penyiapan ID card internal panitia, PDF formulir operator, dan email pemberitahuan.                                              |
| Pengambilan kartu | Operator membawa formulir tercetak ke panitia di lokasi perkemahan dan menerima kartu fisik saat penyerahan formulir.                                        |
| Pembayaran        | Belum termasuk versi pertama.                                                                                                                                |
| Platform          | Website responsif yang dibuka melalui browser, tanpa kebutuhan memasang aplikasi HP.                                                                         |

## 4. Pengguna dan hak akses

| Pengguna         | Kemampuan                                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pengunjung       | Membaca informasi kegiatan, jadwal pendaftaran, petunjuk, dan kontak panitia.                                                                                                                                           |
| Operator sekolah | Daftar/masuk dengan Google atau email/password, mengelola draf, mengirim dan memperbaiki pendaftaran, menerima email persetujuan, serta mengunduh/mencetak PDF formulir miliknya. Tidak memiliki akses ID card digital. |
| Panitia/admin    | Memeriksa pendaftaran/foto, memberikan keputusan, mengunduh rekap dan formulir, melihat/mencetak ID card internal, memantau pengiriman email, dan menyerahkan kartu fisik saat formulir diterima.                       |

Setiap akun baru mendapat akses operator biasa. Hak panitia diberikan secara terpisah kepada akun yang ditetapkan pengelola; pengguna tidak dapat memilih sendiri peran panitia saat login. Autentikasi mengidentifikasi akun pengguna, sedangkan keterwakilan sekolah diperiksa dalam proses verifikasi panitia. Verifikasi kepemilikan email mendukung pengiriman pemberitahuan ke alamat yang benar.

## 5. Input formulir yang disepakati

### 5.1 Data sekolah dan penanggung jawab

Usulan kolom formulir pada versi sebelumnya telah disetujui pemilik proyek. Kolom bertanda **Wajib** harus lengkap sebelum pendaftaran dikirim; kolom **Opsional** tetap boleh kosong. Persetujuan atas usulan tidak mengubah seluruh kolom opsional menjadi wajib.

| Kolom                               | Status   | Bentuk dan tujuan                                                                                                                                                                                        |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nama sekolah                        | Wajib    | Teks; gunakan nama resmi sekolah agar mudah ditemukan panitia.                                                                                                                                           |
| Nama penanggung jawab/pembina utama | Wajib    | Orang yang dapat dihubungi panitia; dapat berbeda dari nama akun aplikasi.                                                                                                                               |
| Nomor WhatsApp penanggung jawab     | Wajib    | Satu nomor aktif; input ramah keyboard telepon. Terima penulisan `08...` atau `+62...`, lalu normalkan.                                                                                                  |
| Email akun                          | Otomatis | Diambil dari akun aplikasi yang masuk, baik Google maupun email/password. Menjadi tujuan email persetujuan; ditampilkan untuk diperiksa operator, bukan input bebas untuk mengganti pemilik pendaftaran. |
| Kabupaten/kota                      | Wajib    | Membantu membedakan sekolah dengan nama sama dan menyusun rekap wilayah.                                                                                                                                 |
| Kecamatan                           | Opsional | Membantu identifikasi lokasi sekolah.                                                                                                                                                                    |
| NPSN                                | Opsional | Identitas sekolah untuk membantu mendeteksi pendaftaran ganda; disimpan sebagai teks.                                                                                                                    |
| Nomor gugus depan putri             | Opsional | Tampil bila sekolah mendaftarkan regu putri.                                                                                                                                                             |
| Nomor gugus depan putra             | Opsional | Tampil bila sekolah mendaftarkan regu putra. Kolom terpisah mengakomodasi nomor yang berbeda.                                                                                                            |
| Alamat sekolah                      | Opsional | Alamat ringkas jika dibutuhkan untuk administrasi kegiatan.                                                                                                                                              |
| Catatan untuk panitia               | Opsional | Informasi operasional singkat; tampilkan arahan agar tidak memasukkan data sensitif peserta.                                                                                                             |

Nomor gugus depan dan NPSN tetap opsional sesuai usulan yang disetujui. Nama sekolah, nama penanggung jawab, nomor WhatsApp penanggung jawab, serta kabupaten/kota wajib diisi saat pengiriman akhir.

### 5.2 Data regu putri dan putra

Gunakan satu struktur formulir yang sama untuk kedua kategori. Di layar, daftar regu dikelompokkan menjadi **Regu Putri** dan **Regu Putra**.

| Kolom                        | Status                      | Bentuk dan perilaku                                                                                                |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Kategori regu                | Wajib                       | Otomatis sesuai tombol “Tambah regu putri” atau “Tambah regu putra”.                                               |
| Nama regu                    | Wajib                       | Teks, misalnya “Melati” atau “Rajawali”.                                                                           |
| Daftar nama peserta          | Wajib                       | Satu baris input untuk satu nama; tombol “Tambah peserta” dan “Hapus” tersedia per baris.                          |
| Jumlah peserta               | Wajib ditampilkan; otomatis | Dihitung dari baris peserta yang mempunyai nama, tanpa memasukkan pembina; batas pengiriman 8–15 peserta per regu. |
| Pemimpin regu                | Opsional                    | Pilih dari daftar peserta yang sudah dimasukkan, sehingga tidak mengetik nama yang sama lagi.                      |
| Nama pembina pendamping regu | Opsional                    | Bila berbeda dari penanggung jawab utama.                                                                          |
| WhatsApp pembina pendamping  | Opsional                    | Jika diisi, nama pembina pendamping juga harus tersedia.                                                           |

**Aturan jumlah peserta:** sistem menghitung peserta otomatis dari daftar nama dan menampilkan, misalnya, “8 dari maksimal 15 peserta — minimal 8”. Baris tanpa nama tidak dihitung. Kelengkapan pangkalan diperiksa terpisah sebelum kirim; ketiadaan foto tidak mengurangi jumlah peserta. Draf dengan kurang dari 8 peserta tetap dapat disimpan, tetapi pendaftaran tidak dapat dikirim. Penambahan peserta ke-16 diblokir pada antarmuka dan server. Baris kosong harus dilengkapi atau dihapus sebelum pengiriman akhir. Pemimpin regu termasuk dalam 8–15 peserta; pembina pendamping tidak termasuk.

Apabila nantinya diperlukan kolom “Jumlah peserta yang direncanakan”, tampilkan sebagai data perkiraan yang terpisah. Angka tersebut tidak menjadi sumber rekap peserta resmi.

### 5.3 Data setiap peserta

| Kolom                | Status   | Keterangan                                                                                                                                                         |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nama lengkap         | Wajib    | Nama peserta yang tercantum pada rekap dan ID card.                                                                                                                |
| Pangkalan            | Wajib    | Nama pangkalan/asal peserta yang akan dicetak pada ID card. Terisi awal dari nama sekolah, tetapi dapat diperiksa dan diedit untuk setiap peserta sebelum dikirim. |
| Foto peserta         | Opsional | Satu foto peserta. Jika kosong, pendaftaran tetap dapat dikirim/disetujui dan ID card memakai ruang foto dengan tulisan “Foto belum tersedia”.                     |
| Kelas                | Opsional | Teks singkat, misalnya “7A”.                                                                                                                                       |
| Pemimpin regu        | Opsional | Penanda pada salah satu peserta; maksimal satu pemimpin untuk setiap regu.                                                                                         |
| Kategori putri/putra | Otomatis | Mengikuti kategori regu, sehingga tidak perlu dipilih lagi pada setiap baris.                                                                                      |

Pangkalan disimpan sebagai data peserta tersendiri, bukan sekadar membaca nama sekolah saat kartu dicetak. Perubahan nama sekolah tidak menimpa pangkalan yang sudah tersimpan. Nama/pangkalan disimpan sesuai ejaan input yang dirapikan, lalu ditampilkan uppercase saat render ID card. Kapitalisasi kartu tidak memaksa perubahan ejaan pada data asli atau PDF formulir.

Tanggal lahir, NIK, NISN, alamat rumah, dan data kesehatan tidak masuk versi pertama. Foto termasuk versi pertama dengan sifat opsional; peserta tanpa foto mendapat layanan pendaftaran dan ID card yang sama.

#### Ketentuan foto peserta

- Satu peserta memiliki maksimal satu foto aktif; operator dapat memilih dari galeri atau mengambil foto melalui kamera jika browser mendukung.
- Batas unggahan awal yang direkomendasikan: **maksimal 5 MB** per foto, format **JPG/JPEG, PNG, atau WebP**. Tampilkan syarat sebelum pengguna memilih berkas.
- Foto peserta digunakan untuk ID card peserta tersebut; jangan mengambil foto profil akun Google operator sebagai pengganti.
- Sediakan pratinjau dan pengaturan posisi/pembesaran foto dalam **bingkai lingkaran** sesuai desain ID card, serta tombol “Ganti foto” dan “Hapus foto”. Simpan pengaturan pemotongan agar hasil cetak sesuai pratinjau foto.
- Perbaiki orientasi, sesuaikan ukuran untuk tampilan/cetak, dan hapus metadata yang tidak diperlukan saat memproses gambar. Pertahankan isi foto tanpa mengganti wajah.
- Validasi jenis berkas sebenarnya dan kemampuan membaca gambar pada server, selain batas ukuran; ekstensi nama berkas saja tidak cukup. Format yang tidak didukung mendapat pesan yang jelas.
- Simpan foto secara privat dengan nama berkas yang dibuat sistem; tampilan foto memerlukan hak akses sekolah pemilik atau panitia.
- Unggah foto tidak menghapus isian nama/pangkalan. Tampilkan progres dan tombol coba lagi jika gagal. Pengguna boleh membatalkan unggahan lalu melanjutkan tanpa foto.
- Pengiriman akhir menunggu unggahan yang sedang berlangsung selesai atau dibatalkan secara eksplisit. Foto yang gagal diunggah tidak boleh ditampilkan seolah sudah tersimpan.
- Menambah, mengganti, atau menghapus foto hanya diperbolehkan pada status Draf/Perlu perbaikan. Foto ikut dikunci bersama data peserta ketika pendaftaran dikirim.

### 5.4 Data otomatis sistem

- Nomor pendaftaran unik dan tetap, diberikan ketika pengiriman pertama berhasil.
- Status pendaftaran dan waktu terakhir disimpan.
- Total regu putri, total regu putra, total peserta putri, total peserta putra, dan total peserta keseluruhan.
- Waktu pengiriman, waktu keputusan panitia, dan riwayat perubahan status.
- Identitas akun pemilik pendaftaran, ditetapkan server dari sesi login.
- Identitas/versi ID card, waktu penerbitan, dan status pemrosesan yang terlihat panitia.
- Versi/status PDF formulir yang dapat diunduh operator setelah persetujuan.
- Tujuan, waktu, dan status pemrosesan email pemberitahuan persetujuan.

Contoh ringkasan: 2 regu putri dengan 16 peserta dan 1 regu putra dengan 8 peserta menghasilkan **3 regu, 24 peserta**. Angka ini hanya ilustrasi, bukan batas jumlah anggota.

## 6. Alur operator sekolah

1. Membuka halaman kegiatan dan memilih **Daftar/Masuk dengan Google** atau **Daftar/Masuk dengan Email**.
2. Pengguna baru mendaftar dengan nama, email, password, dan konfirmasi password, atau menyelesaikan Google login. Pengguna email/password mengikuti verifikasi email; pengguna lama masuk dengan metode akun yang sudah terhubung.
3. Masuk ke beranda sekolah dan memilih **Mulai pendaftaran** atau **Lanjutkan draf**.
4. **Langkah 1 — Sekolah:** mengisi nama sekolah, penanggung jawab, kontak, dan kolom pendukung; memeriksa email akun yang akan menerima pemberitahuan.
5. **Langkah 2 — Regu dan peserta:** menambahkan regu putri/putra, nama regu, serta 8–15 peserta per regu. Setiap peserta memiliki nama, pangkalan wajib, dan foto opsional. Kategori yang tidak diikuti tetap menunjukkan “Belum ada regu”.
6. **Langkah 3 — Periksa dan kirim:** memeriksa kelengkapan, foto bila ada, dan jumlah peserta. Foto kosong bukan kesalahan.
7. Menyetujui pernyataan bahwa data telah diperiksa dan operator berwenang mendaftarkan peserta.
8. Menekan **Kirim pendaftaran**. Server menyimpan pengiriman, nomor pendaftaran, dan status **Dikirim**.
9. Memantau status dari beranda. Jika panitia meminta perbaikan, operator memperbaiki data lalu mengirim ulang.
10. Setelah admin menyetujui, status menjadi **Terverifikasi**. Sistem menyiapkan PDF formulir dan langsung memproses email pemberitahuan ke email akun operator.
11. Operator membuka tautan **Buka Formulir Pendaftaran** dari email atau beranda aplikasi, login bila diperlukan, lalu mengunduh PDF yang sudah siap. Saat PDF masih diproses, tampilkan status dan tindakan mencoba lagi.
12. Operator **mencetak formulir pendaftaran dan membawanya ke panitia di lokasi perkemahan**.
13. Saat menyerahkan formulir kepada panitia, operator menerima **ID card fisik peserta**. Operator tidak perlu dan tidak memiliki tombol mengunduh ID card.

**Penyimpanan draf:** tombol “Simpan draf” tersedia pada setiap langkah. Tombol “Simpan & lanjutkan” menyimpan langkah sebelum berpindah. Tampilkan “Tersimpan pukul …” hanya setelah server berhasil menyimpan. Isian yang belum disimpan diberi penanda dan peringatan saat meninggalkan halaman. Versi awal tidak mengklaim dukungan pengisian offline.

**Dokumen sebelum persetujuan:** draf dan pendaftaran Dikirim dapat ditinjau dalam aplikasi. PDF resmi untuk dibawa ke panitia tersedia sesudah Terverifikasi dan proses pembuatan berkas selesai; ini memastikan data yang dibawa adalah versi yang disetujui.

## 7. Alur panitia dan status pendaftaran

Panitia membuka daftar pendaftaran, mencari sekolah atau nomor pendaftaran, memfilter status, memeriksa kelengkapan nama/pangkalan, jumlah 8–15 peserta pada setiap regu, serta foto bila tersedia. Admin kemudian memberi keputusan. Foto kosong tidak menjadi alasan otomatis untuk menolak pendaftaran. Data peserta diperbaiki oleh sekolah melalui alur revisi agar tanggung jawab perubahan tetap jelas.

| Status          | Makna                                                                                                   | Siapa yang dapat mengubah isi pendaftaran? |
| --------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Draf            | Belum dikirim, kelengkapan boleh belum terpenuhi.                                                       | Operator pemilik.                          |
| Dikirim         | Sudah dikirim dan menunggu pemeriksaan.                                                                 | Isi dikunci.                               |
| Perlu perbaikan | Panitia mengembalikan dengan catatan wajib.                                                             | Operator pemilik.                          |
| Terverifikasi   | Admin menyetujui data; sistem menyiapkan kartu internal panitia, PDF formulir, dan email pemberitahuan. | Isi termasuk foto dikunci.                 |
| Ditolak         | Panitia menolak dengan alasan wajib.                                                                    | Isi dikunci.                               |

Transisi yang disediakan:

- Operator: `Draf → Dikirim` dan `Perlu perbaikan → Dikirim`.
- Panitia: `Dikirim → Perlu perbaikan`, `Dikirim → Terverifikasi`, atau `Dikirim → Ditolak`.
- Koreksi setelah persetujuan: panitia dapat mengembalikan `Terverifikasi → Perlu perbaikan` dengan alasan wajib, lalu pemeriksaan diulang.
- Pembukaan ulang penolakan: panitia dapat mengubah `Ditolak → Perlu perbaikan` dengan alasan wajib.

Setiap transisi mencatat pelaku, waktu, status sebelumnya, status baru, dan catatan yang diperlukan. Pengiriman ulang mempertahankan nomor pendaftaran. Tidak ada perpindahan status lewat perubahan kolom bebas dari browser.

Pendaftaran baru dan pengiriman ulang hanya diterima selama periode pendaftaran masih dibuka. Draf tetap dapat dibaca dan disimpan setelah penutupan, tetapi tidak dapat dikirim. Bila revisi harus dilakukan setelah penutupan, panitia perlu memperpanjang periode pendaftaran; pengecualian tenggat per sekolah belum termasuk versi pertama.

### 7.1 ID card internal panitia dan desain yang ditetapkan

**Pemicu:** persetujuan admin dari Dikirim menjadi Terverifikasi. Sistem menyiapkan satu kartu untuk setiap peserta pada versi data yang disetujui. **Hanya panitia/admin** yang memiliki izin melihat hasil render dan mencetak kartu; operator tidak memperoleh kartu melalui halaman, API, unduhan, atau email.

**Aset desain:** [Olivia Wilson.png](src/components/image/Olivia%20Wilson.png), lokasi `D:\Sites\registkemah\src\components\image\Olivia Wilson.png`. Gambar referensi yang diperiksa berukuran **650 × 1004 piksel**. Ukuran hasil cetak ditetapkan secara terpisah menjadi **lebar 5,5 cm × tinggi 8,5 cm**, setara **55 × 85 mm**, orientasi potret.

| Elemen                   | Ketentuan hasil kartu                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Latar, logo, dan bingkai | Gunakan desain gambar referensi: logo kegiatan di atas, lambang besar transparan di latar, garis/ornamen krem-cokelat dan hitam. Pertahankan proporsi serta susunannya.   |
| Foto                     | Foto peserta dipotong berbentuk lingkaran di area foto tengah, dengan bingkai mengikuti gambar referensi. Posisi wajah dapat disesuaikan tanpa meregangkan foto.          |
| NAMA                     | Nama lengkap peserta, **UPPERCASE**, hitam, tebal, rata tengah, pada posisi label NAMA di referensi.                                                                      |
| Garis pemisah            | Pertahankan garis horizontal di antara nama dan pangkalan.                                                                                                                |
| PANGKALAN                | Pangkalan peserta, **UPPERCASE**, hitam, rata tengah, pada posisi label PANGKALAN di referensi.                                                                           |
| Tanpa foto               | Area lingkaran berisi penanda netral “Foto belum tersedia”. Kartu tetap diterbitkan; jangan memakai foto operator atau ilustrasi pemandangan contoh sebagai foto peserta. |

Aturan produksi desain:

- Gambar sumber adalah PNG datar yang sudah memuat ilustrasi foto contoh dan teks “NAMA”/“PANGKALAN”. Saat implementasi, siapkan aset latar turunan dengan area dinamis tersebut dibersihkan sambil mempertahankan ornamen, garis, logo, dan watermark. Simpan gambar referensi asli utuh.
- Masukkan foto, nama, dan pangkalan peserta sebagai lapisan dinamis pada area yang disiapkan. Jangan menimpa teks contoh dengan teks peserta sehingga keduanya terlihat.
- Gunakan transformasi uppercase saat render untuk **nama dan pangkalan**. Contoh: “Aulia Putri” menjadi “AULIA PUTRI”; “SMP Negeri 1” menjadi “SMP NEGERI 1”.
- Atur pembungkusan dan ukuran huruf untuk nama/pangkalan panjang, tanpa memotong identitas, melewati garis, atau menutupi foto. Ukuran huruf harus tetap terbaca pada hasil cetak.
- Kunci ukuran fisik **55 × 85 mm**, cetak dengan skala 100%. Hasil gambar dan tampilan cetak harus mempertahankan rasio ini, bukan bergantung pada DPI bawaan PNG.
- Nomor dan versi kartu disimpan untuk administrasi; tidak menambahkan elemen baru pada desain depan tanpa kebutuhan lebih lanjut. QR code/check-in belum termasuk versi pertama.
- Keluaran kartu adalah **gambar hasil render dan halaman cetak internal panitia**, termasuk tata letak beberapa kartu pada lembar A4. Fitur PDF yang diberikan kepada operator adalah formulir pendaftaran, bukan kartu.
- Panitia menyiapkan cetakan sebelum registrasi fisik, mencocokkan formulir yang dibawa dengan data sekolah, lalu menyerahkan kartu peserta kepada operator. Pencatatan check-in digital belum menjadi syarat versi pertama.

### 7.2 PDF formulir pendaftaran untuk operator

Sistem membuat **satu PDF formulir per pendaftaran sekolah dan versi persetujuan**, bukan PDF ID card per peserta. PDF resmi tersedia setelah pendaftaran Terverifikasi. Operator pemilik dan panitia dapat mengunduhnya; operator mencetak dan membawa berkas tersebut untuk diserahkan kepada panitia.

Isi formulir:

1. Identitas kegiatan, nomor pendaftaran, status persetujuan, versi dokumen, waktu persetujuan/penerbitan, dan identitas sekolah.
2. Seluruh data sekolah/penanggung jawab yang diisi: nama, wilayah, NPSN/gudep bila tersedia, alamat, kontak WhatsApp, email akun, serta catatan operasional.
3. Bagian terpisah Regu Putri dan Regu Putra, masing-masing berisi nama regu, jumlah anggota, dan pembina pendamping/kontaknya bila diisi.
4. Daftar setiap peserta: nomor urut, nama lengkap, pangkalan, kelas bila diisi, penanda pemimpin regu, serta foto kecil jika tersedia. Foto kosong diberi tanda “Tidak diunggah”.
5. Rekap jumlah regu dan peserta per kategori serta total keseluruhan. Pembina tidak termasuk jumlah peserta.
6. Pernyataan data telah diperiksa, petunjuk membawa formulir ke panitia untuk mengambil kartu, dan ruang tanda tangan manual penanggung jawab/penerima sebagai pelengkap penyerahan fisik. Jangan menghasilkan tanda tangan atau stempel persetujuan palsu.

Ketentuan PDF:

- Ukuran **A4 potret**, dengan margin cetak, nomor halaman, header tabel yang diulang, dan pergantian halaman yang tidak memotong baris peserta.
- Semua regu/peserta harus termuat meskipun membutuhkan beberapa halaman. Nama dan pangkalan panjang dibungkus tanpa terpotong.
- PDF memakai salinan data yang disetujui; nama/pangkalan dapat mengikuti ejaan input asli. Kewajiban uppercase berlaku khusus pada ID card.
- Tombol operator adalah **Unduh Formulir Pendaftaran (PDF)**. Berkas dibentuk aplikasi secara konsisten, bukan mengharuskan operator memakai “Print to PDF” dari browser.
- Tidak menyertakan lembar ID card, tautan gambar kartu, atau berkas kartu sebagai lampiran formulir.
- Pembuatan PDF formulir terpisah dari pencetakan kartu panitia: operator dapat mengunduh formulir yang siap meskipun kartu belum dicetak.
- Saat formulir dikembalikan untuk revisi, unduhan versi lama dinonaktifkan. Persetujuan ulang menghasilkan PDF baru dan petunjuk agar operator membawa versi terbaru.

### 7.3 Email persetujuan dan pemberitahuan pengambilan kartu

Email otomatis termasuk versi pertama. Setelah transaksi persetujuan berhasil, sistem langsung mengantrekan dan memproses pemberitahuan ke **email akun operator** yang terverifikasi, baik akun Google maupun email/password. Login Google bukan layanan pengiriman email; aplikasi tetap membutuhkan layanan email transaksional/SMTP yang dikonfigurasi pengelola.

Contoh pesan:

> **Subjek:** Pendaftaran [Nomor Pendaftaran] Disetujui — Bawa Formulir untuk Mengambil ID Card
>
> Yth. [Nama Penanggung Jawab] dari [Nama Sekolah], pendaftaran Anda telah disetujui.
>
> Silakan unduh dan cetak formulir pendaftaran melalui aplikasi. Bawa dan serahkan formulir tersebut kepada panitia saat registrasi di lokasi perkemahan. ID card peserta akan diambil saat Anda menyerahkan formulir pendaftaran kepada panitia.
>
> **Buka Formulir Pendaftaran:** [tautan ke formulir milik sekolah di aplikasi]
>
> [Lokasi dan waktu registrasi sesuai pengaturan panitia]  
> [Kontak panitia]

Aturan pengiriman:

- Isi pesan menjelaskan **pengambilan kartu fisik di lokasi**; tidak berisi tautan unduh, gambar, atau lampiran ID card.
- Tautan mengarah ke halaman formulir yang membutuhkan login dan pemeriksaan kepemilikan. Jika PDF masih disiapkan, halaman menunjukkan status pemrosesan.
- Lokasi/waktu/kontak diambil dari informasi panitia. Jangan mengarang jadwal dari tulisan yang terlihat pada gambar desain kartu.
- Simpan pekerjaan email dengan kunci pendaftaran + versi persetujuan + jenis pemberitahuan. Cegah klik persetujuan ganda membuat antrean email ganda, dan gunakan idempotensi penyedia pengiriman bila tersedia.
- Status operasional: **Menunggu**, **Diproses**, **Diterima layanan email**, atau **Gagal**. Respons diterima layanan tidak boleh diklaim pasti masuk kotak masuk; tampilkan status diterima penerima hanya jika ada bukti sesuai kemampuan layanan.
- Kegagalan email tidak membatalkan persetujuan. Panitia dapat melihat penyebab yang aman untuk ditampilkan dan mencoba ulang; operator tetap melihat pesan pengambilan kartu serta akses PDF di beranda.
- Tombol kirim ulang panitia diberi pembatasan frekuensi dan dicatat. Periksa bahwa versi persetujuan masih aktif sebelum setiap pengiriman/percobaan ulang.
- Jika pendaftaran dikembalikan untuk revisi, batalkan pekerjaan email lama yang belum terkirim. Email yang sudah terkirim tidak dapat ditarik kembali; tautannya selalu menampilkan status terkini, dan persetujuan ulang mengirim pemberitahuan untuk versi baru.
- Notifikasi WhatsApp dan pengingat otomatis di luar pemberitahuan persetujuan belum termasuk versi pertama.

### 7.4 Konsistensi persetujuan, formulir, dan kartu

1. Persetujuan menyimpan versi data sekolah, regu, peserta, pangkalan, dan referensi versi foto, beserta pekerjaan penyiapan formulir, kartu, dan email dalam satu transaksi database.
2. Pekerjaan berkas diproses setelah transaksi selesai. Masing-masing memiliki status Menyiapkan/Siap/Gagal dan dapat diulang tanpa menggandakan keluaran aktif.
3. Operator melihat status PDF formulir; status/pratinjau hasil kartu hanya terlihat panitia. Kartu tidak terbuka kepada operator sekalipun sekolahnya sendiri telah Terverifikasi.
4. Bila foto yang tercatat gagal dibaca, proses kartu ditandai gagal dan dapat dicoba ulang. Penanda “Foto belum tersedia” hanya untuk peserta yang memang tidak memiliki foto.
5. Mengembalikan Terverifikasi ke Perlu perbaikan menonaktifkan kartu dan formulir versi lama. Pekerjaan versi lama yang terlambat selesai tidak boleh mengaktifkan kembali hasilnya.
6. Persetujuan ulang membuat formulir dan kartu dari versi terbaru. Kartu peserta yang dihapus tetap tidak aktif; email versi baru meminta operator memakai formulir terbaru.
7. Cetakan atau berkas yang sudah diterima sebelumnya tidak dapat ditarik otomatis. Operator perlu mencetak ulang formulir terbaru; panitia perlu mengganti kartu fisik lama. Aplikasi menampilkan versi dokumen yang sedang berlaku.
8. Bukti persetujuan, bukti pengiriman email, dan penyerahan kartu fisik merupakan kejadian berbeda. Email sukses tidak berarti kartu sudah diserahkan kepada operator.

## 8. Fitur yang masuk versi pertama

| Fitur                      | Hasil yang harus tersedia                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Informasi kegiatan         | Nama, deskripsi, tanggal/lokasi kegiatan, periode pendaftaran, petunjuk, dan kontak panitia.                                                     |
| Akun pengguna              | Daftar/login Google atau email/password, verifikasi email, pemulihan password, keluar, dan sesi akun.                                            |
| Profil pendaftaran sekolah | Formulir sekolah dan penanggung jawab dengan validasi.                                                                                           |
| Pengelolaan regu           | Tambah, ubah, dan hapus regu dalam kategori Putri/Putra selama masih dapat diedit.                                                               |
| Pengelolaan peserta        | Tambah/ubah/hapus nama dan pangkalan, foto opsional dengan pratinjau, serta validasi 8–15 peserta per regu dan jumlah otomatis.                  |
| Draf dan pengiriman        | Simpan, lanjutkan, tinjau, kirim, serta cegah pengiriman ganda.                                                                                  |
| Status dan revisi          | Catatan panitia, perbaikan sekolah, pengiriman ulang, dan riwayat keputusan.                                                                     |
| Dashboard panitia          | Rekap total sekolah/regu/peserta, pencarian, filter status, dan detail pendaftaran.                                                              |
| Ekspor                     | CSV rekap sekolah dan CSV daftar peserta untuk panitia. Ringkasan statistik membedakan pendaftaran masuk dan terverifikasi.                      |
| PDF formulir pendaftaran   | PDF A4 lengkap dari data yang disetujui, dapat diunduh/dicetak operator pemilik untuk diserahkan kepada panitia.                                 |
| Pengaturan kegiatan        | Informasi kegiatan dan tanggal buka/tutup. Aturan 8–15 peserta per regu ditampilkan sebagai ketentuan tetap kegiatan ini.                        |
| Foto peserta               | Unggah, pratinjau/pengaturan area foto, ganti, dan hapus foto opsional dengan penyimpanan privat.                                                |
| ID card internal panitia   | Desain referensi 55 × 85 mm, nama/pangkalan uppercase, foto lingkaran opsional, hasil render/cetak hanya untuk panitia.                          |
| Email pemberitahuan        | Email otomatis setelah persetujuan, petunjuk membawa formulir dan mengambil kartu fisik di lokasi, status proses serta kirim ulang oleh panitia. |

Calon pengembangan setelah versi pertama: impor Excel, pembayaran, unggah surat tugas, notifikasi WhatsApp/pengingat tambahan, QR check-in, kuota global, beberapa operator per sekolah, pemindahan pengelola sekolah, dan beberapa kegiatan aktif sekaligus.

## 9. Rancangan halaman dan pengalaman di HP

### Peta halaman

| Halaman                                                | Isi utama                                                                                                            |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `/`                                                    | Informasi kegiatan, jadwal, kontak panitia, tombol masuk/daftar.                                                     |
| `/sign-in`                                             | Tombol Google, formulir email/password, tautan daftar/lupa password, dan pesan kesalahan login.                      |
| `/sign-up`                                             | Pendaftaran nama/email/password/konfirmasi atau Google.                                                              |
| `/verify-email`, `/forgot-password`, `/reset-password` | Verifikasi kepemilikan email, permintaan pemulihan, dan pengaturan password baru.                                    |
| `/app`                                                 | Status sekolah, ringkasan regu/peserta, tindakan melanjutkan atau melihat pendaftaran.                               |
| `/app/pendaftaran`                                     | Formulir tiga langkah dan penyimpanan draf.                                                                          |
| `/app/pendaftaran/bukti`                               | Status dan unduh PDF formulir milik operator setelah persetujuan; petunjuk cetak dan bawa ke panitia.                |
| `/admin/pendaftaran/[id]/id-card`                      | Pratinjau dan cetak ID card hanya untuk panitia, termasuk tata letak cetak satu sekolah/regu.                        |
| `/admin`                                               | Rekap kegiatan untuk panitia.                                                                                        |
| `/admin/pendaftaran`                                   | Daftar pendaftaran dengan pencarian, filter, dan ekspor.                                                             |
| `/admin/pendaftaran/[id]`                              | Pemeriksaan data/foto, keputusan, riwayat, PDF formulir, status kartu, serta status/kirim ulang email pemberitahuan. |
| `/admin/kegiatan`                                      | Informasi kegiatan dan aturan pendaftaran.                                                                           |

### Prinsip desain

- Bahasa antarmuka Indonesia dengan label langsung: “Nama sekolah”, “Tambah regu putri”, “Tambah peserta”, dan “Simpan draf”.
- Satu kolom utama pada HP; dua kolom hanya digunakan jika lebar layar mencukupi.
- Formulir peserta berbentuk daftar input vertikal, bukan tabel lebar yang perlu digeser ke samping. Setiap peserta menampilkan nama, pangkalan, foto opsional, serta ringkasan yang dapat dibuka/tutup.
- Pangkalan terisi awal dari nama sekolah; foto menampilkan label “Opsional”, pratinjau kecil, dan tindakan pilih/ganti/hapus yang mudah disentuh.
- Ringkasan regu menampilkan jumlah peserta serta batas 8–15. Setelah 15 peserta, tombol tambah tidak aktif dan menjelaskan batasnya.
- Operator melihat progres unggahan foto dan PDF formulir; progres/pratinjau kartu hanya muncul di area panitia.
- Tombol “Unduh Formulir Pendaftaran (PDF)” mudah dijangkau di HP. Pesan persetujuan menyebutkan bahwa formulir harus dicetak dan dibawa untuk mengambil kartu fisik.
- Halaman daftar/login memberi pilihan Google dan email/password, dukungan autofill, serta tombol tampilkan/sembunyikan password.
- Setiap regu memiliki ringkasan nama dan jumlah peserta; bagian detail dapat dibuka/tutup agar halaman tetap mudah dinavigasi.
- Kelompok Putri/Putra diberi label teks yang jelas; pembedaan tidak hanya mengandalkan warna.
- Tombol utama mudah dijangkau di bagian bawah layar, dengan ruang aman agar tidak menutupi input atau keyboard.
- Target area sentuh minimal 44 × 44 piksel dan ukuran teks input minimal 16 piksel sebagai target desain.
- Status penyimpanan, proses pengiriman, halaman kosong, dan kesalahan jaringan selalu memiliki tampilan yang jelas.
- Tampilkan pesan kesalahan di dekat kolom terkait dan arahkan fokus ke kesalahan pertama saat pengiriman ditolak.
- Menghapus regu yang sudah berisi peserta memerlukan konfirmasi dengan jumlah peserta yang akan ikut dihapus.
- Pertahankan nilai yang sedang diketik ketika penyimpanan gagal; sediakan tombol coba lagi.
- Arah visual: hijau hutan, latar terang hangat, teks gelap, serta aksen secukupnya. Utamakan keterbacaan dan ruang formulir.
- Hormati preferensi pengurangan animasi, dukung navigasi keyboard, dan gunakan label yang dapat dibaca pembaca layar.

Verifikasi layout pada lebar 320, 360, 390, 430, 768, dan 1280 piksel. Pada layar HP tidak boleh ada pemotongan input, tombol yang tertutup, atau gulir horizontal pada halaman utama/formulir. Daftar panitia tampil sebagai kartu ringkas di HP dan dapat menjadi tabel pada desktop.

## 10. Aturan validasi dan konsistensi

1. Draf boleh belum lengkap. Pengiriman akhir wajib memenuhi seluruh kolom wajib yang ditetapkan dalam PRD ini.
2. Pengiriman membutuhkan minimal satu regu dari salah satu kategori, dan **setiap regu wajib berisi 8–15 peserta**. Batas bersifat inklusif: 8 dan 15 diterima; 7 dan 16 ditolak. Berlaku untuk Putri dan Putra. Draf di bawah 8 diperbolehkan; penambahan peserta ke-16 ditolak bahkan pada draf.
3. Jumlah peserta dihitung ulang oleh server berdasarkan data peserta yang tersimpan. Angka total kiriman browser tidak dipercaya sebagai sumber utama.
4. Nama sekolah, regu, peserta, dan pangkalan dirapikan dari spasi berlebih; jangan membatasi nama hanya pada huruf A–Z. Nama dan pangkalan setiap peserta wajib lengkap saat kirim; foto boleh kosong.
5. Nama regu harus berbeda dalam kategori yang sama untuk satu pendaftaran. Nama yang sama pada kategori berbeda diperbolehkan.
6. Nama peserta yang sama dalam satu pendaftaran memunculkan peringatan pemeriksaan, bukan penolakan otomatis: dua orang dapat memiliki nama sama. Keunikan nama bukan bukti identitas.
7. Satu peserta terhubung ke satu regu. Pemimpin regu dipilih dari anggotanya, maksimal satu; jika peserta tersebut dihapus, penandanya ikut dihapus.
8. Pemilik akun tidak boleh membuat pendaftaran kedua untuk sekolah dan kegiatan yang sama. Klik ganda saat mengirim tidak menghasilkan nomor pendaftaran baru.
9. Jika NPSN diisi dan sudah terpakai oleh sekolah lain di sistem, tampilkan arahan menghubungi panitia tanpa mengungkap data pendaftaran akun lain. Nama sekolah yang mirip ditinjau panitia, bukan digabung otomatis.
10. Data sekolah, kontak, regu, nama/pangkalan peserta, dan foto yang telah dikirim terkunci bersama. Perubahan profil tidak boleh diam-diam mengubah bukti pendaftaran atau ID card. Perubahan setelah persetujuan mengikuti proses revisi dan penerbitan versi baru.
11. Periode pendaftaran memakai zona waktu kegiatan yang ditentukan panitia dan pemeriksaan waktu server. Tanggal tutup ditampilkan lengkap beserta jam dan zona waktunya.
12. Perubahan dari dua tab tidak boleh saling menimpa diam-diam. Simpan versi perubahan dan minta pengguna memuat ulang jika data telah berubah.
13. Pendaftaran hanya dinyatakan berhasil setelah tersimpan di database. Jika koneksi terputus, periksa status terkini sebelum mengirim ulang.
14. Batas ukuran teks, ukuran gambar, dan jumlah baris per permintaan ditentukan dalam validasi teknis untuk menjaga aplikasi tetap stabil. Batas tersebut tetap menerapkan aturan bisnis maksimal 15 peserta per regu.
15. Foto opsional tidak menghambat pengiriman, persetujuan, atau penerbitan kartu. Foto yang diunggah harus valid dan sudah selesai tersimpan; foto kosong menggunakan penanda pengganti pada kartu.
16. ID card memuat data yang disetujui, dengan nama/pangkalan uppercase. Akses kartu wajib memeriksa **izin panitia** dan versi persetujuan pada server. Kepemilikan sekolah saja tidak memberi akses kartu.
17. PDF formulir memerlukan sesi pemilik sekolah atau panitia, status Terverifikasi, dan versi aktif. PDF tidak berisi ID card.
18. Email dipicu persetujuan yang berhasil dan masih aktif, ditujukan ke email akun operator, serta tidak menggandakan pekerjaan akibat klik ulang.
19. Google dan email/password menggunakan identitas akun serta hak akses yang sama. Jangan memindahkan atau menggabungkan kepemilikan akun hanya berdasarkan email yang diketik tanpa bukti autentikasi.

## 11. Rencana daftar dan login Google serta email/password

Template sudah memakai Better Auth dengan PostgreSQL dan login email/password. **Pertahankan jalur tersebut dan tambahkan Google**, sehingga kedua metode tersedia untuk daftar dan masuk.

### Pendaftaran dan login email/password

- Formulir daftar berisi nama operator, email, password, dan konfirmasi password; konfirmasi hanya untuk mencocokkan isian dan tidak disimpan.
- Gunakan aturan password bawaan proyek: 8–128 karakter. Password ditangani oleh Better Auth; tidak disimpan atau dicatat sebagai teks biasa.
- Gunakan `emailAndPassword.enabled: true`, `authClient.signUp.email`, dan `authClient.signIn.email` pada autentikasi yang sudah tersedia. Dua metode dapat dikonfigurasi bersama provider Google menurut [dokumentasi resmi Better Auth](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/guides/auth0-migration-guide.mdx).
- Rencana operasional mencakup verifikasi email sebelum login email/password agar pemberitahuan persetujuan menuju alamat yang dikuasai operator. Sediakan kirim ulang verifikasi dengan pembatasan frekuensi.
- Aktifkan verifikasi setelah fungsi pengiriman email tersedia. Template saat ini belum mewajibkannya; jangan mengaktifkan penguncian login tanpa jalur email yang benar-benar berfungsi. Pengguna yang sudah ada perlu mendapat jalur verifikasi yang jelas.
- Sediakan “Lupa password” melalui email dan pengaturan password baru memakai fasilitas Better Auth, dengan token terbatas waktu dan sekali pakai.
- Halaman login menerima email/password dan memberi pesan kesalahan yang jelas tanpa mengungkap detail akun pengguna lain.

### Google

- Konfigurasi `socialProviders.google` memakai `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`; tombol Google memakai `authClient.signIn.social`.
- `BETTER_AUTH_URL` harus cocok dengan origin aplikasi. Callback lokal: `http://localhost:3000/api/auth/callback/google`; produksi: `https://DOMAIN-APLIKASI/api/auth/callback/google`. Rujukan: [Google provider — Better Auth](https://better-auth.com/docs/authentication/google).
- Pengguna Google yang baru membuat akun melalui alur login berhasil; tidak diminta membuat password untuk menggunakan jalur Google.
- Gunakan informasi verifikasi email dari provider yang terpercaya dan tangani kondisi email belum terverifikasi. Pengaturan verifikasi email/password tidak otomatis melindungi semua jalur social login; periksa perilaku versi yang dipakai.
- Jika email sudah digunakan akun yang ada, ikuti alur penautan akun terautentikasi yang aman dari Better Auth. Jangan membuat sekolah ganda atau menggabungkan akun hanya karena string email sama.

### Perilaku bersama dan ketergantungan

- Kedua jalur berakhir pada beranda sekolah yang sama dan menggunakan hak akses yang sama. Akun baru adalah operator; hak panitia diberikan secara sengaja oleh pengelola.
- Email akun menjadi alamat pemberitahuan. Perubahan alamat, bila disediakan nanti, harus melalui verifikasi dan tidak boleh memindahkan kepemilikan sekolah secara bebas.
- Sediakan keluar akun, sesi yang dapat dicabut, pesan login dibatalkan/gagal, dan pemulihan yang sesuai dengan metode masuk pengguna.
- Google hanya meminta identitas dasar; aplikasi tidak memerlukan akses Gmail/Drive/kontak operator.
- Siapkan Google OAuth serta layanan pengiriman email transaksional/SMTP dan identitas pengirim yang dikonfigurasi dengan benar. Simpan kredensial di pengaturan privat server, bukan PRD atau Git.
- Layanan email digunakan untuk verifikasi/pemulihan akun dan pemberitahuan persetujuan. Pengiriman lewat Google login bukan pengganti konfigurasi layanan ini.
- Uji kedua jalur masuk, pendaftaran, verifikasi/pemulihan email, serta pengiriman pemberitahuan secara nyata sebelum menyatakan siap. Pengujian tiruan tetap digunakan untuk otomatisasi, tetapi tidak menggantikan uji integrasi layanan.
- Versi Better Auth di proyek saat penulisan adalah `1.7.3`; cek kompatibilitas dokumentasi saat implementasi. Perencanaan dua metode autentikasi dan verifikasi email telah diperiksa melalui Context7 pada pembaruan ini.

## 12. Rancangan data awal

Bagian ini merupakan model konseptual; nama kolom final ditetapkan saat membuat skema dan migrasi.

| Data                          | Isi utama                                                                                                                                               | Hubungan/aturan                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Akun dan sesi                 | Tabel Better Auth untuk pengguna, kredensial email/password, Google, verifikasi, dan sesi.                                                              | Kedua jalur menggunakan struktur akun yang tersedia dan identitas pengguna aplikasi yang benar.             |
| `events`                      | Nama, lokasi, tanggal kegiatan, buka/tutup pendaftaran, zona waktu, kontak, batas anggota minimum 8 dan maksimum 15.                                    | Satu kegiatan aktif; ketentuan 8–15 tetap diberlakukan pada versi pertama.                                  |
| `schools`                     | Identitas sekolah, nama, NPSN opsional, pemilik akun.                                                                                                   | Satu sekolah per akun pada versi pertama; NPSN yang terisi unik.                                            |
| `registrations`               | Sekolah, kegiatan, nomor pendaftaran, status, salinan data sekolah/kontak/gudep untuk kegiatan ini, waktu kirim, versi perubahan.                       | Unik per pasangan sekolah dan kegiatan. Salinan data ikut terkunci saat dikirim.                            |
| `patrols`                     | Pendaftaran, kategori Putri/Putra, nama regu, pembina pendamping opsional, urutan tampilan.                                                             | Satu pendaftaran memiliki banyak regu.                                                                      |
| `participants`                | Regu, nama lengkap, pangkalan wajib, referensi foto opsional, kelas opsional, penanda pemimpin regu, urutan.                                            | Satu regu memiliki 8–15 peserta saat dikirim; draf boleh kurang dari 8.                                     |
| `participant_photos`          | Pemilik pendaftaran/peserta, lokasi berkas privat, jenis/ukuran/dimensi gambar, versi, waktu unggah.                                                    | Maksimal satu foto aktif per peserta; versi yang dirujuk kartu tetap tersedia sesuai kebijakan penyimpanan. |
| `participant_id_cards`        | Peserta, pendaftaran, versi persetujuan/desain, nomor internal, salinan nama/pangkalan/foto, crop, status, lokasi gambar privat, waktu terbit/nonaktif. | Unik per peserta/versi persetujuan; hasil hanya dapat diakses panitia.                                      |
| `registration_documents`      | Pendaftaran, versi persetujuan, salinan data formulir, status, lokasi PDF privat, waktu terbit/nonaktif.                                                | Satu PDF formulir aktif per versi; diakses pemilik sekolah dan panitia.                                     |
| `email_notifications`         | Pendaftaran, versi persetujuan, jenis pesan, tujuan email, status, kunci idempotensi, percobaan, identitas pesan layanan, waktu/hasil pengiriman.       | Tercatat dan dapat dicoba ulang; tidak berisi lampiran kartu.                                               |
| `registration_status_history` | Pendaftaran, pelaku, status lama/baru, catatan, waktu.                                                                                                  | Riwayat keputusan dan pengiriman disimpan untuk penelusuran.                                                |

Jumlah peserta berasal dari perhitungan data `participants`, sehingga tidak ada angka input terpisah yang berpotensi berbeda. Total per kategori menghitung peserta melalui kategori regunya. Ringkasan panitia menampilkan filter status yang sedang dihitung, misalnya “Peserta terverifikasi”.

Pengiriman dan perubahan status dilakukan dalam transaksi database, termasuk pemeriksaan versi/kelengkapan, validasi 8–15 peserta, pencatatan riwayat, dan penerbitan nomor pendaftaran. Perubahan regu/peserta/foto harus memeriksa status dan versi pendaftaran induknya dalam transaksi agar tidak lolos bersamaan dengan penguncian saat kirim. Persetujuan menyimpan salinan data sekolah/regu/peserta dan pekerjaan kartu, PDF formulir, serta email dalam transaksi yang sama. Pengembalian ke revisi menonaktifkan kartu/formulir versi lama dan membatalkan email lama yang belum terkirim.

Foto, gambar hasil kartu, dan PDF formulir disimpan pada penyimpanan privat; database menyimpan referensi/metadata. Pekerjaan berkas/email dapat dilanjutkan setelah restart. Penggantian foto tidak langsung menghapus versi yang masih dirujuk dokumen/kartu atau pekerjaan penerbitan. Pembersihan berkas mengikuti masa simpan.

## 13. Pendekatan teknis pada proyek yang tersedia

- Gunakan Next.js App Router, React, TypeScript, Tailwind CSS, dan komponen shadcn/ui bawaan template.
- Gunakan Better Auth untuk daftar/login Google dan email/password, verifikasi/pemulihan akun, sesi, serta peran pengguna dan panitia.
- Gunakan PostgreSQL dan Drizzle ORM yang sudah dikonfigurasi.
- Tempatkan validasi input di `src/validators`, aturan bisnis dan query di `src/services`, serta endpoint di `src/app/api`.
- Alur perubahan data: browser → API → pemeriksaan sesi/izin → validasi → service → database.
- Semua operasi milik sekolah memeriksa kepemilikan berdasarkan pengguna yang terautentikasi. Relasi regu/peserta harus ditelusuri sampai pendaftaran miliknya.
- Operasi lintas sekolah dan ekspor hanya tersedia untuk panitia dengan izin server yang sesuai.
- Skema domain ditambahkan melalui migrasi baru; pertahankan tabel akun dan data proyek yang sudah ada.
- Buat PDF formulir A4 dari data disetujui dengan pustaka PDF yang dipilih saat implementasi. Uji tabel panjang, foto opsional, teks Unicode, dan pergantian halaman.
- Render kartu sebagai gambar dengan latar turunan aset referensi dan teks uppercase, lalu tempatkan pada halaman cetak internal panitia dengan ukuran kartu 55 × 85 mm. Pertahankan foto lingkaran dan desain yang diberikan.
- Gunakan direktori lokal privat yang diabaikan Git, misalnya `.data/uploads`, `.data/id-cards`, dan `.data/registration-documents`. Endpoint foto/formulir memeriksa pemilik atau panitia; endpoint hasil kartu mewajibkan panitia.
- Lingkungan produksi membutuhkan penyimpanan berkas privat yang tetap tersedia setelah restart/deploy, berupa volume persisten atau object storage. Provider ditentukan saat menyiapkan publikasi, bukan diasumsikan tersedia saat ini.
- Pembuatan PDF formulir, render kartu, dan email memakai pekerjaan tersimpan yang dapat diulang dengan aman. Periksa versi sebelum mengaktifkan hasil; batasi pemrosesan sekaligus dan tangani kegagalan per pekerjaan.
- Kirim email dari server dengan layanan transaksional/SMTP yang dipilih saat implementasi, tanpa bergantung pada browser operator tetap terbuka. Kredensial tidak berada di bundle klien.
- Ekspor CSV mencakup satu berkas ringkasan sekolah dan satu berkas peserta. Berkas peserta memuat nama, pangkalan, sekolah, regu, kategori, dan status pendaftaran; foto tetap diakses melalui aplikasi. Batasi akses dan perlakukan nilai yang berpotensi menjadi formula spreadsheet sebagai teks.

## 14. Penanganan data dan keandalan

- Data peserta, foto, PDF formulir, dan kontak pembina diakses sekolah pemilik serta panitia. **Hasil render dan halaman cetak ID card hanya dapat diakses panitia**, termasuk ketika diminta operator sekolah pemiliknya sendiri.
- Foto dan PDF tidak memiliki URL publik permanen; setiap permintaan pratinjau/unduhan memeriksa izin serta status kartu jika relevan.
- Penjelasan pengumpulan data mencantumkan penggunaan foto untuk ID card dan menegaskan bahwa foto opsional. Operator meninjau foto sebelum pengiriman.
- Masa simpan/cadangan mencakup database, foto, PDF formulir, gambar kartu, dan catatan email. Setelah revisi, tandai dokumen/kartu lama tidak berlaku.
- Halaman publik menampilkan informasi kegiatan, tanpa daftar nama peserta.
- Data pribadi tidak dimasukkan ke URL, pesan log, atau pesan kesalahan publik.
- Tampilkan penjelasan singkat tentang tujuan pengumpulan data dan kontak panitia pada formulir.
- Masa penyimpanan data setelah acara ditentukan panitia sebelum peluncuran; proses arsip/penghapusan perlu direncanakan dan disetujui terpisah.
- Uji pembatasan akses langsung ke API, bukan hanya menyembunyikan menu.
- Jalankan pengujian menggunakan database terpisah dari data pendaftaran nyata.
- Sebelum peluncuran, periksa kembali laporan audit dependensi template, uji pembaruan yang diperlukan, dan siapkan cadangan database serta langkah pemulihannya.

## 15. Tahapan implementasi

| Tahap                                      | Pekerjaan                                                                                                                                                       | Syarat selesai                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1. Fondasi dan dua metode akun             | Email/password, Google, verifikasi/pemulihan, layanan email, panitia, halaman responsif.                                                                        | Kedua metode daftar/login dan email akun berfungsi; operator tidak memiliki akses panitia.                 |
| 2. Pendaftaran sekolah dan regu            | Skema/migrasi, formulir yang disepakati, pangkalan, foto opsional, penyimpanan privat, validasi 8–15 peserta, jumlah otomatis, draf.                            | Data/foto tersimpan setelah muat ulang, pangkalan wajib, dan pengguna hanya mengakses data miliknya.       |
| 3. Pengiriman dan revisi                   | Pemeriksaan akhir, nomor pendaftaran, penguncian termasuk foto, catatan perbaikan, kirim ulang, versi persetujuan.                                              | Pengiriman ganda aman, batas 8–15 ditegakkan, dan data/foto mengikuti aturan status.                       |
| 4. Persetujuan, formulir, kartu, dan email | PDF formulir A4, render kartu referensi 55 × 85 mm/uppercase, cetak admin, serta email pengambilan kartu.                                                       | Operator menerima email/PDF formulir; hanya panitia mengakses kartu; proses dapat diulang tanpa duplikasi. |
| 5. Verifikasi dan persiapan peluncuran     | Uji dua metode akun, 7/8/15/16 peserta, larangan kartu bagi operator, email nyata, PDF panjang, crop lingkaran, cetak 55 × 85 mm, revisi, penyimpanan produksi. | Kriteria lulus dan alur membawa formulir/mengambil kartu dapat dipahami.                                   |

Urutan implementasi: **daftar/login Google atau email/password → sekolah → regu 8–15 peserta dengan pangkalan wajib dan foto opsional → kirim → admin menyetujui → email → operator unduh/cetak PDF formulir → bawa formulir ke panitia → ambil kartu fisik**. Panitia menyiapkan dan mencetak kartu melalui area internal. Lengkapi beberapa regu, revisi, cetak massal panitia, serta alat operasional setelah alur utama bekerja. Tahap peluncuran dikerjakan ketika pengguna meminta aplikasi dipublikasikan dan lingkungan produksi sudah ditentukan.

## 16. Kriteria penerimaan

- [ ] Operator dapat mendaftar/login melalui Google maupun email/password, keluar, dan kembali ke data sekolah yang sama.
- [ ] Email/password memvalidasi konfirmasi, verifikasi email, dan pemulihan password; Google tersedia tanpa kewajiban membuat password.
- [ ] Penautan metode masuk yang sah tidak membuat sekolah ganda atau memungkinkan pengambilalihan akun berdasarkan email yang diketik.
- [ ] Panitia pertama ditetapkan secara sengaja; pengguna biasa tidak dapat menaikkan hak akses sendiri.
- [ ] Sekolah dapat mendaftarkan hanya putri, hanya putra, atau keduanya.
- [ ] Setiap kategori mendukung lebih dari satu regu.
- [ ] Menambah/menghapus peserta memperbarui jumlah regu dan total sekolah dengan benar; pembina tidak ikut dihitung.
- [ ] Draf yang berhasil disimpan dapat dilanjutkan setelah halaman ditutup atau dibuka pada perangkat lain dengan akun yang sama.
- [ ] Data wajib yang kosong, termasuk pangkalan peserta, ditolak saat pengiriman dengan pesan yang jelas.
- [ ] Untuk kedua kategori, regu berisi 7 peserta gagal dikirim; 8 dan 15 peserta dapat dikirim jika lengkap; peserta ke-16 ditolak oleh antarmuka dan API. Draf di bawah 8 tetap dapat disimpan.
- [ ] Pangkalan awal mengikuti nama sekolah, dapat diedit per peserta, dan tidak ditimpa diam-diam oleh perubahan profil.
- [ ] Foto kosong tetap memungkinkan pengiriman dan persetujuan. Foto valid tersimpan, dapat dipratinjau/diganti/dihapus saat data masih dapat diedit, dan terkunci setelah kirim.
- [ ] Gambar rusak, format tidak didukung, dan unggahan di atas 5 MB ditolak dengan pesan yang jelas; nama/pangkalan yang telah diketik tetap ada.
- [ ] Unggahan yang gagal atau masih berjalan tidak menghasilkan klaim foto telah tersimpan; pengguna dapat mencoba ulang atau membatalkan lalu lanjut tanpa foto.
- [ ] Klik kirim dua kali hanya menghasilkan satu pendaftaran dan satu nomor yang tetap.
- [ ] Pengiriman yang bersamaan dengan perubahan peserta tidak menghasilkan data terkirim yang masih dapat diedit atau total yang tidak konsisten.
- [ ] Data berstatus Dikirim/Terverifikasi/Ditolak terkunci; Perlu perbaikan dapat diedit pemilik dan dikirim ulang selama periode buka.
- [ ] Pengiriman setelah waktu tutup ditolak berdasarkan waktu server, sekalipun halaman dibuka sebelumnya.
- [ ] Pengguna sekolah A tidak dapat membaca, mengubah, menghapus, atau mencetak data sekolah B melalui URL maupun API.
- [ ] Panitia dapat mencari sekolah, memfilter status, memeriksa detail, memberi catatan/keputusan, dan melihat riwayatnya.
- [ ] Total pada dashboard, detail pendaftaran, bukti cetak, dan ekspor cocok untuk filter status yang sama.
- [ ] Koneksi gagal tidak menampilkan keberhasilan palsu atau menghilangkan input yang masih berada di layar.
- [ ] Dua tab yang mengedit data yang sama menghasilkan pemberitahuan konflik, bukan saling menimpa diam-diam.
- [ ] Formulir dapat digunakan pada seluruh ukuran layar sasaran, dengan keyboard HP terbuka, tanpa gulir horizontal atau tombol tertutup.
- [ ] Pemeriksaan proyek yang relevan lulus: `npm run check`, `npm run build`, dan `npm run test:e2e` untuk perubahan autentikasi serta alur pendaftaran.
- [ ] Kedua jalur autentikasi, email verifikasi/pemulihan, email persetujuan nyata, alur sekolah, dan alur panitia diperiksa sebelum dinyatakan siap.
- [ ] Status Dikirim belum memberi akses kartu; persetujuan admin menerbitkan satu kartu per peserta dengan nama dan pangkalan sesuai salinan data yang disetujui.
- [ ] Peserta dengan foto memiliki foto yang tepat pada kartu; peserta tanpa foto mendapat ruang foto berlabel “Foto belum tersedia”, bukan foto akun operator.
- [ ] Gagal membaca foto yang sudah tercatat menghasilkan kegagalan proses yang dapat diulang, bukan kartu Siap dengan foto hilang.
- [ ] Pengulangan persetujuan/proses penerbitan tidak menggandakan kartu; status Menyiapkan/Siap/Gagal benar dan pekerjaan dapat dilanjutkan setelah restart.
- [ ] Operator mendapat PDF formulir, tanpa unduhan/pratinjau ID card; API dan URL langsung hasil kartu menolak operator bahkan untuk sekolahnya sendiri.
- [ ] Panitia mencetak satu kartu per peserta dengan NAMA/PANGKALAN uppercase, desain referensi, foto lingkaran, dan ukuran 55 × 85 mm.
- [ ] Teks NAMA/PANGKALAN dan ilustrasi pemandangan contoh tidak terlihat di belakang data peserta; file referensi asli tetap utuh.
- [ ] Operator tidak dapat mengakses foto/PDF formulir sekolah lain. Semua hasil kartu hanya tersedia bagi panitia. Uji endpoint/berkas langsung, bukan hanya visibilitas tombol.
- [ ] Saat pendaftaran dikembalikan untuk revisi, seluruh kartu versi lama tidak dapat diakses lagi dari aplikasi. Hasil proses versi lama yang terlambat selesai tetap tidak aktif.
- [ ] Persetujuan ulang menghasilkan kartu/PDF formulir/email versi baru; operator diminta membawa formulir terbaru dan panitia mengganti kartu lama.
- [ ] PDF formulir A4 memuat seluruh data sekolah, regu, peserta/pangkalan/foto opsional, dan rekap; data panjang/multi-halaman tidak terpotong dan tidak memuat ID card.
- [ ] Cetak kartu diperiksa pada skala 100%: ukuran 5,5 × 8,5 cm, lingkaran proporsional, logo/ornamen sesuai referensi, identitas panjang terbaca penuh.
- [ ] Email persetujuan menuju email akun operator dan menjelaskan membawa formulir serta mengambil kartu saat penyerahan di lokasi, tanpa lampiran/tautan kartu.
- [ ] Klik persetujuan ulang tidak menggandakan pekerjaan email; gagal kirim dapat diulang. Bukti diterima layanan tidak diklaim pasti masuk kotak masuk.
- [ ] Email/formulir/kartu versi lama tidak diaktifkan atau dikirim setelah dikembalikan untuk revisi.
- [ ] Operator tetap menemukan pesan pengambilan kartu dan PDF aktif di aplikasi ketika email belum diterima.

## 17. Keputusan yang disepakati dan persiapan berikutnya

### Keputusan yang sudah ditetapkan

- Formulir mengikuti kolom wajib/opsional pada bagian 5. Regu Putri/Putra berisi **8–15 peserta**, termasuk pemimpin regu dan tidak termasuk pembina.
- Peserta memiliki **nama dan pangkalan wajib**, serta **foto opsional**.
- Akun mendukung **daftar dan login Google maupun email/password**.
- Desain ID card memakai gambar `src/components/image/Olivia Wilson.png`, ukuran **5,5 cm × 8,5 cm**, foto lingkaran, serta nama/pangkalan **UPPERCASE**.
- **ID card digital hanya diakses panitia** untuk dicetak. Operator menerima kartu fisik saat membawa dan menyerahkan formulir kepada panitia di lokasi perkemahan.
- Persetujuan memicu **email pemberitahuan pengambilan kartu** dan **PDF formulir pendaftaran** yang dapat diunduh/cetak operator.
- PDF operator berisi data formulir, bukan ID card. Rencana unduhan kartu oleh operator dari versi sebelumnya sudah diganti oleh alur ini.

### Persiapan yang masih perlu ditetapkan

| Keputusan                                                  | Rekomendasi awal                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Nama, lokasi, tanggal kegiatan dan jadwal registrasi fisik | Diisi dari informasi resmi panitia; email memakai informasi ini, bukan menafsirkan tanggal dari gambar kartu.                        |
| Periode pendaftaran dan zona waktu                         | Tentukan tanggal serta jam buka/tutup secara eksplisit.                                                                              |
| Jumlah regu per sekolah                                    | Dukung beberapa regu; batas khusus hanya ditambahkan bila perlu. Batas peserta per regu tetap 8–15.                                  |
| Pemilik Google OAuth dan akun panitia                      | Gunakan akun/proyek pengelola dengan admin pertama yang ditunjuk.                                                                    |
| Layanan email dan identitas pengirim                       | Tentukan layanan transaksional/SMTP, alamat pengirim, serta konfigurasi privat; uji verifikasi/pemulihan dan email persetujuan.      |
| Domain dan lingkungan publikasi                            | Ditentukan saat rencana publikasi dibuat; sesuaikan callback Google dan tautan email.                                                |
| Penyimpanan foto, hasil kartu, dan PDF formulir            | Gunakan volume persisten atau object storage privat sesuai lingkungan publikasi, dengan izin akses berbeda untuk kartu dan formulir. |
| Masa penyimpanan dan cadangan                              | Tetapkan masa simpan serta pengelolaan data, foto, hasil kartu, PDF, dan catatan email sebelum peluncuran.                           |

## 18. Rujukan

- Kebutuhan dan perubahan alur dari pemilik proyek: formulir yang disepakati, 8–15 peserta, pangkalan wajib/foto opsional, dua metode akun, desain kartu tetap, uppercase, email persetujuan, PDF formulir, dan penyerahan kartu fisik.
- [Desain ID card dari pengguna](src/components/image/Olivia%20Wilson.png), diperiksa langsung; ukuran sumber 650 × 1004 piksel. Ukuran cetak yang ditetapkan adalah 55 × 85 mm.
- [Instruksi proyek](AGENTS.md), [arsitektur template](docs/architecture.md), dan [standar backend](docs/backend.md).
- [Google provider — Better Auth](https://better-auth.com/docs/authentication/google), rujukan konfigurasi yang diperiksa saat penyusunan awal.
- [Konfigurasi email/password bersama social providers](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/guides/auth0-migration-guide.mdx), [email/password](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/authentication/email-password.mdx), dan [verifikasi email](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/email.mdx), diperiksa melalui Context7 pada pembaruan versi 1.2.
