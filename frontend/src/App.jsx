import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Change this to your Render backend URL in production
const API_BASE = "https://ai-data-copilot-11fd.onrender.com/api/v1";

const WS_BASE = API_BASE
  .replace("https://", "wss://")
  .replace("http://", "ws://")
  .replace("/api/v1", "");

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');
  :root {
    --bg:#050811;--bg2:#0a0f1e;--bg3:#0f1628;
    --surface:#111827;--surface2:#1a2235;
    --border:#1e2d45;--border2:#243550;
    --accent:#3b82f6;--accent2:#6366f1;--accent3:#22d3ee;
    --green:#10b981;--yellow:#f59e0b;--red:#ef4444;
    --text:#f1f5f9;--text2:#94a3b8;--text3:#475569;
    --glow:0 0 20px rgba(59,130,246,.3);
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:'Syne',sans-serif;overflow:hidden}
  .app{display:flex;height:100vh;width:100vw;overflow:hidden}
  /* SIDEBAR */
  .sidebar{width:220px;min-width:220px;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:20px 0;z-index:10}
  .sb-logo{padding:0 20px 24px;border-bottom:1px solid var(--border);margin-bottom:16px}
  .sb-logo .lt{font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;background:linear-gradient(135deg,var(--accent3),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .sb-logo .ls{font-size:10px;color:var(--text3);font-family:'Space Mono',monospace;margin-top:2px}
  .nav-item{display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text2);transition:all .2s;border-left:2px solid transparent}
  .nav-item:hover{color:var(--text);background:rgba(59,130,246,.05)}
  .nav-item.active{color:var(--accent3);border-left-color:var(--accent3);background:rgba(34,211,238,.06)}
  .nav-item.locked{opacity:.4;cursor:not-allowed}
  .nav-icon{font-size:15px}
  .nav-badge{margin-left:auto;background:var(--accent);color:white;font-size:9px;padding:1px 6px;border-radius:10px;font-family:'Space Mono',monospace}
  .sb-footer{margin-top:auto;padding:0 20px;font-size:10px;color:var(--text3);font-family:'Space Mono',monospace;line-height:1.6}
  /* MAIN */
  .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
  .topbar{height:56px;min-height:56px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px}
  .topbar-title{font-size:14px;font-weight:700;color:var(--text2);letter-spacing:.05em;text-transform:uppercase}
  .topbar-right{display:flex;align-items:center;gap:12px}
  .status-dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:blink 2s infinite}
  .status-dot.red{background:var(--red);box-shadow:0 0 8px var(--red)}
  .status-label{font-size:11px;color:var(--text3);font-family:'Space Mono',monospace}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
  .content{flex:1;overflow-y:auto;padding:28px}
  .content::-webkit-scrollbar{width:4px}
  .content::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
  /* UPLOAD */
  .upload-hero{text-align:center;padding:40px 0 32px}
  .upload-hero h1{font-size:40px;font-weight:800;line-height:1.1;background:linear-gradient(135deg,#f1f5f9 0%,var(--accent3) 50%,var(--accent) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
  .upload-hero p{font-size:14px;color:var(--text2);max-width:480px;margin:0 auto;line-height:1.6}
  .dropzone{border:2px dashed var(--border2);border-radius:16px;padding:52px;text-align:center;cursor:pointer;background:var(--bg3);transition:all .3s;position:relative;overflow:hidden;max-width:600px;margin:0 auto 24px}
  .dropzone:hover,.dropzone.drag-over{border-color:var(--accent);background:rgba(59,130,246,.05);box-shadow:var(--glow)}
  .dropzone-icon{font-size:48px;margin-bottom:16px}
  .dropzone h3{font-size:18px;font-weight:700;margin-bottom:8px}
  .dropzone p{font-size:13px;color:var(--text2)}
  .dropzone input{position:absolute;inset:0;opacity:0;cursor:pointer}
  .or-divider{display:flex;align-items:center;gap:16px;max-width:600px;margin:0 auto 20px}
  .or-divider::before,.or-divider::after{content:'';flex:1;height:1px;background:var(--border)}
  .or-divider span{font-size:11px;color:var(--text3);font-family:'Space Mono',monospace}
  .demo-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;max-width:600px;margin:0 auto;padding:14px;border:1px solid var(--border2);border-radius:12px;background:var(--surface);cursor:pointer;color:var(--text2);font-size:13px;font-weight:600;font-family:'Syne',sans-serif;transition:all .2s}
  .demo-btn:hover{border-color:var(--accent2);color:var(--text);background:rgba(99,102,241,.08)}
  .feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:700px;margin:32px auto 0}
  .feature-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px 16px}
  .feature-card .icon{font-size:24px;margin-bottom:10px}
  .feature-card h4{font-size:13px;font-weight:700;margin-bottom:6px}
  .feature-card p{font-size:12px;color:var(--text2);line-height:1.5}
  .file-preview{max-width:600px;margin:0 auto 20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between}
  .file-info{display:flex;align-items:center;gap:12px}
  .file-icon{font-size:24px}
  .file-name{font-size:13px;font-weight:700}
  .file-size{font-size:11px;color:var(--text2);font-family:'Space Mono',monospace}
  /* AGENTS */
  .agents-panel{background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:24px}
  .ap-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
  .ap-header h3{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text2)}
  .ap-progress{height:3px;background:var(--border);border-radius:2px;overflow:hidden;width:120px}
  .ap-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent3));transition:width .5s}
  .agents-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
  .agent-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 8px;text-align:center;transition:all .3s}
  .agent-card.running{border-color:var(--accent);box-shadow:0 0 16px rgba(59,130,246,.25)}
  .agent-card.complete{border-color:var(--green)}
  .agent-card.failed{border-color:var(--red)}
  .agent-icon{font-size:20px;margin-bottom:6px}
  .agent-name{font-size:10px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;line-height:1.3}
  .agent-status{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-family:'Space Mono',monospace;margin-top:6px;padding:2px 6px;border-radius:6px}
  .agent-status.pending{color:var(--text3);background:rgba(71,85,105,.2)}
  .agent-status.running{color:var(--accent);background:rgba(59,130,246,.15)}
  .agent-status.complete{color:var(--green);background:rgba(16,185,129,.15)}
  .agent-status.failed{color:var(--red);background:rgba(239,68,68,.15)}
  .agent-status-dot{width:5px;height:5px;border-radius:50%;background:currentColor}
  .agent-status.running .agent-status-dot{animation:blink 1s infinite}
  .agent-msg{font-size:9px;color:var(--text3);margin-top:4px;line-height:1.3;font-family:'Space Mono',monospace;min-height:12px}
  /* STATS */
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
  .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px}
  .stat-label{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
  .stat-value{font-size:32px;font-weight:800;line-height:1}
  .stat-sub{font-size:11px;color:var(--text2);margin-top:6px}
  .blue{color:var(--accent)}.cyan{color:var(--accent3)}.green{color:var(--green)}.yellow{color:var(--yellow)}
  /* CHARTS */
  .charts-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .chart-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;overflow:hidden}
  .chart-card h4{font-size:13px;font-weight:700;margin-bottom:4px}
  .chart-desc{font-size:11px;color:var(--text2);margin-bottom:16px}
  .chart-svg{width:100%;overflow:visible}
  /* INSIGHTS */
  .insights-section{margin-bottom:24px}
  .section-header{display:flex;align-items:center;gap:10px;margin-bottom:16px}
  .section-header h3{font-size:14px;font-weight:700}
  .section-tag{font-size:10px;background:rgba(59,130,246,.15);color:var(--accent);padding:2px 8px;border-radius:8px;font-family:'Space Mono',monospace}
  .insight-list{display:flex;flex-direction:column;gap:10px}
  .insight-item{background:var(--bg3);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:0 10px 10px 0;padding:14px 16px}
  .insight-item .il{font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
  .insight-item .it{font-size:13px;line-height:1.5}
  .insight-item .ie{font-size:11px;color:var(--text2);margin-top:6px;font-family:'Space Mono',monospace}
  .insight-item .ia{font-size:11px;color:var(--accent3);margin-top:4px}
  /* TABLE */
  .dt-wrap{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:24px}
  .dt-head{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .dt-head h4{font-size:13px;font-weight:700}
  table{width:100%;border-collapse:collapse}
  th{padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);background:var(--bg3);text-align:left;border-bottom:1px solid var(--border)}
  td{padding:10px 16px;font-size:12px;font-family:'Space Mono',monospace;color:var(--text2);border-bottom:1px solid var(--border)}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:rgba(59,130,246,.04);color:var(--text)}
  /* CHAT */
  .chat-page{display:flex;flex-direction:column;height:100%}
  .chat-messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
  .chat-messages::-webkit-scrollbar{width:3px}
  .chat-messages::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
  .bubble{max-width:76%;padding:14px 16px;border-radius:14px;font-size:13px;line-height:1.6}
  .bubble.user{align-self:flex-end;background:var(--accent);border-bottom-right-radius:4px;color:white;font-weight:600}
  .bubble.ai{align-self:flex-start;background:var(--surface2);border:1px solid var(--border);border-bottom-left-radius:4px}
  .bubble.ai .ai-lbl{font-size:10px;font-weight:700;color:var(--accent3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;font-family:'Space Mono',monospace}
  .evidence{font-size:11px;color:var(--text3);margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-family:'Space Mono',monospace}
  .typing{display:flex;gap:4px;align-items:center;padding:4px 0}
  .typing span{width:6px;height:6px;border-radius:50%;background:var(--text3);animation:typing 1.2s infinite}
  .typing span:nth-child(2){animation-delay:.2s}
  .typing span:nth-child(3){animation-delay:.4s}
  @keyframes typing{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
  .chips{display:flex;flex-wrap:wrap;gap:8px;padding:12px 20px;border-top:1px solid var(--border)}
  .chip{font-size:11px;padding:6px 12px;border-radius:20px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);cursor:pointer;transition:all .2s;font-family:'Syne',sans-serif}
  .chip:hover{border-color:var(--accent);color:var(--accent3);background:rgba(59,130,246,.08)}
  .chat-input-area{padding:16px 20px;border-top:1px solid var(--border);display:flex;gap:10px;background:var(--bg2)}
  .chat-input{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 16px;color:var(--text);font-size:13px;font-family:'Syne',sans-serif;outline:none;transition:border-color .2s}
  .chat-input:focus{border-color:var(--accent)}
  .chat-input::placeholder{color:var(--text3)}
  .send-btn{background:var(--accent);border:none;border-radius:10px;width:44px;height:44px;cursor:pointer;font-size:16px;transition:all .2s;display:flex;align-items:center;justify-content:center;color:white;font-weight:700}
  .send-btn:hover{background:var(--accent2);transform:scale(1.05)}
  .send-btn:disabled{background:var(--border);cursor:not-allowed;transform:none}
  /* REPORT */
  .rpt-header{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px;margin-bottom:20px}
  .rpt-header h2{font-size:22px;font-weight:800;margin-bottom:8px}
  .rpt-meta{display:flex;gap:20px}
  .rpt-meta span{font-size:11px;color:var(--text3);font-family:'Space Mono',monospace}
  .rpt-section{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:16px}
  .rpt-section h3{font-size:14px;font-weight:700;color:var(--accent3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;font-family:'Space Mono',monospace}
  .rpt-section p{font-size:13px;line-height:1.7;color:var(--text2)}
  .finding{padding:12px 0;border-bottom:1px solid var(--border);font-size:13px;line-height:1.6}
  .finding:last-child{border-bottom:none}
  .fnum{font-size:11px;font-weight:700;color:var(--accent);font-family:'Space Mono',monospace;margin-right:8px}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}
  .mc{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
  .mc .ml{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
  .mc .mv{font-size:20px;font-weight:800}
  .mc .ms{font-size:10px;color:var(--text2);margin-top:2px}
  /* BUTTONS */
  .btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;border:none;border-radius:10px;padding:12px 24px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Syne',sans-serif;transition:all .2s;box-shadow:var(--glow)}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,130,246,.4)}
  .dl-btn{display:flex;align-items:center;gap:8px;background:var(--green);color:white;border:none;border-radius:10px;padding:12px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Syne',sans-serif;transition:all .2s}
  .dl-btn:hover{background:#059669;transform:translateY(-1px);box-shadow:0 4px 16px rgba(16,185,129,.3)}
  .action-btn{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border2);border-radius:10px;padding:10px 16px;cursor:pointer;font-size:12px;font-weight:600;color:var(--text2);transition:all .2s;font-family:'Syne',sans-serif}
  .action-btn:hover{border-color:var(--accent);color:var(--accent3);background:rgba(59,130,246,.06)}
  .quick-actions{display:flex;gap:10px;margin-bottom:24px}
  .badge{font-size:10px;padding:2px 8px;border-radius:6px;font-family:'Space Mono',monospace}
  .badge-green{background:rgba(16,185,129,.15);color:var(--green)}
  .badge-blue{background:rgba(59,130,246,.15);color:var(--accent)}
  /* ERROR/LOADING */
  .error-banner{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:12px 16px;font-size:12px;color:var(--red);margin-bottom:16px;font-family:'Space Mono',monospace}
  .spinner{width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite;display:inline-block}
  .spinner.lg{width:40px;height:40px;border-width:3px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .center-loading{display:flex;align-items:center;justify-content:center;gap:12px;padding:60px 0;font-size:13px;color:var(--text2);font-family:'Space Mono',monospace}
  .upload-error{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:12px;padding:20px;text-align:center;max-width:600px;margin:0 auto 16px;font-size:13px;color:var(--red)}
  .upload-error .err-title{font-weight:700;font-size:14px;margin-bottom:6px}
`;

// ─── AGENTS ───────────────────────────────────────────────────────────────────
const AGENTS = [
  { id: "cleaner", name: "Data\nCleaner", icon: "🧹" },
  { id: "insight", name: "Insight\nEngine", icon: "🔍" },
  { id: "viz",     name: "Viz\nArchitect", icon: "📊" },
  { id: "report",  name: "Report\nWriter", icon: "📝" },
  { id: "chat",    name: "Chat\nAgent", icon: "💬" },
  { id: "validator",name: "Validator", icon: "✅" },
];

const INIT_STATUSES = () => Object.fromEntries(AGENTS.map(a => [a.id, "pending"]));
const INIT_MSGS = () => Object.fromEntries(AGENTS.map(a => [a.id, ""]));

const SUGGESTIONS = [
  "Which region performs best?",
  "What's the overall revenue trend?",
  "Are there any anomalies in the data?",
  "What's the strongest correlation?",
  "Which category has the highest value?",
  "Summarize the key findings",
];

// ─── INLINE SVG CHARTS ────────────────────────────────────────────────────────
function BarChart({ data, xKey, yKey, color = "#3b82f6" }) {
  if (!data?.length) return <div style={{color:"var(--text3)",fontSize:12,padding:"20px 0"}}>No data</div>;
  const vals = data.map(d => Number(d[yKey]) || 0);
  const max = Math.max(...vals) || 1;
  const W = 320, H = 110, barW = Math.max(8, Math.min(40, (W - 30) / data.length - 4));
  const step = (W - 20) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="chart-svg">
      {data.slice(0, 12).map((d, i) => {
        const v = Number(d[yKey]) || 0;
        const bh = (v / max) * H;
        const x = 10 + i * step + (step - barW) / 2;
        return (
          <g key={i}>
            <rect x={x} y={H - bh} width={barW} height={bh} rx={3} fill={color} opacity={0.85} />
            <text x={x + barW / 2} y={H + 13} textAnchor="middle" fontSize={8} fill="#64748b" fontFamily="Space Mono">
              {String(d[xKey] ?? "").slice(0, 8)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data, xKey, yKey, color = "#22d3ee" }) {
  if (!data?.length) return null;
  const vals = data.map(d => Number(d[yKey]) || 0);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W = 320, H = 100;
  const pts = data.map((d, i) => [
    (i / Math.max(data.length - 1, 1)) * W,
    H - ((Number(d[yKey]) - min) / range) * H,
  ]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = path + ` L${W},${H} L0,${H} Z`;
  const step = Math.ceil(data.length / 6);
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="chart-svg">
      <defs>
        <linearGradient id={`lg_${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#lg_${color.replace("#","")})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.filter((_, i) => i % step === 0).map((d, i) => {
        const [x] = pts[i * step] || [0, 0];
        return <text key={i} x={x} y={H + 14} textAnchor="middle" fontSize={8} fill="#64748b" fontFamily="Space Mono">{String(d[xKey] ?? "").slice(0, 7)}</text>;
      })}
    </svg>
  );
}

function ScatterPlot({ data, xKey = "x", yKey = "y", color = "#6366f1" }) {
  if (!data?.length) return null;
  const xs = data.map(d => Number(d[xKey]) || 0);
  const ys = data.map(d => Number(d[yKey]) || 0);
  const xmax = Math.max(...xs) || 1, ymax = Math.max(...ys) || 1;
  const W = 300, H = 110;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
      {data.slice(0, 200).map((d, i) => (
        <circle key={i}
          cx={(Number(d[xKey]) / xmax) * (W - 20) + 10}
          cy={H - (Number(d[yKey]) / ymax) * (H - 10) - 5}
          r={3.5} fill={color} opacity={0.7}
        />
      ))}
    </svg>
  );
}

