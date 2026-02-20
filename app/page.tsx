"use client";
import { useState, useRef, useEffect } from "react";

type HouseName = "Amani House" | "Imara House" | "Zamani House" | "Ubora House";
type Screen = "landing" | "guest" | "student";

const houseThemes: Record<HouseName, { color: string; accent: string; emoji: string }> = {
  "Amani House":  { color: "#1e40af", accent: "#3b82f6", emoji: "🕊️" },
  "Imara House":  { color: "#be185d", accent: "#ec4899", emoji: "🌸" },
  "Zamani House": { color: "#15803d", accent: "#22c55e", emoji: "🌿" },
  "Ubora House":  { color: "#92400e", accent: "#f59e0b", emoji: "👑" },
};

/* ════════════════════ LANDING ════════════════════ */
function LandingPage({ onSelect }: { onSelect: (s: Screen) => void }) {
  return (
    <main style={{
      minHeight: "100vh", backgroundColor: "#0a0f1e",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "clamp(20px, 5vw, 60px)", fontFamily: "'Georgia', serif",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {[["#1e40af","15%","10%","500px"],["#be185d","70%","60%","400px"],["#15803d","80%","5%","300px"],["#92400e","5%","70%","350px"]].map(([c,l,t,s],i) => (
          <div key={i} style={{ position:"absolute", left:l as string, top:t as string, width:s as string, height:s as string, borderRadius:"50%", background:`radial-gradient(circle, ${c}33 0%, transparent 70%)`, transform:"translate(-50%,-50%)", filter:"blur(40px)" }} />
        ))}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize:"60px 60px" }} />
      </div>

      <div style={{ position:"relative", zIndex:1, textAlign:"center", maxWidth:"700px", width:"100%" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:"10px", backgroundColor:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"100px", padding:"8px 20px", marginBottom:"28px" }}>
          <span style={{ fontSize:"18px" }}>🏫</span>
          <span style={{ fontSize:"clamp(9px,1.5vw,12px)", letterSpacing:"3px", color:"#94a3b8", textTransform:"uppercase" }}>Seat of Wisdom Group of Schools</span>
        </div>

        <h1 style={{ fontSize:"clamp(32px,7vw,68px)", fontWeight:"bold", color:"#f8fafc", margin:"0 0 6px", lineHeight:1.1, letterSpacing:"-1px" }}>Cultural Sports</h1>
        <h1 style={{ fontSize:"clamp(32px,7vw,68px)", fontWeight:"bold", background:"linear-gradient(90deg,#3b82f6,#ec4899,#22c55e,#f59e0b)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", margin:"0 0 16px", lineHeight:1.1, letterSpacing:"-1px" }}>Festival 2026</h1>
        <p style={{ color:"#64748b", fontSize:"clamp(13px,2vw,17px)", margin:"0 0 52px", lineHeight:1.7 }}>
          Generate your personalised digital pass.<br />Choose your registration type to get started.
        </p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap:"20px" }}>
          <RegCard icon="🎟️" title="Guest Pass" desc="For parents, guardians & visitors attending the festival" gradient="linear-gradient(135deg,#1e3a8a,#1e40af,#3b82f6)" glow="#3b82f6" onClick={() => onSelect("guest")} />
          <RegCard icon="🎓" title="Student Pass" desc="For enrolled students participating in the cultural sports day" gradient="linear-gradient(135deg,#134e2a,#15803d,#22c55e)" glow="#22c55e" onClick={() => onSelect("student")} />
        </div>

        <p style={{ marginTop:"48px", color:"#1e293b", fontSize:"11px", letterSpacing:"4px", textTransform:"uppercase" }}>✦ Education: The Best Legacy ✦</p>
      </div>
    </main>
  );
}

