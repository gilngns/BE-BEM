# Deploy backend ke VPS Ubuntu

Backend dipasang di VPS yang sama dengan landing (`gardahijaukemdiktisaintek.digital`) dan layanan AI.

| Alamat | Isi |
|---|---|
| `https://gardahijaukemdiktisaintek.digital/api/...` | Backend ini (service `bebem`, `127.0.0.1:5001`) |
| `https://gardahijaukemdiktisaintek.digital/api-docs` | Swagger |
| `https://gardahijaukemdiktisaintek.digital/` | Landing (tidak berubah) |

Backend memanggil layanan AI di VPS yang sama: prediksi di `127.0.0.1:5000`, chatbot di `127.0.0.1:5002`.

## Urutan

1. Landing sudah terpasang (Nginx + HTTPS).
2. Layanan AI sudah terpasang (repo `AI-BEM`, `deploy/setup-server.sh`). Tanpa AI, backend tetap jalan, tapi fitur prediksi dan chatbot membalas "layanan tidak tersedia".
3. Pasang backend:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/gilngns/BE-BEM/main/deploy/setup-server.sh -o setup-be.sh
   sudo bash setup-be.sh
   ```

   Tidak ada pertanyaan. Skrip otomatis:
   - membuat database `bebem` dan `.env` (password database dan `JWT_SECRET` dibuat acak, `TRUST_PROXY=1`, alamat AI lokal);
   - menjalankan `npm ci`, `prisma generate`, dan `prisma migrate deploy`;
   - mendaftarkan service `bebem`;
   - menambahkan `/api` dan `/api-docs` ke Nginx landing (konfigurasi lama dicadangkan; kalau Nginx error, otomatis dikembalikan);
   - memasang backup harian database ke `/var/backups/bebem`, disimpan 14 hari.

4. Cek bagian "Pemeriksaan" di akhir output:

   ```
   Backend lokal          200 {"success":true,"status":"ok"}
   Lewat domain           400 {"success":false,"message":"Username dan password wajib diisi"}
   Swagger                200 {"openapi":...
   Landing (tidak berubah) 200 ...
   AI prediksi            200 ...
   AI chatbot             200 ...
   ```

   Angka 400 pada "Lewat domain" memang benar: login dengan body kosong harus ditolak.

## Aplikasi Android

Ganti base URL di aplikasi menjadi:

```
https://gardahijaukemdiktisaintek.digital
```

Path endpoint tetap sama (`/api/auth/login`, `/api/siklus`, dst.). Selama aplikasi lama masih dipakai, jangan matikan backend di server lama.

## Memindahkan data dari server lama (opsional)

Database baru dimulai kosong. Jika akun dan data warga di server lama perlu ikut pindah:

1. Di server lama, buat dump (sesuaikan nama database):

   ```bash
   pg_dump -Fc --no-owner --no-acl -d NAMA_DB_LAMA > bebem-lama.dump
   ```

2. Upload `bebem-lama.dump` ke `/root/` di VPS baru (SFTP Termius).
3. Di VPS baru:

   ```bash
   sudo systemctl stop bebem
   sudo -u postgres dropdb bebem
   sudo -u postgres createdb -O bebem bebem
   sudo -u postgres pg_restore --no-owner --role=bebem -d bebem /root/bebem-lama.dump
   cd /srv/bebem/app && sudo -u bebem npx prisma migrate deploy
   sudo systemctl start bebem
   ```

   `prisma migrate deploy` menambahkan migrasi yang belum ada di database lama.

Token login lama tidak berlaku lagi, karena `JWT_SECRET` server baru berbeda. Warga cukup login ulang dengan username dan password yang sama.

## Update setelah ada perubahan kode

Push ke `main`, lalu di VPS:

```bash
sudo bash /srv/bebem/app/deploy/update.sh
```

## Perintah yang sering dipakai

| Keperluan | Perintah |
|---|---|
| Status | `sudo systemctl status bebem` |
| Log (live) | `sudo journalctl -u bebem -f` |
| Restart | `sudo systemctl restart bebem` |
| Ubah pengaturan | `sudo nano /srv/bebem/app/.env` lalu restart |
| Daftar backup | `sudo ls -lh /var/backups/bebem` |

Batas rate limit bisa diatur lewat `.env` (`RATE_LIMIT_*`, lihat `.env.example`). Nilai bawaannya sudah longgar untuk demo dengan banyak HP di satu wifi.

## Pengujian

```bash
npm test
```

Tes ini mensimulasikan demo: banyak warga registrasi dan login bersamaan dari satu wifi, akun yang dipakai bersama, salah ketik password, dan huruf kapital otomatis. Tidak butuh database.
