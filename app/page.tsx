"use client";
import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// 🔧 SUPABASE CONFIG — paste your credentials here
// Dashboard → Settings → API
// ═══════════════════════════════════════════════════════════════
const SUPABASE_URL = "https://ftvucbgindnzbqrsuemp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dnVjYmdpbmRuemJxcnN1ZW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODc1NzQsImV4cCI6MjA4NzM2MzU3NH0.2mSyEk7KmcDN3Y5WtecwZvBCsQD--rNzPpi4li7fUlo";

// ─── Types ────────────────────────────────────────────────────
type HouseName = "Amani House" | "Imara House" | "Zamani House" | "Ubora House";
type Screen = "landing" | "guest" | "student" | "admin";

interface Registration {
  id: string;
  type: "Guest" | "Student";
  name: string;
  house: HouseName;
  class_name?: string;
  mode?: string;
  reg_number?: number;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────
const ADMIN_PASSWORD = "admin1234";

// Updated house colors: Amani=Orange, Imara=Pink, Zamani=Yellow, Ubora=Blue
const houseThemes: Record<HouseName, { color: string; accent: string; light: string; emoji: string }> = {
  "Amani House":  { color: "#92400e", accent: "#f97316", light: "#fff7ed", emoji: "🔥" },
  "Imara House":  { color: "#be185d", accent: "#ec4899", light: "#fce7f3", emoji: "🌸" },
  "Zamani House": { color: "#854d0e", accent: "#eab308", light: "#fefce8", emoji: "⭐" },
  "Ubora House":  { color: "#1e40af", accent: "#3b82f6", light: "#dbeafe", emoji: "🔵" },
};

const HOUSE_NAMES = Object.keys(houseThemes) as HouseName[];

// ─── Supabase helpers ─────────────────────────────────────────
async function sbFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadRegistrations(): Promise<Registration[]> {
  try {
    const data = await sbFetch("/registrations?order=timestamp.desc");
    return data || [];
  } catch (e) { console.error("loadRegistrations:", e); return []; }
}

async function getStudentCount(): Promise<number> {
  try {
    const data = await sbFetch("/registrations?type=eq.Student&select=reg_number&order=reg_number.desc&limit=1");
    if (data && data.length > 0 && data[0].reg_number) return data[0].reg_number;
    return 0;
  } catch { return 0; }
}

async function getNextStudentNumber(): Promise<number> {
  try {
    // Call our atomic SQL function to prevent race conditions
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_next_student_number`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("rpc failed");
    const num = await res.json();
    return typeof num === "number" ? num : 1;
  } catch {
    // fallback: count + 1
    const count = await getStudentCount();
    return count + 1;
  }
}

async function saveRegistration(reg: Registration): Promise<void> {
  await sbFetch("/registrations", {
    method: "POST",
    body: JSON.stringify({
      id: reg.id,
      type: reg.type,
      name: reg.name,
      house: reg.house,
      class_name: reg.class_name || null,
      mode: reg.mode || null,
      reg_number: reg.reg_number || null,
      timestamp: reg.timestamp,
    }),
  });
}

async function deleteRegistration(id: string): Promise<void> {
  await sbFetch(`/registrations?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function renumberStudents(allRegs: Registration[]): Promise<Registration[]> {
  // Get all students sorted by their original timestamp (oldest first)
  const students = allRegs
    .filter(r => r.type === "Student")
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Reassign reg_number sequentially 1, 2, 3…
  for (let i = 0; i < students.length; i++) {
    const newNum = i + 1;
    if (students[i].reg_number !== newNum) {
      await sbFetch(`/registrations?id=eq.${encodeURIComponent(students[i].id)}`, {
        method: "PATCH",
        body: JSON.stringify({ reg_number: newNum }),
      });
      students[i] = { ...students[i], reg_number: newNum };
    }
  }

  // Return full updated list (guests unchanged, students renumbered)
  const guests = allRegs.filter(r => r.type === "Guest");
  return [...guests, ...students].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Supabase realtime subscription via WebSocket
function subscribeToRegistrations(onInsert: (reg: Registration) => void): () => void {
  const wsUrl = SUPABASE_URL.replace("https://", "wss://").replace("http://", "ws://");
  const ws = new WebSocket(`${wsUrl}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ topic: "realtime:public:registrations", event: "phx_join", payload: {}, ref: "1" }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.event === "INSERT" && msg.payload?.record) {
        onInsert(msg.payload.record as Registration);
      }
    } catch {}
  };

  return () => ws.close();
}

// ─── Canvas helpers ───────────────────────────────────────────
const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => res(img);
    img.onerror = () => rej();
  });

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawSepLine(ctx: CanvasRenderingContext2D, y: number, W: number, accent: string) {
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "transparent"); g.addColorStop(0.3, accent + "99");
  g.addColorStop(0.7, accent + "99"); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.fillRect(24, y, W - 48, 1);
}

// ─── Shared UI ────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "3px", color: "#94a3b8", textTransform: "uppercase", fontFamily: "Georgia, serif" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  padding: "13px 16px", borderRadius: "12px", border: "2px solid #334155",
  color: "#f1f5f9", backgroundColor: "#0f172a", fontSize: "15px",
  fontFamily: "Georgia, serif", outline: "none", width: "100%", boxSizing: "border-box",
};

function HouseGrid({ value, onChange }: { value: HouseName; onChange: (h: HouseName) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
      {HOUSE_NAMES.map((h) => {
        const t = houseThemes[h]; const active = value === h;
        return (
          <button key={h} onClick={() => onChange(h)} style={{
            padding: "12px 8px", borderRadius: "12px",
            border: active ? `2px solid ${t.accent}` : "2px solid #334155",
            backgroundColor: active ? t.color + "22" : "#0f172a",
            color: active ? t.accent : "#64748b",
            fontWeight: active ? "bold" : "normal", fontSize: "13px",
            cursor: "pointer", transition: "all 0.2s", fontFamily: "Georgia, serif",
          }}>
            {t.emoji} {h}
          </button>
        );
      })}
    </div>
  );
}

// ─── Share Panel ──────────────────────────────────────────────
const SHARE_HASHTAGS = "#SOWculturalsportsfestival #SOW7thbiennialinterhousesport";
const SHARE_MESSAGE = (name: string, house: string) =>
`🎉 I'm officially registered for the Seat of Wisdom Cultural Sports Festival 2026! 🏆🎭

${name ? `My name is ${name} and I` : "I"}'m proudly representing ${house}! 🔥

Join us LIVE on Facebook as we celebrate excellence, culture, and sportsmanship at the 7th Biennial Inter-House Sports Festival!

📍 Physical attendees — see you there!
📺 Can't make it? Watch us LIVE on Facebook!

${SHARE_HASHTAGS}
🏛️ Seat of Wisdom Group of Schools — Education: The Best Legacy`;

const PLATFORMS = [
  { name: "Facebook", icon: "f", color: "#1877f2", bg: "#1877f222", border: "#1877f244", getUrl: (msg: string) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(msg)}&hashtag=%23SOWculturalsportsfestival` },
  { name: "WhatsApp", icon: "w", color: "#25d366", bg: "#25d36622", border: "#25d36644", getUrl: (msg: string) => `https://wa.me/?text=${encodeURIComponent(msg)}` },
  { name: "Twitter / X", icon: "𝕏", color: "#e7e9ea", bg: "#e7e9ea12", border: "#e7e9ea22", getUrl: (msg: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}` },
  { name: "Telegram", icon: "✈", color: "#29b6f6", bg: "#29b6f622", border: "#29b6f644", getUrl: (msg: string) => `https://t.me/share/url?url=https://seatofwisdom.edu&text=${encodeURIComponent(msg)}` },
  { name: "LinkedIn", icon: "in", color: "#0a66c2", bg: "#0a66c222", border: "#0a66c244", getUrl: (msg: string) => `https://www.linkedin.com/sharing/share-offsite/?url=https://seatofwisdom.edu&summary=${encodeURIComponent(msg)}` },
  { name: "Copy Text", icon: "⧉", color: "#94a3b8", bg: "#94a3b812", border: "#94a3b822", getUrl: () => "" },
];

function SharePanel({ name, house, accentColor, canvasRef }: { name: string; house: string; accentColor: string; canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const [copied, setCopied] = useState(false);
  const [nativeSharing, setNativeSharing] = useState(false);
  const [nativeSuccess, setNativeSuccess] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const message = SHARE_MESSAGE(name, house);

  useEffect(() => { setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)); }, []);

  const getCanvasBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => { const c = canvasRef.current; if (!c) return resolve(null); c.toBlob(resolve, "image/png"); });

  const handleNativeShare = async () => {
    setNativeSharing(true);
    try {
      const blob = await getCanvasBlob();
      const shareData: ShareData = { text: message, title: "SOW Cultural Sports Festival 2026" };
      if (blob && navigator.canShare?.({ files: [new File([blob], "sow-festival-pass.png", { type: "image/png" })] })) {
        shareData.files = [new File([blob], "sow-festival-pass.png", { type: "image/png" })];
      }
      await navigator.share(shareData);
      setNativeSuccess(true); setTimeout(() => setNativeSuccess(false), 3000);
    } catch {}
    setNativeSharing(false);
  };

  const handlePlatform = (p: typeof PLATFORMS[0]) => {
    if (p.name === "Copy Text") {
      navigator.clipboard.writeText(message).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
    } else { window.open(p.getUrl(message), "_blank", "noopener,noreferrer"); }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div style={{ marginTop: "20px", width: "100%", background: "linear-gradient(135deg, #0a0f1a, #1e293b)", borderRadius: "20px", border: `1px solid ${accentColor}44`, overflow: "hidden", boxShadow: `0 0 50px -10px ${accentColor}33` }}>
      <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${accentColor}22`, background: `linear-gradient(135deg, ${accentColor}12, transparent)`, display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0, background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)`, border: `1px solid ${accentColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🚀</div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#f1f5f9", fontFamily: "Georgia, serif" }}>Share Your Festival Pass!</div>
          <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "Georgia, serif", marginTop: "3px" }}>
            {canNativeShare ? "Your pass image will be attached automatically 🖼️" : "Download your pass first, then attach it when sharing 🖼️"}
          </div>
        </div>
      </div>
      {canNativeShare && (
        <div style={{ padding: "16px 22px 0" }}>
          <button onClick={handleNativeShare} disabled={nativeSharing} style={{ width: "100%", padding: "15px 18px", borderRadius: "14px", border: `2px solid ${accentColor}`, background: nativeSuccess ? "linear-gradient(135deg,#052e16,#15803d)" : `linear-gradient(135deg,${accentColor}dd,${accentColor})`, color: "#fff", cursor: nativeSharing ? "wait" : "pointer", fontFamily: "Georgia,serif", fontSize: "15px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "all 0.3s", boxShadow: `0 0 30px ${accentColor}44`, opacity: nativeSharing ? 0.8 : 1 }}>
            <span style={{ fontSize: "20px" }}>{nativeSuccess ? "✅" : nativeSharing ? "⏳" : "📤"}</span>
            {nativeSuccess ? "Shared successfully!" : nativeSharing ? "Opening share sheet…" : "Share Pass + Image (with photo attached)"}
          </button>
          <div style={{ textAlign: "center", padding: "10px 0 4px", fontSize: "10px", color: "#475569", letterSpacing: "2px", textTransform: "uppercase", fontFamily: "Georgia,serif" }}>— or share to a specific platform —</div>
        </div>
      )}
      {!canNativeShare && (
        <div style={{ margin: "16px 22px 0", padding: "12px 16px", borderRadius: "12px", background: "linear-gradient(135deg,#1c2a1a,#0f1a0d)", border: "1px solid #22c55e33", display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <span style={{ fontSize: "20px", flexShrink: 0 }}>🖼️</span>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#22c55e", fontFamily: "Georgia,serif", marginBottom: "3px" }}>Attach your pass image when posting!</div>
            <div style={{ fontSize: "11px", color: "#4ade80", fontFamily: "Georgia,serif", lineHeight: 1.6, opacity: 0.8 }}>Your pass has been downloaded. Open your platform, paste the message below, and attach the image from your Downloads folder for maximum impact! 🎉</div>
          </div>
        </div>
      )}
      <div style={{ padding: "14px 22px", borderBottom: `1px solid ${accentColor}18`, marginTop: "14px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#475569", textTransform: "uppercase", fontFamily: "Georgia,serif", marginBottom: "8px" }}>Your caption</div>
        <div style={{ background: "#070c14", borderRadius: "12px", padding: "14px 16px", border: "1px solid #1e293b", fontSize: "12px", color: "#94a3b8", fontFamily: "Georgia,serif", lineHeight: 1.8, maxHeight: "120px", overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {message}
        </div>
      </div>
      <div style={{ padding: "16px 22px 20px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#475569", textTransform: "uppercase", fontFamily: "Georgia,serif", marginBottom: "12px" }}>Share on</div>
        <button onClick={() => handlePlatform(PLATFORMS[0])} onMouseEnter={() => setHoveredBtn("Facebook")} onMouseLeave={() => setHoveredBtn(null)}
          style={{ width: "100%", padding: "14px 18px", borderRadius: "12px", marginBottom: "10px", border: hoveredBtn === "Facebook" ? "2px solid #1877f2" : "2px solid #1877f244", background: hoveredBtn === "Facebook" ? "#1877f2" : "#1877f218", color: "#fff", cursor: "pointer", fontFamily: "Georgia,serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "14px", fontWeight: "bold", transition: "all 0.25s", boxShadow: hoveredBtn === "Facebook" ? "0 0 28px #1877f255" : "none" }}>
          <span style={{ fontSize: "20px", fontWeight: "900", fontFamily: "Arial,sans-serif", lineHeight: 1 }}>f</span>
          Share on Facebook — We're Going LIVE! 📺
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: "8px" }}>
          {PLATFORMS.slice(1).map((p) => {
            const isHov = hoveredBtn === p.name; const isCop = p.name === "Copy Text" && copied;
            return (
              <button key={p.name} onClick={() => handlePlatform(p)} onMouseEnter={() => setHoveredBtn(p.name)} onMouseLeave={() => setHoveredBtn(null)}
                style={{ padding: "12px 6px", borderRadius: "10px", border: isHov ? `2px solid ${p.color}` : `2px solid ${p.border}`, background: isHov ? p.bg : "transparent", color: isCop ? "#22c55e" : p.color, cursor: "pointer", fontFamily: "Georgia,serif", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", fontSize: "10px", fontWeight: "bold", transition: "all 0.2s", boxShadow: isHov ? `0 0 16px ${p.color}33` : "none" }}>
                <span style={{ fontSize: "17px" }}>{isCop ? "✓" : p.icon}</span>
                {isCop ? "Copied!" : p.name}
              </button>
            );
          })}
        </div>
        {!canNativeShare && (
          <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "10px", background: "#0f172a", border: "1px solid #334155", fontSize: "11px", color: "#64748b", fontFamily: "Georgia,serif", lineHeight: 1.6 }}>
            💡 <strong style={{ color: "#94a3b8" }}>Pro tip:</strong> After clicking a platform, attach your downloaded pass image manually for the best impression!
          </div>
        )}
        <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {["#SOWculturalsportsfestival", "#SOW7thbiennialinterhousesport"].map(tag => (
            <span key={tag} style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "10px", background: accentColor + "18", color: accentColor, border: `1px solid ${accentColor}33`, fontFamily: "monospace" }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pass Preview ─────────────────────────────────────────────
function PassPreview({ canvasRef, image, accentColor, canvasWidth, canvasHeight, onDownload, downloadDisabled, placeholder, showShare, shareName, shareHouse }: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>; image: string | null; accentColor: string;
  canvasWidth: number; canvasHeight: number; onDownload: () => void; downloadDisabled: boolean; placeholder: string;
  showShare?: boolean; shareName?: string; shareHouse?: string;
}) {
  return (
    <div style={{ backgroundColor: "#0f172a", padding: "clamp(14px,3vw,28px)", borderRadius: "20px", display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid #334155" }}>
      <p style={{ fontSize: "10px", letterSpacing: "4px", color: "#475569", margin: "0 0 16px 0", textTransform: "uppercase" }}>Invitation Preview</p>
      <div style={{ width: "100%", borderRadius: "14px", overflow: "hidden", boxShadow: `0 8px 32px -8px ${accentColor}44`, border: `1px solid ${accentColor}33` }}>
        {image ? (
          <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} style={{ width: "100%", height: "auto", display: "block" }} />
        ) : (
          <div style={{ padding: "clamp(40px,8vw,80px) 20px", textAlign: "center", color: "#475569", background: "linear-gradient(135deg,#1e293b,#0f172a)" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>🎭</div>
            <p style={{ margin: "0 auto", fontSize: "14px", maxWidth: "220px" }}>{placeholder}</p>
          </div>
        )}
      </div>
      <button disabled={downloadDisabled} onClick={onDownload} style={{ marginTop: "20px", width: "100%", padding: "16px", background: downloadDisabled ? "#1e293b" : `linear-gradient(135deg,${accentColor}cc,${accentColor})`, color: downloadDisabled ? "#475569" : "#fff", fontSize: "15px", fontWeight: "bold", fontFamily: "Georgia,serif", letterSpacing: "2px", borderRadius: "14px", border: downloadDisabled ? "2px solid #334155" : "none", cursor: downloadDisabled ? "not-allowed" : "pointer", transition: "all 0.3s", textTransform: "uppercase" }}>
        ↓ Download Digital Pass
      </button>
      {showShare && shareName && shareHouse && (
        <SharePanel name={shareName} house={shareHouse} accentColor={accentColor} canvasRef={canvasRef} />
      )}
    </div>
  );
}

// ─── Registration Shell ───────────────────────────────────────
function RegistrationShell({ title, subtitle, accentColor, onBack, children }: { title: string; subtitle: string; accentColor: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#080d14", padding: "clamp(16px,4vw,48px)", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Georgia,serif" }}>
      <div style={{ width: "100%", maxWidth: "1060px", marginBottom: "16px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "14px", fontFamily: "Georgia,serif", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}>← Back to selection</button>
      </div>
      <div style={{ textAlign: "center", marginBottom: "clamp(20px,3vw,36px)" }}>
        <p style={{ fontSize: "11px", letterSpacing: "5px", color: accentColor, margin: "0 0 8px 0", textTransform: "uppercase" }}>✦ Seat of Wisdom Group of Schools ✦</p>
        <h1 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: "bold", color: "#f1f5f9", margin: "0 0 4px 0" }}>{title}</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>{subtitle}</p>
      </div>
      <div style={{ maxWidth: "1060px", width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "clamp(16px,3vw,36px)", backgroundColor: "#1e293b", padding: "clamp(20px,4vw,44px)", borderRadius: "24px", boxShadow: `0 0 0 1px #334155, 0 32px 64px -16px rgba(0,0,0,.5), 0 0 60px -20px ${accentColor}44` }}>
        {children}
      </div>
      <p style={{ marginTop: "28px", color: "#1e293b", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase" }}>Education: The Best Legacy</p>
    </main>
  );
}

// ─── LANDING ──────────────────────────────────────────────────
function LandingPage({ onSelect }: { onSelect: (s: Screen) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const cards = [
    { key: "guest", icon: "🎟️", title: "Guest Pass", color: "#3b82f6", desc: "For parents, visitors, and invited guests attending the festival.", cta: "Register as Guest" },
    { key: "student", icon: "🎓", title: "Student Pass", color: "#f97316", desc: "For enrolled students competing or participating in the festival.", cta: "Register as Student" },
  ];
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#080d14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(24px,5vw,60px)", fontFamily: "Georgia,serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: "600px", height: "600px", borderRadius: "50%", top: "-200px", left: "-200px", background: "radial-gradient(circle,#f9731618 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: "500px", height: "500px", borderRadius: "50%", bottom: "-150px", right: "-150px", background: "radial-gradient(circle,#ec489918 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ textAlign: "center", marginBottom: "clamp(32px,6vw,56px)" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg,#1e293b,#0f172a)", border: "2px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", margin: "0 auto 20px", boxShadow: "0 0 40px #f9731618" }}>🏛️</div>
        <p style={{ fontSize: "clamp(10px,1.5vw,12px)", letterSpacing: "6px", color: "#f97316", margin: "0 0 10px 0", textTransform: "uppercase" }}>Seat of Wisdom Group of Schools</p>
        <h1 style={{ fontSize: "clamp(28px,6vw,56px)", fontWeight: "bold", color: "#f1f5f9", margin: "0 0 8px 0", lineHeight: 1.15 }}>Cultural Sports<br />Festival 2026</h1>
        <p style={{ color: "#475569", margin: 0, fontSize: "clamp(13px,2vw,16px)" }}>Generate your personalised digital pass</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: "clamp(16px,3vw,28px)", width: "100%", maxWidth: "680px" }}>
        {cards.map(({ key, icon, title, color, desc, cta }) => (
          <button key={key} onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(null)} onClick={() => onSelect(key as Screen)}
            style={{ padding: "clamp(28px,5vw,44px) clamp(20px,4vw,36px)", borderRadius: "24px", border: hovered === key ? `2px solid ${color}` : "2px solid #1e293b", background: hovered === key ? `linear-gradient(135deg,${color}15,#0f172a)` : "linear-gradient(135deg,#1e293b,#0f172a)", cursor: "pointer", textAlign: "left", transition: "all 0.3s", boxShadow: hovered === key ? `0 0 40px ${color}22` : "none", transform: hovered === key ? "translateY(-4px)" : "none" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>{icon}</div>
            <h2 style={{ fontSize: "clamp(20px,3vw,26px)", fontWeight: "bold", color: "#f1f5f9", margin: "0 0 8px 0" }}>{title}</h2>
            <p style={{ color: "#64748b", margin: 0, fontSize: "14px", lineHeight: 1.6 }}>{desc}</p>
            <div style={{ marginTop: "20px", display: "inline-flex", alignItems: "center", gap: "8px", color, fontSize: "13px", fontWeight: "bold" }}>{cta} <span style={{ fontSize: "18px" }}>→</span></div>
          </button>
        ))}
      </div>
      <button onClick={() => onSelect("admin")} style={{ marginTop: "40px", background: "none", border: "none", cursor: "pointer", color: "#1e293b", fontSize: "12px", fontFamily: "Georgia,serif", letterSpacing: "2px", textTransform: "uppercase" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#475569")} onMouseLeave={(e) => (e.currentTarget.style.color = "#1e293b")}>
        ⚙ Admin Dashboard
      </button>
      <p style={{ marginTop: "12px", color: "#1e293b", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase" }}>Education: The Best Legacy</p>
    </main>
  );
}

// ─── GUEST REGISTRATION ───────────────────────────────────────
function GuestRegistration({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({ name: "", house: "Amani House" as HouseName, mode: "Physical Participation" });
  const [image, setImage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = houseThemes[formData.house];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImage(URL.createObjectURL(file)); setSaved(false); }
  };

  const drawCard = async () => {
    const canvas = canvasRef.current; if (!canvas || !image) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const t = houseThemes[formData.house]; // use current house theme for canvas colors
    try {
      const [logoImg, userImg] = await Promise.all([loadImg("/logo.jpeg").catch(() => null), loadImg(image)]);
      // Background
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
      // Diagonal texture
      ctx.save(); ctx.globalAlpha = 0.035;
      for (let i = -H; i < W + H; i += 30) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
      ctx.restore();
      // Orbs — house colored
      const o1 = ctx.createRadialGradient(W - 60, 60, 0, W - 60, 60, 280); o1.addColorStop(0, t.color + "66"); o1.addColorStop(1, "transparent"); ctx.fillStyle = o1; ctx.fillRect(0, 0, W, H);
      const o2 = ctx.createRadialGradient(80, H - 60, 0, 80, H - 60, 180); o2.addColorStop(0, t.accent + "44"); o2.addColorStop(1, "transparent"); ctx.fillStyle = o2; ctx.fillRect(0, 0, W, H);
      // Top band — house gradient
      const hg = ctx.createLinearGradient(0, 0, W, 0); hg.addColorStop(0, t.color); hg.addColorStop(1, t.accent);
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 5);
      // Logo
      if (logoImg) { ctx.save(); ctx.beginPath(); ctx.arc(62, 54, 34, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(logoImg, 28, 20, 68, 68); ctx.restore(); ctx.strokeStyle = t.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(62, 54, 35, 0, Math.PI * 2); ctx.stroke(); }
      // School name
      ctx.fillStyle = "#f8fafc"; ctx.font = "bold 17px Georgia"; ctx.fillText("SEAT OF WISDOM GROUP OF SCHOOLS", logoImg ? 110 : 32, 44);
      ctx.fillStyle = t.accent; ctx.font = "italic 13px Georgia"; ctx.fillText("✦  CULTURAL SPORTS FESTIVAL 2026  ✦", logoImg ? 110 : 32, 67);
      // Guest badge
      ctx.save(); drawRoundRect(ctx, W - 130, 20, 110, 32, 16); ctx.fillStyle = t.color + "44"; ctx.fill(); ctx.strokeStyle = t.accent + "88"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = t.accent; ctx.font = "bold 11px Georgia"; ctx.fillText("GUEST PASS", W - 118, 41); ctx.restore();
      drawSepLine(ctx, 92, W, t.accent);
      // Photo — circle with house glow
      const pr = 95, px = 60, py = 118;
      ctx.save(); ctx.shadowColor = t.accent; ctx.shadowBlur = 24; ctx.strokeStyle = t.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + pr, py + pr, pr + 5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(px + pr, py + pr, pr, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(userImg, px, py, pr * 2, pr * 2); ctx.restore();
      ctx.strokeStyle = t.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + pr, py + pr, pr + 16, -0.3, 0.3); ctx.stroke();
      // Info
      const ix = px + pr * 2 + 44, iy = 126;
      ctx.fillStyle = "#f1f5f9"; ctx.font = "bold 28px Georgia"; ctx.fillText((formData.name || "GUEST NAME").toUpperCase(), ix, iy + 36);
      const nw = ctx.measureText((formData.name || "GUEST NAME").toUpperCase()).width;
      const ul = ctx.createLinearGradient(ix, 0, ix + nw, 0); ul.addColorStop(0, t.accent); ul.addColorStop(1, "transparent");
      ctx.fillStyle = ul; ctx.fillRect(ix, iy + 44, nw, 2);
      // House pill — house gradient
      ctx.save(); drawRoundRect(ctx, ix, iy + 58, 218, 40, 20);
      const pg = ctx.createLinearGradient(ix, 0, ix + 218, 0); pg.addColorStop(0, t.color); pg.addColorStop(1, t.accent);
      ctx.fillStyle = pg; ctx.shadowColor = t.accent; ctx.shadowBlur = 10; ctx.fill(); ctx.restore();
      ctx.fillStyle = "#fff"; ctx.font = "bold 15px Georgia"; ctx.fillText(`${t.emoji}  ${formData.house.toUpperCase()}`, ix + 18, iy + 84);
      ctx.fillStyle = "#94a3b8"; ctx.font = "13px Georgia"; ctx.fillText(`${formData.mode === "Facebook Live" ? "🎥" : "📍"}  ${formData.mode}`, ix, iy + 134);
      drawSepLine(ctx, H - 68, W, t.accent);
      ctx.fillStyle = "#475569"; ctx.font = "11px monospace"; ctx.fillText("GUEST PASS  •  2026", 32, H - 40);
      const sub = "SEAT OF WISDOM  •  EDUCATION: THE BEST LEGACY"; ctx.fillText(sub, W - ctx.measureText(sub).width - 32, H - 40);
      ctx.fillStyle = hg; ctx.fillRect(0, H - 5, W, 5);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (image) drawCard(); }, [formData, image]);

  const handleDownload = async () => {
    const canvas = canvasRef.current; if (!canvas) return;
    if (!saved && !saving) {
      setSaving(true);
      try {
        const reg: Registration = { id: `g_${Date.now()}_${Math.random().toString(36).slice(2)}`, type: "Guest", name: formData.name, house: formData.house, mode: formData.mode, timestamp: new Date().toISOString() };
        await saveRegistration(reg);
        setSaved(true);
      } catch (e) { console.error("Save failed:", e); }
      setSaving(false);
    }
    const a = document.createElement("a"); a.download = `SeatOfWisdom-Guest-${formData.name || "pass"}.png`;
    a.href = canvas.toDataURL("image/png"); a.click();
  };

  return (
    <RegistrationShell title="Guest Registration" subtitle="Join the 2026 Cultural Sports Festival" accentColor={theme.accent} onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <Field label="Full Guest Name"><input style={inputBase} placeholder="e.g. John Doe" onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></Field>
        <Field label="Supporting House"><HouseGrid value={formData.house} onChange={(h) => setFormData({ ...formData, house: h })} /></Field>
        <Field label="How Will You Join Us?">
          <div style={{ display: "flex", gap: "10px" }}>
            {["Physical Participation", "Facebook Live"].map((mode) => {
              const active = formData.mode === mode;
              return (
                <button key={mode} onClick={() => setFormData({ ...formData, mode })} style={{ flex: 1, padding: "12px", borderRadius: "12px", fontFamily: "Georgia,serif", border: active ? `2px solid ${theme.accent}` : "2px solid #334155", backgroundColor: active ? theme.color + "22" : "#0f172a", color: active ? theme.accent : "#64748b", fontWeight: active ? "bold" : "normal", fontSize: "13px", cursor: "pointer", transition: "all 0.2s" }}>
                  {mode === "Physical Participation" ? "📍 Physical" : "🎥 Facebook"}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Upload Your Photo">
          <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", border: `2px dashed ${theme.accent}66`, backgroundColor: theme.color + "11", cursor: "pointer", color: theme.accent, fontSize: "14px", fontFamily: "Georgia,serif" }}>
            <span style={{ fontSize: "22px" }}>📸</span><span>Choose a photo…</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </label>
        </Field>
        {saved && (
          <div style={{ padding: "12px 16px", borderRadius: "12px", background: "linear-gradient(135deg,#052e16,#0f172a)", border: "1px solid #22c55e44", color: "#22c55e", fontSize: "13px", fontFamily: "Georgia,serif" }}>
            ✅ Registration saved to database!
          </div>
        )}
      </div>
      <PassPreview canvasRef={canvasRef} image={image} accentColor={theme.accent} canvasWidth={800} canvasHeight={420} onDownload={handleDownload} downloadDisabled={!image || !formData.name} placeholder="Upload a photo to preview your guest pass" showShare={saved} shareName={formData.name} shareHouse={formData.house} />
    </RegistrationShell>
  );
}

// ─── STUDENT REGISTRATION ─────────────────────────────────────
function StudentRegistration({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({ name: "", house: "Amani House" as HouseName, className: "" });
  const [image, setImage] = useState<string | null>(null);
  const [regCount, setRegCount] = useState(0);
  const [myNumber, setMyNumber] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load current count from Supabase on mount
  useEffect(() => {
    getStudentCount().then(setRegCount).catch(() => setRegCount(0));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImage(URL.createObjectURL(file));
  };

  const confirmRegistration = async () => {
    if (!formData.name || !image) return;
    setSaving(true);
    try {
      const nextNum = await getNextStudentNumber();
      const reg: Registration = { id: `s_${Date.now()}_${Math.random().toString(36).slice(2)}`, type: "Student", name: formData.name, house: formData.house, class_name: formData.className, reg_number: nextNum, timestamp: new Date().toISOString() };
      await saveRegistration(reg);
      setRegCount(nextNum);
      setMyNumber(nextNum);
    } catch (e) { console.error("Registration failed:", e); alert("Registration failed — please check your internet connection and try again."); }
    setSaving(false);
  };

  const drawCard = async () => {
    const canvas = canvasRef.current; if (!canvas || !image || myNumber === null) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const t = houseThemes[formData.house]; // ← house-colored canvas
    const sAccent2 = t.accent + "cc";
    try {
      const [logoImg, userImg] = await Promise.all([loadImg("/logo.jpeg").catch(() => null), loadImg(image)]);
      // Background — dark with house tint
      ctx.fillStyle = "#0a0804"; ctx.fillRect(0, 0, W, H);
      // Diagonal shimmer using house accent
      ctx.save(); ctx.globalAlpha = 0.05;
      for (let i = -H; i < W + H; i += 24) { ctx.strokeStyle = t.accent; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
      ctx.restore();
      // Orbs — house colored
      const o1 = ctx.createRadialGradient(W * 0.75, 0, 0, W * 0.75, 0, 320); o1.addColorStop(0, t.color + "66"); o1.addColorStop(1, "transparent"); ctx.fillStyle = o1; ctx.fillRect(0, 0, W, H);
      const o2 = ctx.createRadialGradient(60, H, 0, 60, H, 220); o2.addColorStop(0, t.accent + "33"); o2.addColorStop(1, "transparent"); ctx.fillStyle = o2; ctx.fillRect(0, 0, W, H);
      // Top band
      const hg = ctx.createLinearGradient(0, 0, W, 0); hg.addColorStop(0, t.color); hg.addColorStop(0.5, t.accent); hg.addColorStop(1, t.color);
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 5);
      // Logo
      if (logoImg) { ctx.save(); ctx.beginPath(); ctx.arc(62, 54, 34, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(logoImg, 28, 20, 68, 68); ctx.restore(); ctx.strokeStyle = t.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(62, 54, 35, 0, Math.PI * 2); ctx.stroke(); }
      // School name
      ctx.fillStyle = "#fef3c7"; ctx.font = "bold 17px Georgia"; ctx.fillText("SEAT OF WISDOM GROUP OF SCHOOLS", logoImg ? 110 : 32, 44);
      ctx.fillStyle = t.accent; ctx.font = "italic 13px Georgia"; ctx.fillText("✦  CULTURAL SPORTS FESTIVAL 2026  ✦", logoImg ? 110 : 32, 67);
      // Student badge
      ctx.save(); drawRoundRect(ctx, W - 140, 20, 120, 32, 16); ctx.fillStyle = t.color + "66"; ctx.fill(); ctx.strokeStyle = t.accent + "99"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = t.accent; ctx.font = "bold 11px Georgia"; ctx.fillText("STUDENT PASS", W - 128, 41); ctx.restore();
      drawSepLine(ctx, 92, W, t.accent);
      // Photo — square with house-colored corner brackets
      const pw = 190, ph = 190, px = 52, py = 112;
      ctx.save(); drawRoundRect(ctx, px, py, pw, ph, 8); ctx.clip(); ctx.drawImage(userImg, px, py, pw, ph); ctx.restore();
      ctx.strokeStyle = t.accent; ctx.lineWidth = 3; drawRoundRect(ctx, px, py, pw, ph, 8); ctx.stroke();
      // Corner brackets
      [[px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]].forEach(([cx, cy], i) => {
        ctx.strokeStyle = sAccent2; ctx.lineWidth = 4; ctx.beginPath();
        const dx = i % 2 === 0 ? 1 : -1, dy = i < 2 ? 1 : -1;
        ctx.moveTo(cx + dx * 22, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * 22); ctx.stroke();
      });
      // Reg number plate
      ctx.fillStyle = "#000000aa"; ctx.fillRect(px, py + ph - 36, pw, 36);
      ctx.fillStyle = t.accent; ctx.font = "bold 15px monospace";
      const regStr = `#${String(myNumber).padStart(4, "0")}`;
      ctx.fillText(regStr, px + (pw - ctx.measureText(regStr).width) / 2, py + ph - 12);
      // Name & info
      const ix = px + pw + 44, iy = 112;
      ctx.fillStyle = "#fef3c7"; ctx.font = "bold 27px Georgia"; ctx.fillText((formData.name || "STUDENT NAME").toUpperCase(), ix, iy + 34);
      const nw = ctx.measureText((formData.name || "STUDENT NAME").toUpperCase()).width;
      const ul = ctx.createLinearGradient(ix, 0, ix + nw, 0); ul.addColorStop(0, t.accent); ul.addColorStop(1, "transparent");
      ctx.fillStyle = ul; ctx.fillRect(ix, iy + 42, nw, 2);
      if (formData.className) {
        ctx.fillStyle = "#1c1408"; drawRoundRect(ctx, ix, iy + 54, 160, 34, 8); ctx.fill();
        ctx.strokeStyle = t.accent + "66"; ctx.lineWidth = 1; drawRoundRect(ctx, ix, iy + 54, 160, 34, 8); ctx.stroke();
        ctx.fillStyle = t.accent; ctx.font = "bold 14px Georgia"; ctx.fillText(`📚  ${formData.className}`, ix + 12, iy + 77);
      }
      // House pill — house gradient
      ctx.save(); drawRoundRect(ctx, ix, iy + (formData.className ? 98 : 58), 218, 40, 20);
      const pg = ctx.createLinearGradient(ix, 0, ix + 218, 0); pg.addColorStop(0, t.color); pg.addColorStop(1, t.accent);
      ctx.fillStyle = pg; ctx.shadowColor = t.accent; ctx.shadowBlur = 10; ctx.fill(); ctx.restore();
      ctx.fillStyle = "#fff"; ctx.font = "bold 15px Georgia"; ctx.fillText(`${t.emoji}  ${formData.house.toUpperCase()}`, ix + 18, iy + (formData.className ? 124 : 84));
      ctx.fillStyle = "#78716c"; ctx.font = "12px Georgia"; ctx.fillText(`Total registered: ${regCount} student${regCount !== 1 ? "s" : ""}`, ix, iy + (formData.className ? 156 : 116));
      drawSepLine(ctx, H - 68, W, t.accent);
      ctx.fillStyle = "#57534e"; ctx.font = "11px monospace"; ctx.fillText(`STUDENT PASS  •  REG #${String(myNumber).padStart(4, "0")}`, 32, H - 40);
      const sub = "SEAT OF WISDOM  •  EDUCATION: THE BEST LEGACY"; ctx.fillText(sub, W - ctx.measureText(sub).width - 32, H - 40);
      ctx.fillStyle = hg; ctx.fillRect(0, H - 5, W, 5);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (image && myNumber !== null) drawCard(); }, [formData, image, myNumber]);

  const download = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const a = document.createElement("a"); a.download = `SeatOfWisdom-Student-${formData.name || "pass"}.png`;
    a.href = canvas.toDataURL("image/png"); a.click();
  };

  const theme = houseThemes[formData.house];

  return (
    <RegistrationShell title="Student Registration" subtitle="Compete in the 2026 Cultural Sports Festival" accentColor={theme.accent} onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Registration counter */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: "14px", background: "linear-gradient(135deg,#1c1408,#0d0a04)", border: `1px solid ${theme.accent}44` }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#78716c", textTransform: "uppercase", fontFamily: "Georgia,serif" }}>Registrations so far</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: theme.accent, fontFamily: "Georgia,serif", lineHeight: 1.2 }}>{regCount} <span style={{ fontSize: "14px", color: "#78716c" }}>student{regCount !== 1 ? "s" : ""}</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#78716c", textTransform: "uppercase", fontFamily: "Georgia,serif" }}>Your number will be</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: myNumber !== null ? "#22c55e" : theme.accent, fontFamily: "monospace", lineHeight: 1.2 }}>
              {myNumber !== null ? `#${String(myNumber).padStart(4, "0")}` : `#${String(regCount + 1).padStart(4, "0")}`}
            </div>
          </div>
        </div>
        <Field label="Full Student Name"><input style={inputBase} placeholder="e.g. Amara Osei" onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></Field>
        <Field label="Class / Grade"><input style={inputBase} placeholder="e.g. JSS 3A  or  Grade 10" onChange={(e) => setFormData({ ...formData, className: e.target.value })} /></Field>
        <Field label="House Affiliation"><HouseGrid value={formData.house} onChange={(h) => setFormData({ ...formData, house: h })} /></Field>
        <Field label="Upload Your Photo">
          <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", border: `2px dashed ${theme.accent}66`, backgroundColor: theme.color + "11", cursor: "pointer", color: theme.accent, fontSize: "14px", fontFamily: "Georgia,serif" }}>
            <span style={{ fontSize: "22px" }}>📸</span><span>Choose a photo…</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </label>
        </Field>
        {myNumber === null ? (
          <button disabled={!formData.name || !image || saving} onClick={confirmRegistration} style={{ padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer", background: (!formData.name || !image) ? "#1c1408" : `linear-gradient(135deg,${theme.color},${theme.accent})`, color: (!formData.name || !image) ? "#57534e" : "#fff", fontWeight: "bold", fontSize: "15px", fontFamily: "Georgia,serif", letterSpacing: "1px", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Registering…" : "✦ Confirm Registration & Generate Pass"}
          </button>
        ) : (
          <div style={{ padding: "14px", borderRadius: "12px", background: "linear-gradient(135deg,#052e16,#0f172a)", border: "1px solid #22c55e44", color: "#22c55e", textAlign: "center", fontFamily: "Georgia,serif", fontSize: "14px" }}>
            ✅ Registered & saved! You are student #{String(myNumber).padStart(4, "0")}
          </div>
        )}
      </div>
      <PassPreview canvasRef={canvasRef} image={image && myNumber !== null ? image : null} accentColor={theme.accent} canvasWidth={800} canvasHeight={430} onDownload={download} downloadDisabled={!image || !formData.name || myNumber === null} placeholder="Fill in your details & confirm registration to generate your pass" showShare={myNumber !== null} shareName={formData.name} shareHouse={formData.house} />
    </RegistrationShell>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────
function DeleteConfirmModal({ reg, onConfirm, onCancel, deleting }: {
  reg: Registration; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  const ht = houseThemes[reg.house];
  const isStudent = reg.type === "Student";
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "420px", backgroundColor: "#1e293b", borderRadius: "20px", padding: "36px 32px", boxShadow: "0 0 0 1px #334155, 0 32px 64px -8px rgba(0,0,0,0.8)", fontFamily: "Georgia,serif" }}>
        {/* Icon */}
        <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "linear-gradient(135deg,#450a0a,#7f1d1d)", border: "1px solid #ef444433", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", marginBottom: "20px" }}>🗑️</div>
        {/* Title */}
        <h2 style={{ color: "#f1f5f9", fontSize: "20px", margin: "0 0 8px 0" }}>Delete Registration?</h2>
        <p style={{ color: "#64748b", fontSize: "13px", margin: "0 0 20px 0", lineHeight: 1.6 }}>
          This will permanently remove this registration from Supabase.{isStudent ? " All remaining student numbers will be recalculated." : ""} This cannot be undone.
        </p>
        {/* Registration card */}
        <div style={{ backgroundColor: "#0f172a", borderRadius: "12px", padding: "14px 16px", border: "1px solid #334155", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", backgroundColor: isStudent ? "#92400e22" : "#1e40af22", color: isStudent ? "#f97316" : "#3b82f6" }}>
              {isStudent ? "🎓 Student" : "🎟️ Guest"}
            </span>
            {isStudent && reg.reg_number && (
              <span style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace" }}>#{String(reg.reg_number).padStart(4, "0")}</span>
            )}
          </div>
          <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "bold", marginBottom: "4px" }}>{reg.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: ht.accent }}>{ht.emoji} {reg.house}</span>
            {reg.class_name && <span style={{ fontSize: "11px", color: "#64748b" }}>• {reg.class_name}</span>}
            {reg.mode && <span style={{ fontSize: "11px", color: "#64748b" }}>• {reg.mode}</span>}
          </div>
        </div>
        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} disabled={deleting} style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "2px solid #334155", background: "#0f172a", color: "#94a3b8", fontSize: "14px", fontWeight: "bold", fontFamily: "Georgia,serif", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "none", background: deleting ? "#450a0a" : "linear-gradient(135deg,#7f1d1d,#ef4444)", color: "#fff", fontSize: "14px", fontWeight: "bold", fontFamily: "Georgia,serif", cursor: deleting ? "wait" : "pointer", opacity: deleting ? 0.7 : 1 }}>
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────
function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const [filter, setFilter] = useState<"All" | "Guest" | "Student">("All");
  const [houseFilter, setHouseFilter] = useState<"All" | HouseName>("All");
  const [search, setSearch] = useState("");
  const [confirmReg, setConfirmReg] = useState<Registration | null>(null);
  const [deleting, setDeleting] = useState(false);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); fetchData(); }
    else { setPwError(true); }
  };

  const fetchData = async () => {
    setLoading(true);
    const data = await loadRegistrations();
    setRegs(data);
    setLiveCount(data.length);
    setLoading(false);
  };

  // Realtime subscription — new row appears instantly in table
  useEffect(() => {
    if (!authed) return;
    const unsub = subscribeToRegistrations((newReg) => {
      setRegs((prev) => {
        // Avoid duplicates
        if (prev.find(r => r.id === newReg.id)) return prev;
        setLiveCount(c => c + 1);
        return [newReg, ...prev];
      });
    });
    return unsub;
  }, [authed]);

  const filtered = regs.filter((r) => {
    if (filter !== "All" && r.type !== filter) return false;
    if (houseFilter !== "All" && r.house !== houseFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const houseCounts = HOUSE_NAMES.reduce((acc, h) => { acc[h] = regs.filter(r => r.house === h).length; return acc; }, {} as Record<string, number>);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + "  " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const handleDelete = async () => {
    if (!confirmReg) return;
    setDeleting(true);
    try {
      await deleteRegistration(confirmReg.id);
      const remaining = regs.filter(r => r.id !== confirmReg.id);
      // Renumber students if we deleted a student
      const updated = confirmReg.type === "Student" ? await renumberStudents(remaining) : remaining;
      setRegs(updated);
      setLiveCount(updated.length);
    } catch (e) { console.error("Delete failed:", e); alert("Delete failed — please try again."); }
    setDeleting(false);
    setConfirmReg(null);
  };

  if (!authed) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#080d14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: "420px", backgroundColor: "#1e293b", borderRadius: "24px", padding: "48px 36px", boxShadow: "0 0 0 1px #334155, 0 32px 64px -16px rgba(0,0,0,.6)", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚙️</div>
          <h2 style={{ color: "#f1f5f9", fontSize: "24px", margin: "0 0 6px 0" }}>Admin Dashboard</h2>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 32px 0" }}>Enter the admin password to continue</p>
          <input type="password" placeholder="Password" value={pw} onChange={(e) => { setPw(e.target.value); setPwError(false); }} onKeyDown={(e) => e.key === "Enter" && login()}
            style={{ ...inputBase, marginBottom: "12px", textAlign: "center", border: pwError ? "2px solid #ef4444" : "2px solid #334155" }} />
          {pwError && <p style={{ color: "#ef4444", fontSize: "13px", margin: "0 0 12px 0" }}>Incorrect password. Try again.</p>}
          <button onClick={login} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#1e40af,#3b82f6)", color: "#fff", fontSize: "15px", fontWeight: "bold", fontFamily: "Georgia,serif", cursor: "pointer" }}>
            Unlock Dashboard
          </button>
          <button onClick={onBack} style={{ marginTop: "16px", background: "none", border: "none", color: "#475569", cursor: "pointer", fontFamily: "Georgia,serif", fontSize: "13px" }}>← Back to home</button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#080d14", padding: "clamp(16px,4vw,40px)", fontFamily: "Georgia,serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <p style={{ fontSize: "11px", letterSpacing: "4px", color: "#3b82f6", margin: "0 0 4px 0", textTransform: "uppercase" }}>Admin Dashboard</p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h1 style={{ fontSize: "clamp(22px,4vw,32px)", color: "#f1f5f9", margin: 0 }}>Festival Registrations</h1>
              {/* Live indicator */}
              <span style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "20px", background: "#052e16", border: "1px solid #22c55e44", fontSize: "11px", color: "#22c55e", fontFamily: "monospace" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                LIVE
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={fetchData} style={{ padding: "10px 18px", borderRadius: "10px", border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontFamily: "Georgia,serif", fontSize: "13px" }}>↻ Refresh</button>
            <button onClick={onBack} style={{ padding: "10px 18px", borderRadius: "10px", border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontFamily: "Georgia,serif", fontSize: "13px" }}>← Exit</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "12px", marginBottom: "28px" }}>
          {[
            { label: "Total", value: regs.length, color: "#f1f5f9" },
            { label: "Guests", value: regs.filter(r => r.type === "Guest").length, color: "#3b82f6" },
            { label: "Students", value: regs.filter(r => r.type === "Student").length, color: "#f97316" },
            ...HOUSE_NAMES.map(h => ({ label: h.replace(" House", ""), value: houseCounts[h], color: houseThemes[h].accent })),
          ].map(({ label, value, color }) => (
            <div key={label} style={{ backgroundColor: "#1e293b", borderRadius: "14px", padding: "16px 18px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#475569", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
              <div style={{ fontSize: "26px", fontWeight: "bold", color, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="🔍 Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputBase, maxWidth: "240px", padding: "10px 14px", fontSize: "14px" }} />
          {(["All", "Guest", "Student"] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: "10px 16px", borderRadius: "10px", fontFamily: "Georgia,serif", fontSize: "13px", cursor: "pointer", border: filter === t ? "2px solid #3b82f6" : "2px solid #334155", background: filter === t ? "#1e40af22" : "#1e293b", color: filter === t ? "#3b82f6" : "#64748b" }}>{t}</button>
          ))}
          <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value as any)} style={{ ...inputBase, maxWidth: "180px", padding: "10px 14px", fontSize: "13px" }}>
            <option value="All">All Houses</option>
            {HOUSE_NAMES.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: "#1e293b", borderRadius: "20px", border: "1px solid #334155", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#475569" }}>Loading from Supabase…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#475569" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
              <p style={{ margin: 0 }}>{regs.length === 0 ? "No registrations yet." : "No results match your filters."}</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #334155" }}>
                    {["#", "Type", "Name", "House", "Class / Mode", "Registered", ""].map((h) => (
                      <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "10px", letterSpacing: "2px", color: "#64748b", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const ht = houseThemes[r.house]; const isStudent = r.type === "Student";
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #0f172a", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#0f172a")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "14px 16px", color: "#475569", fontSize: "13px", fontFamily: "monospace" }}>
                          {isStudent && r.reg_number ? `#${String(r.reg_number).padStart(4, "0")}` : "—"}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", backgroundColor: isStudent ? "#92400e22" : "#1e40af22", color: isStudent ? "#f97316" : "#3b82f6" }}>
                            {isStudent ? "🎓 Student" : "🎟️ Guest"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#f1f5f9", fontSize: "14px", fontWeight: "bold" }}>{r.name}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", backgroundColor: ht.color + "22", color: ht.accent }}>{ht.emoji} {r.house}</span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "13px" }}>
                          {isStudent ? (r.class_name || "—") : (r.mode === "Facebook Live" ? "🎥 Facebook Live" : "📍 Physical")}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "12px", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {formatDate(r.timestamp)}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <button onClick={() => setConfirmReg(r)} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #ef444433", background: "#450a0a22", color: "#ef4444", fontSize: "12px", cursor: "pointer", fontFamily: "Georgia,serif", transition: "all 0.2s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#7f1d1d"; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#450a0a22"; e.currentTarget.style.color = "#ef4444"; }}>
                            🗑 Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: "12px 16px", borderTop: "1px solid #334155", color: "#475569", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Showing {filtered.length} of {regs.length} registration{regs.length !== 1 ? "s" : ""}</span>
                <span style={{ color: "#22c55e", fontSize: "11px" }}>● Live updates enabled</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
      {confirmReg && (
        <DeleteConfirmModal
          reg={confirmReg}
          onConfirm={handleDelete}
          onCancel={() => setConfirmReg(null)}
          deleting={deleting}
        />
      )}
    </main>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  if (screen === "guest") return <GuestRegistration onBack={() => setScreen("landing")} />;
  if (screen === "student") return <StudentRegistration onBack={() => setScreen("landing")} />;
  if (screen === "admin") return <AdminDashboard onBack={() => setScreen("landing")} />;
  return <LandingPage onSelect={setScreen} />;
}