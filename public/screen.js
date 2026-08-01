const socket = io();
let prayers = [];

const counter = document.getElementById("counter");
const recentPrayerList = document.getElementById("recentPrayerList");

const qrCard = document.getElementById("qrCard");
const qrToggleBtn = document.getElementById("qrToggleBtn");
const zoomIcon = document.getElementById("zoomIcon");

// QR 코드 생성
fetch("/api/qr")
  .then(r => r.json())
  .then(data => {
    document.getElementById("qr").src = data.dataUrl;
    document.getElementById("prayUrl").textContent = data.url;
  });

// 🔍 QR 코드 확대/축소 토글 이벤트
if (qrToggleBtn) {
  qrToggleBtn.addEventListener("click", () => {
    const isMinimized = qrCard.classList.toggle("minimized");
    if (isMinimized) {
      zoomIcon.textContent = "🔍 +";
    } else {
      zoomIcon.textContent = "🔍 −";
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

// 기도 목록 렌더링 (최신순 10개)
function renderPrayers() {
  if (!recentPrayerList) return;
  
  if (!prayers || !prayers.length) {
    recentPrayerList.innerHTML = '<div class="recent-empty">아직 나누어진 기도제목이 없습니다.</div>';
    return;
  }

  // 최신순 정렬
  const recentList = [...prayers].reverse();

  recentPrayerList.innerHTML = recentList.map(prayer => {
    const displayName = prayer.name && prayer.name !== "익명" ? escapeHtml(prayer.name) : "익명";
    return `
      <div class="recent-item">
        <span class="recent-name">${displayName}</span>
        <div class="recent-text">${escapeHtml(prayer.text)}</div>
      </div>
    `;
  }).join("");
}

// Socket.io 이벤트
socket.on("prayer:init", list => {
  prayers = list || [];
  updateCounter();
  renderPrayers();
});

socket.on("prayer:new", prayer => {
  prayers.push(prayer);
  if (prayers.length > 100) prayers = prayers.slice(-100);
  updateCounter();
  renderPrayers();
});

socket.on("prayer:clear", () => {
  prayers = [];
  updateCounter();
  renderPrayers();
});