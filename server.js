const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require("qrcode");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.set("trust proxy", 1);

require("dotenv").config();

const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-me";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

function cleanText(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function normalizePrayer(row) {
  return {
    id: row.id,
    text: row.text,
    name: row.name || "익명",
    createdAt: row.created_at
  };
}

async function getRecentPrayers(limit = 100) {
  const { data, error } = await supabase
    .from("prayers")
    .select("id,name,text,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).reverse().map(normalizePrayer);
}

app.get("/api/health", async (_req, res) => {
  try {
    const { count, error } = await supabase
      .from("prayers")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    res.json({
      ok: true,
      database: "supabase",
      count: count || 0
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      database: "supabase",
      error: error.message
    });
  }
});

app.get("/pray", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pray.html"));
});

app.get("/api/qr", async (req, res) => {
  try {
    const host = req.get("host");
    const protocol =
      req.get("x-forwarded-proto") ||
      req.protocol ||
      "https";

    const url = `${protocol}://${host}/pray`;

    const dataUrl = await QRCode.toDataURL(url, {
      width: 520,
      margin: 1,
      errorCorrectionLevel: "M"
    });

    res.json({ url, dataUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "QR generation failed" });
  }
});

app.get("/api/prayers", async (_req, res) => {
  try {
    const prayers = await getRecentPrayers(100);
    res.json(prayers);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "기도제목을 불러오지 못했습니다."
    });
  }
});

app.post("/api/prayers", async (req, res) => {
  const text = cleanText(req.body?.text);
  const name = cleanText(req.body?.name).slice(0, 30);

  if (!text) {
    return res.status(400).json({
      error: "기도제목을 입력해 주세요."
    });
  }

  try {
    const { data, error } = await supabase
      .from("prayers")
      .insert({
        text,
        name: name || "익명"
      })
      .select("id,name,text,created_at")
      .single();

    if (error) throw error;

    const prayer = normalizePrayer(data);

    io.emit("prayer:new", prayer);

    res.status(201).json({
      ok: true,
      prayer
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "기도제목 저장에 실패했습니다."
    });
  }
});

app.post("/api/admin/clear", async (req, res) => {
  const key = req.get("x-admin-key");

  if (key !== ADMIN_KEY) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  try {
    const { error } = await supabase
      .from("prayers")
      .delete()
      .gte("id", 0);

    if (error) throw error;

    io.emit("prayer:clear");

    res.json({
      ok: true
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "전체 삭제에 실패했습니다."
    });
  }
});

io.on("connection", async socket => {
  try {
    const prayers = await getRecentPrayers(100);
    socket.emit("prayer:init", prayers);
  } catch (error) {
    console.error("Socket init failed:", error);
    socket.emit("prayer:init", []);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Church Prayer Live v1.1 running on port ${PORT}`
  );
});