"use client";
import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type HouseName = "Amani House" | "Imara House" | "Zamani House" | "Ubora House";
type Screen = "landing" | "guest" | "student" | "admin";

interface Registration {
  id: string;
  type: "Guest" | "Student";
  name: string;
  house: HouseName;
  className?: string;
  mode?: string;
  regNumber?: number;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "admin1234";
const STORAGE_KEY = "sow_registrations";
const COUNT_KEY = "student_reg_count";

const houseThemes: Record<HouseName, { color: string; accent: string; emoji: string }> = {
  "Amani House":  { color: "#1e40af", accent: "#3b82f6", emoji: "🕊️" },
  "Imara House":  { color: "#be185d", accent: "#ec4899", emoji: "🌸" },
  "Zamani House": { color: "#15803d", accent: "#22c55e", emoji: "🌿" },
  "Ubora House":  { color: "#92400e", accent: "#f59e0b", emoji: "👑" },
};

const HOUSE_NAMES = Object.keys(houseThemes) as HouseName[];

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function loadRegistrations(): Promise<Registration[]> {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

async function saveRegistration(reg: Registration): Promise<void> {
  const all = await loadRegistrations();
  all.push(reg);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────
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

// ─── Shared UI ────────────────────────────────────────────────────────────────
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

// ─── Share Panel ──────────────────────────────────────────────────────────────
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
  {
    name: "Facebook",
    icon: "f",
    color: "#1877f2",
    bg: "#1877f222",
    border: "#1877f244",
    getUrl: (msg: string) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(msg)}&hashtag=%23SOWculturalsportsfestival`,
  },
  {
    name: "WhatsApp",
    icon: "w",
    color: "#25d366",
    bg: "#25d36622",
    border: "#25d36644",
    getUrl: (msg: string) => `https://wa.me/?text=${encodeURIComponent(msg)}`,
  },
  {
    name: "Twitter / X",
    icon: "𝕏",
    color: "#e7e9ea",
    bg: "#e7e9ea12",
    border: "#e7e9ea22",
    getUrl: (msg: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`,
  },
  {
    name: "Telegram",
    icon: "✈",
    color: "#29b6f6",
    bg: "#29b6f622",
    border: "#29b6f644",
    getUrl: (msg: string) => `https://t.me/share/url?url=https://seatofwisdom.edu&text=${encodeURIComponent(msg)}`,
  },
  {
    name: "LinkedIn",
    icon: "in",
    color: "#0a66c2",
    bg: "#0a66c222",
    border: "#0a66c244",
    getUrl: (msg: string) => `https://www.linkedin.com/sharing/share-offsite/?url=https://seatofwisdom.edu&summary=${encodeURIComponent(msg)}`,
  },
  {
    name: "Copy Text",
    icon: "⧉",
    color: "#94a3b8",
    bg: "#94a3b812",
    border: "#94a3b822",
    getUrl: () => "",
  },
];

function SharePanel({ name, house, accentColor }: { name: string; house: string; accentColor: string }) {
  const [copied, setCopied] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const message = SHARE_MESSAGE(name, house);

  const handlePlatform = (platform: typeof PLATFORMS[0]) => {
    if (platform.name === "Copy Text") {
      navigator.clipboard.writeText(message).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
    } else {
      window.open(platform.getUrl(message), "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div style={{
      marginTop: "20px", width: "100%",
      background: "linear-gradient(135deg, #0f172a, #1e293b)",
      borderRadius: "18px", border: `1px solid ${accentColor}33`,
      overflow: "hidden",
      boxShadow: `0 0 40px -10px ${accentColor}22`,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px 12px",
        borderBottom: "1px solid #1e293b",
        background: `linear-gradient(135deg, ${accentColor}0a, transparent)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontSize: "22px" }}>🚀</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#f1f5f9", fontFamily: "Georgia, serif" }}>
              Share Your Festival Pass!
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "Georgia, serif", marginTop: "2px" }}>
              Spread the excitement — invite your friends & family
            </div>
          </div>
        </div>
      </div>

      {/* Message preview */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e293b" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#475569", textTransform: "uppercase", fontFamily: "Georgia, serif", marginBottom: "8px" }}>
          Your message
        </div>
        <div style={{
          background: "#0f172a", borderRadius: "10px", padding: "12px 14px",
          border: "1px solid #334155", fontSize: "12px", color: "#94a3b8",
          fontFamily: "Georgia, serif", lineHeight: 1.7,
          maxHeight: "110px", overflowY: "auto",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {message}
        </div>
      </div>

      {/* Platform buttons */}
      <div style={{ padding: "14px 20px 18px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#475569", textTransform: "uppercase", fontFamily: "Georgia, serif", marginBottom: "12px" }}>
          Share on
        </div>

        {/* Facebook — hero button */}
        <button
          onClick={() => handlePlatform(PLATFORMS[0])}
          onMouseEnter={() => setHoveredBtn("Facebook")}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            width: "100%", padding: "14px 18px", borderRadius: "12px", marginBottom: "10px",
            border: hoveredBtn === "Facebook" ? "2px solid #1877f2" : "2px solid #1877f244",
            background: hoveredBtn === "Facebook" ? "#1877f2" : "#1877f222",
            color: "#fff", cursor: "pointer", fontFamily: "Georgia, serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            fontSize: "14px", fontWeight: "bold", transition: "all 0.2s",
            boxShadow: hoveredBtn === "Facebook" ? "0 0 24px #1877f244" : "none",
          }}
        >
          <span style={{ fontSize: "18px", fontWeight: "900", fontFamily: "Arial, sans-serif" }}>f</span>
          Share on Facebook — We're Going LIVE! 📺
        </button>

        {/* Other platforms grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
          {PLATFORMS.slice(1).map((p) => {
            const isHovered = hoveredBtn === p.name;
            const isCopied = p.name === "Copy Text" && copied;
            return (
              <button
                key={p.name}
                onClick={() => handlePlatform(p)}
                onMouseEnter={() => setHoveredBtn(p.name)}
                onMouseLeave={() => setHoveredBtn(null)}
                style={{
                  padding: "11px 8px", borderRadius: "10px",
                  border: isHovered ? `2px solid ${p.color}` : `2px solid ${p.border}`,
                  background: isHovered ? p.bg : "transparent",
                  color: isCopied ? "#22c55e" : p.color,
                  cursor: "pointer", fontFamily: "Georgia, serif",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "5px",
                  fontSize: "10px", fontWeight: "bold", transition: "all 0.2s",
                  letterSpacing: "0.5px",
                }}
              >
                <span style={{ fontSize: "18px" }}>{isCopied ? "✓" : p.icon}</span>
                {isCopied ? "Copied!" : p.name}
              </button>
            );
          })}
        </div>

        {/* Hashtag chips */}
        <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {["#SOWculturalsportsfestival", "#SOW7thbiennialinterhousesport"].map(tag => (
            <span key={tag} style={{
              padding: "4px 10px", borderRadius: "20px", fontSize: "10px",
              background: accentColor + "18", color: accentColor,
              border: `1px solid ${accentColor}33`, fontFamily: "monospace",
            }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PassPreview({ canvasRef, image, accentColor, canvasWidth, canvasHeight, onDownload, downloadDisabled, placeholder, showShare, shareName, shareHouse }: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>; image: string | null; accentColor: string;
  canvasWidth: number; canvasHeight: number; onDownload: () => void; downloadDisabled: boolean; placeholder: string;
  showShare?: boolean; shareName?: string; shareHouse?: string;
}) {
  return (
    <div style={{ backgroundColor: "#0f172a", padding: "clamp(14px, 3vw, 28px)", borderRadius: "20px", display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid #334155" }}>
      <p style={{ fontSize: "10px", letterSpacing: "4px", color: "#475569", margin: "0 0 16px 0", textTransform: "uppercase" }}>Invitation Preview</p>
      <div style={{ width: "100%", borderRadius: "14px", overflow: "hidden", boxShadow: `0 8px 32px -8px ${accentColor}44`, border: `1px solid ${accentColor}33` }}>
        {image ? (
          <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} style={{ width: "100%", height: "auto", display: "block" }} />
        ) : (
          <div style={{ padding: "clamp(40px, 8vw, 80px) 20px", textAlign: "center", color: "#475569", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>🎭</div>
            <p style={{ margin: "0 auto", fontSize: "14px", maxWidth: "220px" }}>{placeholder}</p>
          </div>
        )}
      </div>
      <button disabled={downloadDisabled} onClick={onDownload} style={{
        marginTop: "20px", width: "100%", padding: "16px",
        background: downloadDisabled ? "#1e293b" : `linear-gradient(135deg, ${accentColor}cc, ${accentColor})`,
        color: downloadDisabled ? "#475569" : "#ffffff", fontSize: "15px", fontWeight: "bold",
        fontFamily: "Georgia, serif", letterSpacing: "2px", borderRadius: "14px",
        border: downloadDisabled ? "2px solid #334155" : "none",
        cursor: downloadDisabled ? "not-allowed" : "pointer", transition: "all 0.3s", textTransform: "uppercase",
      }}>
        ↓ Download Digital Pass
      </button>
      {showShare && shareName && shareHouse && (
        <SharePanel name={shareName} house={shareHouse} accentColor={accentColor} />
      )}
    </div>
  );
}

function RegistrationShell({ title, subtitle, accentColor, onBack, children }: {
  title: string; subtitle: string; accentColor: string; onBack: () => void; children: React.ReactNode;
}) {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#080d14", padding: "clamp(16px, 4vw, 48px)", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ width: "100%", maxWidth: "1060px", marginBottom: "16px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "14px", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}>
          ← Back to selection
        </button>
      </div>
      <div style={{ textAlign: "center", marginBottom: "clamp(20px, 3vw, 36px)" }}>
        <p style={{ fontSize: "11px", letterSpacing: "5px", color: accentColor, margin: "0 0 8px 0", textTransform: "uppercase" }}>✦ Seat of Wisdom Group of Schools ✦</p>
        <h1 style={{ fontSize: "clamp(22px, 4vw, 36px)", fontWeight: "bold", color: "#f1f5f9", margin: "0 0 4px 0" }}>{title}</h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>{subtitle}</p>
      </div>
      <div style={{
        maxWidth: "1060px", width: "100%",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
        gap: "clamp(16px, 3vw, 36px)", backgroundColor: "#1e293b",
        padding: "clamp(20px, 4vw, 44px)", borderRadius: "24px",
        boxShadow: `0 0 0 1px #334155, 0 32px 64px -16px rgba(0,0,0,0.5), 0 0 60px -20px ${accentColor}44`,
      }}>
        {children}
      </div>
      <p style={{ marginTop: "28px", color: "#1e293b", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase" }}>Education: The Best Legacy</p>
    </main>
  );
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function LandingPage({ onSelect }: { onSelect: (s: Screen) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const cards = [
    { key: "guest",   icon: "🎟️", title: "Guest Pass",   color: "#3b82f6", desc: "For parents, visitors, and invited guests attending the festival.", cta: "Register as Guest" },
    { key: "student", icon: "🎓", title: "Student Pass", color: "#f59e0b", desc: "For enrolled students competing or participating in the festival.", cta: "Register as Student" },
  ];

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#080d14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(24px, 5vw, 60px)", fontFamily: "Georgia, serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: "600px", height: "600px", borderRadius: "50%", top: "-200px", left: "-200px", background: "radial-gradient(circle, #1e40af18 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: "500px", height: "500px", borderRadius: "50%", bottom: "-150px", right: "-150px", background: "radial-gradient(circle, #be185d18 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ textAlign: "center", marginBottom: "clamp(32px, 6vw, 56px)" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #1e293b, #0f172a)", border: "2px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", margin: "0 auto 20px", boxShadow: "0 0 40px #3b82f618" }}>🏛️</div>
        <p style={{ fontSize: "clamp(10px, 1.5vw, 12px)", letterSpacing: "6px", color: "#3b82f6", margin: "0 0 10px 0", textTransform: "uppercase" }}>Seat of Wisdom Group of Schools</p>
        <h1 style={{ fontSize: "clamp(28px, 6vw, 56px)", fontWeight: "bold", color: "#f1f5f9", margin: "0 0 8px 0", lineHeight: 1.15 }}>Cultural Sports<br />Festival 2026</h1>
        <p style={{ color: "#475569", margin: 0, fontSize: "clamp(13px, 2vw, 16px)" }}>Generate your personalised digital pass</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "clamp(16px, 3vw, 28px)", width: "100%", maxWidth: "680px" }}>
        {cards.map(({ key, icon, title, color, desc, cta }) => (
          <button key={key}
            onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect(key as Screen)}
            style={{
              padding: "clamp(28px, 5vw, 44px) clamp(20px, 4vw, 36px)", borderRadius: "24px",
              border: hovered === key ? `2px solid ${color}` : "2px solid #1e293b",
              background: hovered === key ? `linear-gradient(135deg, ${color}15, #0f172a)` : "linear-gradient(135deg, #1e293b, #0f172a)",
              cursor: "pointer", textAlign: "left", transition: "all 0.3s",
              boxShadow: hovered === key ? `0 0 40px ${color}22, inset 0 0 40px ${color}0a` : "none",
              transform: hovered === key ? "translateY(-4px)" : "none",
            }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>{icon}</div>
            <h2 style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: "bold", color: "#f1f5f9", margin: "0 0 8px 0" }}>{title}</h2>
            <p style={{ color: "#64748b", margin: 0, fontSize: "14px", lineHeight: 1.6 }}>{desc}</p>
            <div style={{ marginTop: "20px", display: "inline-flex", alignItems: "center", gap: "8px", color, fontSize: "13px", fontWeight: "bold" }}>
              {cta} <span style={{ fontSize: "18px" }}>→</span>
            </div>
          </button>
        ))}
      </div>

      <button onClick={() => onSelect("admin")} style={{ marginTop: "40px", background: "none", border: "none", cursor: "pointer", color: "#1e293b", fontSize: "12px", fontFamily: "Georgia, serif", letterSpacing: "2px", textTransform: "uppercase", transition: "color 0.2s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#475569")} onMouseLeave={(e) => (e.currentTarget.style.color = "#1e293b")}>
        ⚙ Admin Dashboard
      </button>
      <p style={{ marginTop: "12px", color: "#1e293b", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase" }}>Education: The Best Legacy</p>
    </main>
  );
}

// ─── GUEST REGISTRATION ───────────────────────────────────────────────────────
function GuestRegistration({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({ name: "", house: "Amani House" as HouseName, mode: "Physical Participation" });
  const [image, setImage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = houseThemes[formData.house];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImage(URL.createObjectURL(file)); setSaved(false); }
  };

  const drawCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    try {
      const [logoImg, userImg] = await Promise.all([loadImg("/logo.jpeg").catch(() => null), loadImg(image)]);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = 0.035;
      for (let i = -H; i < W + H; i += 30) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
      ctx.restore();
      const o1 = ctx.createRadialGradient(W - 60, 60, 0, W - 60, 60, 280); o1.addColorStop(0, theme.color + "55"); o1.addColorStop(1, "transparent"); ctx.fillStyle = o1; ctx.fillRect(0, 0, W, H);
      const o2 = ctx.createRadialGradient(80, H - 60, 0, 80, H - 60, 180); o2.addColorStop(0, theme.accent + "33"); o2.addColorStop(1, "transparent"); ctx.fillStyle = o2; ctx.fillRect(0, 0, W, H);
      const hg = ctx.createLinearGradient(0, 0, W, 0); hg.addColorStop(0, theme.color); hg.addColorStop(1, theme.accent);
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 5);
      if (logoImg) { ctx.save(); ctx.beginPath(); ctx.arc(62, 54, 34, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(logoImg, 28, 20, 68, 68); ctx.restore(); ctx.strokeStyle = theme.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(62, 54, 35, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = "#f8fafc"; ctx.font = "bold 17px Georgia"; ctx.fillText("SEAT OF WISDOM GROUP OF SCHOOLS", logoImg ? 110 : 32, 44);
      ctx.fillStyle = theme.accent; ctx.font = "italic 13px Georgia"; ctx.fillText("✦  CULTURAL SPORTS FESTIVAL 2026  ✦", logoImg ? 110 : 32, 67);
      ctx.save(); drawRoundRect(ctx, W - 130, 20, 110, 32, 16); ctx.fillStyle = theme.color + "44"; ctx.fill(); ctx.strokeStyle = theme.accent + "88"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = theme.accent; ctx.font = "bold 11px Georgia"; ctx.fillText("GUEST PASS", W - 118, 41); ctx.restore();
      drawSepLine(ctx, 92, W, theme.accent);
      const pr = 95, px = 60, py = 118;
      ctx.save(); ctx.shadowColor = theme.accent; ctx.shadowBlur = 20; ctx.strokeStyle = theme.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + pr, py + pr, pr + 5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(px + pr, py + pr, pr, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(userImg, px, py, pr * 2, pr * 2); ctx.restore();
      ctx.strokeStyle = theme.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + pr, py + pr, pr + 16, -0.3, 0.3); ctx.stroke();
      const ix = px + pr * 2 + 44, iy = 126;
      ctx.fillStyle = "#f1f5f9"; ctx.font = "bold 28px Georgia"; ctx.fillText((formData.name || "GUEST NAME").toUpperCase(), ix, iy + 36);
      const nw = ctx.measureText((formData.name || "GUEST NAME").toUpperCase()).width;
      const ul = ctx.createLinearGradient(ix, 0, ix + nw, 0); ul.addColorStop(0, theme.accent); ul.addColorStop(1, "transparent");
      ctx.fillStyle = ul; ctx.fillRect(ix, iy + 44, nw, 2);
      ctx.save(); drawRoundRect(ctx, ix, iy + 58, 218, 40, 20);
      const pg = ctx.createLinearGradient(ix, 0, ix + 218, 0); pg.addColorStop(0, theme.color); pg.addColorStop(1, theme.accent);
      ctx.fillStyle = pg; ctx.shadowColor = theme.accent; ctx.shadowBlur = 10; ctx.fill(); ctx.restore();
      ctx.fillStyle = "#fff"; ctx.font = "bold 15px Georgia"; ctx.fillText(`${theme.emoji}  ${formData.house.toUpperCase()}`, ix + 18, iy + 84);
      ctx.fillStyle = "#94a3b8"; ctx.font = "13px Georgia"; ctx.fillText(`${formData.mode === "Facebook Live" ? "🎥" : "📍"}  ${formData.mode}`, ix, iy + 134);
      drawSepLine(ctx, H - 68, W, theme.accent);
      ctx.fillStyle = "#475569"; ctx.font = "11px monospace"; ctx.fillText("GUEST PASS  •  2026", 32, H - 40);
      const sub = "SEAT OF WISDOM  •  EDUCATION: THE BEST LEGACY"; ctx.fillText(sub, W - ctx.measureText(sub).width - 32, H - 40);
      ctx.fillStyle = hg; ctx.fillRect(0, H - 5, W, 5);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (image) drawCard(); }, [formData, image]);

  const handleDownload = async () => {
    const canvas = canvasRef.current; if (!canvas) return;
    if (!saved) {
      const reg: Registration = { id: `g_${Date.now()}`, type: "Guest", name: formData.name, house: formData.house, mode: formData.mode, timestamp: new Date().toISOString() };
      await saveRegistration(reg);
      setSaved(true);
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
                <button key={mode} onClick={() => setFormData({ ...formData, mode })} style={{
                  flex: 1, padding: "12px", borderRadius: "12px", fontFamily: "Georgia, serif",
                  border: active ? `2px solid ${theme.accent}` : "2px solid #334155",
                  backgroundColor: active ? theme.color + "22" : "#0f172a",
                  color: active ? theme.accent : "#64748b",
                  fontWeight: active ? "bold" : "normal", fontSize: "13px", cursor: "pointer", transition: "all 0.2s",
                }}>{mode === "Physical Participation" ? "📍 Physical" : "🎥 Facebook"}</button>
              );
            })}
          </div>
        </Field>
        <Field label="Upload Your Photo">
          <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", border: `2px dashed ${theme.accent}66`, backgroundColor: theme.color + "11", cursor: "pointer", color: theme.accent, fontSize: "14px", fontFamily: "Georgia, serif" }}>
            <span style={{ fontSize: "22px" }}>📸</span><span>Choose a photo…</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </label>
        </Field>
        {saved && (
          <div style={{ padding: "12px 16px", borderRadius: "12px", background: "linear-gradient(135deg, #052e16, #0f172a)", border: "1px solid #22c55e44", color: "#22c55e", fontSize: "13px", fontFamily: "Georgia, serif" }}>
            ✅ Registration saved to database!
          </div>
        )}
      </div>
      <PassPreview canvasRef={canvasRef} image={image} accentColor={theme.accent} canvasWidth={800} canvasHeight={420} onDownload={handleDownload} downloadDisabled={!image || !formData.name} placeholder="Upload a photo to preview your guest pass" showShare={saved} shareName={formData.name} shareHouse={formData.house} />
    </RegistrationShell>
  );
}

// ─── STUDENT REGISTRATION ─────────────────────────────────────────────────────
function StudentRegistration({ onBack }: { onBack: () => void }) {
  const [formData, setFormData] = useState({ name: "", house: "Amani House" as HouseName, className: "" });
  const [image, setImage] = useState<string | null>(null);
  const [regCount, setRegCount] = useState(0);
  const [myNumber, setMyNumber] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sColor = "#78350f"; const sAccent = "#f59e0b"; const sAccent2 = "#fbbf24";

  useEffect(() => {
    (async () => {
      try { const r = localStorage.getItem(COUNT_KEY); setRegCount(r ? parseInt(r) || 0 : 0); }
      catch { setRegCount(0); }
    })();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImage(URL.createObjectURL(file));
  };

  const confirmRegistration = async () => {
    if (!formData.name || !image) return;
    setSaving(true);
    try {
      const r = localStorage.getItem(COUNT_KEY);
      const current = r ? parseInt(r) || 0 : 0;
      const newCount = current + 1;
      localStorage.setItem(COUNT_KEY, String(newCount));
      setRegCount(newCount); setMyNumber(newCount);
      const reg: Registration = { id: `s_${Date.now()}`, type: "Student", name: formData.name, house: formData.house, className: formData.className, regNumber: newCount, timestamp: new Date().toISOString() };
      await saveRegistration(reg);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const drawCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !image || myNumber === null) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    try {
      const [logoImg, userImg] = await Promise.all([loadImg("/logo.jpeg").catch(() => null), loadImg(image)]);
      ctx.fillStyle = "#0d0a04"; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = 0.05;
      for (let i = -H; i < W + H; i += 24) { ctx.strokeStyle = sAccent; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
      ctx.restore();
      const o1 = ctx.createRadialGradient(W * 0.75, 0, 0, W * 0.75, 0, 320); o1.addColorStop(0, "#92400e55"); o1.addColorStop(1, "transparent"); ctx.fillStyle = o1; ctx.fillRect(0, 0, W, H);
      const o2 = ctx.createRadialGradient(60, H, 0, 60, H, 220); o2.addColorStop(0, "#f59e0b22"); o2.addColorStop(1, "transparent"); ctx.fillStyle = o2; ctx.fillRect(0, 0, W, H);
      const hg = ctx.createLinearGradient(0, 0, W, 0); hg.addColorStop(0, sColor); hg.addColorStop(0.5, sAccent); hg.addColorStop(1, sColor);
      ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 5);
      if (logoImg) { ctx.save(); ctx.beginPath(); ctx.arc(62, 54, 34, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(logoImg, 28, 20, 68, 68); ctx.restore(); ctx.strokeStyle = sAccent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(62, 54, 35, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = "#fef3c7"; ctx.font = "bold 17px Georgia"; ctx.fillText("SEAT OF WISDOM GROUP OF SCHOOLS", logoImg ? 110 : 32, 44);
      ctx.fillStyle = sAccent; ctx.font = "italic 13px Georgia"; ctx.fillText("✦  CULTURAL SPORTS FESTIVAL 2026  ✦", logoImg ? 110 : 32, 67);
      ctx.save(); drawRoundRect(ctx, W - 140, 20, 120, 32, 16); ctx.fillStyle = sColor + "66"; ctx.fill(); ctx.strokeStyle = sAccent + "99"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = sAccent; ctx.font = "bold 11px Georgia"; ctx.fillText("STUDENT PASS", W - 128, 41); ctx.restore();
      drawSepLine(ctx, 92, W, sAccent);
      const pw = 190, ph = 190, px = 52, py = 112;
      ctx.save(); drawRoundRect(ctx, px, py, pw, ph, 8); ctx.clip(); ctx.drawImage(userImg, px, py, pw, ph); ctx.restore();
      ctx.strokeStyle = sAccent; ctx.lineWidth = 3; drawRoundRect(ctx, px, py, pw, ph, 8); ctx.stroke();
      [[px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph]].forEach(([cx, cy], i) => {
        ctx.strokeStyle = sAccent2; ctx.lineWidth = 4; ctx.beginPath();
        const dx = i % 2 === 0 ? 1 : -1, dy = i < 2 ? 1 : -1;
        ctx.moveTo(cx + dx * 22, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * 22); ctx.stroke();
      });
      ctx.fillStyle = "#000000aa"; ctx.fillRect(px, py + ph - 36, pw, 36);
      ctx.fillStyle = sAccent; ctx.font = "bold 15px monospace";
      const regStr = `#${String(myNumber).padStart(4, "0")}`;
      ctx.fillText(regStr, px + (pw - ctx.measureText(regStr).width) / 2, py + ph - 12);
      const ix = px + pw + 44, iy = 112;
      ctx.fillStyle = "#fef3c7"; ctx.font = "bold 27px Georgia"; ctx.fillText((formData.name || "STUDENT NAME").toUpperCase(), ix, iy + 34);
      const nw = ctx.measureText((formData.name || "STUDENT NAME").toUpperCase()).width;
      const ul = ctx.createLinearGradient(ix, 0, ix + nw, 0); ul.addColorStop(0, sAccent); ul.addColorStop(1, "transparent");
      ctx.fillStyle = ul; ctx.fillRect(ix, iy + 42, nw, 2);
      if (formData.className) {
        ctx.fillStyle = "#1c1408"; drawRoundRect(ctx, ix, iy + 54, 160, 34, 8); ctx.fill();
        ctx.strokeStyle = sAccent + "66"; ctx.lineWidth = 1; drawRoundRect(ctx, ix, iy + 54, 160, 34, 8); ctx.stroke();
        ctx.fillStyle = sAccent2; ctx.font = "bold 14px Georgia"; ctx.fillText(`📚  ${formData.className}`, ix + 12, iy + 77);
      }
      const hTheme = houseThemes[formData.house];
      ctx.save(); drawRoundRect(ctx, ix, iy + (formData.className ? 98 : 58), 218, 40, 20);
      const pg = ctx.createLinearGradient(ix, 0, ix + 218, 0); pg.addColorStop(0, hTheme.color); pg.addColorStop(1, hTheme.accent);
      ctx.fillStyle = pg; ctx.shadowColor = hTheme.accent; ctx.shadowBlur = 10; ctx.fill(); ctx.restore();
      ctx.fillStyle = "#fff"; ctx.font = "bold 15px Georgia"; ctx.fillText(`${hTheme.emoji}  ${formData.house.toUpperCase()}`, ix + 18, iy + (formData.className ? 124 : 84));
      ctx.fillStyle = "#78716c"; ctx.font = "12px Georgia"; ctx.fillText(`Total registered: ${regCount} student${regCount !== 1 ? "s" : ""}`, ix, iy + (formData.className ? 156 : 116));
      drawSepLine(ctx, H - 68, W, sAccent);
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

  return (
    <RegistrationShell title="Student Registration" subtitle="Compete in the 2026 Cultural Sports Festival" accentColor={sAccent} onBack={onBack}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: "14px", background: "linear-gradient(135deg, #1c1408, #0d0a04)", border: `1px solid ${sAccent}44` }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#78716c", textTransform: "uppercase", fontFamily: "Georgia, serif" }}>Registrations so far</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: sAccent, fontFamily: "Georgia, serif", lineHeight: 1.2 }}>{regCount} <span style={{ fontSize: "14px", color: "#78716c" }}>student{regCount !== 1 ? "s" : ""}</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#78716c", textTransform: "uppercase", fontFamily: "Georgia, serif" }}>Your number will be</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: myNumber !== null ? "#22c55e" : sAccent2, fontFamily: "monospace", lineHeight: 1.2 }}>
              {myNumber !== null ? `#${String(myNumber).padStart(4, "0")}` : `#${String(regCount + 1).padStart(4, "0")}`}
            </div>
          </div>
        </div>
        <Field label="Full Student Name"><input style={inputBase} placeholder="e.g. Amara Osei" onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></Field>
        <Field label="Class / Grade"><input style={inputBase} placeholder="e.g. JSS 3A  or  Grade 10" onChange={(e) => setFormData({ ...formData, className: e.target.value })} /></Field>
        <Field label="House Affiliation"><HouseGrid value={formData.house} onChange={(h) => setFormData({ ...formData, house: h })} /></Field>
        <Field label="Upload Your Photo">
          <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", border: `2px dashed ${sAccent}66`, backgroundColor: sColor + "11", cursor: "pointer", color: sAccent, fontSize: "14px", fontFamily: "Georgia, serif" }}>
            <span style={{ fontSize: "22px" }}>📸</span><span>Choose a photo…</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </label>
        </Field>
        {myNumber === null ? (
          <button disabled={!formData.name || !image || saving} onClick={confirmRegistration} style={{
            padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer",
            background: (!formData.name || !image) ? "#1c1408" : `linear-gradient(135deg, ${sColor}, ${sAccent})`,
            color: (!formData.name || !image) ? "#57534e" : "#fff",
            fontWeight: "bold", fontSize: "15px", fontFamily: "Georgia, serif", letterSpacing: "1px", opacity: saving ? 0.7 : 1,
          }}>{saving ? "Registering…" : "✦ Confirm Registration & Generate Pass"}</button>
        ) : (
          <div style={{ padding: "14px", borderRadius: "12px", background: "linear-gradient(135deg, #052e16, #0f172a)", border: "1px solid #22c55e44", color: "#22c55e", textAlign: "center", fontFamily: "Georgia, serif", fontSize: "14px" }}>
            ✅ Registered & saved! You are student #{String(myNumber).padStart(4, "0")}
          </div>
        )}
      </div>
      <PassPreview canvasRef={canvasRef} image={image && myNumber !== null ? image : null} accentColor={sAccent} canvasWidth={800} canvasHeight={430} onDownload={download} downloadDisabled={!image || !formData.name || myNumber === null} placeholder="Fill in your details & confirm registration to generate your pass" showShare={myNumber !== null} shareName={formData.name} shareHouse={formData.house} />
    </RegistrationShell>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"All" | "Guest" | "Student">("All");
  const [houseFilter, setHouseFilter] = useState<"All" | HouseName>("All");
  const [search, setSearch] = useState("");

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); fetchData(); }
    else { setPwError(true); }
  };

  const fetchData = async () => {
    setLoading(true);
    const data = await loadRegistrations();
    setRegs([...data].reverse());
    setLoading(false);
  };

  const filtered = regs.filter((r) => {
    if (filter !== "All" && r.type !== filter) return false;
    if (houseFilter !== "All" && r.house !== houseFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const houseCounts = HOUSE_NAMES.reduce((acc, h) => { acc[h] = regs.filter((r) => r.house === h).length; return acc; }, {} as Record<string, number>);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + "  " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  if (!authed) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#080d14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: "420px", backgroundColor: "#1e293b", borderRadius: "24px", padding: "48px 36px", boxShadow: "0 0 0 1px #334155, 0 32px 64px -16px rgba(0,0,0,0.6)", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚙️</div>
          <h2 style={{ color: "#f1f5f9", fontSize: "24px", margin: "0 0 6px 0" }}>Admin Dashboard</h2>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 32px 0" }}>Enter the admin password to continue</p>
          <input type="password" placeholder="Password" value={pw} onChange={(e) => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={(e) => e.key === "Enter" && login()}
            style={{ ...inputBase, marginBottom: "12px", textAlign: "center", border: pwError ? "2px solid #ef4444" : "2px solid #334155" }} />
          {pwError && <p style={{ color: "#ef4444", fontSize: "13px", margin: "0 0 12px 0" }}>Incorrect password. Try again.</p>}
          <button onClick={login} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #1e40af, #3b82f6)", color: "#fff", fontSize: "15px", fontWeight: "bold", fontFamily: "Georgia, serif", cursor: "pointer" }}>
            Unlock Dashboard
          </button>
          <button onClick={onBack} style={{ marginTop: "16px", background: "none", border: "none", color: "#475569", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px" }}>← Back to home</button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#080d14", padding: "clamp(16px, 4vw, 40px)", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <p style={{ fontSize: "11px", letterSpacing: "4px", color: "#3b82f6", margin: "0 0 4px 0", textTransform: "uppercase" }}>Admin Dashboard</p>
            <h1 style={{ fontSize: "clamp(22px, 4vw, 32px)", color: "#f1f5f9", margin: 0 }}>Festival Registrations</h1>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={fetchData} style={{ padding: "10px 18px", borderRadius: "10px", border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px" }}>↻ Refresh</button>
            <button onClick={onBack} style={{ padding: "10px 18px", borderRadius: "10px", border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: "13px" }}>← Exit</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginBottom: "28px" }}>
          {[
            { label: "Total", value: regs.length, color: "#f1f5f9" },
            { label: "Guests", value: regs.filter(r => r.type === "Guest").length, color: "#3b82f6" },
            { label: "Students", value: regs.filter(r => r.type === "Student").length, color: "#f59e0b" },
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
          <input placeholder="🔍 Search by name…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputBase, maxWidth: "240px", padding: "10px 14px", fontSize: "14px" }} />
          {(["All", "Guest", "Student"] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "10px 16px", borderRadius: "10px", fontFamily: "Georgia, serif", fontSize: "13px", cursor: "pointer",
              border: filter === t ? "2px solid #3b82f6" : "2px solid #334155",
              background: filter === t ? "#1e40af22" : "#1e293b",
              color: filter === t ? "#3b82f6" : "#64748b",
            }}>{t}</button>
          ))}
          <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value as any)}
            style={{ ...inputBase, maxWidth: "180px", padding: "10px 14px", fontSize: "13px" }}>
            <option value="All">All Houses</option>
            {HOUSE_NAMES.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: "#1e293b", borderRadius: "20px", border: "1px solid #334155", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#475569" }}>Loading registrations…</div>
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
                    {["#", "Type", "Name", "House", "Class / Mode", "Registered"].map((h) => (
                      <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "10px", letterSpacing: "2px", color: "#64748b", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const ht = houseThemes[r.house];
                    const isStudent = r.type === "Student";
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #0f172a", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#0f172a")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "14px 16px", color: "#475569", fontSize: "13px", fontFamily: "monospace" }}>
                          {isStudent && r.regNumber ? `#${String(r.regNumber).padStart(4, "0")}` : "—"}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", backgroundColor: isStudent ? "#92400e22" : "#1e40af22", color: isStudent ? "#f59e0b" : "#3b82f6" }}>
                            {isStudent ? "🎓 Student" : "🎟️ Guest"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#f1f5f9", fontSize: "14px", fontWeight: "bold" }}>{r.name}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", backgroundColor: ht.color + "22", color: ht.accent }}>
                            {ht.emoji} {r.house}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "13px" }}>
                          {isStudent ? (r.className || "—") : (r.mode === "Facebook Live" ? "🎥 Facebook Live" : "📍 Physical")}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "12px", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {formatDate(r.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: "12px 16px", borderTop: "1px solid #334155", color: "#475569", fontSize: "12px" }}>
                Showing {filtered.length} of {regs.length} registration{regs.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  if (screen === "guest") return <GuestRegistration onBack={() => setScreen("landing")} />;
  if (screen === "student") return <StudentRegistration onBack={() => setScreen("landing")} />;
  if (screen === "admin") return <AdminDashboard onBack={() => setScreen("landing")} />;
  return <LandingPage onSelect={setScreen} />;
}