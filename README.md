# PantauStok AI

Sistem manajemen inventaris cerdas dengan analitik, peramalan permintaan (demand forecasting), dan asisten AI. Dibangun dengan **FastAPI** (backend) dan **React + Vite** (frontend), didukung **PostgreSQL**.

> Forecasting & narasi inventaris ditenagai model AI melalui [SumoPod](https://sumopod.com) (kompatibel OpenAI API).

---

## ✨ Fitur

### Inti
- **Dashboard** — KPI real-time, tren permintaan, distribusi stok, breakdown kategori
- **Produk & Pemasok** — CRUD lengkap, bulk import
- **Pergerakan Stok** — log IN / OUT / penyesuaian
- **Peramalan (Forecasting)** — prediksi permintaan per produk
- **Peringatan (Alerts)** — low-stock, overstock, anomali

### Kecerdasan & Analitik
- **Smart Reorder** — saran reorder otomatis + Purchase Order dengan **PO lifecycle tracking** (expected vs actual arrival, partial receive, timeline)
- **Analytics Hub** — analisis ABC, dead stock, performa pemasok
- **AI Assistant** — tanya-jawab inventaris berbahasa natural (ID/EN)
- **Laba Rugi (P&L)** — revenue, HPP, laba kotor, margin, tren, heatmap kategori×pemasok

### Operasional
- **Pindai Barcode / QR** — scan via webcam (`html5-qrcode`), lookup SKU, stok in/out cepat, generate label QR
- **Kalender Inventaris** — agregasi event: pergerakan, kedatangan PO, stok opname
- **Stok Opname / Cycle Count** — sesi penghitungan, laporan selisih, approve → penyesuaian otomatis
- **Multi-Gudang** — stok per-lokasi, transfer antar-gudang, tampilan konsolidasi

### Administrasi
- **Autentikasi & Role** — JWT, RBAC (admin / manager / staff)
- **Multi-Bahasa (i18n)** — Indonesia & Inggris
- **Custom Dashboard Builder** — atur widget yang tampil, simpan layout per-user, mode fullscreen
- **Integrasi E-Commerce (mock)** — Tokopedia / Shopee / WooCommerce, sync stok & tarik pesanan (siap disambung API asli)
- **Laporan Terjadwal** — generate PDF (inventaris / P&L), jadwal + kirim email (opsional via SMTP)
- **Laporan & Ekspor** — ekspor CSV, audit trail

---

## 🛠️ Tech Stack

| Lapisan | Teknologi |
|---|---|
| Backend | FastAPI, SQLAlchemy (async), Pydantic |
| Database | PostgreSQL (via `asyncpg`) |
| Auth | JWT (`python-jose`), bcrypt (`passlib`) |
| AI / ML | SumoPod (OpenAI-compatible), Prophet, statsmodels, scikit-learn |
| PDF / QR | reportlab, qrcode |
| Frontend | React 19, Vite, React Router, Chart.js, html5-qrcode, lucide-react |

---

## 📋 Prasyarat

- **Python** 3.10+
- **Node.js** 18+
- **PostgreSQL** 13+
- API key **SumoPod** (untuk fitur AI/forecasting)

---

## 🚀 Setup & Menjalankan

### 1. Klon repositori
```bash
git clone https://github.com/gevinfaza1702/pantaustok_aiinventory.git
cd pantaustok_aiinventory
```

### 2. Konfigurasi environment
Salin `.env.example` menjadi `.env` di root, lalu isi nilainya:
```bash
cp .env.example .env
```

Variabel penting:
```env
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@localhost:5432/stocksense
SECRET_KEY=ganti-dengan-string-acak-yang-kuat
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI (SumoPod)
SUMOPOD_API_KEY=sk-xxxxxxxx
SUMOPOD_BASE_URL=https://ai.sumopod.com/v1
SUMOPOD_MODEL=MiniMax-M2.7-highspeed

# SMTP (opsional — untuk Laporan Terjadwal; kosongkan untuk menonaktifkan email)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@pantaustok.local
```

> Buat database PostgreSQL bernama `stocksense` (atau sesuaikan `DATABASE_URL`) sebelum menjalankan.

### 3. Backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate     # Windows (Git Bash) — Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend jalan di `http://localhost:8000`.
- Dokumentasi API interaktif: `http://localhost:8000/api/v1/docs`
- Tabel database dibuat otomatis saat startup. **User admin default dibuat otomatis** (lihat di bawah).

**Isi data contoh (opsional):**
```bash
curl -X POST http://localhost:8000/api/v1/seed
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend jalan di `http://localhost:5173` (default Vite).

---

## 🔑 Login Default

Saat pertama kali backend dijalankan, akun admin dibuat otomatis:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | admin |

> ⚠️ **Segera ganti** kredensial ini di lingkungan production.

Role tersedia: `admin` > `manager` > `staff`. Beberapa menu (Multi-Gudang, E-Commerce, persetujuan stok opname, jadwal laporan) memerlukan role `manager` ke atas.

---

## 📁 Struktur Proyek

```
pantaustok_aiinventory/
├── backend/
│   ├── models/        # Model SQLAlchemy
│   ├── routers/       # Endpoint API per fitur
│   ├── services/      # Logika bisnis
│   ├── ml/            # Engine forecasting
│   ├── config.py      # Settings (baca dari .env)
│   ├── database.py    # Engine & session async
│   ├── main.py        # Entry point FastAPI
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/       # Halaman per fitur
│       ├── components/  # Komponen UI bersama
│       ├── contexts/    # AuthContext
│       ├── i18n/        # Kamus ID/EN
│       └── services/    # Klien API (axios)
├── .env.example
└── .gitignore
```

---

## 📝 Catatan

- File `.env` berisi rahasia dan **tidak** ikut ter-commit (sudah di `.gitignore`). Gunakan `.env.example` sebagai acuan.
- Integrasi E-Commerce saat ini berupa **mock connector** dengan interface yang siap disambungkan ke API Tokopedia/Shopee/WooCommerce asli.
- Pengiriman email pada Laporan Terjadwal hanya aktif bila konfigurasi SMTP diisi; jika kosong, PDF tetap bisa dibuat & diunduh manual.