function RegCard({ icon, title, desc, gradient, glow, onClick }: { icon:string; title:string; desc:string; gradient:string; glow:string; onClick:()=>void }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      background: h ? gradient : "rgba(255,255,255,0.04)",
      border:`1px solid ${h ? glow+"88" : "rgba(255,255,255,0.10)"}`,
      borderRadius:"20px", padding:"clamp(22px,4vw,36px) clamp(18px,3vw,28px)",
      cursor:"pointer", textAlign:"left", transition:"all 0.3s",
      boxShadow: h ? `0 0 40px -8px ${glow}66, 0 20px 40px -12px rgba(0,0,0,0.5)` : "0 4px 20px rgba(0,0,0,0.2)",
      transform: h ? "translateY(-4px)" : "none",
    }}>
      <div style={{ fontSize:"36px", marginBottom:"14px" }}>{icon}</div>
      <div style={{ fontSize:"clamp(17px,2.5vw,22px)", fontWeight:"bold", color:"#f1f5f9", marginBottom:"10px" }}>{title}</div>
      <div style={{ fontSize:"13px", color: h ? "#cbd5e1" : "#64748b", lineHeight:1.6, transition:"color 0.3s" }}>{desc}</div>
      <div style={{ marginTop:"18px", fontSize:"13px", color:glow, display:"flex", alignItems:"center", gap:"6px", fontWeight:"bold", letterSpacing:"1px" }}>
        Get Started <span style={{ transition:"transform 0.2s", transform: h ? "translateX(4px)" : "none", display:"inline-block" }}>→</span>
      </div>
    </button>
  );
}

/* ════════════════════ CANVAS HELPERS ════════════════════ */
function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = src;
    img.onload = () => res(img); img.onerror = () => rej();
  });
}
function rr(ctx: CanvasRenderingContext2D, x:number, y:number, w:number, h:number, r:number) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

