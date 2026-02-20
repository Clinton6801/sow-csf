"use client";
import { useState, useRef, useEffect } from "react";

export default function CulturalSportsRegistration() {
  type HouseName = "Amani House" | "Imara House" | "Zamani House" | "Ubora House";
  const [formData, setFormData] = useState<{
    name: string;
    house: HouseName;
    mode: string;
  }>({
    name: "",
    house: "Amani House",
    mode: "Physical Participation",
  });
  const [image, setImage] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const houseThemes: Record<HouseName, { color: string; accent: string; light: string; emoji: string }> = {
    "Amani House": { color: "#1e40af", accent: "#3b82f6", light: "#dbeafe", emoji: "🕊️" },
    "Imara House": { color: "#be185d", accent: "#ec4899", light: "#fce7f3", emoji: "🌸" },
    "Zamani House": { color: "#15803d", accent: "#22c55e", light: "#dcfce7", emoji: "🌿" },
    "Ubora House": { color: "#92400e", accent: "#f59e0b", light: "#fef3c7", emoji: "👑" },
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
    }
  };

  const drawCard = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => reject();
      });

    try {
      const [logoImg, userImg] = await Promise.all([
        loadImage("/logo.jpeg").catch(() => null),
        loadImage(image),
      ]);

      const theme = houseThemes[formData.house];

      // ── Background ──────────────────────────────────────────
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      // Subtle diagonal stripe texture
      ctx.save();
      ctx.globalAlpha = 0.04;
      for (let i = -H; i < W + H; i += 28) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + H, H);
        ctx.stroke();
      }
      ctx.restore();

      // ── Glowing orb top-right ────────────────────────────────
      const grad1 = ctx.createRadialGradient(W - 80, 80, 0, W - 80, 80, 260);
      grad1.addColorStop(0, theme.color + "55");
      grad1.addColorStop(1, "transparent");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, W, H);

      // ── Glowing orb bottom-left ──────────────────────────────
      const grad2 = ctx.createRadialGradient(80, H - 80, 0, 80, H - 80, 200);
      grad2.addColorStop(0, theme.accent + "33");
      grad2.addColorStop(1, "transparent");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, W, H);

      // ── Top accent band ──────────────────────────────────────
      const headerGrad = ctx.createLinearGradient(0, 0, W, 0);
      headerGrad.addColorStop(0, theme.color);
      headerGrad.addColorStop(1, theme.accent);
      ctx.fillStyle = headerGrad;
      ctx.fillRect(0, 0, W, 5);

      // ── School name & event ──────────────────────────────────
      ctx.save();
      // Logo
      if (logoImg) {
        // Circle clip for logo
        ctx.save();
        ctx.beginPath();
        ctx.arc(60, 54, 34, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, 26, 20, 68, 68);
        ctx.restore();
        // Logo ring
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(60, 54, 35, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 18px 'Georgia', serif";
      ctx.letterSpacing = "1px";
      ctx.fillText("SEAT OF WISDOM GROUP OF SCHOOLS", logoImg ? 108 : 32, 44);

      ctx.fillStyle = theme.accent;
      ctx.font = "italic 14px 'Georgia', serif";
      ctx.fillText("✦  CULTURAL SPORTS FESTIVAL 2026  ✦", logoImg ? 108 : 32, 68);
      ctx.restore();

      // ── Thin separator line ──────────────────────────────────
      const sepGrad = ctx.createLinearGradient(0, 0, W, 0);
      sepGrad.addColorStop(0, "transparent");
      sepGrad.addColorStop(0.3, theme.accent + "aa");
      sepGrad.addColorStop(0.7, theme.accent + "aa");
      sepGrad.addColorStop(1, "transparent");
      ctx.fillStyle = sepGrad;
      ctx.fillRect(24, 92, W - 48, 1);

      // ── User photo (circle) ──────────────────────────────────
      const photoX = 68;
      const photoY = 128;
      const photoR = 100;

      // Outer glow ring
      ctx.save();
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 24;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(photoX + photoR, photoY + photoR, photoR + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Photo clip circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(photoX + photoR, photoY + photoR, photoR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(userImg, photoX, photoY, photoR * 2, photoR * 2);
      ctx.restore();

      // Decorative arc notch
      ctx.strokeStyle = theme.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(photoX + photoR, photoY + photoR, photoR + 16, -0.3, 0.3);
      ctx.stroke();

      // ── Guest info panel ─────────────────────────────────────
      const infoX = 56 + photoR * 2 + 40;
      const infoY = 128;

      // Name
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "bold 30px 'Georgia', serif";
      const displayName = formData.name.toUpperCase() || "YOUR NAME";
      ctx.fillText(displayName, infoX, infoY + 38);

      // Thin underline
      const nameWidth = ctx.measureText(displayName).width;
      const underlineGrad = ctx.createLinearGradient(infoX, 0, infoX + nameWidth, 0);
      underlineGrad.addColorStop(0, theme.accent);
      underlineGrad.addColorStop(1, "transparent");
      ctx.fillStyle = underlineGrad;
      ctx.fillRect(infoX, infoY + 48, nameWidth, 2);

      // House badge pill
      const badgeW = 210;
      const badgeH = 40;
      const badgeX = infoX;
      const badgeY = infoY + 65;
      const badgeR = 20;

      ctx.save();
      // Pill shape
      ctx.beginPath();
      ctx.moveTo(badgeX + badgeR, badgeY);
      ctx.lineTo(badgeX + badgeW - badgeR, badgeY);
      ctx.arcTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + badgeR, badgeR);
      ctx.lineTo(badgeX + badgeW, badgeY + badgeH - badgeR);
      ctx.arcTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - badgeR, badgeY + badgeH, badgeR);
      ctx.lineTo(badgeX + badgeR, badgeY + badgeH);
      ctx.arcTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - badgeR, badgeR);
      ctx.lineTo(badgeX, badgeY + badgeR);
      ctx.arcTo(badgeX, badgeY, badgeX + badgeR, badgeY, badgeR);
      ctx.closePath();
      const pillGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
      pillGrad.addColorStop(0, theme.color);
      pillGrad.addColorStop(1, theme.accent);
      ctx.fillStyle = pillGrad;
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'Georgia', serif";
      ctx.fillText(`${theme.emoji}  ${formData.house.toUpperCase()}`, badgeX + 18, badgeY + 26);

      // Attendance row
      const modeIcon = formData.mode === "Facebook Live" ? "🎥" : "📍";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px 'Georgia', serif";
      ctx.fillText(`${modeIcon}  ${formData.mode}`, infoX, infoY + 140);

      // ── Bottom info row ──────────────────────────────────────
      ctx.fillStyle = sepGrad;
      ctx.fillRect(24, H - 72, W - 48, 1);

      ctx.fillStyle = "#475569";
      ctx.font = "12px monospace";
      ctx.fillText("GUEST PASS  •  2026", 32, H - 42);

      ctx.fillStyle = "#475569";
      ctx.font = "12px monospace";
      const subtext = "SEAT OF WISDOM  •  EDUCATION: THE BEST LEGACY";
      const subW = ctx.measureText(subtext).width;
      ctx.fillText(subtext, W - subW - 32, H - 42);

      // ── Bottom accent band ───────────────────────────────────
      ctx.fillStyle = headerGrad;
      ctx.fillRect(0, H - 5, W, 5);

    } catch (err) {
      console.error("Canvas error:", err);
    }
  };

  useEffect(() => {
    if (image) drawCard();
  }, [formData, image]);

  const downloadTicket = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `SeatOfWisdom-Pass-${formData.name || "guest"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const theme = houseThemes[formData.house];

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#0f172a",
      padding: "clamp(16px, 4vw, 48px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'Georgia', serif",
      backgroundImage: "radial-gradient(ellipse at 20% 50%, #1e293b 0%, #0f172a 100%)",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "clamp(20px, 4vw, 40px)" }}>
        <p style={{
          fontSize: "clamp(10px, 1.5vw, 13px)",
          letterSpacing: "6px",
          color: theme.accent,
          margin: "0 0 8px 0",
          textTransform: "uppercase",
          transition: "color 0.4s",
        }}>✦ Seat of Wisdom Group of Schools ✦</p>
        <h1 style={{
          fontSize: "clamp(22px, 5vw, 42px)",
          fontWeight: "bold",
          color: "#f1f5f9",
          margin: "0",
          lineHeight: 1.2,
        }}>Cultural Sports Festival</h1>
        <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: "clamp(13px, 2vw, 16px)" }}>Generate your personalized digital pass</p>
      </div>

      {/* Card */}
      <div style={{
        maxWidth: "1060px",
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
        gap: "clamp(16px, 3vw, 36px)",
        backgroundColor: "#1e293b",
        padding: "clamp(20px, 4vw, 44px)",
        borderRadius: "24px",
        boxShadow: `0 0 0 1px #334155, 0 32px 64px -16px rgba(0,0,0,0.5), 0 0 60px -20px ${theme.accent}44`,
        transition: "box-shadow 0.4s",
      }}>

        {/* ── Form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h2 style={{ fontSize: "clamp(18px, 3vw, 26px)", fontWeight: "bold", color: "#f1f5f9", margin: "0 0 4px 0" }}>Guest Registration</h2>
            <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>Join the 2026 celebration</p>
          </div>

          {/* Name */}
          <Field label="Full Guest Name">
            <input
              type="text"
              placeholder="e.g. John Doe"
              style={inputStyle}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </Field>

          {/* House */}
          <Field label="Supporting House">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {(Object.keys(houseThemes) as HouseName[]).map((h) => {
                const t = houseThemes[h];
                const active = formData.house === h;
                return (
                  <button
                    key={h}
                    onClick={() => setFormData({ ...formData, house: h })}
                    style={{
                      padding: "12px 8px",
                      borderRadius: "12px",
                      border: active ? `2px solid ${t.accent}` : "2px solid #334155",
                      backgroundColor: active ? t.color + "22" : "#0f172a",
                      color: active ? t.accent : "#64748b",
                      fontWeight: active ? "bold" : "normal",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {t.emoji} {h}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Mode */}
          <Field label="How Will You Join Us?">
            <div style={{ display: "flex", gap: "10px" }}>
              {["Physical Participation", "Facebook Live"].map((mode) => {
                const active = formData.mode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setFormData({ ...formData, mode })}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      border: active ? `2px solid ${theme.accent}` : "2px solid #334155",
                      backgroundColor: active ? theme.color + "22" : "#0f172a",
                      color: active ? theme.accent : "#64748b",
                      fontWeight: active ? "bold" : "normal",
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {mode === "Physical Participation" ? "📍 Physical" : "🎥 Facebook"}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Photo */}
          <Field label="Upload Your Photo">
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              borderRadius: "12px",
              border: `2px dashed ${theme.accent}66`,
              backgroundColor: theme.color + "11",
              cursor: "pointer",
              color: theme.accent,
              fontSize: "14px",
              transition: "all 0.2s",
            }}>
              <span style={{ fontSize: "22px" }}>📸</span>
              <span>Choose a photo…</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            </label>
          </Field>
        </div>

        {/* ── Preview ── */}
        <div style={{
          backgroundColor: "#0f172a",
          padding: "clamp(14px, 3vw, 28px)",
          borderRadius: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "1px solid #334155",
        }}>
          <p style={{ fontSize: "10px", letterSpacing: "4px", color: "#475569", margin: "0 0 16px 0", textTransform: "uppercase" }}>Invitation Preview</p>

          <div style={{
            width: "100%",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: `0 8px 32px -8px ${theme.accent}44`,
            border: `1px solid ${theme.accent}33`,
            transition: "box-shadow 0.4s",
          }}>
            {image ? (
              <canvas
                ref={previewCanvasRef}
                width={800}
                height={420}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            ) : (
              <div style={{
                padding: "clamp(40px, 8vw, 80px) 20px",
                textAlign: "center",
                color: "#475569",
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              }}>
                <div style={{ fontSize: "44px", marginBottom: "12px" }}>🎭</div>
                <p style={{ margin: 0, fontSize: "14px", fontFamily: "Georgia, serif" }}>Upload a photo to preview your festival pass</p>
              </div>
            )}
          </div>

          <button
            disabled={!image || !formData.name}
            onClick={downloadTicket}
            style={{
              marginTop: "20px",
              width: "100%",
              padding: "16px",
              background: (!image || !formData.name) ? "#1e293b" : `linear-gradient(135deg, ${theme.color}, ${theme.accent})`,
              color: (!image || !formData.name) ? "#475569" : "#ffffff",
              fontSize: "15px",
              fontWeight: "bold",
              fontFamily: "Georgia, serif",
              letterSpacing: "2px",
              borderRadius: "14px",
              border: (!image || !formData.name) ? "2px solid #334155" : "none",
              cursor: (!image || !formData.name) ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              textTransform: "uppercase",
            }}
          >
            ↓ Download Digital Pass
          </button>
        </div>

      </div>

      <p style={{ marginTop: "28px", color: "#334155", fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase" }}>
        Education: The Best Legacy
      </p>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "2px", color: "#94a3b8", textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "13px 16px",
  borderRadius: "12px",
  border: "2px solid #334155",
  color: "#f1f5f9",
  backgroundColor: "#0f172a",
  fontSize: "15px",
  fontFamily: "Georgia, serif",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};