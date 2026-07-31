const socket = io();
let prayers = [];
let lastId = null;

const prayerText = document.getElementById("prayerText");
const prayerName = document.getElementById("prayerName");
const counter = document.getElementById("counter");

fetch("/api/qr")
  .then(r => r.json())
  .then(data => {
    document.getElementById("qr").src = data.dataUrl;
    document.getElementById("prayUrl").textContent = data.url;
  });

function updateCounter() {
  counter.textContent = `등록 ${prayers.length}건`;
}

function showRandomPrayer() {
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
