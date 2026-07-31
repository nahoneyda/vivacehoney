const form = document.getElementById("form");
const text = document.getElementById("text");
const nameInput = document.getElementById("name");
const count = document.getElementById("count");
const message = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");
const prayerList = document.getElementById("prayerList");
const refreshPrayers = document.getElementById("refreshPrayers");

let prayers = [];
const socket = typeof io === "function" ? io() : null;

text.addEventListener("input", () => {
  count.textContent = text.value.length;
});

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

function renderRandomPrayers() {
  if (!prayers.length) {
    prayerList.innerHTML = '<div class="prayer-list-empty">아직 나눠진 기도제목이 없습니다.<br>첫 기도제목을 나눠 주세요.</div>';
    return;
  }

  const selected = shuffle(prayers).slice(0, 10);
  prayerList.innerHTML = selected.map((prayer) => {
    const displayName = prayer.name && prayer.name !== "익명" ? escapeHtml(prayer.name) : "익명";
    return `
      <article class="shared-prayer-item">
        <div class="prayer-avatar" aria-hidden="true">●</div>
        <div class="shared-prayer-content">
          <div class="shared-prayer-meta">
            <strong>${displayName}</strong>
            <span>· ${escapeHtml(timeAgo(prayer.createdAt))}</span>
          </div>
          <p>${escapeHtml(prayer.text)}</p>
        </div>
        <div class="shared-prayer-icon" aria-label="함께 기도합니다">🙏</div>
      </article>
    `;
  }).join("");
}

async function loadPrayers() {
  prayerList.classList.add("loading");
  try {
    const res = await fetch("/api/prayers", { cache: "no-store" });
    if (!res.ok) throw new Error("기도제목을 불러오지 못했습니다.");
    const data = await res.json();
    prayers = Array.isArray(data) ? data : [];
    renderRandomPrayers();
  } catch (err) {
    prayerList.innerHTML = `<div class="prayer-list-empty error-text">${escapeHtml(err.message)}</div>`;
  } finally {
    prayerList.classList.remove("loading");
  }
}

refreshPrayers.addEventListener("click", () => {
  refreshPrayers.classList.add("spin");
  renderRandomPrayers();
  setTimeout(() => refreshPrayers.classList.remove("spin"), 450);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "";
  message.className = "message";
  submitBtn.disabled = true;
  submitBtn.textContent = "등록 중...";

  try {
    const res = await fetch("/api/prayers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput.value, text: text.value })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "전송에 실패했습니다.");

    text.value = "";
    count.textContent = "0";
    message.textContent = "기도제목이 등록되었습니다. 함께 기도하겠습니다.";
    message.className = "message ok";

    if (data.prayer && !prayers.some((p) => p.id === data.prayer.id)) {
      prayers.push(data.prayer);
    }
    renderRandomPrayers();
  } catch (err) {
    message.textContent = err.message;
    message.className = "message error";
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '기도제목 나누기 <span aria-hidden="true">✈</span>';
  }
});

if (socket) {
  socket.on("prayer:new", (prayer) => {
    if (!prayer || prayers.some((p) => p.id === prayer.id)) return;
    prayers.push(prayer);
    if (prayers.length > 100) prayers = prayers.slice(-100);
    renderRandomPrayers();
  });

  socket.on("prayer:clear", () => {
    prayers = [];
    renderRandomPrayers();
  });
}

loadPrayers();