/* ════════════════════ GUEST ════════════════════ */
function GuestRegistration({ onBack }: { onBack:()=>void }) {
  const [fd, setFd] = useState({ name:"", house:"Amani House" as HouseName, mode:"Physical Participation" });
  const [img, setImg] = useState<string|null>(null);
  const cRef = useRef<HTMLCanvasElement|null>(null);

  const draw = async () => {
    const canvas = cRef.current; if (!canvas||!img) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W=canvas.width, H=canvas.height, t=houseThemes[fd.house];
    try {
      const [logo,user] = await Promise.all([loadImg("/logo.jpeg").catch(()=>null), loadImg(img)]);
      ctx.clearRect(0,0,W,H);

      // BG
      ctx.fillStyle="#0a0f1e"; ctx.fillRect(0,0,W,H);
      ctx.save(); ctx.globalAlpha=0.035;
      for(let i=-H;i<W+H;i+=30){ ctx.strokeStyle="#fff"; ctx.lineWidth=10; ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+H,H); ctx.stroke(); }
      ctx.restore();

      // Orbs
      const o1=ctx.createRadialGradient(W*.85,H*.2,0,W*.85,H*.2,300); o1.addColorStop(0,t.color+"55"); o1.addColorStop(1,"transparent"); ctx.fillStyle=o1; ctx.fillRect(0,0,W,H);
      const o2=ctx.createRadialGradient(W*.1,H*.85,0,W*.1,H*.85,180); o2.addColorStop(0,t.accent+"33"); o2.addColorStop(1,"transparent"); ctx.fillStyle=o2; ctx.fillRect(0,0,W,H);

      // Top/bottom bars
      const bg=ctx.createLinearGradient(0,0,W,0); bg.addColorStop(0,t.color); bg.addColorStop(1,t.accent);
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,6);

      // Logo
      if(logo){ ctx.save(); ctx.beginPath(); ctx.arc(62,52,35,0,Math.PI*2); ctx.clip(); ctx.drawImage(logo,27,17,70,70); ctx.restore(); ctx.strokeStyle=t.accent; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(62,52,36,0,Math.PI*2); ctx.stroke(); }

      // Header text
      ctx.fillStyle="#f1f5f9"; ctx.font="bold 17px Georgia,serif"; ctx.fillText("SEAT OF WISDOM GROUP OF SCHOOLS",logo?112:30,42);
      ctx.fillStyle=t.accent; ctx.font="italic 13px Georgia,serif"; ctx.fillText("✦  CULTURAL SPORTS FESTIVAL 2026  ✦",logo?112:30,64);

      // Sep
      const sep=ctx.createLinearGradient(0,0,W,0); sep.addColorStop(0,"transparent"); sep.addColorStop(0.3,t.accent+"88"); sep.addColorStop(0.7,t.accent+"88"); sep.addColorStop(1,"transparent");
      ctx.fillStyle=sep; ctx.fillRect(28,88,W-56,1);

      // Guest badge
      rr(ctx,W-155,14,140,30,15); ctx.fillStyle=t.color+"88"; ctx.fill(); ctx.strokeStyle=t.accent+"99"; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle=t.accent; ctx.font="bold 11px Georgia,serif"; ctx.textAlign="center"; ctx.fillText("✦ GUEST PASS ✦",W-85,34); ctx.textAlign="left";

      // Photo circle
      const cx=118,cy=248,r=106;
      ctx.save(); ctx.shadowColor=t.accent; ctx.shadowBlur=28; ctx.strokeStyle=t.accent; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(cx,cy,r+7,0,Math.PI*2); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip(); ctx.drawImage(user,cx-r,cy-r,r*2,r*2); ctx.restore();
      for(let a=0;a<Math.PI*2;a+=Math.PI/6){ ctx.strokeStyle=t.accent+"55"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*(r+14),cy+Math.sin(a)*(r+14)); ctx.lineTo(cx+Math.cos(a)*(r+22),cy+Math.sin(a)*(r+22)); ctx.stroke(); }

      // Info
      const ix=258,iy=112;
      ctx.fillStyle="#f1f5f9"; ctx.font="bold 30px Georgia,serif";
      const nm=fd.name.toUpperCase()||"YOUR NAME"; ctx.fillText(nm,ix,iy+42);
      const nw=ctx.measureText(nm).width; const nl=ctx.createLinearGradient(ix,0,ix+nw,0); nl.addColorStop(0,t.accent); nl.addColorStop(1,"transparent"); ctx.fillStyle=nl; ctx.fillRect(ix,iy+50,nw,2);

      rr(ctx,ix,iy+64,215,42,21); const pg=ctx.createLinearGradient(ix,0,ix+215,0); pg.addColorStop(0,t.color); pg.addColorStop(1,t.accent);
      ctx.save(); ctx.shadowColor=t.accent; ctx.shadowBlur=12; ctx.fillStyle=pg; ctx.fill(); ctx.restore();
      ctx.fillStyle="#fff"; ctx.font="bold 15px Georgia,serif"; ctx.fillText(`${t.emoji}  ${fd.house.toUpperCase()}`,ix+18,iy+91);

      ctx.fillStyle="#6b7280"; ctx.font="14px Georgia,serif";
      ctx.fillText(`${fd.mode==="Facebook Live"?"🎥":"📍"}  ${fd.mode}`,ix,iy+148);

      // Footer
      ctx.fillStyle=sep; ctx.fillRect(28,H-62,W-56,1);
      ctx.fillStyle="#334155"; ctx.font="11px monospace";
      ctx.fillText("GUEST PASS  •  2026",32,H-36);
      ctx.textAlign="right"; ctx.fillText("SEAT OF WISDOM  •  EDUCATION: THE BEST LEGACY",W-32,H-36); ctx.textAlign="left";
      ctx.fillStyle=bg; ctx.fillRect(0,H-6,W,6);
    } catch(e){ console.error(e); }
  };

  useEffect(()=>{ if(img) draw(); },[fd,img]);

  const dl=()=>{ const c=cRef.current; if(!c) return; const a=document.createElement("a"); a.download=`GuestPass-${fd.name||"guest"}.png`; a.href=c.toDataURL("image/png"); a.click(); };
  const t=houseThemes[fd.house];

  return (
    <RegLayout badge="🎟️ Guest Registration" title="Guest Registration" subtitle="Join the Seat of Wisdom Cultural Festival"
      tc={t.color} ac={t.accent} onBack={onBack} canDl={!!img&&!!fd.name} onDl={dl}
      form={<>
        <Field label="Full Guest Name"><input type="text" placeholder="e.g. Mary Johnson" style={iS} onChange={e=>setFd({...fd,name:e.target.value})} /></Field>
        <Field label="Supporting House"><HP sel={fd.house} onChange={h=>setFd({...fd,house:h})} /></Field>
        <Field label="How Will You Join Us?">
          <div style={{display:"flex",gap:"10px"}}>
            {["Physical Participation","Facebook Live"].map(m=>(
              <Btn key={m} lbl={m==="Physical Participation"?"📍 Physical":"🎥 Facebook"} active={fd.mode===m} ac={t.accent} tc={t.color} onClick={()=>setFd({...fd,mode:m})} />
            ))}
          </div>
        </Field>
        <Field label="Your Photo"><UB ac={t.accent} tc={t.color} onChange={e=>{const f=e.target.files?.[0];if(f)setImg(URL.createObjectURL(f));}} /></Field>
      </>}
      preview={img?<canvas ref={cRef} width={820} height={440} style={{width:"100%",height:"auto",display:"block"}} />:<EP/>}
    />
  );
}

