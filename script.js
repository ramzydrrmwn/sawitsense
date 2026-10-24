/* ==========================================================================
   SawitSense — script.js
   CATATAN PENTING:
   - Semua data sensor di file ini adalah DATA SIMULASI (bukan sensor fisik).
   - Struktur fungsi dibuat modular: readSensorData() dan fetchWeatherData()
     dapat diganti kelak dengan pemanggilan API nyata (ESP32/MQTT, BMKG)
     tanpa mengubah bagian rendering di bawah.
   ========================================================================== */

const BACKEND_BASE_URL = "http://localhost:5000"; // ganti sesuai deployment backend

// ---------------------------------------------------------------------
// 1. BATAS NILAI STATUS (Normal / Warning / Critical)
//    Didefinisikan di sini agar status TIDAK ditulis manual di HTML.
// ---------------------------------------------------------------------
const THRESHOLDS = {
  temperature: { unit: "°C", warning: [26, 34], critical: [0, 40] }, // di luar critical range = critical
  humidity:    { unit: "%",  warning: [40, 80], critical: [0, 100] },
  soil_moisture: { unit: "%", warning: [35, 75], critical: [0, 100] },
  ph:          { unit: "",   warning: [5.5, 6.5], critical: [4.5, 7.5] },
  nitrogen:    { unit: "mg/kg", warning: [80, 150], critical: [0, 250] },
  phosphorus:  { unit: "mg/kg", warning: [30, 60], critical: [0, 120] },
  potassium:   { unit: "mg/kg", warning: [60, 100], critical: [0, 180] },
};

function getStatus(key, value) {
  const t = THRESHOLDS[key];
  if (!t) return "normal";
  const [cLow, cHigh] = t.critical;
  const [wLow, wHigh] = t.warning;
  if (value < cLow || value > cHigh) return "critical";
  if (value < wLow || value > wHigh) return "warning";
  return "normal";
}

// ---------------------------------------------------------------------
// 2. SUMBER DATA SIMULASI
//    Nantinya, ganti isi fungsi ini dengan fetch() ke backend/ESP32.
// ---------------------------------------------------------------------
async function readSensorData() {
  try {
    const res = await fetch("../data/sensor_data.json");
    if (!res.ok) throw new Error("gagal memuat data simulasi");
    return await res.json();
  } catch (e) {
    // fallback jika file tidak bisa diakses (mis. dibuka langsung via file://)
    return {
      temperature: 29.5, humidity: 68, soil_moisture: 62, ph: 5.8,
      nitrogen: 120, phosphorus: 45, potassium: 80,
      history: [
        { time: "08:00", temperature: 27.1, humidity: 74, soil_moisture: 66, ph: 5.9 },
        { time: "10:00", temperature: 28.4, humidity: 71, soil_moisture: 64, ph: 5.85 },
        { time: "12:00", temperature: 30.2, humidity: 65, soil_moisture: 60, ph: 5.8 },
        { time: "14:00", temperature: 31.0, humidity: 63, soil_moisture: 58, ph: 5.75 },
        { time: "16:00", temperature: 29.5, humidity: 68, soil_moisture: 62, ph: 5.8 },
      ],
    };
  }
}

async function fetchWeatherData() {
  // TODO: ganti dengan pemanggilan API BMKG resmi saat sudah dikonfigurasi.
  // Contoh nanti: const res = await fetch(`${BACKEND_BASE_URL}/api/weather`);
  try {
    const res = await fetch("../data/weather_data.json");
    if (!res.ok) throw new Error("gagal memuat data cuaca");
    return await res.json();
  } catch (e) {
    return {
      condition: "Berawan, potensi hujan sore hari",
      temperature: 30, humidity: 70, rain_probability: 70,
      forecast: [
        { time: "12:00", temp: 30, icon: "⛅" },
        { time: "14:00", temp: 31, icon: "🌤️" },
        { time: "16:00", temp: 29, icon: "🌦️" },
        { time: "18:00", temp: 27, icon: "🌧️" },
        { time: "20:00", temp: 26, icon: "🌧️" },
      ],
    };
  }
}

// ---------------------------------------------------------------------
// 3. RENDER — DASHBOARD (hanya berjalan di dashboard.html)
// ---------------------------------------------------------------------
const STAT_META = [
  { key: "temperature", label: "Temperature" },
  { key: "humidity", label: "Humidity" },
  { key: "soil_moisture", label: "Soil Moisture" },
  { key: "ph", label: "Soil pH" },
];

function statusLabel(s) {
  return { normal: "Normal", warning: "Warning", critical: "Critical" }[s];
}

function renderStatCards(data) {
  const el = document.getElementById("stat-cards");
  if (!el) return;
  el.innerHTML = STAT_META.map(({ key, label }) => {
    const value = data[key];
    const status = getStatus(key, value);
    const unit = THRESHOLDS[key].unit;
    return `
      <div class="stat-card">
        <span class="status-pill status-${status}">${statusLabel(status)}</span>
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}<span class="stat-unit">${unit}</span></div>
      </div>`;
  }).join("");
}