function PieChart({ data, xKey = "name", yKey = "value" }) {
  if (!data?.length) return null;
  const COLORS = ["#3b82f6", "#22d3ee", "#6366f1", "#10b981", "#f59e0b", "#ef4444"];
  const total = data.reduce((s, d) => s + (Number(d[yKey]) || 0), 0) || 1;
  let angle = -90;
  const r = 44, cx = 58, cy = 58;
  const slices = data.slice(0, 6).map((d, i) => {
    const sweep = ((Number(d[yKey]) || 0) / total) * 360;
    const s = angle; angle += sweep;
    return { ...d, start: s, sweep, color: COLORS[i % COLORS.length] };
  });
  const arc = (cx, cy, r, start, sweep) => {
    const s = (start * Math.PI) / 180, e = ((start + sweep) * Math.PI) / 180;
    const large = sweep > 180 ? 1 : 0;
    return `M${cx + r * Math.cos(s)},${cy + r * Math.sin(s)} A${r},${r},0,${large},1,${cx + r * Math.cos(e)},${cy + r * Math.sin(e)}`;
  };
  return (
    <svg viewBox="0 0 220 120" className="chart-svg">
      {slices.map((s, i) => <path key={i} d={arc(cx, cy, r, s.start, s.sweep - 0.5)} fill="none" stroke={s.color} strokeWidth={13} />)}
      <circle cx={cx} cy={cy} r={28} fill="#111827" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={10} fill="#f1f5f9" fontFamily="Syne" fontWeight="800">Mix</text>
      {slices.map((s, i) => (
        <g key={i} transform={`translate(122,${16 + i * 18})`}>
          <rect width={7} height={7} rx={2} fill={s.color} />
          <text x={11} y={7} fontSize={9} fill="#94a3b8" fontFamily="Space Mono">{String(s[xKey] ?? "").slice(0, 12)}</text>
        </g>
      ))}
    </svg>
  );
}

