const socket = io();
let prayers = [];
let lastId = null;

const prayerText = document.getElementById("prayerText");
const prayerName = document.getElementById("prayerName");
const counter = document.getElementById("counter");
const recentPrayerList = document.getElementById("recentPrayerList");

const qrCard = document.getElementById("qrCard");
const displayGrid = document.getElementById("displayGrid");
const qrToggleBtn = document.getElementById("qrToggleBtn");
const zoomIcon = document.getElementById("zoomIcon");

// QR 코드 생성
fetch("/api/qr")
  .then(r => r.json())
  .then(data => {
    document.getElementById("qr").src = data.dataUrl;
    document.getElementById("prayUrl").textContent = data.url;
  });

// 🔍 QR 코드 확대/축소 토글 기능
if (qrToggleBtn) {
  qrToggleBtn.addEventListener("click", () => {
    const isMinimized = qrCard.classList.toggle("minimized");
    displayGrid.classList.toggle("qr-minimized", isMinimized);

    if (isMinimized) {
      zoomIcon.textContent = "🔍 +"; // 축소 상태일 때는 확대 아이콘 표시
    } else {
      zoomIcon.textContent = "🔍 −"; // 기본 상태일 때는 축소 아이콘 표시
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateCounter() {
  if (counter) {
    counter.textContent = `등록 ${prayers.length}건`;
  }
}

// 하단 최근 기도 목록 렌더링
function renderRecentPrayers() {
  if (!recentPrayerList) return;
  
  if (!prayers || !prayers.length) {
    recentPrayerList.innerHTML = '<div class="recent-empty">아직 나누어진 기도제목이 없습니다.</div>';
    return;
  }

  const recent10 = [...prayers].reverse().slice(0, 10);

  recentPrayerList.innerHTML = recent10.map(prayer => {
    const displayName = prayer.name && prayer.name !== "익명" ? escapeHtml(prayer.name) : "익명";
    return `
      <div class="recent-item">
        <span class="recent-name">${displayName}</span>
        <span class="recent-text">${escapeHtml(prayer.text)}</span>
      </div>
    `;
  }).join("");
}

function showRandomPrayer() {
  renderRecentPrayers();

  if (!prayers.length) {
    prayerText.textContent = "기도제목을 기다리고 있습니다.";
    prayerName.textContent = "";
    updateCounter();
    return;
  }

  let pool = prayers;
  if (prayers.length > 1 && lastId !== null) {
    pool = prayers.filter(p => p.id !== lastId);
  }

  const prayer = pool[Math.floor(Math.random() * pool.length)];
  lastId = prayer.id;

  prayerText.classList.remove("show");
  setTimeout(() => {
    prayerText.textContent = prayer.text;
    prayerName.textContent = prayer.name === "익명" ? "— 익명" : `— ${prayer.name}`;
    prayerText.classList.add("show");
    updateCounter();
  }, 180);
}

socket.on("prayer:init", list => {
  prayers = list || [];
  updateCounter();
  showRandomPrayer();
});

socket.on("prayer:new", prayer => {
  prayers.push(prayer);
  if (prayers.length > 100) prayers = prayers.slice(-100);
  updateCounter();
  showRandomPrayer();
});

socket.on("prayer:clear", () => {
  prayers = [];
  lastId = null;
  showRandomPrayer();
});

setInterval(showRandomPrayer, 8000);