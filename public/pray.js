const form = document.getElementById("form");
const text = document.getElementById("text");
const nameInput = document.getElementById("name");
const count = document.getElementById("count");
const message = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");

text.addEventListener("input", () => {
  count.textContent = text.value.length;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "전송 중...";

  try {
    const res = await fetch("/api/prayers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameInput.value,
        text: text.value
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "전송에 실패했습니다.");

    text.value = "";
    count.textContent = "0";
    message.textContent = "기도제목이 등록되었습니다. 함께 기도하겠습니다.";
    message.className = "message ok";
  } catch (err) {
    message.textContent = err.message;
    message.className = "message error";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "기도제목 보내기";
  }
});