function ChartRenderer({ type, data, xKey, yKey, color }) {
  switch (type) {
    case "line": return <LineChart data={data} xKey={xKey} yKey={yKey} color={color} />;
    case "bar": return <BarChart data={data} xKey={xKey} yKey={yKey} color={color} />;
    case "scatter": return <ScatterPlot data={data} xKey={xKey} yKey={yKey} color={color} />;
    case "pie": return <PieChart data={data} xKey={xKey} yKey={yKey} />;
    case "histogram": return <BarChart data={data} xKey={xKey} yKey={yKey} color={color} />;
    default: return <BarChart data={data} xKey={xKey} yKey={yKey} color={color} />;
  }
}

// ─── AGENT SWARM PANEL ────────────────────────────────────────────────────────
function AgentSwarmPanel({ statuses, messages }) {
  const done = Object.values(statuses).filter(s => s === "complete").length;
  return (
    <div className="agents-panel">
      <div className="ap-header">
        <h3>🤖 Agent Swarm</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "Space Mono" }}>{done}/6 complete</span>
          <div className="ap-progress"><div className="ap-fill" style={{ width: `${(done / 6) * 100}%` }} /></div>
        </div>
      </div>
      <div className="agents-grid">
        {AGENTS.map(a => (
          <div key={a.id} className={`agent-card ${statuses[a.id]}`}>
            <div className="agent-icon">{a.icon}</div>
            <div className="agent-name" style={{ whiteSpace: "pre-line" }}>{a.name}</div>
            <div className={`agent-status ${statuses[a.id]}`}>
              <div className="agent-status-dot" />
              {statuses[a.id]}
            </div>
            <div className="agent-msg">{messages[a.id] || ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── UPLOAD PAGE ──────────────────────────────────────────────────────────────
function UploadPage({ onAnalyze }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setError("");
    setPreview(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setPreview(data);
    } catch (e) {
      setError(e.message || "Upload failed. Is the backend running?");
      setFile(null);
    }
    setUploading(false);
  }, []);

  const handleDemoData = async () => {
    // Create a demo CSV blob and upload it
    const csv = `date,region,product,sales,quantity,profit,marketing_spend
2024-01-15,North,Product A,18400,124,5520,2100
2024-01-16,South,Product B,9200,63,2300,1050
2024-01-17,East,Product A,14600,98,4380,1800
2024-01-18,West,Product C,12100,81,3630,1500
2024-01-19,North,Product D,21300,143,6390,2400
2024-02-01,North,Product A,22100,149,6630,2600
2024-02-05,South,Product B,8900,61,2225,980
2024-02-10,East,Product C,15800,106,4740,1900
2024-02-15,West,Product A,13400,90,4020,1600
2024-02-20,North,Product B,19200,129,5760,2200
2024-03-01,South,Product D,99999,1,0,500
2024-03-05,North,Product C,24500,165,7350,2800
2024-03-10,East,Product A,16700,112,5010,2000
2024-03-15,West,Product B,11300,76,3390,1350
2024-03-20,South,Product A,9800,66,2940,1100
2024-04-01,North,Product A,26000,175,7800,3000
2024-04-08,South,Product C,10200,68,3060,1150
2024-04-15,East,Product B,17400,117,5220,2100
2024-04-22,West,Product D,14100,95,4230,1700
2024-05-01,North,Product B,28000,188,8400,3200
2024-05-10,South,Product A,,71,3150,1200
2024-05-18,East,Product D,18900,127,5670,2250
2024-06-01,North,Product C,31000,208,9300,3500
2024-06-15,South,Product B,11100,75,3330,1260
2024-07-01,North,Product A,33500,225,10050,3800
2024-07-20,East,Product C,20100,135,6030,2400
2024-08-01,North,Product D,35000,235,10500,4000
2024-09-01,North,Product A,37500,252,11250,4250
2024-10-01,North,Product B,39000,262,11700,4400
2024-11-01,North,Product A,44000,296,13200,5000
2024-12-01,North,Product C,52000,350,15600,5800
2024-12-15,North,Product A,48000,323,14400,5400`;
    const blob = new Blob([csv], { type: "text/csv" });
    const demoFile = new File([blob], "sales_by_region_2024.csv", { type: "text/csv" });
    await handleFile(demoFile);
  };

  return (
    <div className="content">
      <div className="upload-hero">
        <h1>Transform Data<br />Into Insight</h1>
        <p>Upload any CSV and watch 6 AI agents automatically clean, analyze, visualize, and report your data — powered by real Pandas + Groq LLM.</p>
      </div>

      {error && (
        <div className="upload-error">
          <div className="err-title">⚠️ Upload Error</div>
          {error}
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text3)" }}>
            Make sure FastAPI is running: <code>uvicorn main:app --reload --port 8000</code>
          </div>
        </div>
      )}

      {!preview ? (
        <div
          className={`dropzone ${dragging ? "drag-over" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        >
          {uploading ? (
            <><div className="spinner lg" style={{ margin: "0 auto 16px" }} /><p>Uploading & parsing…</p></>
          ) : (
            <><div className="dropzone-icon">📂</div><h3>Drop your CSV or Excel file</h3><p>CSV, XLSX, JSON supported · Max 10MB</p></>
          )}
          {!uploading && <input type="file" accept=".csv,.xlsx,.json" onChange={e => handleFile(e.target.files[0])} />}
        </div>
      ) : (
        <div className="file-preview">
          <div className="file-info">
            <div className="file-icon">📊</div>
            <div>
              <div className="file-name">{preview.filename}</div>
              <div className="file-size">{preview.rows.toLocaleString()} rows · {preview.columns} columns · Ready</div>
            </div>
          </div>
          <button className="btn-primary" onClick={() => onAnalyze(preview.session_id)}>
            Analyze with 6 AI Agents →
          </button>
        </div>
      )}

      {!preview && (
        <>
          <div className="or-divider"><span>OR</span></div>
          <button className="demo-btn" onClick={handleDemoData} disabled={uploading}>
            <span>⚡</span>
            <span>{uploading ? "Loading…" : "Try with demo dataset — sales_by_region_2024.csv"}</span>
          </button>
        </>
      )}

      <div className="feature-grid">
        {[
          { icon: "🧹", title: "Real Pandas Cleaning", desc: "Actual missing-value imputation, duplicate removal, type inference via Pandas." },
          { icon: "🔍", title: "Groq LLM Insights", desc: "Llama 3.3 70B generates narrative insights grounded in your actual data stats." },
          { icon: "🔄", title: "WebSocket Streaming", desc: "Agent progress broadcasts in real-time so you watch every step live." },
        ].map(f => (
          <div key={f.title} className="feature-card">
            <div className="icon">{f.icon}</div>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({ sessionId, agentStatuses, agentMessages, done, onNavigate }) {
  const [insights, setInsights] = useState(null);
  const [charts, setCharts] = useState([]);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    if (!done || !sessionId) return;
    // Fetch real data from backend
    const fetchData = async () => {
      try {
        const [iRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/insights/${sessionId}`),
          fetch(`${API_BASE}/charts/${sessionId}`),
        ]);
        if (iRes.ok) setInsights(await iRes.json());
        if (cRes.ok) { const d = await cRes.json(); setCharts(d.charts || []); }
      } catch (e) {
        setLoadErr("Could not load results from backend.");
      }
    };
    fetchData();
  }, [done, sessionId]);

  return (
    <div className="content">
      <AgentSwarmPanel statuses={agentStatuses} messages={agentMessages} />

      {loadErr && <div className="error-banner">⚠️ {loadErr}</div>}

      {done && (
        <div className="quick-actions">
          <button className="action-btn" onClick={() => onNavigate("chat")}>💬 Chat with Data</button>
          <button className="action-btn" onClick={() => onNavigate("report")}>📄 View Report</button>
          <a href={`${API_BASE}/download/csv/${sessionId}`} download>
            <button className="action-btn">⬇️ Export Cleaned CSV</button>
          </a>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Rows</div>
          <div className="stat-value blue">{insights?.cleaned_shape?.[0]?.toLocaleString() || "—"}</div>
          <div className="stat-sub">Original: {insights?.original_shape?.[0]?.toLocaleString() || "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Data Quality</div>
          <div className="stat-value cyan">{insights?.data_quality_score != null ? `${insights.data_quality_score}%` : "—"}</div>
          <div className="stat-sub">{insights?.cleaning_steps?.length || 0} cleaning steps applied</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Insights Found</div>
          <div className="stat-value green">{insights?.narrative?.length ?? "—"}</div>
          <div className="stat-sub">{insights?.anomalies?.length || 0} anomalies flagged</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Correlations</div>
          <div className="stat-value yellow">{insights?.correlations ? Object.keys(insights.correlations).length : "—"}</div>
          <div className="stat-sub">{insights?.trends?.length || 0} trends detected</div>
        </div>
      </div>

      {!done && (
        <div className="center-loading">
          <div className="spinner" />
          Agents are working — results will appear when complete…
        </div>
      )}

      {charts.length > 0 && (
        <div className="charts-row">
          {charts.slice(0, 2).map(c => (
            <div key={c.id} className="chart-card">
              <h4>{c.title}</h4>
              <div className="chart-desc">{c.description}</div>
              <ChartRenderer type={c.type} data={c.data} xKey={c.x_key} yKey={c.y_key} color={c.color} />
            </div>
          ))}
        </div>
      )}

      {charts.length > 2 && (
        <div className="charts-row">
          {charts.slice(2, 4).map(c => (
            <div key={c.id} className="chart-card">
              <h4>{c.title}</h4>
              <div className="chart-desc">{c.description}</div>
              <ChartRenderer type={c.type} data={c.data} xKey={c.x_key} yKey={c.y_key} color={c.color} />
            </div>
          ))}
        </div>
      )}

      {insights?.narrative?.length > 0 && (
        <div className="insights-section">
          <div className="section-header">
            <h3>AI Insights</h3>
            <span className="section-tag">Groq · Llama 3.3 70B · Real Data</span>
          </div>
          <div className="insight-list">
            {insights.narrative.map((ins, i) => (
              <div key={i} className="insight-item">
                <div className="il">{ins.label || "Insight"}</div>
                <div className="it">{ins.text}</div>
                {ins.evidence && <div className="ie">📍 {ins.evidence}</div>}
                {ins.action && <div className="ia">{ins.action}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {insights?.cleaning_steps?.length > 0 && (
        <div className="dt-wrap">
          <div className="dt-head">
            <h4>Cleaning Steps Applied</h4>
            <span className="badge badge-green">✓ {insights.cleaning_steps.length} steps</span>
          </div>
          <table>
            <thead><tr><th>Action</th><th>Detail</th><th>Rows Affected</th></tr></thead>
            <tbody>
              {insights.cleaning_steps.map((s, i) => (
                <tr key={i}>
                  <td>{s.action}</td>
                  <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.detail}</td>
                  <td>{s.rows_affected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── CHAT PAGE ────────────────────────────────────────────────────────────────
function ChatPage({ sessionId }) {
  const [messages, setMessages] = useState([
    { role: "ai", content: "Hi! I've analyzed your dataset. Ask me anything about it — trends, anomalies, comparisons, or specific values." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = useCallback(async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    const newMsg = { role: "user", content: q };
    setMessages(m => [...m, newMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.role !== "ai" || messages.indexOf(m) > 0)
        .map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));

      const res = await fetch(`${API_BASE}/chat/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setMessages(m => [...m, {
        role: "ai",
        content: data.answer,
        evidence: data.evidence,
      }]);
    } catch (e) {
      setMessages(m => [...m, { role: "ai", content: `Error: ${e.message}. Make sure the backend is running.` }]);
    }
    setLoading(false);
  }, [input, loading, messages, sessionId]);

  return (
    <div className="chat-page">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === "ai" && <div className="ai-lbl">🤖 Copilot · Groq Llama 3.3</div>}
            {m.content}
            {m.evidence?.length > 0 && (
              <div className="evidence">
                {m.evidence.map((e, j) => <div key={j}>📍 {e}</div>)}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="bubble ai">
            <div className="ai-lbl">🤖 Copilot</div>
            <div className="typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chips">
        {SUGGESTIONS.map(s => (
          <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
        ))}
      </div>
      <div className="chat-input-area">
        <input className="chat-input" placeholder="Ask anything about your data…"
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()} />
        <button className="send-btn" onClick={() => send()} disabled={loading || !input.trim()}>↑</button>
      </div>
    </div>
  );
}

// ─── REPORT PAGE ──────────────────────────────────────────────────────────────
function ReportPage({ sessionId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/report/${sessionId}/json`);
        if (res.status === 202) {
          setError("Report is still generating. Please wait a moment and refresh.");
          setLoading(false); return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setReport(await res.json());
      } catch (e) {
        setError(`Could not load report: ${e.message}`);
      }
      setLoading(false);
    };
    load();
  }, [sessionId]);

  if (loading) return <div className="center-loading"><div className="spinner" />Loading report…</div>;
  if (error) return <div className="content"><div className="error-banner">⚠️ {error}</div></div>;
  if (!report) return null;

  return (
    <div className="content">
      <div className="rpt-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2>{report.filename || "Analysis Report"}</h2>
            <div className="rpt-meta">
              <span>📅 {new Date().toLocaleDateString()}</span>
              <span>🤖 Generated by Groq Llama 3.3 70B</span>
            </div>
          </div>
          <a href={`${API_BASE}/download/csv/${sessionId}`} download>
            <button className="dl-btn">⬇️ Download CSV</button>
          </a>
        </div>
      </div>

      <div className="rpt-section">
        <h3>01 · Executive Summary</h3>
        <p>{report.executive_summary}</p>
      </div>

      <div className="rpt-section">
        <h3>02 · Key Findings</h3>
        {report.findings?.map((f, i) => (
          <div key={i} className="finding"><span className="fnum">#{String(i + 1).padStart(2, "0")}</span>{f}</div>
        ))}
      </div>

      <div className="rpt-section">
        <h3>03 · Recommendations</h3>
        {report.recommendations?.map((r, i) => (
          <div key={i} className="finding"><span className="fnum">→{i + 1}</span>{r}</div>
        ))}
      </div>

      {report.sections?.map((s, i) => (
        <div key={i} className="rpt-section">
          <h3>{String(i + 4).padStart(2, "0")} · {s.title}</h3>
          <p>{s.content}</p>
        </div>
      ))}

      <div className="rpt-section">
        <h3>Data Quality</h3>
        <p>{report.data_quality}</p>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("upload");
  const [sessionId, setSessionId] = useState(null);
  const [agentStatuses, setAgentStatuses] = useState(INIT_STATUSES());
  const [agentMessages, setAgentMessages] = useState(INIT_MSGS());
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [backendOk, setBackendOk] = useState(null);
  const wsRef = useRef(null);

  // Health check
  useEffect(() => {
    fetch(`${API_BASE.replace("/api/v1", "")}/health`)
      .then(r => r.ok ? setBackendOk(true) : setBackendOk(false))
      .catch(() => setBackendOk(false));
  }, []);

  const startAnalysis = useCallback(async (sid) => {
    setSessionId(sid);
    setAgentStatuses(INIT_STATUSES());
    setAgentMessages(INIT_MSGS());
    setAllDone(false);
    setAnalysisStarted(true);
    setPage("dashboard");

    // Connect WebSocket
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`${WS_BASE}/ws/${sid}`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "agent_update") {
          setAgentStatuses(s => ({ ...s, [msg.agent]: msg.status }));
          setAgentMessages(m => ({ ...m, [msg.agent]: msg.message }));
        } else if (msg.type === "analysis_complete") {
          setAllDone(true);
        }
      } catch (_) {}
    };

    ws.onopen = () => {
      // Trigger backend analysis
      fetch(`${API_BASE}/analyze/${sid}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .catch(() => {});
    };

    ws.onerror = () => {
      // Fallback: poll status
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/status/${sid}`);
          if (res.ok) {
            const d = await res.json();
            setAgentStatuses(d.agent_statuses);
            if (Object.values(d.agent_statuses).every(s => s === "complete")) {
              setAllDone(true);
              clearInterval(poll);
            }
          }
        } catch (_) {}
      }, 1500);
    };
  }, []);

  const NAV = [
    { id: "upload",    icon: "⬆️", label: "Upload" },
    { id: "dashboard", icon: "📊", label: "Dashboard", badge: analysisStarted && !allDone ? "…" : null },
    { id: "chat",      icon: "💬", label: "Chat" },
    { id: "report",    icon: "📄", label: "Report" },
  ];

  const PAGE_TITLE = { upload: "Upload Data", dashboard: "Analysis Dashboard", chat: "Chat with Data", report: "Executive Report" };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="sidebar">
          <div className="sb-logo">
            <div className="lt">DataCopilot</div>
            <div className="ls">v2.0 · Real Backend</div>
          </div>
          {NAV.map(n => {
            const locked = n.id !== "upload" && !sessionId;
            return (
              <div key={n.id}
                className={`nav-item ${page === n.id ? "active" : ""} ${locked ? "locked" : ""}`}
                onClick={() => !locked && setPage(n.id)}
              >
                <span className="nav-icon">{n.icon}</span>
                {n.label}
                {n.badge && <span className="nav-badge">{n.badge}</span>}
              </div>
            );
          })}
          <div className="sb-footer">
            Backend<br />
            <span style={{ color: backendOk ? "var(--green)" : backendOk === false ? "var(--red)" : "var(--text3)" }}>
              {backendOk === null ? "checking…" : backendOk ? "● connected" : "● offline"}
            </span><br /><br />
            {sessionId && <><span style={{ color: "var(--accent)" }}>Session</span><br />{sessionId}</>}
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <span className="topbar-title">{PAGE_TITLE[page]}</span>
            <div className="topbar-right">
              <div className={`status-dot ${backendOk === false ? "red" : ""}`} />
              <span className="status-label">
                {backendOk === false ? "backend offline" : "FastAPI · Groq LLM"}
              </span>
            </div>
          </div>

          {page === "upload" && <UploadPage onAnalyze={startAnalysis} />}
          {page === "dashboard" && <DashboardPage sessionId={sessionId} agentStatuses={agentStatuses} agentMessages={agentMessages} done={allDone} onNavigate={setPage} />}
          {page === "chat" && <ChatPage sessionId={sessionId} />}
          {page === "report" && <ReportPage sessionId={sessionId} />}
        </div>
      </div>
    </>
  );
}
