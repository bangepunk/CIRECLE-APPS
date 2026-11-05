# Deploy CIRCLE (tanpa Emergent)

Arsitektur: **Frontend → Vercel**, **Backend → Render**, **Database → MongoDB Atlas**, **Login → Google**.
File upload disimpan di MongoDB (GridFS), jadi tidak butuh layanan storage lain.

## 1. MongoDB Atlas (gratis)
1. Buat cluster **M0 (Free)**, region Singapore.
2. Database Access → buat user + password.
3. Network Access → Add IP `0.0.0.0/0` (IP Render tidak tetap).
4. Connect → Drivers → salin connection string `mongodb+srv://...` → ini nilai `MONGO_URL`.

## 2. Google Login
1. https://console.cloud.google.com → buat project → **APIs & Services → OAuth consent screen** (External, lalu Publish).
2. **Credentials → Create credentials → OAuth client ID → Web application.**
3. **Authorized JavaScript origins**: isi alamat frontend, mis. `https://app.domainmu.id` dan `https://nama-proyek.vercel.app` (dan `http://localhost:3000` untuk uji lokal). Redirect URI tidak perlu diisi.
4. Salin **Client ID** → nilai `GOOGLE_CLIENT_ID` (hanya di backend; frontend mengambilnya otomatis).

## 3. Backend di Render
1. Render → **New → Blueprint** → pilih repo ini (membaca `render.yaml`).
2. Isi variabel: `MONGO_URL`, `GOOGLE_CLIENT_ID`, `SUPER_ADMIN_EMAILS` (email kamu → jadi Super Admin saat login pertama), `CORS_ORIGINS`, `APP_URL`.
   - `CORS_ORIGINS` = alamat frontend, pisahkan koma **tanpa spasi**.
3. Setelah live, buka `https://<alamat-backend>/api/health` → harus `{"ok":true}`.

## 4. Frontend di Vercel
- Application Preset: **Other**, Root Directory `./` (sisanya otomatis dari `vercel.json`).
- Environment Variable: `REACT_APP_BACKEND_URL` = alamat backend, tanpa `/` di akhir dan tanpa `/api`.
- Ubah nilai ini → wajib **Redeploy** (dipakai saat build).

## 5. Email laporan mingguan (opsional)
Tambahkan di Render: `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `EMAIL_FROM_NAME`.
Lalu di GitHub repo → Settings → Secrets → Actions: `BACKEND_URL` dan `WEBHOOK_CRON_SECRET` (nilai sama dengan di Render).
Jadwal: Senin 09:00 WIB (`.github/workflows/weekly-report.yml`). Tanpa SMTP, aplikasi tetap jalan normal.

## Catatan penting
- **Domain sendiri sangat disarankan**: frontend `app.domainmu.id`, backend `api.domainmu.id`. Cookie login memakai `SameSite=None`; tanpa domain yang sama, Safari/iPhone (dan sebagian browser privasi) bisa menolak cookie login karena beda situs (`vercel.app` vs `onrender.com`).
- Plan Render **free** akan tertidur saat idle, sehingga chat/call (WebSocket) putus dan bangunnya lambat. Pakai `starter`.
- Backend harus 1 instance saja (status online/chat realtime disimpan di memori proses).
- Data lama di database Emergent **tidak ikut pindah otomatis**. Database baru akan terisi data awal (seed) saat backend pertama kali jalan.