/* ════════════════════ STUDENT ════════════════════ */
function StudentRegistration({ onBack }: { onBack:()=>void }) {
  const [fd, setFd] = useState({ name:"", house:"Amani House" as HouseName, cls:"", num:"" });
  const [img, setImg] = useState<string|null>(null);
  const cRef = useRef<HTMLCanvasElement|null>(null);

  const draw = async () => {
    const canvas = cRef.current; if(!canvas||!img) return;
    const ctx = canvas.getContext("2d"); if(!ctx) return;
    const W=canvas.width, H=canvas.height, t=houseThemes[fd.house];
    try {
      const [logo,user]=await Promise.all([loadImg("/logo.jpeg").catch(()=>null),loadImg(img)]);
      ctx.clearRect(0,0,W,H);

      // Light ivory BG
      ctx.fillStyle="#fafaf7"; ctx.fillRect(0,0,W,H);

      // Dot grid
      ctx.save(); ctx.globalAlpha=0.07;
      for(let x=24;x<W;x+=28) for(let y=24;y<H;y+=28){ ctx.fillStyle=t.color; ctx.beginPath(); ctx.arc(x,y,1.5,0,Math.PI*2); ctx.fill(); }
      ctx.restore();

      // Left sidebar + top bar
      const sg=ctx.createLinearGradient(0,0,0,H); sg.addColorStop(0,t.color); sg.addColorStop(1,t.accent);
      ctx.fillStyle=sg; ctx.fillRect(0,0,10,H);
      ctx.fillStyle=sg; ctx.fillRect(0,0,W,7);

      // Logo
      if(logo){ ctx.save(); ctx.beginPath(); ctx.arc(65,50,34,0,Math.PI*2); ctx.clip(); ctx.drawImage(logo,31,16,68,68); ctx.restore(); ctx.strokeStyle=t.color; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(65,50,35,0,Math.PI*2); ctx.stroke(); }

      // Header
      ctx.fillStyle=t.color; ctx.font="bold 17px Georgia,serif"; ctx.fillText("SEAT OF WISDOM GROUP OF SCHOOLS",logo?113:30,40);
      ctx.fillStyle="#6b7280"; ctx.font="italic 13px Georgia,serif"; ctx.fillText("Cultural Sports Festival 2026  —  Student Pass",logo?113:30,61);

      // Hairline
      ctx.strokeStyle=t.color+"30"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(28,86); ctx.lineTo(W-28,86); ctx.stroke();

      // Student badge
      rr(ctx,W-160,14,145,32,16); ctx.fillStyle=t.color; ctx.fill();
      ctx.fillStyle="#fff"; ctx.font="bold 12px Georgia,serif"; ctx.textAlign="center"; ctx.fillText("✦ STUDENT PASS ✦",W-87,35); ctx.textAlign="left";

      // Photo rounded square
      const px=28,py=106,ps=198;
      ctx.save(); rr(ctx,px,py,ps,ps,14); ctx.clip(); ctx.drawImage(user,px,py,ps,ps); ctx.restore();
      ctx.save(); ctx.shadowColor=t.color+"44"; ctx.shadowBlur=18; rr(ctx,px,py,ps,ps,14); ctx.strokeStyle=t.color; ctx.lineWidth=3; ctx.stroke(); ctx.restore();

      // House tag under photo
      rr(ctx,px,py+ps+10,ps,34,17); ctx.fillStyle=t.color; ctx.fill();
      ctx.fillStyle="#fff"; ctx.font="bold 13px Georgia,serif"; ctx.textAlign="center"; ctx.fillText(`${t.emoji}  ${fd.house.toUpperCase()}`,px+ps/2,py+ps+32); ctx.textAlign="left";

      // Right info
      const ix=252,iy=106;
      ctx.fillStyle="#111827"; ctx.font="bold 30px Georgia,serif";
      const nm=fd.name.toUpperCase()||"STUDENT NAME"; ctx.fillText(nm,ix,iy+40);
      const nw=ctx.measureText(nm).width; ctx.fillStyle=t.accent; ctx.fillRect(ix,iy+48,Math.min(nw,W-ix-32),3);

      [{icon:"🎓",label:"Class / Grade",value:fd.cls||"—"},{icon:"🪪",label:"Student No.",value:fd.num?`#${fd.num}`:"—"}].forEach(({icon,label,value},i)=>{
        const ry=iy+72+i*72;
        rr(ctx,ix,ry,W-ix-30,58,12); ctx.fillStyle=t.color+"0f"; ctx.fill(); ctx.strokeStyle=t.color+"22"; ctx.lineWidth=1; ctx.stroke();
        ctx.font="20px serif"; ctx.fillStyle="#000"; ctx.fillText(icon,ix+14,ry+36);
        ctx.fillStyle="#9ca3af"; ctx.font="10px Georgia,serif"; ctx.fillText(label.toUpperCase(),ix+46,ry+21);
        ctx.fillStyle="#111827"; ctx.font="bold 17px Georgia,serif"; ctx.fillText(value,ix+46,ry+43);
      });

      // Footer
      ctx.strokeStyle=t.color+"22"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(28,H-58); ctx.lineTo(W-28,H-58); ctx.stroke();
      ctx.fillStyle="#9ca3af"; ctx.font="11px monospace"; ctx.fillText("STUDENT ID PASS  •  2026",30,H-32);
      ctx.textAlign="right"; ctx.fillText("SEAT OF WISDOM  •  EDUCATION: THE BEST LEGACY",W-30,H-32); ctx.textAlign="left";
      ctx.fillStyle=sg; ctx.fillRect(0,H-7,W,7);
    } catch(e){ console.error(e); }
  };

  useEffect(()=>{ if(img) draw(); },[fd,img]);

  const dl=()=>{ const c=cRef.current; if(!c) return; const a=document.createElement("a"); a.download=`StudentPass-${fd.name||"student"}.png`; a.href=c.toDataURL("image/png"); a.click(); };
  const t=houseThemes[fd.house];

  return (
    <RegLayout badge="🎓 Student Registration" title="Student Registration" subtitle="Create your student festival pass"
      tc={t.color} ac={t.accent} onBack={onBack} canDl={!!img&&!!fd.name} onDl={dl}
      form={<>
        <Field label="Full Name"><input type="text" placeholder="e.g. Amara Osei" style={iS} onChange={e=>setFd({...fd,name:e.target.value})} /></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
          <Field label="Class / Grade"><input type="text" placeholder="e.g. JSS 2A" style={iS} onChange={e=>setFd({...fd,cls:e.target.value})} /></Field>
          <Field label="Student Number"><input type="text" placeholder="e.g. 0042" style={iS} onChange={e=>setFd({...fd,num:e.target.value})} /></Field>
        </div>
        <Field label="House"><HP sel={fd.house} onChange={h=>setFd({...fd,house:h})} /></Field>
        <Field label="Your Photo"><UB ac={t.accent} tc={t.color} onChange={e=>{const f=e.target.files?.[0];if(f)setImg(URL.createObjectURL(f));}} /></Field>
      </>}
      preview={img?<canvas ref={cRef} width={820} height={440} style={{width:"100%",height:"auto",display:"block"}} />:<EP/>}
    />
  );
}

