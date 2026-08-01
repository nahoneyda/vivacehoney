require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
// 기존 코드:
// const supabaseKey = process.env.SUPABASE_KEY;

// 수정 코드: .env의 SUPABASE_SECRET_KEY 이름을 읽도록 변경
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 페이지 라우팅
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/pray", (req, res) => res.sendFile(path.join(__dirname, "public", "pray.html")));
app.get("/play", (req, res) => res.sendFile(path.join(__dirname, "public", "pray.html")));

// 1. 전체 기도제목 조회 (GET /api/prayers)
app.get("/api/prayers", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("prayers")
      .select("*")
      .order("created_at", { ascending: true }); // 오래된 순 -> 최신순 정렬

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: "기도제목을 불러오지 못했습니다." });
  }
});

// 2. 새 기도제목 등록 (POST /api/prayers)
app.post("/api/prayers", async (req, res) => {
  const { name, text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "기도제목을 입력해 주세요." });
  }

  // DB에 넣을 데이터 (created_at과 id는 DB default 값 적용)
  const insertData = {
    name: name && name.trim() ? name.trim() : "익명",
    text: text.trim()
  };

  try {
    const { data, error } = await supabase
      .from("prayers")
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    // 소켓 연결된 클라이언트들에게 즉시 실시간 데이터 전송
    io.emit("prayer:new", data);
    res.json({ success: true, prayer: data });
  } catch (err) {
    console.error("Insert Error:", err);
    res.status(500).json({ error: "기도제목 저장에 실패했습니다." });
  }
});

// 3. QR 코드 생성 API
app.get("/api/qr", (req, res) => {
  const host = req.get("host");
  const protocol = req.protocol;
  const prayUrl = `${protocol}://${host}/pray`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(prayUrl)}`;
  res.json({ dataUrl: qrApiUrl, url: prayUrl });
});

// 4. Socket.io 접속 시 초기 데이터 발송
io.on("connection", async (socket) => {
  try {
    const { data } = await supabase
      .from("prayers")
      .select("*")
      .order("created_at", { ascending: true });
    socket.emit("prayer:init", data || []);
  } catch (err) {
    console.error("Socket Init Error:", err);
  }
});

// 예외 처리 핸들러
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception Error:", err);
});

// 서버 대기 시작
server.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Supabase DB 연동 서버 실행 완료!`);
  console.log(`👉 메인 화면: http://localhost:${PORT}`);
  console.log(`👉 기도 입력: http://localhost:${PORT}/pray`);
  console.log(`========================================`);
});