function renderNPK(data) {
  const el = document.getElementById("npk-bars");
  if (!el) return;
  const rows = [
    { key: "nitrogen", label: "Nitrogen (N)", max: 250 },
    { key: "phosphorus", label: "Phosphorus (P)", max: 120 },
    { key: "potassium", label: "Potassium (K)", max: 180 },
  ];
  el.innerHTML = rows.map(({ key, label, max }) => {
    const value = data[key];
    const status = getStatus(key, value);
    const pct = Math.min(100, (value / max) * 100);
    return `
      <div class="npk-row">
        <div class="npk-label">
          <span>${label} <span class="status-pill status-${status}" style="position:static; margin-left:6px;">${statusLabel(status)}</span></span>
          <span>${value} mg/kg</span>
        </div>
        <div class="npk-track"><div class="npk-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join("");
}

function renderChart(data) {
  const canvas = document.getElementById("trendChart");
  if (!canvas || !window.Chart) return;
  const history = data.history || [];
  new Chart(canvas, {
    type: "line",
    data: {
      labels: history.map(h => h.time),
      datasets: [
        { label: "Suhu (°C)", data: history.map(h => h.temperature), borderColor: "#2f6b3e", tension: .35 },
        { label: "Kelembapan (%)", data: history.map(h => h.humidity), borderColor: "#c98a3a", tension: .35 },
        { label: "Soil Moisture (%)", data: history.map(h => h.soil_moisture), borderColor: "#4c9a5c", tension: .35 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom", labels: { font: { family: "Inter" } } } },
      scales: { y: { beginAtZero: false } },
    },
  });
}

function buildRecommendations(sensor, weather) {
  const items = [];
  const phStatus = getStatus("ph", sensor.ph);
  const moistureStatus = getStatus("soil_moisture", sensor.soil_moisture);

  items.push({
    warn: phStatus !== "normal",
    text: phStatus === "normal"
      ? `<b>Soil Condition:</b> pH tanah (${sensor.ph}) berada pada rentang yang cukup baik.`
      : `<b>Soil Condition:</b> pH tanah (${sensor.ph}) berada pada kondisi yang perlu diperhatikan.`,
  });
  items.push({
    warn: moistureStatus !== "normal",
    text: `<b>Moisture:</b> Kelembapan tanah (${sensor.soil_moisture}%) berada pada kondisi ${moistureStatus === "normal" ? "cukup" : "yang perlu diwaspadai"}.`,
  });
  items.push({
    warn: weather.rain_probability >= 60,
    text: `<b>Weather:</b> ${weather.rain_probability >= 60 ? "Terdapat potensi hujan cukup tinggi." : "Kondisi cuaca relatif stabil."}`,
  });

  const combineWarn = weather.rain_probability >= 60 && moistureStatus !== "critical";
  items.push({
    warn: combineWarn,
    text: `<b>Recommendation:</b> ${
      combineWarn
        ? "Pertimbangkan kondisi kelembapan tanah dan prakiraan hujan sebelum melakukan pemupukan atau pemeliharaan hari ini."
        : "Kondisi saat ini cukup mendukung aktivitas pemeliharaan rutin, tetap lakukan pemeriksaan berkala."
    }`,
  });

  return items;
}

function renderRecommendations(sensor, weather) {
  const el = document.getElementById("reco-list");
  if (!el) return;
  const items = buildRecommendations(sensor, weather);
  el.innerHTML = items.map(i => `<div class="reco-item ${i.warn ? "warn" : ""}">${i.text}</div>`).join("");
}

function renderWeather(weather) {
  const desc = document.getElementById("weather-desc");
  if (!desc) return;
  desc.textContent = weather.condition;
  document.getElementById("weather-temp").textContent = `${weather.temperature}°C`;
  document.getElementById("weather-humidity").textContent = weather.humidity;
  document.getElementById("weather-rain").textContent = weather.rain_probability;
  document.getElementById("forecast-row").innerHTML = weather.forecast.map(f => `
    <div class="forecast-chip">
      <div>${f.time}</div>
      <div style="font-size:1.2rem;">${f.icon}</div>
      <div class="t">${f.temp}°C</div>
    </div>`).join("");
}

let latestSensorData = null;
let latestWeatherData = null;

async function initDashboard() {
  if (!document.getElementById("stat-cards")) return; // bukan halaman dashboard

  const [sensor, weather] = await Promise.all([readSensorData(), fetchWeatherData()]);
  latestSensorData = sensor;
  latestWeatherData = weather;

  renderStatCards(sensor);
  renderNPK(sensor);
  renderChart(sensor);
  renderWeather(weather);
  renderRecommendations(sensor, weather);

  const lastUpdated = document.getElementById("last-updated");
  if (lastUpdated) lastUpdated.textContent = new Date().toLocaleTimeString("id-ID");
}

// ---------------------------------------------------------------------
// 4. AI ASSISTANT (chatbot) — memanggil backend /api/chat
//    Backend yang meneruskan ke OpenAI API. Jika backend tidak tersedia,
//    tampilkan pesan fallback (lihat bagian 15 & 16 pada spesifikasi).
// ---------------------------------------------------------------------
function appendMessage(role, text) {
  const log = document.getElementById("chat-log");
  if (!log) return;
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function sendChatMessage(message) {
  appendMessage("user", message);

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        sensor_data: latestSensorData,
        weather_data: latestWeatherData,
      }),
    });
    if (!res.ok) throw new Error("backend error");
    const data = await res.json();
    appendMessage("ai", data.reply);
  } catch (e) {
    // Fallback: backend belum tersedia / OpenAI API gagal.
    // Ditandai jelas sebagai mock, sesuai ketentuan mode demo/offline.
    appendMessage("ai", "AI Assistant sedang tidak tersedia. Silakan coba kembali. (mode demo: backend belum terhubung)");
  }
}

function initChat() {
  const form = document.getElementById("chat-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const value = input.value.trim();
    if (!value) return;
    sendChatMessage(value);
    input.value = "";
  });
  document.querySelectorAll(".chip-btn").forEach(btn => {
    btn.addEventListener("click", () => sendChatMessage(btn.dataset.q));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
  initChat();
});
