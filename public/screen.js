const socket = io();
let prayers = [];
let lastId = null;

const prayerText = document.getElementById("prayerText");
const prayerName = document.getElementById("prayerName");
const counter = document.getElementById("counter");
const recentPrayerList = document.getElementById("recentPrayerList");

// QR 코드 생성
fetch("/api/qr")
  .then(r => r.json())
  .then(data => {
    document.getElementById("qr").src = data.dataUrl;
    document.getElementById("prayUrl").textContent = data.url;
  });

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

// 🔥 하단 최근 기도 목록 10개 렌더링 함수
function renderRecentPrayers() {
  if (!recentPrayerList) return;
  
  if (!prayers || !prayers.length) {
    recentPrayerList.innerHTML = '<div class="recent-empty">아직 나누어진 기도제목이 없습니다.</div>';
    return;
  }

  // 최신순으로 상위 10개 추출
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
  renderRecentPrayers(); // 최근 목록 업데이트

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

// 실시간 데이터 수신 이벤트
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