"""
SawitSense — Backend (Flask)
============================
Tugas backend ini:
1. Menyajikan data sensor & cuaca simulasi ke frontend (opsional, frontend
   juga bisa membaca langsung file JSON di /data saat dijalankan statis).
2. Menyediakan endpoint POST /api/chat yang meneruskan pertanyaan pengguna
   + data monitoring ke OpenAI API, lalu mengembalikan jawaban AI.

CATATAN PENTING:
- API key OpenAI HANYA disimpan di sini (lewat .env), TIDAK PERNAH dikirim
  atau ditulis di frontend/HTML/JS.
- Jika OpenAI API gagal/tidak tersedia, endpoint ini mengembalikan pesan
  fallback yang jelas, bukan meng-crash aplikasi.
- Seluruh data sensor pada project ini adalah data SIMULASI.
"""

import os
import json
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()  # membaca file .env

app = Flask(__name__)
CORS(app)  # izinkan frontend (origin berbeda) memanggil backend ini

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Coba import client OpenAI. Jika library belum terpasang atau key kosong,
# fitur AI otomatis jatuh ke mode fallback (lihat generate_ai_reply()).
try:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
except ImportError:
    client = None


# ---------------------------------------------------------------------
# Util: baca data simulasi dari /data (modular — nanti sumber ini yang
# diganti dengan pembacaan dari ESP32/MQTT/database)
# ---------------------------------------------------------------------
def read_json_file(filename: str) -> dict:
    path = DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.route("/api/sensor", methods=["GET"])
def get_sensor_data():
    """Mengembalikan data sensor SIMULASI. Ganti fungsi ini dengan
    pembacaan ESP32/MQTT/database saat perangkat nyata sudah tersedia."""
    try:
        return jsonify(read_json_file("sensor_data.json"))
    except FileNotFoundError:
        return jsonify({"error": "data simulasi tidak ditemukan"}), 404


@app.route("/api/weather", methods=["GET"])
def get_weather_data():
    """Mengembalikan data cuaca. Saat ini MOCK DATA.
    TODO: ganti dengan pemanggilan API resmi BMKG di sini."""
    try:
        return jsonify(read_json_file("weather_data.json"))
    except FileNotFoundError:
        return jsonify({"error": "data cuaca tidak ditemukan"}), 404


# ---------------------------------------------------------------------
# AI Assistant
# ---------------------------------------------------------------------
SYSTEM_PROMPT_TEMPLATE = """Anda adalah SawitSense AI, asisten informasi budidaya kelapa sawit.

Gunakan data monitoring dan cuaca berikut sebagai konteks:

Data tanaman:
Suhu: {temperature}°C
Kelembapan: {humidity}%
Kelembapan tanah: {soil_moisture}%
pH: {ph}
Nitrogen: {nitrogen} mg/kg
Phosphorus: {phosphorus} mg/kg
Potassium: {potassium} mg/kg

Data cuaca:
Suhu udara: {w_temperature}°C
Kelembapan: {w_humidity}%
Probabilitas hujan: {rain_probability}%

Catatan penting:
- Seluruh data di atas berasal dari data SIMULASI, bukan sensor fisik nyata.
- Jangan mengarang data yang tidak diberikan.
- Berikan rekomendasi secara hati-hati dan jelaskan alasannya.
- Jangan memberikan diagnosis absolut ("tanaman pasti mengalami...").
  Gunakan bahasa seperti "berdasarkan data yang tersedia...",
  "kemungkinan...", atau "disarankan melakukan pemeriksaan langsung...".
- Jawaban harus mudah dipahami petani.
"""


def build_system_prompt(sensor_data: dict, weather_data: dict) -> str:
    sensor_data = sensor_data or {}
    weather_data = weather_data or {}
    return SYSTEM_PROMPT_TEMPLATE.format(
        temperature=sensor_data.get("temperature", "tidak tersedia"),
        humidity=sensor_data.get("humidity", "tidak tersedia"),
        soil_moisture=sensor_data.get("soil_moisture", "tidak tersedia"),
        ph=sensor_data.get("ph", "tidak tersedia"),
        nitrogen=sensor_data.get("nitrogen", "tidak tersedia"),
        phosphorus=sensor_data.get("phosphorus", "tidak tersedia"),
        potassium=sensor_data.get("potassium", "tidak tersedia"),
        w_temperature=weather_data.get("temperature", "tidak tersedia"),
        w_humidity=weather_data.get("humidity", "tidak tersedia"),
        rain_probability=weather_data.get("rain_probability", "tidak tersedia"),
    )


def generate_ai_reply(user_message: str, sensor_data: dict, weather_data: dict) -> str:
    """Memanggil OpenAI API. Jika gagal (key belum diset, kuota habis,
    koneksi gagal, dsb) -> kembalikan fallback yang jelas, JANGAN crash."""
    if client is None:
        # Mode demo/offline — ditandai jelas sebagai mock.
        return (
            "[Mode demo] AI Assistant belum terhubung ke OpenAI API. "
            "Berdasarkan data simulasi saat ini, kondisi tanaman terlihat "
            "cukup stabil, namun disarankan mengonfigurasi OPENAI_API_KEY "
            "pada file .env untuk mendapatkan analisis penuh."
        )

    try:
        system_prompt = build_system_prompt(sensor_data, weather_data)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=400,
        )
        return response.choices[0].message.content
    except Exception:
        # Jangan pernah membuat backend/website crash karena kegagalan API.
        return "AI Assistant sedang tidak tersedia. Silakan coba kembali."


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json(silent=True) or {}
    user_message = body.get("message", "").strip()
    sensor_data = body.get("sensor_data")
    weather_data = body.get("weather_data")

    if not user_message:
        return jsonify({"error": "pertanyaan tidak boleh kosong"}), 400

    reply = generate_ai_reply(user_message, sensor_data, weather_data)
    return jsonify({"reply": reply})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
