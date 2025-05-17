# gemini2 - Just Simple Gemini Clone

[Read in: [English](README.md)]

<br>

## Bahasa Indonesia

Sebuah aplikasi chat sederhana berbasis web yang berinteraksi dengan API Gemini dari Google, bertujuan untuk mereplikasi beberapa fungsionalitas inti dari antarmuka mirip Gemini. Proyek ini menggunakan Firebase untuk layanan backend (autentikasi, Firestore, Storage) dan proksi berbasis Deno untuk berkomunikasi secara aman dengan API Gemini.

### Fitur

*   **Autentikasi Google**: Proses masuk yang aman menggunakan akun Google.
*   **Chat Real-time**: Terlibat dalam percakapan dengan AI Gemini.
*   **Riwayat Chat**: Percakapan sebelumnya disimpan dan dapat diakses kembali.
*   **Unggah File**:
    *   **Analisis Gambar**: Unggah gambar (JPG, PNG, dll.) agar AI dapat menganalisis dan mendeskripsikannya.
    *   **Pemrosesan Dokumen**: Unggah dokumen PDF dan berbagai dokumen berbasis teks (TXT, MD, HTML, CSV, JSON, XML) agar AI dapat memproses kontennya.
*   **Pemilihan Model**: Pilih antara model Gemini yang berbeda (misalnya, versi Flash, Pro eksperimental).
*   **UI Responsif**: Beradaptasi dengan berbagai ukuran layar untuk pengalaman yang baik di desktop dan seluler.
*   **Kustomisasi Tema**: Beralih antara tema Terang, Gelap, dan Sistem.
*   **Manajemen Pesan**: Opsi untuk menyalin respons AI.
*   **Manajemen Chat Terbaru**: Ganti nama atau hapus percakapan sebelumnya.

### Teknologi yang Digunakan

*   **Frontend**: Vanilla JavaScript, HTML, CSS
*   **Layanan Backend**:
    *   Firebase Authentication
    *   Firebase Firestore (untuk penyimpanan chat)
    *   Firebase Storage (untuk unggahan file)
*   **Proksi AI**: Deno (TypeScript) - Sebuah proksi backend (`gemini-backend.deno.dev`) untuk menangani permintaan ke API Google Gemini secara aman.
*   **Model AI**: Google Gemini API

### Struktur Proyek (Sederhana)

*   `index.html`: File HTML utama.
*   `css/style.css`: Gaya untuk aplikasi.
*   `js/script.js`: Menangani logika UI, event listener, dan interaksi dengan `function.js`.
*   `js/function.js`: Logika inti interaksi Firebase dan API.
*   `js/firebase.config.js`: Konfigurasi proyek Firebase.
*   `assets/`: Berisi gambar dan aset statis lainnya.
*   **(Proksi Backend - Proyek Deno Terpisah)**:
    *   `main.ts` (atau serupa): Server Deno yang menjadi proksi permintaan ke API Gemini dan memproses unggahan file.

### Pengaturan

1.  **Pengaturan Firebase**:
    *   Buat proyek Firebase di https://console.firebase.google.com/.
    *   Aktifkan Autentikasi Google.
    *   Siapkan Firestore dan Firebase Storage.
    *   Perbarui `js/firebase.config.js` dengan konfigurasi proyek Firebase Anda.
    *   Konfigurasikan aturan Firebase Storage untuk mengizinkan unggahan oleh pengguna dan pembacaan oleh proksi (lihat contoh di diskusi sebelumnya).

2.  **Kunci API Gemini**:
    *   Dapatkan kunci API Google Gemini dari Google AI Studio.

3.  **Proksi Backend Deno**:
    *   Proksi backend (misalnya, `https://gemini-backend.deno.dev`) harus berjalan.
    *   Atur variabel lingkungan `GEMINI_API_KEY` untuk proyek Deno Deploy atau server Deno lokal Anda.
    *   Pastikan `GEMINI_PROXY_URL` di `js/function.js` mengarah ke proksi Deno Anda yang telah di-deploy.

4.  **Frontend**:
    *   Sajikan file frontend (HTML, CSS, JS) menggunakan server HTTP sederhana (misalnya, Live Server di VS Code, `http.server` dari Python, dll.).

### Berkontribusi

Kontribusi sangat diharapkan! Silakan kirim pull request atau buka issue.

### Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.