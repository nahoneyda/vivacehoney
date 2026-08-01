const socket = io();

const form = document.getElementById("form");
const nameInput = document.getElementById("name");
const textInput = document.getElementById("text");
const countSpan = document.getElementById("count");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");

// 글자 수 세기
if (textInput && countSpan) {
  textInput.addEventListener("input", () => {
    countSpan.textContent = textInput.value.length;
  });
}

// 폼 제출 이벤트
if (form) {
  form.addEventListener("submit", async (e) => {
    // 🔥 중요: 기본 폼 제출 동작(페이지 새로고침 및 URL ? 추가) 방지
    e.preventDefault();

    const name = nameInput ? nameInput.value.trim() : "";
    const text = textInput ? textInput.value.trim() : "";

    if (!text) {
      showMessage("기도제목을 입력해 주세요.", "error");
      return;
    }

    // 버튼 중복 클릭 방지
    submitBtn.disabled = true;
    submitBtn.textContent = "저장 중...";
    showMessage("", "");

    try {
      const response = await fetch("/api/prayers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, text })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showMessage("기도제목이 정상적으로 나누어졌습니다. 🙏", "ok");
        if (textInput) textInput.value = "";
        if (nameInput) nameInput.value = "";
        if (countSpan) countSpan.textContent = "0";
      } else {
        showMessage(result.error || "저장에 실패했습니다. 다시 시도해 주세요.", "error");
      }
    } catch (err) {
      console.error("제출 에러:", err);
      showMessage("서버 통신 중 오류가 발생했습니다.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "기도제목 나누기";
    }
  });
}

function showMessage(msg, type) {
  if (!message) return;
  message.textContent = msg;
  message.className = `message ${type}`;
}