/* ════════════════════ SHARED LAYOUT ════════════════════ */
function RegLayout({ badge,title,subtitle,tc,ac,onBack,canDl,onDl,form,preview }:{
  badge:string; title:string; subtitle:string; tc:string; ac:string; onBack:()=>void;
  canDl:boolean; onDl:()=>void; form:React.ReactNode; preview:React.ReactNode;
}) {
  return (
    <main style={{ minHeight:"100vh", backgroundColor:"#0a0f1e", padding:"clamp(16px,4vw,48px)", display:"flex", flexDirection:"column", alignItems:"center", fontFamily:"'Georgia',serif" }}>
      <div style={{ width:"100%", maxWidth:"1080px", marginBottom:"20px" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", padding:"8px 18px", borderRadius:"100px", cursor:"pointer", fontSize:"13px", fontFamily:"Georgia,serif", display:"inline-flex", alignItems:"center", gap:"8px" }}>← Back to Home</button>
      </div>
      <div style={{ textAlign:"center", marginBottom:"clamp(16px,3vw,30px)" }}>
        <div style={{ display:"inline-block", padding:"5px 16px", borderRadius:"100px", backgroundColor:tc+"22", border:`1px solid ${ac}44`, color:ac, fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"12px" }}>{badge}</div>
        <h1 style={{ fontSize:"clamp(22px,4vw,36px)", fontWeight:"bold", color:"#f1f5f9", margin:"0 0 6px" }}>{title}</h1>
        <p style={{ color:"#64748b", margin:0, fontSize:"14px" }}>{subtitle}</p>
      </div>
      <div style={{ maxWidth:"1080px", width:"100%", display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap:"clamp(16px,3vw,32px)", backgroundColor:"#111827", padding:"clamp(20px,4vw,40px)", borderRadius:"24px", border:"1px solid #1f2937", boxShadow:`0 32px 64px -16px rgba(0,0,0,0.6), 0 0 80px -30px ${ac}44` }}>
        <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>{form}</div>
        <div style={{ backgroundColor:"#0a0f1e", padding:"clamp(14px,3vw,24px)", borderRadius:"18px", display:"flex", flexDirection:"column", alignItems:"center", border:"1px solid #1f2937" }}>
          <p style={{ fontSize:"10px", letterSpacing:"4px", color:"#374151", margin:"0 0 14px", textTransform:"uppercase" }}>Pass Preview</p>
          <div style={{ width:"100%", borderRadius:"12px", overflow:"hidden", boxShadow:`0 8px 32px -8px ${ac}44`, border:`1px solid ${ac}22` }}>{preview}</div>
          <button disabled={!canDl} onClick={onDl} style={{ marginTop:"18px", width:"100%", padding:"15px", background:canDl?`linear-gradient(135deg,${tc},${ac})`:"#1f2937", color:canDl?"#fff":"#374151", fontSize:"14px", fontWeight:"bold", fontFamily:"Georgia,serif", letterSpacing:"2px", borderRadius:"12px", border:"none", cursor:canDl?"pointer":"not-allowed", textTransform:"uppercase", transition:"all 0.3s" }}>↓ Download Pass</button>
        </div>
      </div>
      <p style={{ marginTop:"28px", color:"#1e293b", fontSize:"11px", letterSpacing:"4px", textTransform:"uppercase" }}>✦ Education: The Best Legacy ✦</p>
    </main>
  );
}

/* ════════════════════ MICRO COMPONENTS ════════════════════ */
function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}><label style={{ fontSize:"10px", fontWeight:"bold", letterSpacing:"2px", color:"#6b7280", textTransform:"uppercase" }}>{label}</label>{children}</div>;
}
function HP({ sel, onChange }: { sel:HouseName; onChange:(h:HouseName)=>void }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
      {(Object.keys(houseThemes) as HouseName[]).map(h => {
        const t=houseThemes[h], a=sel===h;
        return <button key={h} onClick={()=>onChange(h)} style={{ padding:"10px 8px", borderRadius:"10px", border:`2px solid ${a?t.accent:"#1f2937"}`, backgroundColor:a?t.color+"22":"#0a0f1e", color:a?t.accent:"#4b5563", fontWeight:a?"bold":"normal", fontSize:"12px", cursor:"pointer", transition:"all 0.2s", fontFamily:"Georgia,serif" }}>{t.emoji} {h}</button>;
      })}
    </div>
  );
}
function Btn({ lbl, active, ac, tc, onClick }: { lbl:string; active:boolean; ac:string; tc:string; onClick:()=>void }) {
  return <button onClick={onClick} style={{ flex:1, padding:"11px 8px", borderRadius:"10px", border:`2px solid ${active?ac:"#1f2937"}`, backgroundColor:active?tc+"22":"#0a0f1e", color:active?ac:"#4b5563", fontWeight:active?"bold":"normal", fontSize:"12px", cursor:"pointer", transition:"all 0.2s", fontFamily:"Georgia,serif" }}>{lbl}</button>;
}
function UB({ ac, tc, onChange }: { ac:string; tc:string; onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void }) {
  return <label style={{ display:"flex", alignItems:"center", gap:"12px", padding:"13px 16px", borderRadius:"12px", border:`2px dashed ${ac}55`, backgroundColor:tc+"11", cursor:"pointer", color:ac, fontSize:"13px", fontFamily:"Georgia,serif" }}><span style={{fontSize:"20px"}}>📸</span><span>Choose a photo…</span><input type="file" accept="image/*" onChange={onChange} style={{display:"none"}} /></label>;
}
function EP() {
  return <div style={{ padding:"clamp(40px,8vw,70px) 20px", textAlign:"center", color:"#374151", background:"linear-gradient(135deg,#111827,#0a0f1e)" }}><div style={{fontSize:"40px",marginBottom:"12px"}}>🎭</div><p style={{margin:0,fontSize:"13px",fontFamily:"Georgia,serif"}}>Fill in your details & upload a photo to preview your pass</p></div>;
}
const iS: React.CSSProperties = { padding:"12px 14px", borderRadius:"10px", border:"2px solid #1f2937", color:"#f1f5f9", backgroundColor:"#0a0f1e", fontSize:"14px", fontFamily:"Georgia,serif", outline:"none", width:"100%", boxSizing:"border-box" };

/* ════════════════════ ROOT ════════════════════ */
export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  if (screen==="guest")   return <GuestRegistration   onBack={()=>setScreen("landing")} />;
  if (screen==="student") return <StudentRegistration onBack={()=>setScreen("landing")} />;
  return <LandingPage onSelect={setScreen} />;
}