# SawitSense

Prototype platform monitoring dan rekomendasi budidaya kelapa sawit berbasis
**IoT (simulasi)**, **AI (OpenAI API)**, dan integrasi data cuaca.

> ⚠️ **Catatan penting:** Ini adalah prototype riset. Seluruh data sensor pada
> dashboard adalah **data simulasi**, bukan hasil pembacaan dari sensor fisik
> yang benar-benar terpasang. Struktur kode dirancang modular agar sumber
> data ini bisa diganti dengan data ESP32/MQTT/database di masa depan tanpa
> mengubah keseluruhan frontend.

## Struktur Folder

```
SawitSense/
├── frontend/
│   ├── index.html      # Landing page
│   ├── dashboard.html  # Dashboard monitoring + weather + AI assistant
│   ├── style.css
│   └── script.js
├── backend/
│   ├── app.py           # Flask API (endpoint /api/chat, /api/sensor, /api/weather)
│   ├── requirements.txt
│   └── .env.example
├── data/
│   ├── sensor_data.json  # Data sensor SIMULASI
│   └── weather_data.json # Data cuaca MOCK (siap diganti API BMKG)
└── README.md
```

## Bagian yang masih menggunakan data simulasi/mock

| Bagian | Status | Cara mengganti nantinya |
|---|---|---|
| `data/sensor_data.json` | Simulasi | Ganti `readSensorData()` di `script.js` / endpoint `/api/sensor` di `app.py` dengan pembacaan ESP32/MQTT/database |
| `data/weather_data.json` | Mock | Ganti `fetchWeatherData()` di `script.js` / endpoint `/api/weather` di `app.py` dengan pemanggilan API resmi BMKG |
| AI Assistant tanpa `.env` terisi | Fallback demo | Isi `OPENAI_API_KEY` pada `backend/.env` |

## Cara Menjalankan

### 1. Frontend (tanpa backend, untuk lihat tampilan)
Buka `frontend/index.html` langsung di browser, atau jalankan server statis
sederhana agar `fetch()` ke file JSON di `/data` berjalan normal:

```bash
cd frontend
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

### 2. Backend (untuk mengaktifkan AI Assistant)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # lalu isi OPENAI_API_KEY di dalam .env
python app.py
```

Backend berjalan di `http://localhost:5000`.

### 3. Menghubungkan frontend ke backend

Pastikan `BACKEND_BASE_URL` di `frontend/script.js` sesuai alamat backend
(default: `http://localhost:5000`).

## Cara Memasukkan API Key OpenAI

1. Buat file `backend/.env` (salin dari `.env.example`).
2. Isi baris berikut dengan API key Anda:
   ```
   OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
   ```
3. **Jangan pernah** menaruh API key di file HTML/JS frontend, dan jangan
   commit file `.env` ke GitHub (`.gitignore` sudah mengaturnya).

## Keamanan

- API key OpenAI hanya diakses dari backend (Python), tidak pernah dikirim ke browser.
- Jika pemanggilan OpenAI API gagal, backend mengembalikan pesan
  "AI Assistant sedang tidak tersedia. Silakan coba kembali." — aplikasi tidak crash.
- Website tetap dapat didemonstrasikan tanpa backend/API key aktif, menggunakan
  data simulasi dan respons AI mode demo sebagai fallback.

## Roadmap Pengembangan Selanjutnya

1. ✅ Frontend dashboard (landing page, dashboard, grafik, weather, chatbot UI)
2. ✅ Backend Flask + endpoint `/api/chat`
3. ✅ Integrasi OpenAI API (dengan fallback jika gagal)
4. ⏭️ Integrasi API cuaca BMKG resmi (saat ini masih mock)
5. ⏭️ Integrasi data sensor nyata dari ESP32 (saat ini masih simulasi JSON)
