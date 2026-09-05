import type { Agent, Blog, DatabaseUsageMetrics, Run, Stats } from "./turso_store.ts";
import type { PanelSettings } from "./settings.ts";
import type { ModelInfo } from "./openrouter.ts";
import type { CategoryInfo } from "./blog_api.ts";
import { categoryName } from "./agent.ts";

export const styles = `
:root {
  --font: system-ui, -apple-system, BlinkMacSystemFont, "Inter", "SF Pro Display", "Helvetica Neue", sans-serif;
  --font-mono: "SF Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace;
  --c-bg: #f4f5f7;
  --c-surface: #ffffff;
  --c-text: #17191d;
  --c-text-soft: #7c818a;
  --c-text-muted: #888d95;
  --c-border: rgba(0,0,0,.08);
  --c-border-light: rgba(0,0,0,.05);
  --c-accent: #007aff;
  --c-accent-hover: #0056cc;
  --c-accent-soft: rgba(0,122,255,.08);
  --c-accent-ring: rgba(0,122,255,.14);
  --c-success: #247047;
  --c-success-soft: #eaf7ef;
  --c-warning: #c99328;
  --c-warning-soft: #fdf6e7;
  --c-danger: #8b2d2d;
  --c-danger-soft: #fdf0f0;
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --radius-2xl: 28px;
  --glass: rgba(255,255,255,.68);
  --glass-strong: rgba(255,255,255,.86);
  --line: rgba(255,255,255,.78);
  --blur: blur(24px) saturate(1.3);
  --shadow-xs: 0 2px 8px rgba(15,23,42,.04),0 1px 2px rgba(15,23,42,.02),inset 0 1px 0 rgba(255,255,255,.9);
  --shadow-sm: 0 2px 8px rgba(15,23,42,.04),0 1px 2px rgba(15,23,42,.02),inset 0 1px 0 rgba(255,255,255,.9);
  --shadow: 0 18px 42px -6px rgba(15,23,42,.07),0 4px 14px rgba(15,23,42,.03),inset 0 1px 0 rgba(255,255,255,.88);
  --shadow-md: 0 18px 42px -6px rgba(15,23,42,.09),0 4px 14px rgba(15,23,42,.04),inset 0 1px 0 rgba(255,255,255,.88);
  --shadow-lg: 0 24px 50px -8px rgba(15,23,42,.11),0 6px 18px rgba(15,23,42,.04),inset 0 1px 0 #fff;
  --shadow-xl: 0 44px 120px -12px rgba(15,23,42,.38),0 18px 40px rgba(15,23,42,.12),inset 0 1px 0 #fff;
}
*,*::before,*::after{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent}
body{
  font-family:var(--font);font-size:14px;line-height:1.5;
  color:var(--c-text);background:var(--c-bg);
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  min-height:100vh;overflow-x:hidden;
  background:linear-gradient(160deg,#f4f5f7 0%,#f2f3f7 55%,#eef2f8 100%);
}
body::before,body::after{content:"";position:fixed;z-index:-1;border-radius:50%;filter:blur(80px);pointer-events:none}
body::before{width:500px;height:500px;top:-160px;left:-140px;background:radial-gradient(circle,rgba(126,138,196,.28),transparent 65%)}
body::after{width:580px;height:580px;bottom:-200px;right:-180px;background:radial-gradient(circle,rgba(116,190,235,.25),transparent 65%)}
a{color:var(--c-accent);text-decoration:none;transition:color .15s}
a:hover{color:var(--c-accent-hover)}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;border:0;background:none;padding:0}
h1{font-size:1.5rem;font-weight:500;letter-spacing:-.02em;line-height:1.15}
h2{font-size:1.1rem;font-weight:500;letter-spacing:-.01em;line-height:1.25}
h3{font-size:.95rem;font-weight:500;line-height:1.3}
button,.button{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  min-height:40px;padding:0 18px;border:1px solid transparent;
  border-radius:12px;font-size:13.5px;font-weight:500;
  text-decoration:none;cursor:pointer;white-space:nowrap;
  transition:background .15s ease,transform .16s cubic-bezier(.16,1,.3,1),box-shadow .16s ease;
}
.button,.btn-primary{
  background:#202226;color:#fff;
  box-shadow:0 6px 18px rgba(20,22,28,.2),0 1px 2px rgba(0,0,0,.1);
}
.button:hover,.btn-primary:hover{
  background:#090a0c;transform:translateY(-1.5px);
  box-shadow:0 10px 24px rgba(20,22,28,.28),0 2px 6px rgba(0,0,0,.1);
}
.button:active,.btn-primary:active{transform:translateY(0);box-shadow:0 3px 10px rgba(20,22,28,.18)}
.button-secondary{
  background:rgba(255,255,255,.88);color:#2f3339;
  border-color:rgba(0,0,0,.08);
  box-shadow:0 2px 6px rgba(15,23,42,.04),inset 0 1px 0 #fff;
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
}
.button-secondary:hover{
  background:#ffffff;border-color:rgba(0,0,0,.14);transform:translateY(-1px);
  box-shadow:0 6px 16px rgba(15,23,42,.08),inset 0 1px 0 #fff;
}
.button-danger{
  background:#fff;color:#8b2d2d;
  border-color:#e7caca;
  box-shadow:0 2px 6px rgba(139,45,45,.06),inset 0 1px 0 #fff;
}
.button-danger:hover{
  background:#fbf2f2;border-color:#e0b2b2;transform:translateY(-1px);
  box-shadow:0 6px 16px rgba(139,45,45,.12);
}
.button-sm{min-height:34px;padding:0 13px;font-size:12.5px;border-radius:10px}
.button-xs{min-height:28px;padding:0 10px;font-size:11px;border-radius:6px}
input,select,textarea{
  width:100%;min-height:44px;padding:10px 13px;
  border:1px solid rgba(0,0,0,.09);border-radius:12px;
  background:rgba(244,245,246,.85);color:#17191d;
  outline:none;box-shadow:inset 0 1px 2px rgba(15,23,42,.03);
  transition:border-color .15s ease,box-shadow .15s ease,background .15s ease;
}
textarea{min-height:90px;resize:vertical;line-height:1.5}
input:focus,select:focus,textarea:focus{
  border-color:#007aff;box-shadow:0 0 0 3.5px rgba(0,122,255,.14),0 2px 8px rgba(0,122,255,.05);
  background:#fff;
}
input[type=checkbox]{width:17px;min-height:17px;margin:0;accent-color:#202226}
label{display:block;margin:0 0 7px;color:#30343a;font-size:13px;font-weight:500}
.field-help{margin-top:4px;font-size:11.5px;color:var(--c-text-muted);line-height:1.4}
.form-stack{display:flex;flex-direction:column;gap:15px}
.form-row{display:flex;gap:12px;flex-wrap:wrap}
.form-row>*{flex:1;min-width:180px}
/* === Combobox (refined) === */
.combobox{position:relative}
.cb-input{padding-right:34px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23949ba8' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
.cb-list{position:absolute;z-index:50;left:0;right:0;top:calc(100% + 6px);max-height:280px;overflow-y:auto;background:var(--glass-strong);border:1px solid var(--c-border);border-radius:var(--radius-lg);padding:5px;box-shadow:var(--shadow-lg);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur)}
.cb-option{padding:9px 11px;border-radius:var(--radius-sm);cursor:pointer;display:flex;flex-direction:column;gap:2px;transition:all .12s}
.cb-option:hover,.cb-option:focus{background:var(--c-accent-soft);outline:none}
.cb-opt-header{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cb-opt-id{font-size:13px;font-weight:500;color:var(--c-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cb-opt-name{font-size:11px;color:var(--c-text-muted)}
.cb-opt-badges{display:inline-flex;align-items:center;gap:4px;flex-shrink:0}
.model-badge{display:inline-flex;align-items:center;padding:1px 5px;border-radius:4px;font-size:9.5px;font-weight:500;letter-spacing:.03em;text-transform:uppercase}
.badge-free{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0}
.badge-img{background:#fce7f3;color:#be185d;border:1px solid #fbcfe8}
.badge-vision{background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd}
.badge-ctx{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
.cb-empty{padding:10px 12px;color:var(--c-text-muted);font-size:12px}
input[type=checkbox]{width:16px;min-height:16px;accent-color:var(--c-accent)}
/* === Typography === */
.muted{color:var(--c-text-muted);font-size:12.5px}
.eyebrow{margin-bottom:6px;color:var(--c-text-muted);font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase}
/* === Shell & Topbar === */
.shell{width:100%;max-width:1400px;margin:0 auto;padding:12px 12px 40px}
.topbar{
  position:sticky;top:0;z-index:40;
  display:flex;align-items:center;justify-content:space-between;gap:14px;
  margin:-12px -12px 18px;padding:10px 14px;
  background:var(--glass);border-bottom:1px solid var(--c-border);
  backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);
  box-shadow:var(--shadow-xs);
}
.brand{display:flex;align-items:center;gap:10px;flex-shrink:0}
.brand-mark{
  display:grid;place-items:center;width:34px;height:34px;
  border-radius:var(--radius-sm);
  background:linear-gradient(135deg,#181a1f 0%,#0f172a 100%);
  color:#fff;font-size:13.5px;font-weight:500;letter-spacing:-.01em;
  box-shadow:0 3px 10px rgba(24,26,31,.18);
}
.brand-name{font-size:15px;font-weight:500;letter-spacing:-.015em;color:var(--c-text)}
.brand-subtitle{display:none;font-size:11px;color:var(--c-text-muted)}
.main-nav{display:flex;align-items:center;gap:2px;background:rgba(0,0,0,.03);padding:3.5px;border-radius:var(--radius-sm);border:1px solid rgba(0,0,0,.04);overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.main-nav::-webkit-scrollbar{display:none}
.main-nav-btn{display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:7px;font-weight:500;font-size:12.5px;color:var(--c-text-soft);text-decoration:none;border:0;cursor:pointer;transition:all .15s ease;white-space:nowrap}
.main-nav-btn:hover{color:var(--c-text);background:rgba(255,255,255,.65)}
.main-nav-btn.active{background:var(--c-surface);color:var(--c-text);box-shadow:var(--shadow-sm)}
.main-nav-btn svg{width:15px;height:15px;flex-shrink:0;opacity:.65}
.main-nav-btn.active svg{opacity:1;color:var(--c-accent)}
.topbar-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
.card{border:1px solid var(--c-border);border-radius:var(--radius-xl);background:var(--c-surface);box-shadow:var(--shadow-sm);padding:20px;min-width:0;box-sizing:border-box;transition:box-shadow .2s ease;position:relative}
.card:hover{box-shadow:var(--shadow)}
.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;width:100%}
.section-head>div{flex:1;min-width:180px}
.section-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0}
.section-head h2{margin-bottom:3px;font-weight:500}
.section-head p{margin-bottom:0;font-size:13px;color:var(--c-text-soft)}
/* === Status Pills === */
.status-pill{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:20px;font-size:11.5px;font-weight:500;white-space:nowrap;transition:all .15s}
.status-pill::before{content:"";width:6.5px;height:6.5px;border-radius:50%;flex-shrink:0}
.status-success{background:var(--c-success-soft);color:var(--c-success)}.status-success::before{background:var(--c-success)}
.status-pending{background:var(--c-bg);color:var(--c-text-soft)}.status-pending::before{background:var(--c-text-muted)}
.status-error{background:var(--c-danger-soft);color:var(--c-danger)}.status-error::before{background:var(--c-danger)}
.status-active{background:var(--c-success-soft);color:var(--c-success)}.status-active::before{background:var(--c-success)}
.status-paused{background:var(--c-bg);color:var(--c-text-muted)}.status-paused::before{background:var(--c-text-muted)}
.status-running{background:var(--c-warning-soft);color:var(--c-warning)}.status-running::before{background:var(--c-warning)}
button.status-pill{cursor:pointer;border:1px solid transparent;font:inherit;line-height:inherit}
button.status-pill:hover{transform:scale(1.04);box-shadow:0 1px 4px rgba(0,0,0,.08);filter:brightness(0.96)}
button.status-pill.status-error:hover{background:#fee2e2;border-color:#fca5a5}
button.status-pill.status-success:hover{background:#dcfce7;border-color:#86efac}
/* === Stats === */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px;margin-bottom:18px}
.stat{padding:16px 18px;border:1px solid var(--c-border);border-radius:var(--radius-lg);background:var(--c-surface);box-shadow:var(--shadow-xs);transition:all .2s ease;position:relative;overflow:hidden}
.stat::before{content:"";position:absolute;top:0;left:0;right:0;height:2.5px;background:var(--c-accent);opacity:0;transition:opacity .2s}
.stat:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}
.stat:hover::before{opacity:1}
.stat-label{margin-bottom:6px;color:var(--c-text-muted);font-size:10.5px;font-weight:500;text-transform:uppercase;letter-spacing:.055em}
.stat-value{overflow-wrap:anywhere;font-size:20px;font-weight:500;letter-spacing:-.015em;color:var(--c-text)}
.stat-value.success{color:var(--c-success)}
/* === Layout === */
.layout{display:grid;gap:18px;align-items:start;width:100%;min-width:0}
.stack{display:grid;gap:18px;min-width:0;width:100%}
.stack-aside{position:relative;min-width:0;width:100%}
.checkbox-label{display:flex;align-items:center;gap:8px;min-height:32px;margin:0;font-size:13px;color:var(--c-text);white-space:nowrap;cursor:pointer}
.check-group{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px 12px;margin-top:4px}
/* === Agent Cards === */
.agent-list{display:grid;gap:12px;min-width:0;width:100%}
.agent{padding:14px 18px;border:1px solid var(--c-border);border-radius:var(--radius-lg);background:var(--c-surface);box-shadow:var(--shadow-xs);transition:all .22s ease;position:relative;overflow:hidden}
.agent::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--c-accent),var(--c-accent-hover));opacity:0;transition:opacity .25s}
.agent:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);border-color:#d1d5de}
.agent:hover::before{opacity:1}
.agent-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;width:100%}
.agent-title{display:flex;align-items:center;gap:12px;flex:1;min-width:260px}
.agent-title-info{flex:1;min-width:0}
.agent-name{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;margin-bottom:2px;font-size:14px;font-weight:600;letter-spacing:-.01em;color:var(--c-text)}
.agent-desc{margin:0;color:var(--c-text-soft);font-size:12px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;max-width:850px}
.agent-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;margin-top:10px;padding-top:10px;border-top:1px solid var(--c-border);color:var(--c-text-soft);font-size:11.5px;width:100%}
.agent-meta span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.agent-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex-shrink:0}
.agent-actions form{display:inline-flex;margin:0}
.agent-actions form,.agent-actions .button{width:auto}
.agent-error{margin-top:10px;padding:10px 12px;border:1px solid #fecaca;border-radius:var(--radius-sm);background:var(--c-danger-soft);color:#b91c1c;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
.divider{height:1px;margin:18px 0;background:var(--c-border)}
.settings-grid{display:grid;gap:18px;align-items:start;min-width:0;width:100%}
.blog-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--c-border)}
.blog-row:last-child{border-bottom:0;padding-bottom:0}
.blog-name{font-weight:500;font-size:14px;color:var(--c-text)}
.blog-url{font-size:12px;color:var(--c-text-muted);margin:2px 0 6px;word-break:break-all}
.blog-cats{display:flex;flex-wrap:wrap;gap:5px}
.cat-chip{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;background:var(--c-accent-soft);color:var(--c-accent);font-size:11px;font-weight:500}
.audit-wrap{overflow:hidden;width:100%;margin:0}
.blog-favicon{width:20px;height:20px;border-radius:4px;flex-shrink:0}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{padding:10px;border-bottom:1px solid var(--c-border);text-align:left;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
th{color:var(--c-text-muted);font-weight:500}td{color:var(--c-text-soft)}
tbody tr{transition:background .12s ease}tbody tr:hover{background:var(--c-bg)}
/* === Table Stack (mobile card-style) === */
.table-stack{display:block;overflow:visible;margin:0}
.table-stack thead{display:none}
.table-stack tbody{display:block}
.table-stack tr{display:grid;grid-template-columns:1fr;gap:8px;padding:12px;margin:0 0 10px;border:1px solid var(--c-border);border-radius:var(--radius);background:var(--c-surface);box-shadow:var(--shadow-sm)}
.table-stack td{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:2px 0;border-bottom:0;text-align:right;white-space:normal}
.table-stack td::before{content:attr(data-label);flex-shrink:0;color:var(--c-text-muted);font-size:10.5px;font-weight:500;text-align:left;text-transform:uppercase;letter-spacing:.04em}
.table-stack td code{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55%}
.table-stack tr:has(>td.empty){display:block;margin:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none}
.table-stack td.empty{display:block;width:100%;min-height:0;padding:16px 10px;text-align:center}
.table-stack td.empty::before{content:none}
.table-avatar-cell{display:flex;align-items:center;gap:10px}
/* === Modal === */
.modal{display:none;position:fixed;inset:0;z-index:60;place-items:center;padding:16px}
.modal:target{display:grid}
.modal-backdrop,.modal-overlay{position:absolute;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.modal-panel{position:relative;z-index:1;width:min(760px,100%);max-height:min(760px,88vh);overflow:auto;padding:22px;border:1px solid var(--c-border);border-radius:var(--radius-xl);background:var(--glass-strong);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);box-shadow:var(--shadow-xl)}
.modal-head,.modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;position:sticky;top:-22px;margin:-22px -22px 16px;padding:22px;background:var(--glass);border-bottom:1px solid var(--c-border);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);z-index:2}
.modal-close{display:grid;place-items:center;width:36px;height:36px;border:1px solid var(--c-border);border-radius:var(--radius-sm);background:var(--c-surface);color:var(--c-text-soft);text-decoration:none;font-size:18px;box-shadow:var(--shadow-sm);transition:all .15s ease}
.modal-close:hover{background:var(--c-bg);color:var(--c-text)}
/* === Toast === */
.toast{position:fixed;left:50%;bottom:20px;z-index:100;transform:translateX(-50%);padding:11px 18px;border:1px solid var(--c-border);border-radius:var(--radius-lg);background:var(--glass-strong);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);box-shadow:var(--shadow-xl);color:var(--c-text);font-size:13px;font-weight:500;animation:toast-in .25s ease}
.toast-error{color:#b91c1c;border-color:#fecaca}
@keyframes toast-in{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
/* === Banner & Notice === */
.banner{padding:13px 15px;border:1px solid #fde68a;border-radius:var(--radius);background:#fffbeb;color:#92400e;font-size:13px;line-height:1.5;margin-bottom:18px}
.banner a{color:var(--c-text);font-weight:500}
.notice{padding:14px 16px;border:1px solid var(--c-border);border-radius:var(--radius);background:var(--c-surface);color:var(--c-text-soft);font-size:13px;line-height:1.5;box-shadow:var(--shadow-sm)}
.empty{display:grid;place-items:center;min-height:130px;border:1px dashed var(--c-border);border-radius:var(--radius-lg);color:var(--c-text-muted);text-align:center;font-size:13px;background:var(--c-bg);padding:22px;width:100%;box-sizing:border-box}
/* === Code & Errors === */
.code-block{overflow-wrap:anywhere;padding:12px;border:1px solid var(--c-border);border-radius:var(--radius-sm);background:var(--c-bg);color:var(--c-text-soft);font-family:var(--font-mono);font-size:12px;line-height:1.55}
.error{padding:11px 13px;border:1px solid #fecaca;border-radius:var(--radius-sm);background:var(--c-danger-soft);color:#b91c1c;font-size:13px}
/* === Badges (25d gradient preserved) === */
.badge-25d{display:inline-grid;place-items:center;border-radius:50%;padding:2.5px;background:linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);box-shadow:0 6px 16px -2px rgba(220,39,67,.28),0 2px 6px rgba(0,0,0,.08);transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease;flex-shrink:0;vertical-align:middle;box-sizing:border-box}
.badge-25d:hover{transform:perspective(300px) rotateX(6deg) rotateY(-6deg) scale(1.08) translateY(-2px);box-shadow:0 12px 26px -2px rgba(220,39,67,.36),0 4px 10px rgba(0,0,0,.12)}
.badge-25d-inner{width:100%;height:100%;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#ffffff;padding:2px;box-sizing:border-box;position:relative}
.badge-25d-inner img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
.badge-25d-inner>div{width:100%;height:100%;border-radius:50%;overflow:hidden;display:grid;place-items:center}
.badge-gold{background:linear-gradient(135deg,#fffbeb 0%,#fde68a 30%,#f59e0b 70%,#b45309 100%);box-shadow:0 10px 25px -2px rgba(245,158,11,.45)}
.badge-silver{background:linear-gradient(135deg,#ffffff 0%,#e2e8f0 40%,#94a3b8 80%,#64748b 100%);box-shadow:0 10px 25px -2px rgba(148,163,184,.45)}
.badge-bronze{background:linear-gradient(135deg,#ffedd5 0%,#fed7aa 35%,#d97706 75%,#9a3412 100%);box-shadow:0 10px 25px -2px rgba(217,119,6,.45)}
.avatar-ring{display:inline-flex;border-radius:50%;padding:2px;background:linear-gradient(135deg,var(--c-accent),#7c3aed)}
/* === Ranking & Podium === */
.ranking-hero{overflow:hidden;background:linear-gradient(145deg,#ffffff 0%,#fbfcfe 58%,#fffaf1 100%);border-color:rgba(148,163,184,.18);box-shadow:0 20px 60px rgba(30,41,59,.08)}
.ranking-hero::before{content:"";position:absolute;width:360px;height:360px;right:-140px;top:-190px;border-radius:50%;background:radial-gradient(circle,rgba(148,163,184,.14),rgba(148,163,184,0) 68%);pointer-events:none}
.ranking-hero::after{content:"";position:absolute;width:280px;height:280px;left:-130px;bottom:-190px;border-radius:50%;background:radial-gradient(circle,rgba(245,158,11,.14),rgba(245,158,11,0) 70%);pointer-events:none}
.ranking-hero-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:22px;position:relative;z-index:1}
.ranking-title-wrap{max-width:700px}
.ranking-title{font-size:clamp(23px,3vw,34px)!important;font-weight:650!important;letter-spacing:-.04em;line-height:1.12;margin:5px 0 8px!important;color:#111827}
.ranking-description{font-size:13.5px!important;line-height:1.55;max-width:650px}
.ranking-live{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;background:rgba(255,255,255,.72);border:1px solid rgba(148,163,184,.18);color:#475569;font-size:11px;font-weight:650;white-space:nowrap;box-shadow:0 8px 24px rgba(30,41,59,.06);backdrop-filter:blur(10px)}
.ranking-live::before{content:"";width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.13)}
.ranking-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:20px;position:relative;z-index:1}
.ranking-stat{padding:13px 14px;border-radius:14px;background:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.9);box-shadow:0 8px 25px rgba(30,41,59,.05);backdrop-filter:blur(12px)}
.ranking-stat-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#7c8598;font-weight:650;margin-bottom:5px}
.ranking-stat-value{font-size:20px;line-height:1;font-weight:700;letter-spacing:-.035em;color:#172033}
.ranking-stat-value span{font-size:11px;font-weight:500;color:#8a93a5;letter-spacing:0;margin-left:3px}
.podium-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:end;margin:30px 0 4px;position:relative;z-index:1}
.podium-card{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;min-height:218px;padding:28px 18px 20px;border-radius:22px;background:rgba(255,255,255,.78);border:1px solid rgba(148,163,184,.18);box-shadow:0 16px 42px rgba(30,41,59,.08);transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease;backdrop-filter:blur(14px);box-sizing:border-box}
.podium-card::after{content:"";position:absolute;inset:auto 24px 0;height:3px;border-radius:6px 6px 0 0;background:#94a3b8;opacity:.55}
.podium-card:hover{transform:translateY(-6px);box-shadow:0 24px 54px rgba(30,41,59,.13)}
.podium-1st{order:2;min-height:246px;padding-top:32px;border-color:rgba(245,158,11,.4);background:linear-gradient(155deg,#fffdf7 0%,#fff7dc 54%,#fffbeb 100%);box-shadow:0 24px 55px rgba(180,120,20,.16)}
.podium-1st::before{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 50% 0,rgba(251,191,36,.18),transparent 44%);pointer-events:none}
.podium-1st::after{background:linear-gradient(90deg,#f59e0b,#fde68a);opacity:1;height:4px}
.podium-2nd{order:1}.podium-2nd::after{background:linear-gradient(90deg,#94a3b8,#e2e8f0)}
.podium-3rd{order:3}.podium-3rd::after{background:linear-gradient(90deg,#c26b35,#fdba74)}
.podium-rank-badge{position:absolute;top:-14px;display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#fff;box-shadow:0 8px 20px rgba(15,23,42,.18),inset 0 1px 0 rgba(255,255,255,.3)}
.rank-gold{background:linear-gradient(135deg,#fbbf24,#d97706)}.rank-silver{background:linear-gradient(135deg,#8390a3,#536176)}.rank-bronze{background:linear-gradient(135deg,#ea8a47,#a84316)}
.podium-name{font-size:15px;font-weight:650;margin:12px 0 5px;color:#172033;letter-spacing:-.015em}
.podium-1st .podium-name{color:#3f321b;font-size:18px}
.podium-blog{display:inline-flex;align-items:center;gap:6px;margin-bottom:8px}
.podium-1st .cat-chip{background:#fff8df!important;border-color:#f6d98c!important;color:#92400e!important}
.podium-score{font-size:28px;font-weight:700;letter-spacing:-.045em;color:#172033;margin:7px 0 3px}
.podium-score span{font-size:11px;font-weight:600;color:#8a93a5;letter-spacing:.02em;text-transform:uppercase}
.podium-1st .podium-score{color:#a9480b;font-size:34px}.podium-1st .podium-score span{color:#b45309}
.podium-sub{font-size:11px;line-height:1.45;color:#8a93a5}.podium-1st .podium-sub{color:#78350f}
.ranking-table-card{padding:0;overflow:hidden;border-color:rgba(148,163,184,.17);box-shadow:0 16px 48px rgba(30,41,59,.07)}
.ranking-table-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:22px 24px 18px;border-bottom:1px solid rgba(148,163,184,.15)}
.ranking-table-head .section-head{margin:0}
.ranking-table-meta{font-size:11.5px;color:#8a93a5;white-space:nowrap}
.ranking-table-wrap{padding:8px 14px 16px;overflow-x:auto}
.ranking-table{border-collapse:separate;border-spacing:0 7px;min-width:1040px}
.ranking-table th{border:0;padding:7px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.065em;color:#929bad;font-weight:650}
.ranking-table td{padding:11px 12px;background:#f8fafc;border-top:1px solid #eef1f5;border-bottom:1px solid #eef1f5;color:#5e687a}
.ranking-table td:first-child{border-left:1px solid #eef1f5;border-radius:12px 0 0 12px}.ranking-table td:last-child{border-right:1px solid #eef1f5;border-radius:0 12px 12px 0}
.ranking-table tr{transition:transform .16s ease,filter .16s ease}.ranking-table tbody tr:hover{transform:translateY(-2px);filter:drop-shadow(0 8px 10px rgba(30,41,59,.07))}
.ranking-table tbody tr:first-child td{background:linear-gradient(90deg,#fffaf0,#fffdf8);border-color:#f8e7bc}
.ranking-position{display:inline-grid;place-items:center;width:29px;height:29px;border-radius:9px;background:#eef2f7;color:#64748b;font-size:11px;font-weight:700}.ranking-position.is-top{background:#172033;color:#fff;box-shadow:0 6px 14px rgba(23,32,51,.16)}
.ranking-agent-name{display:block;font-weight:650;color:#20293a;max-width:150px;overflow:hidden;text-overflow:ellipsis}.ranking-model{font-size:10px;color:#9aa2b1;max-width:150px;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.ranking-number{font-variant-numeric:tabular-nums;font-weight:600;color:#374151}.ranking-number.primary{font-size:13px;color:#111827}
/* === Avatar Picker === */
.avatar-picker{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}
.avatar-opt{cursor:pointer;border:2px solid transparent;border-radius:50%;padding:2px;transition:border-color .15s ease,transform .15s ease}
.avatar-opt:hover{transform:scale(1.08)}
.avatar-opt input[type=radio]{display:none}
.avatar-opt:has(input:checked){border-color:var(--c-accent);transform:scale(1.1)}
/* === Highlight Pills === */
.highlight-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:500}
.highlight-viral{background:#fdf2f8;border:1px solid #fbcfe8;color:#be185d}
.highlight-leader{background:#fef3c7;border:1px solid #fde68a;color:#92400e}
.highlight-roi{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857}
/* === Tabs === */
.tab-pane{display:none}
.tab-pane.active{display:block}
.blog-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.blog-tab{display:inline-flex;align-items:center;padding:6px 14px;border-radius:999px;background:var(--c-surface);border:1px solid var(--c-border);color:var(--c-text-soft);font-size:12px;font-weight:500;text-decoration:none;box-shadow:var(--shadow-sm);transition:all .15s ease}
.blog-tab:hover{background:var(--c-bg);color:var(--c-text);box-shadow:var(--shadow)}
.blog-tab.active{background:var(--c-text);color:#fff;border-color:var(--c-text);box-shadow:var(--shadow)}
/* === Login === */
.login-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px 14px;box-sizing:border-box}
.login-card{width:100%;max-width:420px;border-radius:var(--radius-xl);background:var(--glass-strong);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);border:1px solid var(--c-border);box-shadow:var(--shadow-xl);padding:32px 26px 26px;box-sizing:border-box}
.login-head{text-align:center;margin-bottom:24px}
.login-head h1{font-size:22px;font-weight:500;letter-spacing:-.02em;color:var(--c-text);margin:0 0 6px}
.login-head p{font-size:13px;color:var(--c-text-soft);margin:0}
.login-form{display:grid;gap:14px}
.login-form label{font-size:12px;font-weight:500;color:var(--c-text-soft);margin-bottom:4px}
.login-form input{height:44px;border-radius:var(--radius);background:var(--c-bg);border:1px solid var(--c-border);font-size:14px;padding:0 13px;transition:all .15s ease}
.login-form input:focus{background:var(--c-surface);border-color:var(--c-accent);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.btn-login{width:100%;height:44px;border-radius:var(--radius);border:none;background:var(--c-accent);color:#fff;font-size:14px;font-weight:500;letter-spacing:-.01em;cursor:pointer;box-shadow:0 4px 14px rgba(37,99,235,.3);transition:all .18s ease;margin-top:4px;display:inline-flex;align-items:center;justify-content:center}
.btn-login:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(37,99,235,.4)}
.btn-login:active{transform:translateY(0);box-shadow:0 3px 10px rgba(37,99,235,.25)}
.login-error{padding:10px 13px;border-radius:var(--radius-sm);background:var(--c-danger-soft);border:1px solid #fecaca;color:#b91c1c;font-size:13px;font-weight:500;text-align:center;margin-bottom:16px;animation:toast-in .25s ease}
.security-note{margin:20px 0 0;color:var(--c-text-muted);font-size:11.5px;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px}
/* === Post Create === */
.post-create-layout{display:grid;gap:20px;align-items:start;width:100%}
.post-create-main{min-width:0;display:flex;flex-direction:column;gap:16px}
.post-create-sidebar{min-width:0;display:flex;flex-direction:column;gap:16px}
.post-header-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 16px;background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm)}
.stats-counter-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 12px;background:var(--c-bg);border-radius:var(--radius);border:1px solid var(--c-border-light)}
.stat-chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--c-text-soft)}
.stat-chip strong{color:var(--c-text);font-weight:600}
.editor-toolbar{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:6px 8px;background:var(--c-bg);border:1px solid var(--c-border);border-radius:var(--radius) var(--radius) 0 0;border-bottom:none}
.editor-tool-btn{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;border-radius:6px;border:1px solid transparent;background:transparent;color:var(--c-text-soft);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s ease}
.editor-tool-btn:hover{background:var(--c-surface);color:var(--c-text);border-color:var(--c-border);box-shadow:var(--shadow-xs)}
.editor-tool-btn:active{transform:scale(.96)}
.editor-tool-sep{width:1px;height:16px;background:var(--c-border);margin:0 3px}
.editor-mode-nav{display:flex;align-items:center;gap:4px;background:var(--c-bg);padding:3px;border-radius:8px;border:1px solid var(--c-border-light)}
.editor-mode-btn{padding:4px 10px;border-radius:6px;font-size:11.5px;font-weight:500;color:var(--c-text-soft);border:none;background:transparent;cursor:pointer;transition:all .15s ease}
.editor-mode-btn.active{background:var(--c-surface);color:var(--c-text);box-shadow:var(--shadow-xs)}
.article-preview-body{padding:24px;background:var(--c-surface);border:1px solid var(--c-border);border-radius:0 0 var(--radius) var(--radius);min-height:300px;font-size:15px;line-height:1.75;color:#1e293b}
.article-preview-body h2{font-size:1.4rem;font-weight:600;margin:24px 0 12px;color:#0f172a;line-height:1.3}
.article-preview-body h3{font-size:1.15rem;font-weight:600;margin:18px 0 8px;color:#1e293b;line-height:1.35}
.article-preview-body p{margin:0 0 16px}
.article-preview-body ul,.article-preview-body ol{margin:0 0 16px;padding-left:24px}
.article-preview-body li{margin-bottom:6px}
.article-preview-body blockquote{margin:18px 0;padding:12px 18px;border-left:4px solid var(--c-accent);background:var(--c-accent-soft);border-radius:0 var(--radius-sm) var(--radius-sm) 0;color:var(--c-text-soft);font-style:italic}
.article-preview-body pre{margin:16px 0;padding:14px;background:#0f172a;color:#f8fafc;border-radius:var(--radius);overflow-x:auto;font-family:var(--font-mono);font-size:13px}
.article-preview-body img{max-width:100%;height:auto;border-radius:var(--radius);margin:14px 0}
.dropzone-box{border:2px dashed var(--c-border);border-radius:var(--radius);padding:18px 14px;text-align:center;background:var(--c-bg);transition:all .2s ease;cursor:pointer}
.dropzone-box:hover,.dropzone-box.dragover{border-color:var(--c-accent);background:var(--c-accent-soft)}
.sidebar-subtabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;background:var(--c-bg);padding:4px;border-radius:var(--radius);border:1px solid var(--c-border);margin-bottom:16px}
.sidebar-subtab{padding:8px 2px;font-size:11.5px;font-weight:500;color:var(--c-text-soft);border:1px solid transparent;border-radius:var(--radius-sm);background:transparent;cursor:pointer;transition:all .15s ease;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar-subtab:hover{color:var(--c-text);background:var(--c-surface)}
.sidebar-subtab.active{color:var(--c-text);background:var(--c-surface);font-weight:600;border-color:var(--c-border);box-shadow:var(--shadow-xs)}
.prompt-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.prompt-chip{display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;background:var(--c-surface);border:1px solid var(--c-border);font-size:11px;color:var(--c-text-soft);cursor:pointer;transition:all .15s ease}
.prompt-chip:hover{background:var(--c-accent-soft);color:var(--c-accent);border-color:var(--c-accent)}
.pexels-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;max-height:280px;overflow-y:auto;padding-right:4px}
.pexels-item{position:relative;border-radius:var(--radius-sm);overflow:hidden;cursor:pointer;aspect-ratio:16/10;background:#e2e8f0;border:1px solid var(--c-border)}
.pexels-item img{width:100%;height:100%;object-fit:cover;transition:transform .2s ease}
.pexels-item:hover img{transform:scale(1.06)}
.pexels-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);opacity:0;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:500;transition:opacity .15s ease}
.pexels-item:hover .pexels-overlay{opacity:1}
.ai-action-list{display:grid;gap:8px}
.ai-action-btn{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:var(--radius-sm);background:var(--c-bg);border:1px solid var(--c-border);font-size:12.5px;color:var(--c-text);cursor:pointer;transition:all .15s ease;text-align:left}
.ai-action-btn:hover{background:var(--c-surface);border-color:var(--c-accent);color:var(--c-accent);transform:translateX(2px)}
.ai-generate-section{padding:14px 0 0;border-top:1px solid var(--c-border-light);margin-top:14px}
.ai-generate-section:first-child{border-top:0;margin-top:0;padding-top:0}
.gen-result{margin-top:10px;padding:12px;border-radius:var(--radius-sm);background:var(--c-bg);font-size:13px;line-height:1.5;border:1px solid var(--c-border-light)}
.gen-loading{display:flex;align-items:center;gap:8px;color:var(--c-text-muted);font-size:12.5px;padding:8px 0}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid var(--c-border);border-top-color:var(--c-accent);border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
/* === Ranking Filter === */
.ranking-filter{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.ranking-filter-btn{padding:6px 14px;border:1px solid var(--c-border);border-radius:999px;background:var(--c-surface);color:var(--c-text-soft);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s ease}
.ranking-filter-btn:hover{background:var(--c-bg);color:var(--c-text)}
.ranking-filter-btn.active{background:var(--c-text);color:#fff;border-color:var(--c-text)}
/* === Settings helpers === */
.checks-row{display:flex;flex-wrap:wrap;gap:10px 16px}
.check-item{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--c-text);cursor:pointer}
.table-wrap{overflow-x:auto;width:100%}
/* === Responsive === */
@media(max-width:639px){
  .topbar{flex-wrap:wrap;padding:10px 12px;gap:8px}.brand{order:1}.topbar-right{order:2}.main-nav{order:3;width:100%}
  .agent{max-width:100%}.podium-grid{grid-template-columns:1fr;gap:12px}
}
@media(min-width:640px){
  .shell{padding:22px 20px 56px}.topbar{padding:12px 22px;margin:-22px -20px 22px}
  .brand-subtitle{display:block}.card{padding:22px}.modal{padding:24px}
  .podium-grid{grid-template-columns:repeat(3,1fr);gap:18px}
  .podium-card{padding:28px 22px 24px}.podium-name{font-size:15px}.podium-score{font-size:24px}
  .post-create-layout{grid-template-columns:minmax(0,1fr) 340px}
}
@media(min-width:768px){
  .table-stack{display:table;overflow:auto;margin:0}.table-stack thead{display:table-header-group}.table-stack tbody{display:table-row-group}.table-stack tr{display:table-row;gap:0;margin:0;padding:0;border:0;border-radius:0;background:none;box-shadow:none}.table-stack td{display:table-cell;width:auto;padding:10px 12px;border-bottom:1px solid var(--c-border);text-align:left;white-space:nowrap}.table-stack td::before{content:none}.table-stack td.empty{display:table-cell;min-height:140px;padding:0}
}
@media(min-width:1100px){
  .layout{grid-template-columns:minmax(0,1fr) 320px}.stack-aside{position:sticky;top:80px}.settings-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .post-create-layout{grid-template-columns:minmax(0,1fr) 380px}
}
/* === Syslog & Run Details === */
.syslog-terminal{background:#0b1120;color:#f8fafc;border-radius:14px;border:1px solid #1e293b;box-shadow:inset 0 2px 10px rgba(0,0,0,.6);font-family:var(--font-mono);font-size:12px;line-height:1.55;min-height:440px;max-height:640px;overflow-y:auto;padding:16px}
.syslog-entry{padding:7px 10px;border-radius:8px;margin-bottom:6px;border-left:3px solid transparent;display:flex;flex-direction:column;gap:3px;transition:background .12s ease}
.syslog-entry:hover{background:rgba(255,255,255,.05)}
.syslog-entry.level-error{border-left-color:#ef4444;background:rgba(239,68,68,.09)}
.syslog-entry.level-warn{border-left-color:#f59e0b;background:rgba(245,158,11,.08)}
.syslog-entry.level-success{border-left-color:#10b981;background:rgba(16,185,129,.07)}
.syslog-entry.level-info{border-left-color:#3b82f6}
.syslog-meta{display:flex;align-items:center;gap:8px;font-size:11px;flex-wrap:wrap}
.syslog-time{color:#94a3b8}
.syslog-source{color:#38bdf8;font-weight:500}
.syslog-badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.syslog-badge.error{background:#dc2626;color:#fff}
.syslog-badge.warn{background:#d97706;color:#fff}
.syslog-badge.success{background:#059669;color:#fff}
.syslog-badge.info{background:#2563eb;color:#fff}
.syslog-msg{color:#e2e8f0;word-break:break-word}
.syslog-details{margin-top:6px;padding:10px 12px;background:#030712;border-radius:8px;color:#cbd5e1;font-size:11px;white-space:pre-wrap;word-break:break-all;border:1px solid #1e293b}
.log-level-btn{border:1px solid var(--c-border);background:var(--c-surface);color:var(--c-text-soft);padding:4px 11px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s ease}
.log-level-btn:hover{background:rgba(0,0,0,.04);color:var(--c-text)}
.log-level-btn.active{background:var(--c-accent);color:#fff;border-color:var(--c-accent)}
@keyframes pulse-ring{0%{transform:scale(0.9);opacity:.6}50%{transform:scale(1.15);opacity:1}100%{transform:scale(0.9);opacity:.6}}
.pulse-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#2563eb;animation:pulse-ring 1.6s infinite ease-in-out}
.run-log-terminal{background:#0f172a;color:#f1f5f9;border-radius:12px;border:1px solid #334155;padding:14px;font-family:var(--font-mono);font-size:12px;line-height:1.55;max-height:360px;overflow-y:auto;white-space:pre-wrap;word-break:break-word}
.diag-card{padding:14px 16px;border-radius:12px;border:1px solid rgba(239,68,68,.3);background:#fef2f2;color:#991b1b;margin-bottom:14px}
.agent-error{margin-top:10px;padding:8px 12px;background:#fef2f2;border:1px solid rgba(239,68,68,.25);border-radius:8px;color:#991b1b;font-size:12px;display:flex;align-items:center;gap:6px;word-break:break-word}
.log-inspect-btn{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:rgba(0,122,255,.08);color:#007aff;border:1px solid rgba(0,122,255,.2);font-size:11.5px;font-weight:500;cursor:pointer;transition:all .15s ease;text-decoration:none;white-space:nowrap}
.log-inspect-btn:hover{background:#007aff;color:#fff}
.log-inspect-btn.btn-error{background:rgba(239,68,68,.08);color:#dc2626;border-color:rgba(239,68,68,.2)}
.log-inspect-btn.btn-error:hover{background:#dc2626;color:#fff}


`;

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCost(cost: number): string {
  if (cost === undefined || cost === null || cost <= 0) return "$0.0000";
  return `$${cost.toFixed(4)}`;
}

const MODEL_SUGGESTIONS = [
  "deepseek/deepseek-chat",
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.3-70b-instruct",
  "anthropic/claude-3-5-haiku-20241022",
];

const DEFAULT_IMAGE_MODELS = [
  "google/gemini-2.5-flash-image",
  "google/gemini-3.1-flash-image",
  "openai/gpt-5-image",
  "openai/gpt-5-image-mini",
  "qwen/qwen-image-3-pro",
];

export function loginPage(invalid = false): Response {
  return html(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Entrar — Blog Agent OS</title><style>${styles}</style></head><body>
<main class="login-shell">
  <section class="login-card">
    <div class="login-head">
      <div class="badge-25d" style="width:58px;height:58px;margin:0 auto 16px">
        <div class="badge-25d-inner">
          <div style="background:linear-gradient(135deg,#0a84ff,#5e5ce6);color:#fff;font-weight:500;font-size:19px;display:grid;place-items:center;width:100%;height:100%">BA</div>
        </div>
      </div>
      <h1>Blog Agent OS</h1>
      <p>Painel de Gestão & Agentes Autônomos</p>
    </div>

    ${invalid ? '<div class="login-error">Usuário ou senha incorretos.</div>' : ""}

    <form class="login-form" method="post" action="/admin/login">
      <div>
        <label for="username">Usuário</label>
        <input id="username" name="username" placeholder="admin" required autofocus autocomplete="username">
      </div>
      <div>
        <label for="password">Senha</label>
        <input id="password" name="password" type="password" placeholder="••••••••" required autocomplete="current-password">
      </div>
      <button class="btn-login" type="submit">Entrar no Painel</button>
    </form>

    <div class="security-note">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span>Sessão protegida por cookie assinado e seguro</span>
    </div>
  </section>
</main></body></html>`,
    invalid ? 401 : 200,
  );
}

export const AVATAR_PRESETS: { id: string; label: string; bg: string; icon: string }[] = [
  {
    id: "bot",
    label: "Robô AI",
    bg: "linear-gradient(135deg, #0ea5e9, #2563eb)",
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="16" y1="16" x2="16" y2="16.01"/></svg>`,
  },
  {
    id: "spark",
    label: "Estrela IA",
    bg: "linear-gradient(135deg, #f59e0b, #d97706)",
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>`,
  },
  {
    id: "rocket",
    label: "Foguete",
    bg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
  },
  {
    id: "target",
    label: "Alvo CTR",
    bg: "linear-gradient(135deg, #f43f5e, #be123c)",
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  },
  {
    id: "crown",
    label: "Coroa",
    bg: "linear-gradient(135deg, #eab308, #ca8a04)",
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>`,
  },
  {
    id: "pen",
    label: "Redator",
    bg: "linear-gradient(135deg, #10b981, #047857)",
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
  },
  {
    id: "palette",
    label: "Pinterest",
    bg: "linear-gradient(135deg, #ec4899, #be185d)",
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="#fff"/><circle cx="17.5" cy="10.5" r=".5" fill="#fff"/><circle cx="8.5" cy="7.5" r=".5" fill="#fff"/><circle cx="6.5" cy="12.5" r=".5" fill="#fff"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  },
  {
    id: "zap",
    label: "Raio Viral",
    bg: "linear-gradient(135deg, #fbbf24, #d97706)",
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  },
  {
    id: "flame",
    label: "Em Alta",
    bg: "linear-gradient(135deg, #f97316, #c2410c)",
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  },
  {
    id: "brain",
    label: "Neural",
    bg: "linear-gradient(135deg, #6366f1, #4338ca)",
    icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/></svg>`,
  },
];

export function renderAvatar(
  avatar: string | null | undefined,
  size = 46,
  rank?: "gold" | "silver" | "bronze" | "none",
): string {
  const av = (avatar || "bot").trim();
  const rankClass = rank === "gold"
    ? "badge-gold"
    : rank === "silver"
    ? "badge-silver"
    : rank === "bronze"
    ? "badge-bronze"
    : "";

  let inner = "";
  if (av.startsWith("data:image/") || av.startsWith("http://") || av.startsWith("https://") || av.startsWith("/")) {
    inner = `<img src="${escapeHtml(av)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;display:block;">`;
  } else {
    const found = AVATAR_PRESETS.find((p) => p.id === av) || AVATAR_PRESETS[0];
    inner = `<div style="width:100%;height:100%;display:grid;place-items:center;background:${found.bg}">${found.icon}</div>`;
  }

  return `<div class="badge-25d ${rankClass}" style="width:${size}px;height:${size}px;min-width:${size}px"><div class="badge-25d-inner">${inner}</div></div>`;
}

export function extractDomain(baseUrl: string): string {
  try {
    let clean = baseUrl.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "https://" + clean;
    }
    const u = new URL(clean);
    return u.hostname;
  } catch {
    return baseUrl;
  }
}

export function renderBlogFavicon(baseUrl: string, blogName: string, size = 44): string {
  const domain = extractDomain(baseUrl);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  return `<div class="badge-25d" style="width:${size}px;height:${size}px;min-width:${size}px" title="${escapeHtml(blogName)} (${escapeHtml(domain)})">
    <div class="badge-25d-inner">
      <img src="${faviconUrl}" alt="${escapeHtml(blogName)}" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='grid'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">
      <div style="display:none;width:100%;height:100%;border-radius:50%;place-items:center;background:linear-gradient(135deg,#6366f1,#4338ca);color:#fff;font-weight:500;font-size:${Math.max(10, Math.round(size * 0.36))}px">
        ${escapeHtml((blogName || "B").slice(0, 2).toUpperCase())}
      </div>
    </div>
  </div>`;
}

export interface DashboardData {
  activeTab?: string;
  agents: Agent[];
  runs: Run[];
  stats: Stats;
  credits: string | null;
  runInterval: number;
  msg: string | null;
  msgError: boolean;
  configMissing: string[];
  runningIds: Set<number>;
  defaultModel: string;
  models: ModelInfo[];
  blogs: Blog[];
  categoriesByBlog: Record<number, CategoryInfo[]>;
  rankingItems?: AgentRankingItem[];
  selectedBlogId?: number | null;
  databaseMetrics?: DatabaseUsageMetrics;
  settings?: PanelSettings;
  isServerless?: boolean;
  isDenoDeploy?: boolean;
  cronUrl?: string;
  hasCronToken?: boolean;
}

export function dashboardPage(data: DashboardData): Response {
  const { agents, runs, stats, credits } = data;
  const activeTab = data.activeTab || "agents";
  const successRate = stats.totalRuns > 0
    ? Math.round((stats.successRuns / stats.totalRuns) * 100)
    : 0;
  const banners = data.configMissing.length > 0
    ? `<div class="banner"><span style="font-weight:500">Configuração incompleta:</span> faltam ${
      data.configMissing.join(", ")
    }. O painel funciona, mas os agentes não serão executados até que estes valores sejam definidos na aba <a href="javascript:void(0)" onclick="switchTab('settings')">Configurações &amp; Blogs</a>.</div>`
    : "";
  const toast = data.msg
    ? `<div class="toast${data.msgError ? " toast-error" : ""}">${
      escapeHtml(data.msg)
    }</div><script>(function(){setTimeout(()=>{document.querySelector(".toast")?.remove()},4200);var u=new URL(window.location);if(u.searchParams.has("msg")||u.searchParams.has("err")){u.searchParams.delete("msg");u.searchParams.delete("err");window.history.replaceState({},"",u.toString());}})();</script>`
    : "";

  return html(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Blog Agent OS</title><style>${styles}</style></head><body>
<main class="shell">
  <header class="topbar">
    <div class="brand"><div class="brand-mark">BA</div><div><div class="brand-name">Blog Agent OS</div><div class="brand-subtitle">Painel de agentes autônomos</div></div></div>
    
    <nav class="main-nav">
      <button class="main-nav-btn ${activeTab === "agents" ? "active" : ""}" data-tab="agents">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="16" y1="16" x2="16" y2="16.01"/></svg>
        Agentes &amp; Operações
      </button>
      <button class="main-nav-btn ${activeTab === "create-post" ? "active" : ""}" data-tab="create-post">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        Criar Post
      </button>
      <button class="main-nav-btn ${activeTab === "ranking" ? "active" : ""}" data-tab="ranking">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
        Arena &amp; Ranking
      </button>
      <button class="main-nav-btn ${activeTab === "database" ? "active" : ""}" data-tab="database">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        Banco de Dados
      </button>
      <button class="main-nav-btn ${activeTab === "logs" ? "active" : ""}" data-tab="logs">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        Logs do Sistema
      </button>
      <button class="main-nav-btn ${activeTab === "settings" ? "active" : ""}" data-tab="settings">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Configurações &amp; Blogs
      </button>
    </nav>

    <div class="topbar-right">
      ${credits ? `<span class="status-pill">${credits}</span>` : ""}
      <a class="button button-secondary button-sm" href="/chat" style="display:inline-flex;align-items:center;gap:6px">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Chat
      </a>
      <form method="post" action="/admin/logout"><button class="button-secondary" type="submit">Sair</button></form>
    </div>
  </header>

  ${banners}

  <div id="tab-agents" class="tab-pane ${activeTab === "agents" ? "active" : ""}">
    <section class="stats">
      <div class="stat"><div class="stat-label">Agentes ativos</div><div class="stat-value success">${stats.activeAgents} de ${stats.agents}</div></div>
      <div class="stat"><div class="stat-label">Posts publicados</div><div class="stat-value success">${stats.totalPosts}</div></div>
      <div class="stat"><div class="stat-label">Execuções</div><div class="stat-value success">${stats.totalRuns}</div></div>
      <div class="stat"><div class="stat-label">Taxa de sucesso</div><div class="stat-value success">${successRate}%</div></div>
      <div class="stat"><div class="stat-label">Última execução</div><div class="stat-value">${
      fmtDate(stats.lastRunAt)
    }</div></div>
    </section>
    <div class="layout">
      <div class="stack">
        <section class="card">
          <div class="section-head"><div><p class="eyebrow">Automação</p><h2>Agentes</h2><p class="muted">Cada agente escreve, revisa ou publica artigos no seu próprio ritmo.</p></div>
          <div class="section-actions"><span class="status-pill">${agents.length} cadastrado${
      agents.length === 1 ? "" : "s"
    }</span><a class="button" href="#new-agent">+ Novo agente</a></div></div>
          <div class="agent-list">${
      agents.map((a) => agentCard(a, data.runningIds, data.blogs, data.categoriesByBlog, agents)).join("") ||
      '<div class="empty">Nenhum agente cadastrado. Clique em "Novo agente" para criar o primeiro.</div>'
    }</div>
        </section>
        <section class="card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Histórico</p>
              <h2>Últimas execuções</h2>
              <p class="muted">Exibindo as 6 publicações mais recentes.</p>
            </div>
            <div class="section-actions">
              <a class="button button-secondary button-sm" href="#all-runs" style="display:inline-flex;align-items:center;gap:6px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                Ver histórico completo (${runs.length})
              </a>
            </div>
          </div>
          ${runsTable(runs.slice(0, 6), agents)}
        </section>
      </div>
      <aside class="stack stack-aside">
        <section class="card"><div class="section-head"><div><p class="eyebrow">Agendamento</p><h2>Execução automática</h2></div></div>
        <p class="muted" style="margin-bottom:14px">O loop local verifica redatores ativos a cada <span style="font-weight:500">${data.runInterval} min</span>. Na nuvem, use o cron do Deno Deploy apontando para <code>/__cron</code>.</p>
        <form method="post" action="/admin/run-due"><button type="submit">Executar agentes devidos agora</button></form>
        <div class="divider"></div>
        <div class="notice">Os agentes são executados em segundo plano no painel. Redatores com revisor associado passam por validação automática antes da publicação.</div></section>
      </aside>
    </div>
  </div>

  <div id="tab-create-post" class="tab-pane ${activeTab === "create-post" ? "active" : ""}">
    ${renderCreatePostTab(data)}
  </div>

  <div id="tab-ranking" class="tab-pane ${activeTab === "ranking" ? "active" : ""}">
    ${renderRankingTab(data.rankingItems || [], data.blogs, data.selectedBlogId ?? null)}
  </div>

  <div id="tab-database" class="tab-pane ${activeTab === "database" ? "active" : ""}">
    ${renderDatabaseTab(data.databaseMetrics)}
  </div>

  <div id="tab-logs" class="tab-pane ${activeTab === "logs" ? "active" : ""}">
    ${renderLogsTab(data.agents)}
  </div>

  <div id="tab-settings" class="tab-pane ${activeTab === "settings" ? "active" : ""}">
    ${renderSettingsTab(data)}
  </div>

  ${allRunsModal(runs, agents)}
  ${runDetailsModal()}
  ${agents.map((a) => agentProfileModal(a, runs, data.blogs)).join("")}
  ${newAgentModal(data.defaultModel, "", data.models, data.blogs, data.categoriesByBlog, agents)}
  ${agents.map((a) => editModal(a, data.models, data.blogs, data.categoriesByBlog, agents)).join("")}
  ${toast}
</main>
${modelComboboxJs(data.models)}
${blogCategoryJs(data.blogs, data.categoriesByBlog)}
${allRunsModalJs()}
${logsTabJs()}
${runDetailsModalJs()}
<script>
(function(){
  var initialUrl = new URL(window.location);
  if (initialUrl.searchParams.has("msg") || initialUrl.searchParams.has("err")) {
    initialUrl.searchParams.delete("msg");
    initialUrl.searchParams.delete("err");
    window.history.replaceState({}, "", initialUrl.toString());
  }

  window.switchTab = function(name) {
    if (!name) return;
    document.querySelectorAll(".main-nav-btn").forEach(function(b){
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    document.querySelectorAll(".tab-pane").forEach(function(p){
      p.classList.toggle("active", p.id === "tab-" + name);
    });
    try {
      var u = new URL(window.location);
      u.searchParams.set("tab", name);
      u.searchParams.delete("msg");
      u.searchParams.delete("err");
      window.history.replaceState({}, "", u.toString());
    } catch(e) {}
  };

  window.switchBlogRanking = function(blogId) {
    var u = new URL(window.location);
    if (blogId === null || blogId === undefined) {
      u.searchParams.delete("blog_id");
    } else {
      u.searchParams.set("blog_id", String(blogId));
    }
    u.searchParams.set("tab", "ranking");
    u.searchParams.delete("msg");
    u.searchParams.delete("err");
    window.location.href = u.toString();
  };

  document.querySelectorAll(".main-nav-btn").forEach(function(b){
    b.addEventListener("click", function(e){
      e.preventDefault();
      var t = b.getAttribute("data-tab");
      if (t) window.switchTab(t);
    });
  });

  var urlParams = new URLSearchParams(window.location.search);
  var cur = urlParams.get("tab") || "${activeTab}";
  if (document.getElementById("tab-" + cur)) {
    window.switchTab(cur);
  }
})();
</script></body></html>`);
}

function agentCard(
  agent: Agent,
  runningIds: Set<number>,
  blogs: Blog[],
  categoriesByBlog: Record<number, CategoryInfo[]>,
  allAgents: Agent[] = [],
): string {
  const running = runningIds.has(agent.id);
  const isReviewer = agent.role === "reviewer";
  const isVisual = agent.role === "image_creator";
  const pill = agent.status === "active"
    ? '<span class="status-pill status-success">Ativo</span>'
    : '<span class="status-pill status-paused">Pausado</span>';
  const runPill = running ? '<span class="status-pill status-running">Executando…</span>' : "";
  
  let roleBadge = '<span class="cat-chip" style="background:#f3f4f6;color:#374151;font-weight:500">Redator</span>';
  if (isReviewer) {
    roleBadge = '<span class="cat-chip" style="background:#e8effd;border-color:#b9d2fa;color:#1d4ed8;font-weight:500">Revisor</span>';
  } else if (isVisual) {
    roleBadge = `<span class="cat-chip" style="background:#fdf2f8;border-color:#fbcfe8;color:#be185d;font-weight:500">Visual Pinterest (${escapeHtml(agent.imageAspectRatio || "9:16")})</span>`;
  }

  const toolsBadge = agent.toolsEnabled
    ? '<span class="cat-chip" style="background:#ecfdf5;border-color:#a7f3d0;color:#065f46;font-weight:500">Web Search &amp; Tools</span>'
    : '';

  let sourceBadge = "";
  if (agent.imageSourceMode === "pexels_only") {
    sourceBadge = '<span class="cat-chip" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;font-weight:500">Pexels Stock</span>';
  } else if (agent.imageSourceMode === "hybrid") {
    sourceBadge = '<span class="cat-chip" style="background:#eff6ff;border-color:#bfdbfe;color:#1e40af;font-weight:500">Misto (Pexels+IA)</span>';
  } else if (agent.imageSourceMode === "auto_cost") {
    sourceBadge = '<span class="cat-chip" style="background:#fefce8;border-color:#fef08a;color:#854d0e;font-weight:500">Auto-Cost</span>';
  }

  let reviewerMeta = "";
  if (!isReviewer && !isVisual && agent.reviewerId) {
    const rev = allAgents.find((a) => a.id === agent.reviewerId);
    reviewerMeta = `<span>Revisor: <span style="font-weight:500">${escapeHtml(rev ? rev.name : `ID #${agent.reviewerId}`)}</span></span>`;
  }

  const quotaMeta = agent.dailyPostLimit > 0
    ? `<span>Cota: máx. ${agent.dailyPostLimit} posts/dia</span>`
    : "";

  const linkedBlog = blogs.find((b) => b.id === agent.blogId);
  const blogDisplay = linkedBlog
    ? `<span style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle">${renderBlogFavicon(linkedBlog.baseUrl, linkedBlog.name, 22)} <span style="font-weight:500">${escapeHtml(linkedBlog.name)}</span></span>`
    : escapeHtml(blogName(agent.blogId, blogs));

    const nextRunInfo = (() => {
      if (agent.status !== "active") return '<span style="color:#94a3b8">Pausado</span>';
      if (!agent.lastRunAt) return '<span style="color:#16a34a;font-weight:500">Pronto para rodar</span>';
      const last = new Date(agent.lastRunAt).getTime();
      if (Number.isNaN(last)) return "";
      const nextMs = last + agent.scheduleMinutes * 60 * 1000;
      const diffMin = Math.round((nextMs - Date.now()) / (60 * 1000));
      if (diffMin <= 0) return '<span style="color:#16a34a;font-weight:500">Devido para rodar</span>';
      if (diffMin < 60) return `<span>Próxima: em ~${diffMin} min</span>`;
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return `<span>Próxima: em ~${hours}h${mins > 0 ? `${mins}m` : ""} (às ${new Date(nextMs).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})</span>`;
    })();

    const descText = agent.description || (isReviewer ? "Agente de revisão editorial e SEO" : isVisual ? "Agente focado em criação de imagens de alta qualidade e Pins" : "Sem descrição");

    return `<div class="agent">
  <div class="agent-head">
    <div class="agent-title">
      ${renderAvatar(agent.avatar, 42)}
      <div class="agent-title-info">
        <div class="agent-name">${escapeHtml(agent.name)} ${roleBadge} ${toolsBadge} ${sourceBadge} ${pill} ${runPill}</div>
        <p class="agent-desc" title="${escapeHtml(descText)}">${escapeHtml(descText)}</p>
      </div>
    </div>
    <div class="agent-actions">
      ${
        !isReviewer
          ? `<form method="post" action="/admin/agents/${agent.id}/run"><button ${
            running ? "disabled" : ""
          } class="button-sm" type="submit">Executar agora</button></form>`
          : ""
      }
      <form method="post" action="/admin/agents/${agent.id}/toggle"><button class="button-secondary button-sm" type="submit">${
        agent.status === "active" ? "Pausar" : "Ativar"
      }</button></form>
      <a class="button button-secondary button-sm" href="#agent-profile-${agent.id}" title="Ver perfil, métricas e produções deste agente" style="display:inline-flex;align-items:center;gap:5px;font-weight:500">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Perfil (${agent.postCount})
      </a>
      <a class="button button-secondary button-sm" href="#edit-${agent.id}">Editar</a>
      <form method="post" action="/admin/agents/${agent.id}/delete"><input type="hidden" name="confirm" value="1"><button class="button-danger button-sm" type="submit">Excluir</button></form>
    </div>
  </div>
  <div class="agent-meta">
    <span>Texto: <span style="font-weight:500">${escapeHtml(agent.model)}</span></span>
    ${agent.imageModel ? `<span>Imagem: <span style="font-weight:500">${escapeHtml(agent.imageModel)}</span></span>` : ""}
    ${
      !isReviewer
        ? `<span>Blog: ${blogDisplay}</span>
    <span>Categoria: ${
            escapeHtml(categoryLabel(agent.categoryId, categoriesByBlog[agent.blogId ?? -1] ?? []))
          }</span>`
        : `<span>Papel: Revisão e polimento de conteúdo</span>`
    }
    ${reviewerMeta}
    <span>A cada ${agent.scheduleMinutes} min</span>
    ${quotaMeta}
    <span>Posts: ${agent.postCount}</span>
    <span>Última execução: ${fmtDate(agent.lastRunAt)}</span>
    ${nextRunInfo}
  </div>
  ${agent.lastError ? `<div class="agent-error">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" style="flex-shrink:0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
    <div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><strong>Última falha:</strong> ${escapeHtml(agent.lastError)}</div>
    <a href="#agent-profile-${agent.id}" class="log-inspect-btn btn-error" style="flex-shrink:0;margin-left:auto">Ver Diagnóstico</a>
  </div>` : ""}
</div>`;
}

function agentProfileModal(agent: Agent, runs: Run[], blogs: Blog[]): string {
  const agentRuns = runs.filter((r) => r.agentId === agent.id);
  const successRuns = agentRuns.filter((r) => r.status === "success");
  const totalCost = agentRuns.reduce((acc, r) => acc + (r.cost || 0), 0);
  const totalTokens = agentRuns.reduce((acc, r) => acc + (r.tokensIn || 0) + (r.tokensOut || 0), 0);
  const blog = blogs.find((b) => b.id === agent.blogId);
  const isReviewer = agent.role === "reviewer";
  const isVisual = agent.role === "image_creator";

  const roleLabel = isReviewer
    ? " Revisor Editorial"
    : isVisual
    ? " Criador Visual (Pinterest & Capas)"
    : " Redator Autônomo";

  const rows = agentRuns.length > 0
    ? agentRuns.map((r) => {
      const pill = r.status === "success"
        ? `<button type="button" class="status-pill status-success" onclick="openRunDetails(${r.id})" title="Clique para ver os logs e detalhes desta execução">Sucesso</button>`
        : r.status === "running"
        ? `<button type="button" class="status-pill" onclick="openRunDetails(${r.id})" style="background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe" title="Clique para acompanhar esta execução em andamento"><span class="pulse-dot"></span> Gerando...</button>`
        : `<button type="button" class="status-pill status-error" onclick="openRunDetails(${r.id})" title="Clique para ver o diagnóstico e motivo do erro">Erro</button>`;
      const postText = r.postSlug
        ? `${r.postSlug}${r.postId ? ` (#${r.postId})` : ""}`
        : r.title ?? "—";
      const blogUrl = blog && r.postSlug
        ? `${blog.baseUrl.replace(/\/api\/cli\/?$/, "")}/post/${r.postSlug}`
        : null;
      const postCell = blogUrl
        ? `<a href="${escapeHtml(blogUrl)}" target="_blank" rel="noopener" style="font-weight:500;color:#0a84ff;text-decoration:none" title="Abrir post no blog">${escapeHtml(postText)} ↗</a>`
        : `<span title="${escapeHtml(postText)}">${escapeHtml(postText)}</span>`;

      const diagBtn = `<button type="button" class="log-inspect-btn ${r.status === 'error' ? 'btn-error' : ''}" onclick="openRunDetails(${r.id})" title="Ver logs detalhados e diagnóstico desta execução">
        ${r.status === 'error' ? 'Diagnóstico' : r.status === 'running' ? 'Acompanhar' : 'Ver Log'}
      </button>`;

      return `<tr>
        <td>${fmtDate(r.startedAt)}</td>
        <td>${pill}</td>
        <td>${postCell}</td>
        <td title="${escapeHtml(r.model || '—')}">${escapeHtml(r.model || '—')}</td>
        <td>${r.tokensIn}+${r.tokensOut}</td>
        <td>${fmtCost(r.cost)}</td>
        <td>${diagBtn}</td>
      </tr>`;
    }).join("")
    : '<tr><td colspan="7" class="empty" style="text-align:center;padding:28px">Nenhuma publicação gerada por este agente ainda. Clique em "Executar Agora" para gerar a primeira!</td></tr>';

  return `<div class="modal" id="agent-profile-${agent.id}"><div class="modal-backdrop"></div>
<div class="modal-panel" style="max-width:1120px;width:95vw">
  <div class="modal-head" style="align-items:flex-start">
    <div style="display:flex;align-items:center;gap:16px">
      ${renderAvatar(agent.avatar, 64)}
      <div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <h2 style="font-size:22px;margin:0">${escapeHtml(agent.name)}</h2>
          <span class="status-pill" style="background:#f1f5f9;color:#334155;font-weight:500">${roleLabel}</span>
          <span class="status-pill ${agent.status === "active" ? "status-success" : "status-error"}">${agent.status === "active" ? "Ativo" : "Pausado"}</span>
        </div>
        <p class="muted" style="margin-top:4px;font-size:13.5px">${escapeHtml(agent.description || "Sem descrição editorial cadastrada.")}</p>
      </div>
    </div>
    <a class="modal-close" href="#top">×</a>
  </div>

  ${agent.lastError ? `<div class="diag-card" style="margin-top:12px;margin-bottom:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:13px">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        Alerta da Última Execução
      </div>
      ${agentRuns.length > 0 ? `<button type="button" class="log-inspect-btn btn-error" onclick="openRunDetails(${agentRuns[0].id})">Inspecionar Diagnóstico</button>` : ''}
    </div>
    <div style="font-size:12.5px;word-break:break-word">${escapeHtml(agent.lastError)}</div>
  </div>` : ''}

  <!-- Ações e Configurações Rápidas -->
  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:rgba(248,250,252,.8);border:1px solid rgba(148,154,170,.18);border-radius:14px;margin:14px 0">
    <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:12.5px;color:#475569">
      <span>Texto: <span style="font-weight:500">${escapeHtml(agent.model)}</span></span>
      ${agent.imageModel ? `<span>Imagem: <span style="font-weight:500">${escapeHtml(agent.imageModel)} (${agent.imageAspectRatio})</span></span>` : ""}
      <span>Frequência: <span style="font-weight:500">a cada ${agent.scheduleMinutes} min</span></span>
      <span>Pinterest: <span style="font-weight:500">${agent.pinterestEnabled ? "Habilitado" : "Não"}</span></span>
      ${blog ? `<span>Blog: <span style="font-weight:500">${escapeHtml(blog.name)}</span></span>` : ""}
    </div>
    <div style="display:inline-flex;align-items:center;gap:8px">
      ${
        !isReviewer
          ? `<form method="post" action="/admin/agents/${agent.id}/run"><button class="button-sm" type="submit" style="font-weight:500">Executar Agora</button></form>`
          : ""
      }
      <a class="button button-secondary button-sm" href="#edit-${agent.id}">Editar</a>
    </div>
  </div>

  <!-- KPIs do Agente -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px">
    <div style="padding:12px;border:1px solid rgba(148,154,170,.18);border-radius:12px;background:#fff">
      <div style="font-size:11px;font-weight:500;color:#64748b;text-transform:uppercase">Total Publicado</div>
      <div style="font-size:22px;font-weight:500;color:#0f172a;margin-top:2px">${successRuns.length} posts</div>
    </div>
    <div style="padding:12px;border:1px solid rgba(148,154,170,.18);border-radius:12px;background:#fff">
      <div style="font-size:11px;font-weight:500;color:#64748b;text-transform:uppercase">Custo Acumulado</div>
      <div style="font-size:22px;font-weight:500;color:#16a34a;margin-top:2px">${fmtCost(totalCost)}</div>
    </div>
    <div style="padding:12px;border:1px solid rgba(148,154,170,.18);border-radius:12px;background:#fff">
      <div style="font-size:11px;font-weight:500;color:#64748b;text-transform:uppercase">Taxa de Sucesso</div>
      <div style="font-size:22px;font-weight:500;color:#0a84ff;margin-top:2px">${agentRuns.length > 0 ? Math.round((successRuns.length / agentRuns.length) * 100) : 100}%</div>
    </div>
    <div style="padding:12px;border:1px solid rgba(148,154,170,.18);border-radius:12px;background:#fff">
      <div style="font-size:11px;font-weight:500;color:#64748b;text-transform:uppercase">Total Tokens</div>
      <div style="font-size:20px;font-weight:500;color:#475569;margin-top:2px">${totalTokens.toLocaleString("pt-BR")}</div>
    </div>
  </div>

  <!-- Portfólio de Criações -->
  <div class="audit-wrap" style="max-height:45vh;overflow-y:auto;border-radius:14px;border:1px solid rgba(148,154,170,.18);background:#fff">
    <table style="table-layout:fixed;width:100%">
      <colgroup>
        <col style="width:100px">
        <col style="width:90px">
        <col style="width:25%">
        <col style="width:25%">
        <col style="width:75px">
        <col style="width:65px">
        <col style="width:130px">
      </colgroup>
      <thead style="position:sticky;top:0;background:#f8f9fa;z-index:2">
        <tr><th>Quando</th><th>Status</th><th>Post Publicado</th><th>Modelo</th><th>Tokens</th><th>Custo</th><th>Diagnóstico &amp; Logs</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div></div>`;

}

function runsTable(runs: Run[], agents: Agent[] = []): string {
  if (runs.length === 0) {
    return '<div class="empty">Nenhuma execução registrada ainda.</div>';
  }
  return `<div class="audit-wrap"><table style="table-layout:fixed;width:100%">
  <colgroup>
    <col style="width:95px">
    <col style="width:145px">
    <col style="width:90px">
    <col style="width:20%">
    <col style="width:20%">
    <col style="width:75px">
    <col style="width:65px">
    <col style="width:130px">
  </colgroup>
  <thead><tr><th>Quando</th><th>Agente</th><th>Status</th><th>Post</th><th>Modelo</th><th>Tokens</th><th>Custo</th><th>Diagnóstico &amp; Logs</th></tr></thead>
  <tbody>${runs.map((r) => runRow(r, agents)).join("")}</tbody></table></div>`;
}

function runRow(run: Run, agents: Agent[] = []): string {
  const pill = run.status === "success"
    ? `<button type="button" class="status-pill status-success" onclick="openRunDetails(${run.id})" title="Clique para ver os logs e detalhes desta execução">Sucesso</button>`
    : run.status === "running"
    ? `<button type="button" class="status-pill" onclick="openRunDetails(${run.id})" style="background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe" title="Clique para acompanhar esta execução em andamento"><span class="pulse-dot"></span> Gerando...</button>`
    : `<button type="button" class="status-pill status-error" onclick="openRunDetails(${run.id})" title="Clique para ver o diagnóstico e motivo do erro">Erro</button>`;
  const post = run.postSlug
    ? `${run.postSlug}${run.postId ? ` (#${run.postId})` : ""}`
    : run.title ?? "—";
  const model = run.model || "—";
  const agent = agents.find((a) => a.id === run.agentId);
  const agentName = agent ? agent.name : `Agente #${run.agentId}`;
  const agentAvatar = agent ? renderAvatar(agent.avatar, 22) : "";

  const diagBtn = `<button type="button" class="log-inspect-btn ${run.status === 'error' ? 'btn-error' : ''}" onclick="openRunDetails(${run.id})" title="Ver logs detalhados e diagnóstico desta execução">
    ${run.status === 'error' ? 'Diagnóstico' : run.status === 'running' ? 'Acompanhar' : 'Ver Log'}
  </button>`;

  return `<tr>
  <td>${fmtDate(run.startedAt)}</td>
  <td title="Ver perfil de ${escapeHtml(agentName)}">
    <a href="#agent-profile-${run.agentId}" style="display:inline-flex;align-items:center;gap:6px;max-width:100%;overflow:hidden;color:inherit;text-decoration:none">
      ${agentAvatar}
      <span style="font-weight:500;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#0a84ff">${escapeHtml(agentName)}</span>
    </a>
  </td>
  <td>${pill}</td>
  <td title="${escapeHtml(post)}">${escapeHtml(post)}</td>
  <td title="${escapeHtml(model)}">${escapeHtml(model)}</td>
  <td>${run.tokensIn}+${run.tokensOut}</td>
  <td>${fmtCost(run.cost)}</td>
  <td>${diagBtn}</td>
</tr>`;
}

function allRunsModal(runs: Run[], agents: Agent[] = []): string {
  const successCount = runs.filter((r) => r.status === "success").length;
  const errorCount = runs.filter((r) => r.status === "error").length;

  return `<div id="all-runs" class="modal">
  <a class="modal-backdrop" href="#top" aria-label="Fechar"></a>
  <div class="modal-panel" style="max-width:1140px;width:95vw">
    <div class="modal-head">
      <div>
        <p class="eyebrow">Auditoria &amp; Logs</p>
        <h2>Histórico Completo de Execuções</h2>
        <p class="muted">Pesquise por títulos, modelos, agentes ou mensagens de erro.</p>
      </div>
      <a class="modal-close" href="#top" aria-label="Fechar">×</a>
    </div>

    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px">
      <div style="flex:1;min-width:240px;max-width:420px">
        <input id="runs-search" class="cb-input" type="text" placeholder="Pesquisar por post, agente, modelo, erro…" autocomplete="off">
      </div>
      <div style="display:inline-flex;align-items:center;gap:6px">
        <button type="button" class="cat-chip runs-filter-chip active" data-status="all" style="cursor:pointer;font-weight:500">Todos (${runs.length})</button>
        <button type="button" class="cat-chip runs-filter-chip" data-status="success" style="cursor:pointer;background:#f0fdf4;color:#166534;border-color:#bbf7d0;font-weight:500">Sucesso (${successCount})</button>
        <button type="button" class="cat-chip runs-filter-chip" data-status="error" style="cursor:pointer;background:#fef2f2;color:#991b1b;border-color:#fecaca;font-weight:500">Erros (${errorCount})</button>
      </div>
    </div>

    <div class="audit-wrap" style="max-height:58vh;overflow-y:auto;border-radius:14px;border:1px solid rgba(148,154,170,.18);background:#fff">
      <table style="table-layout:fixed;width:100%">
        <colgroup>
          <col style="width:100px">
          <col style="width:145px">
          <col style="width:90px">
          <col style="width:20%">
          <col style="width:20%">
          <col style="width:75px">
          <col style="width:65px">
          <col style="width:130px">
        </colgroup>
        <thead style="position:sticky;top:0;background:#f8f9fa;z-index:2">
          <tr><th>Quando</th><th>Agente</th><th>Status</th><th>Post</th><th>Modelo</th><th>Tokens</th><th>Custo</th><th>Diagnóstico &amp; Logs</th></tr>
        </thead>
        <tbody id="all-runs-tbody">
          ${runs.map((r) => allRunsRow(r, agents)).join("")}
        </tbody>
      </table>
      <div id="all-runs-empty" class="empty" style="display:none;margin:20px">
        Nenhuma execução encontrada para os termos pesquisados.
      </div>
    </div>
  </div>
</div>`;
}

function allRunsRow(run: Run, agents: Agent[] = []): string {
  const pill = run.status === "success"
    ? `<button type="button" class="status-pill status-success" onclick="openRunDetails(${run.id})" title="Clique para ver os logs e detalhes desta execução">Sucesso</button>`
    : run.status === "running"
    ? `<button type="button" class="status-pill" onclick="openRunDetails(${run.id})" style="background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe" title="Clique para acompanhar esta execução em andamento"><span class="pulse-dot"></span> Gerando...</button>`
    : `<button type="button" class="status-pill status-error" onclick="openRunDetails(${run.id})" title="Clique para ver o diagnóstico e motivo do erro">Erro</button>`;
  const post = run.postSlug
    ? `${run.postSlug}${run.postId ? ` (#${run.postId})` : ""}`
    : run.title ?? "—";
  const model = run.model || "—";
  const error = run.error || (run.status === "running" ? "Em andamento..." : "—");
  const agent = agents.find((a) => a.id === run.agentId);
  const agentName = agent ? agent.name : `Agente #${run.agentId}`;
  const agentAvatar = agent ? renderAvatar(agent.avatar, 22) : "";
  const searchBlob = `${fmtDate(run.startedAt)} ${agentName} Agente #${run.agentId} ${run.status} ${post} ${model} ${error}`;

  const diagBtn = `<button type="button" class="log-inspect-btn ${run.status === 'error' ? 'btn-error' : ''}" onclick="openRunDetails(${run.id})" title="Ver logs detalhados e diagnóstico desta execução">
    ${run.status === 'error' ? 'Diagnóstico' : run.status === 'running' ? 'Acompanhar' : 'Ver Log'}
  </button>`;

  return `<tr class="all-runs-row" data-search="${escapeHtml(searchBlob)}" data-status="${escapeHtml(run.status)}">
  <td>${fmtDate(run.startedAt)}</td>
  <td title="${escapeHtml(agentName)} (#${run.agentId})">
    <div style="display:inline-flex;align-items:center;gap:6px;max-width:100%;overflow:hidden">
      ${agentAvatar}
      <span style="font-weight:500;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(agentName)}</span>
    </div>
  </td>
  <td>${pill}</td>
  <td title="${escapeHtml(post)}">${escapeHtml(post)}</td>
  <td title="${escapeHtml(model)}">${escapeHtml(model)}</td>
  <td>${run.tokensIn}+${run.tokensOut}</td>
  <td>${fmtCost(run.cost)}</td>
  <td>${diagBtn}</td>
</tr>`;
}

function allRunsModalJs(): string {
  return `<script>
(function(){
  var searchInput = document.getElementById("runs-search");
  if (!searchInput) return;
  var statusFilter = "all";
  var chips = document.querySelectorAll(".runs-filter-chip");
  var rows = document.querySelectorAll(".all-runs-row");
  var emptyMsg = document.getElementById("all-runs-empty");

  function filter() {
    var q = searchInput.value.toLowerCase().trim();
    var visible = 0;
    rows.forEach(function(row) {
      var text = (row.getAttribute("data-search") || "").toLowerCase();
      var st = row.getAttribute("data-status") || "";
      var matchText = !q || text.indexOf(q) !== -1;
      var matchStatus = statusFilter === "all" || st === statusFilter;
      if (matchText && matchStatus) {
        row.style.display = "";
        visible++;
      } else {
        row.style.display = "none";
      }
    });
    if (emptyMsg) {
      emptyMsg.style.display = visible === 0 ? "block" : "none";
    }
  }

  searchInput.addEventListener("input", filter);
  chips.forEach(function(chip) {
    chip.addEventListener("click", function(e) {
      e.preventDefault();
      chips.forEach(function(c) { c.classList.remove("active"); });
      chip.classList.add("active");
      statusFilter = chip.getAttribute("data-status") || "all";
      filter();
    });
  });
})();
</script>`;
}

function categoryLabel(id: number, categories: CategoryInfo[]): string {
  const found = categories.find((c) => c.id === id);
  return found ? found.name : categoryName(id);
}

function blogName(blogId: number | null, blogs: Blog[]): string {
  if (blogId === null) return "Sem blog";
  const found = blogs.find((b) => b.id === blogId);
  return found ? found.name : `Blog #${blogId} (excluído)`;
}

function blogCategoryFields(
  prefix: string,
  blogs: Blog[],
  agent: { blogId: number | null; categoryId: number } | null,
): string {
  const selectedBlog = agent ? agent.blogId : null;
  const options = blogs.length > 0
    ? blogs.map((b) =>
      `<option value="${b.id}"${b.id === selectedBlog ? " selected" : ""}>${
        escapeHtml(b.name)
      }</option>`
    ).join("")
    : '<option value="" selected disabled>Cadastre um blog em Configurações</option>';
  return `<div class="blogcat" data-blogcat data-required="${agent ? "0" : "1"}" data-cat="${
    agent ? agent.categoryId : ""
  }">
  <div><label for="blog_id-${prefix}">Blog de publicação</label><select id="blog_id-${prefix}" name="blog_id" data-role="blog" required>${options}</select></div>
  <div><label for="category_id-${prefix}">Categoria do blog</label><select id="category_id-${prefix}" name="category_id" data-role="category" required></select></div>
</div>`;
}

function blogCategoryJs(
  blogs: Blog[],
  categoriesByBlog: Record<number, CategoryInfo[]>,
): string {
  return `<script>
(function(){
  var CATS = ${JSON.stringify(categoriesByBlog)};
  var FALLBACK = ${JSON.stringify([1, 2, 3, 4].map((id) => ({ id, name: categoryName(id) })))};
  document.querySelectorAll("[data-blogcat]").forEach(function(pair){
    var blogSel=pair.querySelector("[data-role=blog]"), catSel=pair.querySelector("[data-role=category]");
    function fill(blogId){
      var list=(CATS[blogId]||[]).length?CATS[blogId]:FALLBACK;
      var want=Number(pair.getAttribute("data-cat"))||0;
      catSel.innerHTML="";
      if(pair.getAttribute("data-required")==="1"){
        var ph=document.createElement("option");
        ph.value="";ph.textContent="Selecione a categoria…";ph.disabled=true;ph.selected=true;
        catSel.appendChild(ph);
      }
      var found=false;
      list.forEach(function(c){
        var o=document.createElement("option");
        o.value=c.id;o.textContent=c.name;
        if(c.id===want){o.selected=true;found=true}
        catSel.appendChild(o);
      });
      if(!found&&pair.getAttribute("data-required")!=="1")catSel.selectedIndex=0;
    }
    blogSel.addEventListener("change",function(){
      pair.setAttribute("data-cat","");
      fill(blogSel.value);
    });
    if(blogSel.value)fill(blogSel.value);
  });
})();
</script>`;
}

function modelCombobox(
  prefix: string,
  fieldName: string,
  value: string,
  models: ModelInfo[],
  imageOnly = false,
): string {
  const filtered = imageOnly ? models.filter((m) => m.image) : models;
  const source = filtered.length > 0
    ? filtered
    : imageOnly
    ? DEFAULT_IMAGE_MODELS.map((id) => ({ id, name: id, image: true }))
    : MODEL_SUGGESTIONS.map((id) => ({ id, name: id, image: false }));
  const selected = source.find((m) => m.id === value);
  const display = value ? (selected ? selected.name : value) : "";
  return `<div class="combobox" data-cb${imageOnly ? ' data-image="1"' : ""}>
  <input class="cb-input" id="model-cb-${prefix}" type="text" placeholder="Pesquisar modelo…" autocomplete="off" value="${
    escapeHtml(display)
  }">
  <input class="cb-hidden" type="hidden" name="${escapeHtml(fieldName)}" value="${
    escapeHtml(value)
  }"${fieldName === "model" ? " required" : ""}>
  <div class="cb-list" hidden></div>
</div>`;
}
function modelComboboxJs(models: ModelInfo[]): string {
  return `<script>
(function(){
  var MODELS = ${JSON.stringify(models)};
  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
  document.querySelectorAll("[data-cb]").forEach(function(cb){
    var input=cb.querySelector(".cb-input"), hidden=cb.querySelector(".cb-hidden"), listEl=cb.querySelector(".cb-list");
    var imageOnly=cb.getAttribute("data-image")==="1";
    var items=imageOnly?MODELS.filter(function(m){return m.image}):MODELS;
    function render(q){
      q=(q||"").trim().toLowerCase();
      var shown=items.filter(function(m){return q===""||m.id.toLowerCase().indexOf(q)>-1||(m.name||"").toLowerCase().indexOf(q)>-1}).slice(0,80);
      if(shown.length===0){listEl.innerHTML='<div class="cb-empty">Nenhum modelo encontrado</div>';return}
      listEl.innerHTML=shown.map(function(m){
        var badges = '';
        if(m.isFree) badges += '<span class="model-badge badge-free">GRÁTIS</span>';
        if(m.image) badges += '<span class="model-badge badge-img">IMAGEM</span>';
        if(m.inputModalities && m.inputModalities.indexOf('image') > -1) badges += '<span class="model-badge badge-vision">VISION</span>';
        if(m.contextLength) badges += '<span class="model-badge badge-ctx">' + Math.round(m.contextLength/1000) + 'k</span>';
        return '<div class="cb-option" data-id="'+esc(m.id)+'" tabindex="0">' +
          '<div class="cb-opt-header"><span class="cb-opt-id">'+esc(m.id)+'</span><span class="cb-opt-badges">'+badges+'</span></div>' +
          '<span class="cb-opt-name">'+esc(m.name||"")+'</span></div>';
      }).join("");
    }
    function syncValue(){
      var val=(input.value||"").trim().replace(/^[~]+/,"").trim();
      var match=items.filter(function(m){return (m.id&&m.id.toLowerCase()===val.toLowerCase())||(m.name&&m.name.toLowerCase()===val.toLowerCase())})[0];
      hidden.value=match?match.id:val;
    }
    function pick(m){hidden.value=m.id;input.value=m.name||m.id;listEl.hidden=true}
    function close(){listEl.hidden=true}
    input.addEventListener("input",function(){syncValue();render(input.value);listEl.hidden=false});
    input.addEventListener("change",syncValue);
    input.addEventListener("blur",function(){setTimeout(function(){syncValue();close()},250)});
    input.addEventListener("focus",function(){if(items.length===0)return;render(input.value);listEl.hidden=false});
    input.addEventListener("keydown",function(e){
      if(e.key==="ArrowDown"){e.preventDefault();var o=listEl.querySelectorAll(".cb-option");if(o.length)o[0].focus()}
      else if(e.key==="Enter"){e.preventDefault();var o=listEl.querySelectorAll(".cb-option");if(o.length)o[0].click()}
      else if(e.key==="Escape")close();
    });
    listEl.addEventListener("click",function(e){
      var o=e.target.closest(".cb-option");
      if(o){var m=items.filter(function(x){return x.id===o.getAttribute("data-id")})[0];if(m)pick(m)}
    });
    listEl.addEventListener("keydown",function(e){
      if(e.key==="ArrowDown"||e.key==="ArrowUp"){
        e.preventDefault();
        var o=listEl.querySelectorAll(".cb-option"),i=Array.prototype.indexOf.call(o,document.activeElement);
        var n=e.key==="ArrowDown"?Math.min(i+1,o.length-1):Math.max(i-1,0);
        if(o[n])o[n].focus();
      }else if(e.key==="Enter"){e.preventDefault();if(document.activeElement&&document.activeElement.click)document.activeElement.click()}
      else if(e.key==="Escape"){close();input.focus()}
    });
    document.addEventListener("click",function(e){if(!cb.contains(e.target))close()});
  });
})();
</script>`;
}

function newAgentModal(
  defaultModel: string,
  defaultImageModel: string = "",
  models: ModelInfo[],
  blogs: Blog[],
  categoriesByBlog: Record<number, CategoryInfo[]>,
  allAgents: Agent[] = [],
): string {
  void categoriesByBlog;
  const reviewers = allAgents.filter((a) => a.role === "reviewer");
  return `<div class="modal" id="new-agent"><div class="modal-backdrop"></div>
<div class="modal-panel">
  <div class="modal-head"><div><p class="eyebrow">Novo</p><h2>Criar agente</h2></div><a class="modal-close" href="#top">×</a></div>
  <form class="form-stack" method="post" enctype="multipart/form-data" action="/admin/agents">
  <div><label for="name">Nome do agente</label><input id="name" name="name" required minlength="2" maxlength="60" placeholder="Ex.: Agente IA do dia"></div>
  <div>
    <label>Foto / Avatar do Agente (Badge Redonda 2.5D)</label>
    <div style="display:grid;gap:10px;padding:12px;border:1px solid #dcdee2;border-radius:14px;background:rgba(255,255,255,.5)">
      <div>
        <label for="avatar_file_new" style="font-size:12px;font-weight:normal;color:#475569">Enviar foto do seu computador:</label>
        <input id="avatar_file_new" name="avatar_file" type="file" accept="image/*" style="padding:6px;min-height:38px">
      </div>
      <div>
        <span style="font-size:12px;font-weight:normal;color:#475569">Ou selecione um ícone estilizado 2.5D:</span>
        <div class="avatar-picker">
          ${AVATAR_PRESETS.map((p) => `
            <label class="avatar-opt" title="${p.label}">
              <input type="radio" name="avatar" value="${p.id}" ${p.id === "bot" ? "checked" : ""}>
              <div class="badge-25d" style="width:40px;height:40px"><div class="badge-25d-inner" style="background:${p.bg}">${p.icon}</div></div>
            </label>
          `).join("")}
        </div>
      </div>
      <div>
        <label for="avatar_url_new" style="font-size:12px;font-weight:normal;color:#475569">Ou informe uma URL de imagem externa:</label>
        <input id="avatar_url_new" name="avatar_url" placeholder="https://exemplo.com/avatar.png" style="min-height:38px">
      </div>
    </div>
  </div>
  <div>
    <label for="role-new">Papel do agente</label>
    <select id="role-new" name="role">
      <option value="writer" selected>Redator de Artigos (Gera artigos completos com SEO)</option>
      <option value="image_creator">Criador Visual / Pinterest (Foco em imagens de alta qualidade e Pins)</option>
      <option value="reviewer">Revisor / Editor-Chefe (Valida e aprimora rascunhos)</option>
    </select>
  </div>
  <div>
    <label for="aspect-new">Proporção / Formato da Imagem</label>
    <select id="aspect-new" name="image_aspect_ratio">
      <option value="9:16" selected>9:16 (Vertical / Stories / Pinterest)</option>
      <option value="16:9">16:9 (Horizontal / Capa Widescreen)</option>
      <option value="1:1">1:1 (Quadrado / Feed / Card)</option>
    </select>
  </div>
  <div>
    <label for="reviewer-new">Revisor vinculado (opcional para Redatores)</label>
    <select id="reviewer-new" name="reviewer_id">
      <option value="">Nenhum (Publicação direta sem revisão)</option>
      ${reviewers.map((r) => `<option value="${r.id}">${escapeHtml(r.name)} (${escapeHtml(r.model)})</option>`).join("")}
    </select>
    <p class="field-help">Se definido, os rascunhos deste redator serão revisados por este agente antes da publicação.</p>
  </div>
  <div><label for="description">Descrição / foco</label><textarea id="description" name="description" placeholder="Ex.: Notícias e tutoriais sobre inteligência artificial"></textarea></div>
  <div>
    <label for="model-cb-new">Modelo de Texto / IA (OpenRouter)</label>
    ${modelCombobox("new", "model", defaultModel, models, false)}
    <p class="field-help">Gera o texto (artigo longo ou copy/texto de Pin) e títulos SEO.</p>
  </div>
  <div>
    <label for="model-cb-new-img">Modelo de Imagem (OpenRouter)</label>
    ${modelCombobox("new-img", "image_model", defaultImageModel, models, true)}
    <p class="field-help">Gera a arte visual no formato selecionado (9:16, 16:9 ou 1:1).</p>
  </div>
  <div>
    <label for="image_source_mode_new">Fonte da Imagem de Capa / Pin</label>
    <select id="image_source_mode_new" name="image_source_mode">
      <option value="ai_only">Geração IA (OpenRouter - Flux / SD)</option>
      <option value="pexels_only">Fotos Reais Pexels (100% Grátis & Banco de Fotos)</option>
      <option value="hybrid">Modo Híbrido (Alterna Pexels e IA)</option>
      <option value="auto_cost">Auto-Cost Inteligente (Equilibra gasto conforme saldo)</option>
    </select>
    <p class="field-help">Escolha se o agente gera com IA, pega fotos reais do Pexels ou equilibra automaticamente para economizar créditos.</p>
  </div>
  ${blogCategoryFields("new", blogs, null)}
  <div><label for="prompt">Instruções extras / Diretrizes visuais (opcional)</label><textarea id="prompt" name="prompt" placeholder="Ex.: Foque em estética minimalista, iluminação cinematográfica e cores vibrantes."></textarea></div>
  <div><label for="daily_post_limit_new">Cota diária deste agente (máx. posts/dia)</label><input id="daily_post_limit_new" name="daily_post_limit" type="number" min="0" value="0"><p class="field-help">0 = segue o limite padrão global das Configurações.</p></div>
  <div><label for="schedule_minutes">Frequência (minutos)</label><input id="schedule_minutes" name="schedule_minutes" type="number" min="15" value="720"></div>
  <div><label for="max_tokens">Máx. tokens de resposta</label><input id="max_tokens" name="max_tokens" type="number" min="512" max="65536" value="8192"></div>
  <div class="check-group">
    <label class="checkbox-label"><input type="checkbox" name="tools_enabled">Pesquisa Web & Tools (Agent SDK)</label>
    <label class="checkbox-label"><input type="checkbox" name="publish_to_blog" checked>Publicar no blog</label>
    <label class="checkbox-label"><input type="checkbox" name="pinterest_enabled" checked>Pinterest</label>
    <label class="checkbox-label"><input type="checkbox" name="image_gen" checked>Gerar imagem de capa / Pin</label>
    <label class="checkbox-label"><input type="checkbox" name="status_active" checked>Ativo (agendado)</label>
  </div>
  <button type="submit">Criar agente</button>
</form></div></div>`;
}

function editModal(
  agent: Agent,
  models: ModelInfo[],
  blogs: Blog[],
  categoriesByBlog: Record<number, CategoryInfo[]>,
  allAgents: Agent[] = [],
): string {
  void categoriesByBlog;
  const reviewers = allAgents.filter((a) => a.role === "reviewer" && a.id !== agent.id);
  const isReviewer = agent.role === "reviewer";
  const isVisual = agent.role === "image_creator";
  return `<div class="modal" id="edit-${agent.id}"><div class="modal-backdrop"></div>
<div class="modal-panel">
  <div class="modal-head"><div><p class="eyebrow">Editar agente</p><h2>${
    escapeHtml(agent.name)
  }</h2></div><a class="modal-close" href="#top">×</a></div>
  <form class="form-stack" method="post" enctype="multipart/form-data" action="/admin/agents/${agent.id}/update">
    <div><label for="name-${agent.id}">Nome do agente</label><input id="name-${agent.id}" name="name" required minlength="2" maxlength="60" value="${
    escapeHtml(agent.name)
  }"></div>
    <div>
      <label>Foto / Avatar do Agente (Badge Redonda 2.5D)</label>
      <div style="display:grid;gap:10px;padding:12px;border:1px solid #dcdee2;border-radius:14px;background:rgba(255,255,255,.5)">
        <div style="display:flex;align-items:center;gap:12px">
          ${renderAvatar(agent.avatar, 52)}
          <div>
            <label for="avatar_file_${agent.id}" style="font-size:12px;font-weight:normal;color:#475569">Substituir foto (upload):</label>
            <input id="avatar_file_${agent.id}" name="avatar_file" type="file" accept="image/*" style="padding:6px;min-height:38px">
          </div>
        </div>
        <div>
          <span style="font-size:12px;font-weight:normal;color:#475569">Ou selecione um ícone estilizado 2.5D:</span>
          <div class="avatar-picker">
            ${AVATAR_PRESETS.map((p) => `
              <label class="avatar-opt" title="${p.label}">
                <input type="radio" name="avatar" value="${p.id}" ${p.id === agent.avatar ? "checked" : ""}>
                <div class="badge-25d" style="width:40px;height:40px"><div class="badge-25d-inner" style="background:${p.bg}">${p.icon}</div></div>
              </label>
            `).join("")}
          </div>
        </div>
        <div>
          <label for="avatar_url_${agent.id}" style="font-size:12px;font-weight:normal;color:#475569">Ou informe uma URL de imagem externa:</label>
          <input id="avatar_url_${agent.id}" name="avatar_url" value="${agent.avatar && (agent.avatar.startsWith('http') || agent.avatar.startsWith('data:')) ? escapeHtml(agent.avatar) : ''}" placeholder="https://exemplo.com/avatar.png" style="min-height:38px">
        </div>
      </div>
    </div>
    <div>
      <label for="role-edit-${agent.id}">Papel do agente</label>
      <select id="role-edit-${agent.id}" name="role">
        <option value="writer" ${!isReviewer && !isVisual ? "selected" : ""}>Redator de Artigos (Gera artigos completos com SEO)</option>
        <option value="image_creator" ${isVisual ? "selected" : ""}>Criador Visual / Pinterest (Foco em imagens de alta qualidade e Pins)</option>
        <option value="reviewer" ${isReviewer ? "selected" : ""}>Revisor / Editor-Chefe (Valida e aprimora rascunhos)</option>
      </select>
    </div>
    <div>
      <label for="aspect-edit-${agent.id}">Proporção / Formato da Imagem</label>
      <select id="aspect-edit-${agent.id}" name="image_aspect_ratio">
        <option value="9:16" ${agent.imageAspectRatio === "9:16" ? "selected" : ""}>9:16 (Vertical / Stories / Pinterest)</option>
        <option value="16:9" ${agent.imageAspectRatio === "16:9" ? "selected" : ""}>16:9 (Horizontal / Capa Widescreen)</option>
        <option value="1:1" ${agent.imageAspectRatio === "1:1" ? "selected" : ""}>1:1 (Quadrado / Feed / Card)</option>
      </select>
    </div>
    <div>
      <label for="reviewer-edit-${agent.id}">Revisor vinculado (opcional)</label>
      <select id="reviewer-edit-${agent.id}" name="reviewer_id">
        <option value="">Nenhum (Publicação direta sem revisão)</option>
        ${reviewers.map((r) => `<option value="${r.id}" ${agent.reviewerId === r.id ? "selected" : ""}>${escapeHtml(r.name)} (${escapeHtml(r.model)})</option>`).join("")}
      </select>
    </div>
    <div><label for="description-${agent.id}">Descrição / foco</label><textarea id="description-${agent.id}" name="description">${
    escapeHtml(agent.description)
  }</textarea></div>
    <div>
      <label for="model-cb-edit-${agent.id}">Modelo de Texto / IA (OpenRouter)</label>
      ${modelCombobox(`edit-${agent.id}`, "model", agent.model, models, false)}
      <p class="field-help">Gera o texto (artigo longo ou copy/texto de Pin) e títulos SEO.</p>
    </div>
    <div>
      <label for="model-cb-edit-img-${agent.id}">Modelo de Imagem (OpenRouter)</label>
      ${modelCombobox(`edit-img-${agent.id}`, "image_model", agent.imageModel, models, true)}
      <p class="field-help">Gera a arte visual no formato selecionado (9:16, 16:9 ou 1:1).</p>
    </div>
    <div>
      <label for="image_source_mode_edit_${agent.id}">Fonte da Imagem de Capa / Pin</label>
      <select id="image_source_mode_edit_${agent.id}" name="image_source_mode">
        <option value="ai_only" ${agent.imageSourceMode === "ai_only" ? "selected" : ""}>Geração IA (OpenRouter - Flux / SD)</option>
        <option value="pexels_only" ${agent.imageSourceMode === "pexels_only" ? "selected" : ""}>Fotos Reais Pexels (100% Grátis & Banco de Fotos)</option>
        <option value="hybrid" ${agent.imageSourceMode === "hybrid" ? "selected" : ""}>Modo Híbrido (Alterna Pexels e IA)</option>
        <option value="auto_cost" ${agent.imageSourceMode === "auto_cost" ? "selected" : ""}>Auto-Cost Inteligente (Equilibra gasto conforme saldo)</option>
      </select>
      <p class="field-help">Escolha se o agente gera com IA, pega fotos reais do Pexels ou equilibra automaticamente para economizar créditos.</p>
    </div>
    ${blogCategoryFields(`edit-${agent.id}`, blogs, agent)}
    <div><label for="prompt-${agent.id}">Instruções extras / Diretrizes visuais (opcional)</label><textarea id="prompt-${agent.id}" name="prompt">${
    escapeHtml(agent.prompt)
  }</textarea></div>
    <div><label for="daily_post_limit_edit_${agent.id}">Cota diária deste agente (máx. posts/dia)</label><input id="daily_post_limit_edit_${agent.id}" name="daily_post_limit" type="number" min="0" value="${agent.dailyPostLimit || 0}"><p class="field-help">0 = segue o limite padrão global das Configurações.</p></div>
    <div><label for="schedule_minutes-${agent.id}">Frequência (minutos)</label><input id="schedule_minutes-${agent.id}" name="schedule_minutes" type="number" min="15" value="${agent.scheduleMinutes}"></div>
    <div><label for="max_tokens-${agent.id}">Máx. tokens de resposta</label><input id="max_tokens-${agent.id}" name="max_tokens" type="number" min="512" max="65536" value="${agent.maxTokens}"></div>
    <div class="check-group">
      <label class="checkbox-label"><input type="checkbox" name="tools_enabled" ${
    agent.toolsEnabled ? "checked" : ""
  }>Pesquisa Web & Tools (Agent SDK)</label>
      <label class="checkbox-label"><input type="checkbox" name="publish_to_blog" ${
    agent.publishToBlog ? "checked" : ""
  }>Publicar no blog</label>
      <label class="checkbox-label"><input type="checkbox" name="pinterest_enabled" ${
    agent.pinterestEnabled ? "checked" : ""
  }>Pinterest</label>
      <label class="checkbox-label"><input type="checkbox" name="image_gen" ${
    agent.imageGen ? "checked" : ""
  }>Gerar imagem de capa / Pin</label>
      <label class="checkbox-label"><input type="checkbox" name="status_active" ${
    agent.status === "active" ? "checked" : ""
  }>Ativo (agendado)</label>
    </div>
    <button type="submit">Salvar alterações</button>
  </form>
</div></div>`;
}

export interface SettingsPageData {
  settings: PanelSettings;
  msg: string | null;
  msgError: boolean;
  models: ModelInfo[];
  blogs: Blog[];
  categoriesByBlog: Record<number, CategoryInfo[]>;
  isServerless?: boolean;
  isDenoDeploy?: boolean;
  cronUrl?: string;
  hasCronToken?: boolean;
}

function blogCards(
  blogs: Blog[],
  categoriesByBlog: Record<number, CategoryInfo[]>,
): string {
  if (blogs.length === 0) {
    return '<div class="empty">Nenhum blog cadastrado ainda.</div>';
  }
  return `<div class="blog-list">${
    blogs.map((b) => {
      const cats = categoriesByBlog[b.id] ?? [];
      const catBadges = cats.length > 0
        ? cats.map((c) => `<span class="cat-chip">${escapeHtml(c.name)}</span>`).join("")
        : '<span class="cat-chip" style="opacity:.6">Sem categorias</span>';
      return `<div class="blog-row" style="display:flex;align-items:center;gap:14px">
        ${renderBlogFavicon(b.baseUrl, b.name, 48)}
        <div class="blog-main" style="flex:1;min-width:0">
          <div class="blog-name">${escapeHtml(b.name)}</div>
          <div class="blog-url">${escapeHtml(b.baseUrl)}</div>
          <div class="blog-cats">${catBadges}</div>
        </div>
        <form method="post" action="/admin/blogs/${b.id}/delete">
          <button class="button-danger button-sm" type="submit" onclick="return confirm('Excluir este blog?')">Excluir</button>
        </form>
      </div>`;
    }).join("")
  }</div>`;
}

export function renderSettingsTab(data: DashboardData): string {
  const s = data.settings || {
    openrouterApiKey: "",
    chatModel: "",
    pexelsApiKey: "",
    maxDailyPostsPerAgent: 0,
    maxDailyPostsGlobal: 0,
    dailyBudgetUsd: 0,
    minCreditBalance: 0,
    cooldownSeconds: 0,
  };

  const cronCard = data.isServerless || data.hasCronToken
    ? `<section class="card" style="grid-column: 1 / -1">
    <div class="section-head"><div><p class="eyebrow">Agendamento Externo</p><h2>Gatilho Cron (Deno Deploy / Nuvem)</h2><p class="muted">Em plataformas serverless sem processos contínuos, use esta URL protegida no cron da sua hospedagem para executar os agentes devidos.</p></div></div>
    <div class="form-stack">
      <div>
        <label for="cron-url">URL do Webhook Cron</label>
        <div style="display:flex;gap:8px">
          <input id="cron-url" readonly value="${escapeHtml(data.cronUrl ?? "")}">
          <button type="button" class="button-secondary" onclick="navigator.clipboard.writeText(document.getElementById('cron-url').value);this.innerText='Copiado!';setTimeout(()=>this.innerText='Copiar',2000)">Copiar</button>
        </div>
        ${
          !data.hasCronToken
            ? '<p class="field-help" style="color:#8b2d2d"><span style="font-weight:500">Aviso:</span>A variável <code>CRON_TOKEN</code> não está definida no seu ambiente. Configure-a no painel do host para proteger o endpoint.</p>'
            : '<p class="field-help">Configure um gatilho Cron no painel da sua hospedagem chamando esta URL (ex.: a cada 1 hora).</p>'
        }
      </div>
    </div>
  </section>`
    : "";

  return `
  <div class="settings-grid">
  ${cronCard}
  <section class="card" style="grid-column: 1 / -1">
    <div class="section-head">
      <div>
        <p class="eyebrow">Motor de Inteligência Artificial</p>
        <h2>OpenRouter & Multi-Chaves de Fallback</h2>
        <p class="muted">Gerencie suas chaves do OpenRouter com failover automático. Se a chave principal sofrer rate limit (429) ou zerar créditos, o sistema rotaciona automaticamente para as chaves reservas.</p>
      </div>
    </div>
    <form class="form-stack" method="post" action="/admin/settings">
      <input type="hidden" name="max_daily_posts_per_agent" value="${s.maxDailyPostsPerAgent}">
      <input type="hidden" name="max_daily_posts_global" value="${s.maxDailyPostsGlobal}">
      <input type="hidden" name="daily_budget_usd" value="${s.dailyBudgetUsd}">
      <input type="hidden" name="cooldown_seconds" value="${s.cooldownSeconds}">
      <input type="hidden" name="pexels_api_key" value="${escapeHtml(s.pexelsApiKey)}">
      
      <div style="display:grid;grid-template-columns:1fr;gap:16px">
        <div>
          <label for="openrouter_api_key">Chave Principal do OpenRouter</label>
          <input id="openrouter_api_key" name="openrouter_api_key" placeholder="sk-or-v1-..." value="${escapeHtml(s.openrouterApiKey)}">
          <p class="field-help">Chave principal usada para geração de textos, imagens e execução de ferramentas nos agentes.</p>
        </div>

        <div>
          <label for="openrouter_backup_keys">Chaves de Reserva / Fallback do OpenRouter (Multi-Chaves)</label>
          <textarea id="openrouter_backup_keys" name="openrouter_backup_keys" rows="3" placeholder="sk-or-v1-chave-reserva-1&#10;sk-or-v1-chave-reserva-2">${escapeHtml(s.openrouterBackupKeys || "")}</textarea>
          <p class="field-help">Cole aqui outras chaves do OpenRouter (uma por linha). O sistema troca de chave instantaneamente em caso de erro 429 ou falta de saldo.</p>
        </div>

        <div>
          <label for="model-cb-chat">Modelo Padrão do Chat (/chat)</label>
          ${modelCombobox("chat", "chat_model", s.chatModel, data.models)}
          <p class="field-help">Modelo usado por padrão nas conversas do chat com o Agent OS (<code>/chat</code>).</p>
        </div>

        <details style="border:1px solid rgba(148,154,170,.22);border-radius:14px;padding:14px;background:rgba(255,255,255,.5)">
          <summary style="font-weight:500;font-size:13.5px;color:#475569;cursor:pointer;user-select:none">
             Provedores Diretos Avançados (Groq, Gemini, OpenAI, Claude, DeepSeek, Ollama)
          </summary>
          <p class="field-help" style="margin:8px 0 14px">Opcional: use caso queira conectar APIs proprietárias diretas em vez do OpenRouter.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
            <div>
              <label for="groq_api_key">Groq Cloud (gsk_...)</label>
              <input id="groq_api_key" name="groq_api_key" placeholder="gsk_..." value="${escapeHtml(s.groqApiKey || "")}">
            </div>
            <div>
              <label for="gemini_api_key">Google Gemini (AIzaSy...)</label>
              <input id="gemini_api_key" name="gemini_api_key" placeholder="AIzaSy..." value="${escapeHtml(s.geminiApiKey || "")}">
            </div>
            <div>
              <label for="deepseek_api_key">DeepSeek Direto (sk-...)</label>
              <input id="deepseek_api_key" name="deepseek_api_key" placeholder="sk-..." value="${escapeHtml(s.deepseekApiKey || "")}">
            </div>
            <div>
              <label for="openai_api_key">OpenAI Direto (sk-proj-...)</label>
              <input id="openai_api_key" name="openai_api_key" placeholder="sk-proj-..." value="${escapeHtml(s.openaiApiKey || "")}">
            </div>
            <div>
              <label for="anthropic_api_key">Anthropic Claude (sk-ant-...)</label>
              <input id="anthropic_api_key" name="anthropic_api_key" placeholder="sk-ant-..." value="${escapeHtml(s.anthropicApiKey || "")}">
            </div>
            <div style="grid-column: 1 / -1">
              <label for="ollama_base_url">Ollama Local (URL)</label>
              <input id="ollama_base_url" name="ollama_base_url" placeholder="http://localhost:11434/v1/chat/completions" value="${escapeHtml(s.ollamaBaseUrl || "")}">
            </div>
          </div>
        </details>
      </div>

      <div style="margin-top:14px"><button type="submit">Salvar Configurações de IA</button></div>
    </form>
  </section>

  <section class="card">
    <div class="section-head"><div><p class="eyebrow">Imagens</p><h2>Fotos de Capa & Pexels</h2><p class="muted">Configurações para fotos reais gratuitas do Pexels.</p></div></div>
    <form class="form-stack" method="post" action="/admin/settings">
      <input type="hidden" name="openrouter_api_key" value="${escapeHtml(s.openrouterApiKey)}">
      <input type="hidden" name="chat_model" value="${escapeHtml(s.chatModel)}">
      <div><label for="pexels_api_key">Chave da API Pexels (Opcional - Fotos Reais Grátis)</label><input id="pexels_api_key" name="pexels_api_key" placeholder="Copie sua chave em pexels.com/api" value="${escapeHtml(s.pexelsApiKey)}"><p class="field-help">Obtenha sua chave gratuita em <a href="https://www.pexels.com/pt-br/api/" target="_blank" rel="noopener">pexels.com/api</a> para usar fotos reais sem gastar créditos de IA.</p></div>
      <div><button type="submit">Salvar Pexels</button></div>
    </form>
  </section>

  <section class="card">
    <div class="section-head"><div><p class="eyebrow">Segurança & Orçamento</p><h2>Limites & Travas Anti-Estouro</h2><p class="muted">Proteja seu saldo e evite estouros de limites diários e requisições excessivas.</p></div></div>
    <form class="form-stack" method="post" action="/admin/settings">
      <input type="hidden" name="openrouter_api_key" value="${escapeHtml(s.openrouterApiKey)}">
      <input type="hidden" name="chat_model" value="${escapeHtml(s.chatModel)}">
      <div>
        <label for="max_daily_posts_per_agent">Máx. posts por agente por dia</label>
        <input id="max_daily_posts_per_agent" name="max_daily_posts_per_agent" type="number" min="0" value="${s.maxDailyPostsPerAgent}">
        <p class="field-help">0 = sem limite diário padrão (cada agente pode ter sua própria cota).</p>
      </div>
      <div>
        <label for="max_daily_posts_global">Teto diário global de posts (soma de todos)</label>
        <input id="max_daily_posts_global" name="max_daily_posts_global" type="number" min="0" value="${s.maxDailyPostsGlobal}">
        <p class="field-help">0 = sem limite global somado.</p>
      </div>
      <div>
        <label for="daily_budget_usd">Teto diário de gasto em IA ($ USD)</label>
        <input id="daily_budget_usd" name="daily_budget_usd" type="number" step="0.01" min="0" value="${s.dailyBudgetUsd}">
        <p class="field-help">Ex.: 0.50 ($0,50/dia). Ao atingir o teto, pausa agendamentos até amanhã. 0 = desativado.</p>
      </div>
      <div>
        <label for="cooldown_seconds">Cooldown entre execuções (segundos)</label>
        <input id="cooldown_seconds" name="cooldown_seconds" type="number" min="0" max="300" value="${s.cooldownSeconds}">
        <p class="field-help">Pausa sequencial anti-429 entre agentes devidos (ideal para modelos free). 0 = desativado.</p>
      </div>
      <div><button type="submit">Salvar limites e travas</button></div>
    </form>
  </section>

  <section class="card" style="grid-column: 1 / -1">
    <div class="section-head"><div><p class="eyebrow">Blogs</p><h2>Seus blogs</h2><p class="muted">Cadastre cada site que usa a CLI. Ao salvar, o painel autentica com o token e carrega as categorias disponíveis daquele blog.</p></div></div>
    <form class="form-stack" method="post" action="/admin/blogs">
      <div><label for="blog-name">Nome do blog</label><input id="blog-name" name="name" required minlength="2" maxlength="60" placeholder="Ex.: Blog de economia"></div>
      <div><label for="blog-base-url">Domínio (base da API)</label><input id="blog-base-url" name="base_url" required placeholder="ex.: https://seu-site.com/api/cli"><p class="field-help">A API CLI é documentada em <code>CLI-API.md</code>.</p></div>
      <div><label for="blog-token">Token da API</label><input id="blog-token" name="token" required value="${escapeHtml("")}"><p class="field-help">Usado para autenticar, listar categorias e publicar artigos deste blog.</p></div>
      <div><button type="submit">Cadastrar blog</button></div>
    </form>
    <div class="divider"></div>
    ${blogCards(data.blogs, data.categoriesByBlog)}
  </section>
  </div>`;
}

export function settingsPage(data: SettingsPageData): Response {
  const toast = data.msg
    ? `<div class="toast${data.msgError ? " toast-error" : ""}">${
      escapeHtml(data.msg)
    }</div><script>(function(){setTimeout(()=>{document.querySelector(".toast")?.remove()},4200);var u=new URL(window.location);if(u.searchParams.has("msg")||u.searchParams.has("err")){u.searchParams.delete("msg");u.searchParams.delete("err");window.history.replaceState({},"",u.toString());}})();</script>`
    : "";

  const d: DashboardData = {
    activeTab: "settings",
    agents: [],
    runs: [],
    stats: { agents: 0, activeAgents: 0, totalPosts: 0, totalRuns: 0, successRuns: 0, errorRuns: 0, lastRunAt: null },
    credits: null,
    runInterval: 15,
    msg: data.msg,
    msgError: data.msgError,
    configMissing: [],
    runningIds: new Set(),
    defaultModel: data.settings.chatModel,
    models: data.models,
    blogs: data.blogs,
    categoriesByBlog: data.categoriesByBlog,
    settings: data.settings,
    isServerless: data.isServerless,
    isDenoDeploy: data.isDenoDeploy,
    cronUrl: data.cronUrl,
    hasCronToken: data.hasCronToken,
  };

  return html(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurações — Blog Agent OS</title><style>${styles}</style></head><body>
<main class="shell">
  <header class="topbar"><div class="brand"><div class="brand-mark">BA</div><div><div class="brand-name">Blog Agent OS</div><div class="brand-subtitle">Configurações do painel</div></div></div>
  <div class="topbar-right"><a class="button button-secondary" href="/admin">Voltar ao painel</a></div></header>
  ${toast}
  ${renderSettingsTab(d)}
</main>${modelComboboxJs(data.models)}</body></html>`);
}

export interface DatabasePageData {
  metrics: DatabaseUsageMetrics;
  msg: string | null;
  msgError: boolean;
}

export function renderDatabaseTab(metrics?: DatabaseUsageMetrics): string {
  if (!metrics) return '<div class="empty">Carregando métricas do banco de dados...</div>';
  const formattedSize = metrics.fileSizeBytes !== undefined
    ? `${(metrics.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB (${Math.round(metrics.fileSizeBytes / 1024)} KB)`
    : "Gerenciado na Nuvem (distribuído)";
  const totalTokensFormatted = (metrics.tokenUsage.totalTokensIn + metrics.tokenUsage.totalTokensOut).toLocaleString("pt-BR");

  return `
  <section class="stats" style="margin-bottom:20px">
    <div class="stat"><div class="stat-label">Tipo de Banco</div><div class="stat-value success">${metrics.driver === "sqlite" ? "SQLite Local" : "Turso (libsql)"}</div></div>
    <div class="stat"><div class="stat-label">Armazenamento em Disco</div><div class="stat-value success">${formattedSize}</div></div>
    <div class="stat"><div class="stat-label">Redatores / Revisores</div><div class="stat-value">${metrics.tableCounts.writers} / ${metrics.tableCounts.reviewers}</div></div>
    <div class="stat"><div class="stat-label">Total de Execuções</div><div class="stat-value">${metrics.tableCounts.runs}</div></div>
    <div class="stat"><div class="stat-label">Custo Total de IA</div><div class="stat-value success">$${metrics.tokenUsage.totalCostUsd.toFixed(4)}</div></div>
  </section>

  <div class="settings-grid">
    <section class="card" style="grid-column: 1 / -1">
      <div class="section-head">
        <div>
          <p class="eyebrow">Métricas de Consumo</p>
          <h2>Consumo de Tokens e Custos por Agente</h2>
          <p class="muted">Acompanhe detalhadamente o volume de dados e o gasto gerado por cada agente.</p>
        </div>
      </div>
      <div class="audit-wrap">
        <table class="table-stack">
          <thead>
            <tr>
              <th>Agente</th>
              <th>Papel</th>
              <th>Modelo</th>
              <th>Execuções</th>
              <th>Tokens Entrada</th>
              <th>Tokens Saída</th>
              <th>Custo Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              metrics.agentConsumption.length === 0
                ? '<tr><td colspan="7" class="empty">Nenhum agente com execuções registradas.</td></tr>'
                : metrics.agentConsumption.map((a) => `
              <tr>
                <td data-label="Agente"><span style="font-weight:500">${escapeHtml(a.agentName)}</span> <span class="muted">(#${a.agentId})</span></td>
                <td data-label="Papel"><span class="cat-chip" style="${a.role === "reviewer" ? "background:#e8effd;border-color:#b9d2fa;color:#1d4ed8;" : ""}">${a.role === "reviewer" ? "Revisor" : "Redator"}</span></td>
                <td data-label="Modelo"><code>${escapeHtml(a.model)}</code></td>
                <td data-label="Execuções">${a.runsCount}</td>
                <td data-label="Tokens Entrada">${a.tokensIn.toLocaleString("pt-BR")}</td>
                <td data-label="Tokens Saída">${a.tokensOut.toLocaleString("pt-BR")}</td>
                <td data-label="Custo Total"><span style="font-weight:500">$${a.totalCostUsd.toFixed(4)}</span></td>
              </tr>
            `).join("")
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Manutenção</p>
          <h2>Limpeza de Histórico</h2>
          <p class="muted">Evite que a tabela de execuções cresça indefinidamente. Mantenha apenas os registros mais recentes.</p>
        </div>
      </div>
      <form class="form-stack" method="post" action="/admin/database/clear-runs">
        <div>
          <label for="keep_latest">Manter quantas execuções recentes?</label>
          <input id="keep_latest" name="keep_latest" type="number" min="10" max="1000" value="50" required>
          <p class="field-help">Execuções mais antigas que este número serão permanentemente removidas do banco.</p>
        </div>
        <div>
          <button type="submit" class="button-secondary">Limpar execuções antigas</button>
        </div>
      </form>
    </section>

    <section class="card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Otimização</p>
          <h2>Compactar Banco de Dados</h2>
          <p class="muted">Executa a rotina de desfragmentação e liberação de espaço em disco.</p>
        </div>
      </div>
      <form class="form-stack" method="post" action="/admin/database/vacuum">
        <p class="field-help" style="margin-top:0">Localização do banco: <code>${escapeHtml(metrics.location)}</code></p>
        <p class="field-help">Total acumulado de tokens processados: <span style="font-weight:500">${totalTokensFormatted}</span></p>
        <div>
          <button type="submit" class="button-secondary">Otimizar e compactar agora</button>
        </div>
      </form>
    </section>
  </div>`;
}

export function databasePage(data: DatabasePageData): Response {
  const toast = data.msg
    ? `<div class="toast${data.msgError ? " toast-error" : ""}">${
      escapeHtml(data.msg)
    }</div><script>setTimeout(()=>{document.querySelector(".toast")?.remove()},4200)</script>`
    : "";

  return html(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Banco de Dados — Blog Agent OS</title><style>${styles}</style></head><body>
<main class="shell">
  <header class="topbar"><div class="brand"><div class="brand-mark">BA</div><div><div class="brand-name">Blog Agent OS</div><div class="brand-subtitle">Gerenciador do Banco de Dados</div></div></div>
  <div class="topbar-right"><a class="button button-secondary" href="/admin">Voltar ao painel</a></div></header>
  ${toast}
  ${renderDatabaseTab(data.metrics)}
</main></body></html>`);
}

export function renderLogsTab(agents: Agent[]): string {
  return `
  <div class="card" style="padding:22px">
    <div class="section-head" style="margin-bottom:16px">
      <div>
        <p class="eyebrow">Observabilidade &amp; Diagnóstico</p>
        <h2>Logs do Sistema em Tempo Real</h2>
        <p class="muted">Acompanhe cada etapa de execução dos agentes, chamadas às APIs de IA, requisições de blog e erros com diagnóstico detalhado.</p>
      </div>
      <div class="section-actions">
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--c-text-soft);cursor:pointer;user-select:none;margin-right:8px">
          <input type="checkbox" id="syslog-auto-refresh" checked style="width:15px;height:15px">
          Auto-refresh (3s)
        </label>
        <button type="button" class="button button-sm button-secondary" id="btn-refresh-logs" onclick="loadSystemLogs()" style="display:inline-flex;align-items:center;gap:6px">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Atualizar Agora
        </button>
        <button type="button" class="button button-sm button-secondary" id="btn-copy-logs" onclick="copySystemLogs()" style="display:inline-flex;align-items:center;gap:6px">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copiar Logs
        </button>
        <button type="button" class="button button-sm button-secondary" id="btn-clear-logs" onclick="clearSystemLogs()" style="color:var(--c-danger);display:inline-flex;align-items:center;gap:6px">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Limpar
        </button>
      </div>
    </div>

    <!-- Filters Bar -->
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;padding:10px 14px;background:var(--c-bg);border-radius:12px;border:1px solid var(--c-border)">
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">
        <span style="font-size:12px;font-weight:600;color:var(--c-text-soft);margin-right:4px">Nível:</span>
        <button type="button" class="log-level-btn active" data-level="" onclick="filterLogLevel('')">Todos</button>
        <button type="button" class="log-level-btn" data-level="error" onclick="filterLogLevel('error')">Erros</button>
        <button type="button" class="log-level-btn" data-level="warn" onclick="filterLogLevel('warn')">Avisos</button>
        <button type="button" class="log-level-btn" data-level="success" onclick="filterLogLevel('success')">Sucesso</button>
        <button type="button" class="log-level-btn" data-level="info" onclick="filterLogLevel('info')">Info</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:220px;max-width:440px">
        <select id="syslog-agent-filter" onchange="loadSystemLogs()" style="height:34px;font-size:12px;padding:0 8px;border-radius:8px">
          <option value="">Todos os Agentes</option>
          ${agents.map((a) => `<option value="${a.id}">${escapeHtml(a.name)} (#${a.id})</option>`).join("")}
        </select>
        <input type="text" id="syslog-search" placeholder="Pesquisar nos logs..." oninput="debounceLogsSearch()" style="height:34px;font-size:12px;padding:0 10px;border-radius:8px">
      </div>
    </div>

    <!-- Terminal Container -->
    <div id="syslog-terminal" class="syslog-terminal">
      <div id="syslog-body" class="syslog-body">
        <div style="text-align:center;padding:30px;color:#94a3b8">Carregando logs do sistema...</div>
      </div>
    </div>
  </div>`;
}

export function runDetailsModal(): string {
  return `
  <div class="modal" id="run-details-modal" style="display:none;position:fixed;inset:0;z-index:9999;place-items:center;justify-content:center;align-items:center">
    <div class="modal-backdrop" onclick="closeRunDetails()"></div>
    <div class="modal-panel" style="margin:auto;max-width:920px;width:min(920px,95vw);max-height:92vh;display:flex;flex-direction:column;position:relative;z-index:2">
      <div class="modal-head" style="flex-shrink:0;align-items:flex-start">
        <div>
          <p class="eyebrow" id="rd-eyebrow">Diagnóstico de Execução</p>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <h2 id="rd-title" style="margin:0;font-size:20px">Execução #...</h2>
            <span id="rd-status-pill" class="status-pill">—</span>
          </div>
          <p class="muted" id="rd-subtitle" style="margin-top:4px;font-size:13px"></p>
        </div>
        <button type="button" class="modal-close" onclick="closeRunDetails()" style="background:none;border:none;font-size:24px;cursor:pointer;line-height:1;color:var(--c-text-soft)" aria-label="Fechar">×</button>
      </div>

      <div id="rd-content" style="overflow-y:auto;flex:1;padding-right:4px;margin-top:12px">
        <div style="text-align:center;padding:40px;color:var(--c-text-muted)">Carregando detalhes da execução...</div>
      </div>

      <div class="modal-foot" style="display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--c-border);margin-top:14px;flex-shrink:0">
        <button type="button" class="button button-sm button-secondary" id="btn-copy-run-log" onclick="copyRunLog()" style="display:inline-flex;align-items:center;gap:6px">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copiar Log Completo
        </button>
        <button type="button" class="button button-sm button-secondary" onclick="closeRunDetails()" style="min-width:80px">
          Fechar
        </button>
      </div>
    </div>
  </div>`;
}

export interface AgentRankingItem {
  agent: Agent;
  blogName: string;
  totalPosts: number;
  totalViews: number;
  views7d: number;
  uniqueVisitors: number;
  totalCostUsd: number;
  roiScore: number;
  rank: number;
  highlightBadge?: string;
}

export interface RankingPageData {
  items: AgentRankingItem[];
  blogs: Blog[];
  selectedBlogId: number | null;
  msg: string | null;
  msgError: boolean;
}

export function renderRankingTab(items: AgentRankingItem[], blogs: Blog[], selectedBlogId: number | null): string {
  const first = items[0];
  const second = items[1];
  const third = items[2];

  const podiumHtml = items.length > 0
    ? `<div class="podium-grid">
        ${
          second
            ? (() => {
              const b2 = blogs.find((b) => b.id === second.agent.blogId);
              return `<div class="podium-card podium-2nd">
                <span class="podium-rank-badge rank-silver">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  2º Lugar
                </span>
                ${renderAvatar(second.agent.avatar, 68, "silver")}
                <div class="podium-name">${escapeHtml(second.agent.name)}</div>
                <div class="podium-blog">
                  ${b2 ? renderBlogFavicon(b2.baseUrl, second.blogName, 22) : ""}
                  <span class="cat-chip">${escapeHtml(second.blogName)}</span>
                </div>
                <div class="podium-score">${second.totalViews.toLocaleString("pt-BR")} <span style="font-size:13px;font-weight:500;color:#64748b">views</span></div>
                <div class="podium-sub">${second.views7d.toLocaleString("pt-BR")} views (7d) • ${second.totalPosts} posts</div>
              </div>`;
            })()
            : "<div></div>"
        }
        ${
          first
            ? (() => {
              const b1 = blogs.find((b) => b.id === first.agent.blogId);
              return `<div class="podium-card podium-1st">
                <span class="podium-rank-badge rank-gold">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
                  1º Campeão
                </span>
                ${renderAvatar(first.agent.avatar, 84, "gold")}
                <div class="podium-name" style="font-size:18px">${escapeHtml(first.agent.name)}</div>
                <div class="podium-blog">
                  ${b1 ? renderBlogFavicon(b1.baseUrl, first.blogName, 24) : ""}
                  <span class="cat-chip">${escapeHtml(first.blogName)}</span>
                </div>
                <div class="podium-score">${first.totalViews.toLocaleString("pt-BR")} <span>views</span></div>
                <div class="podium-sub">${first.views7d.toLocaleString("pt-BR")} views na semana • Score: ${first.roiScore.toLocaleString("pt-BR")} views/$</div>
              </div>`;
            })()
            : '<div class="empty" style="grid-column:1/-1">Nenhum agente para ranquear ainda.</div>'
        }
        ${
          third
            ? (() => {
              const b3 = blogs.find((b) => b.id === third.agent.blogId);
              return `<div class="podium-card podium-3rd">
                <span class="podium-rank-badge rank-bronze">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  3º Lugar
                </span>
                ${renderAvatar(third.agent.avatar, 68, "bronze")}
                <div class="podium-name">${escapeHtml(third.agent.name)}</div>
                <div class="podium-blog">
                  ${b3 ? renderBlogFavicon(b3.baseUrl, third.blogName, 22) : ""}
                  <span class="cat-chip">${escapeHtml(third.blogName)}</span>
                </div>
                <div class="podium-score">${third.totalViews.toLocaleString("pt-BR")} <span style="font-size:13px;font-weight:500;color:#64748b">views</span></div>
                <div class="podium-sub">${third.views7d.toLocaleString("pt-BR")} views (7d) • ${third.totalPosts} posts</div>
              </div>`;
            })()
            : "<div></div>"
        }
      </div>`
    : "";

  const blogTabs = `
    <div class="blog-tabs">
      <a class="blog-tab ${selectedBlogId === null ? "active" : ""}" href="javascript:void(0)" onclick="switchBlogRanking(null)">Todos os Blogs</a>
      ${blogs.map((b) => `<a class="blog-tab ${selectedBlogId === b.id ? "active" : ""}" href="javascript:void(0)" onclick="switchBlogRanking(${b.id})">${escapeHtml(b.name)}</a>`).join("")}
    </div>
  `;

  return `
  <section class="card ranking-hero" style="margin-bottom:20px">
    <div class="section-head ranking-hero-head">
      <div>
        <p class="eyebrow">Gamificação & Audiência</p>
        <h2 class="ranking-title">Arena dos Agentes <span style="color:#8b93a5;font-weight:450">— Leaderboard</span></h2>
        <p class="muted ranking-description">Os agentes competem em visualizações reais e analisam os artigos mais lidos para superarem seus próprios recordes.</p>
      </div>
    </div>
    ${blogTabs}
    ${podiumHtml}
  </section>

  <section class="card ranking-table-card">
    <div class="section-head ranking-table-head">
      <div>
        <p class="eyebrow">Tabela Completa</p>
        <h2>Classificação Geral</h2>
      </div>
    </div>
    ${
      items.length === 0
        ? '<div class="empty">Nenhum dado de ranking registrado ainda.</div>'
        : `<div class="audit-wrap ranking-table-wrap">
      <table class="table-stack ranking-table">
        <thead>
          <tr>
            <th style="width:50px">Pos</th>
            <th>Agente</th>
            <th>Blog de Destino</th>
            <th>Papel</th>
            <th>Posts</th>
            <th>Views Totais</th>
            <th>Views 7D</th>
            <th>Visitantes Únicos</th>
            <th>Custo Total</th>
            <th>Score ROI (Views/$)</th>
            <th>Destaque</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it) => {
            const rankRank = it.rank === 1 ? "gold" : it.rank === 2 ? "silver" : it.rank === 3 ? "bronze" : "none";
            const itBlog = blogs.find((b) => b.id === it.agent.blogId);
            return `
              <tr>
                <td data-label="Pos"><span class="ranking-position ${it.rank <= 3 ? "is-top" : ""}">#${it.rank}</span></td>
                <td data-label="Agente">
                  <div class="table-avatar-cell">
                    ${renderAvatar(it.agent.avatar, 42, rankRank)}
                    <div>
                      <span class="ranking-agent-name">${escapeHtml(it.agent.name)}</span>
                      <div class="ranking-model">${escapeHtml(it.agent.model)}</div>
                    </div>
                  </div>
                </td>
                <td data-label="Blog">
                  <div style="display:flex;align-items:center;gap:8px">
                    ${itBlog ? renderBlogFavicon(itBlog.baseUrl, it.blogName, 26) : ""}
                    <span>${escapeHtml(it.blogName)}</span>
                  </div>
                </td>
                <td data-label="Papel"><span class="cat-chip" style="${it.agent.role === "reviewer" ? "background:#e8effd;color:#1d4ed8;" : it.agent.role === "image_creator" ? "background:#fdf2f8;color:#be185d;" : ""}">${it.agent.role === "reviewer" ? "Revisor" : it.agent.role === "image_creator" ? "Visual" : "Redator"}</span></td>
                <td data-label="Posts"><span class="ranking-number">${it.totalPosts}</span></td>
                <td data-label="Views Totais"><span class="ranking-number primary">${it.totalViews.toLocaleString("pt-BR")}</span></td>
                <td data-label="Views 7D"><span class="ranking-number">${it.views7d.toLocaleString("pt-BR")}</span></td>
                <td data-label="Visitantes"><span class="ranking-number">${it.uniqueVisitors.toLocaleString("pt-BR")}</span></td>
                <td data-label="Custo Total"><span class="ranking-number">$${it.totalCostUsd.toFixed(4)}</span></td>
                <td data-label="Score ROI"><span class="ranking-number primary">${it.roiScore.toLocaleString("pt-BR")}</span></td>
                <td data-label="Destaque">${it.highlightBadge || "—"}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>`
    }
  </section>`;
}

export function rankingPage(data: RankingPageData): Response {
  const toast = data.msg
    ? `<div class="toast${data.msgError ? " toast-error" : ""}">${
      escapeHtml(data.msg)
    }</div><script>(function(){setTimeout(()=>{document.querySelector(".toast")?.remove()},4200);var u=new URL(window.location);if(u.searchParams.has("msg")||u.searchParams.has("err")){u.searchParams.delete("msg");u.searchParams.delete("err");window.history.replaceState({},"",u.toString());}})();</script>`
    : "";

  return html(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Arena & Ranking — Blog Agent OS</title><style>${styles}</style></head><body>
<main class="shell">
  <header class="topbar"><div class="brand"><div class="brand-mark">BA</div><div><div class="brand-name">Blog Agent OS</div><div class="brand-subtitle">Arena de Competência & Gamificação</div></div></div>
  <div class="topbar-right"><a class="button button-secondary" href="/admin">Voltar ao painel</a></div></header>
  ${toast}
  ${renderRankingTab(data.items, data.blogs, data.selectedBlogId)}
</main>
<script>
window.switchBlogRanking = function(blogId) {
  var u = new URL(window.location);
  if (blogId === null || blogId === undefined) {
    u.searchParams.delete("blog_id");
  } else {
    u.searchParams.set("blog_id", String(blogId));
  }
  u.searchParams.delete("msg");
  u.searchParams.delete("err");
  window.location.href = u.toString();
};
</script>
</body></html>`);
}

export function logsTabJs(): string {
  return `
<script>
(function(){
  var currentLogLevel = "";
  var searchTimeout = null;
  var lastLogsData = [];

  window.filterLogLevel = function(level) {
    currentLogLevel = level;
    document.querySelectorAll(".log-level-btn").forEach(function(b){
      b.classList.toggle("active", b.getAttribute("data-level") === level);
    });
    loadSystemLogs();
  };

  window.debounceLogsSearch = function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadSystemLogs, 300);
  };

  window.loadSystemLogs = function() {
    var agentSelect = document.getElementById("syslog-agent-filter");
    var searchInput = document.getElementById("syslog-search");
    var body = document.getElementById("syslog-body");
    if (!body) return;

    var agentId = agentSelect ? agentSelect.value : "";
    var search = searchInput ? searchInput.value.trim() : "";

    var url = new URL("/admin/api/logs", window.location.origin);
    url.searchParams.set("limit", "150");
    if (currentLogLevel) url.searchParams.set("level", currentLogLevel);
    if (agentId) url.searchParams.set("agentId", agentId);
    if (search) url.searchParams.set("search", search);

    fetch(url.toString())
      .then(function(res){ return res.json(); })
      .then(function(data){
        if (!data || !Array.isArray(data.logs)) return;
        lastLogsData = data.logs;
        renderLogsList(data.logs);
      })
      .catch(function(err){
        console.warn("Falha ao carregar logs:", err);
      });
  };

  function renderLogsList(logs) {
    var body = document.getElementById("syslog-body");
    if (!body) return;

    if (logs.length === 0) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">Nenhum registro de log encontrado para os filtros selecionados.</div>';
      return;
    }

    var html = logs.map(function(item){
      var time = item.timestamp ? item.timestamp.substring(11, 19) : "--:--:--";
      var levelClass = "level-" + (item.level || "info");
      var badgeClass = item.level || "info";
      var badgeLabel = item.level === "error" ? "ERRO" : item.level === "warn" ? "AVISO" : item.level === "success" ? "OK" : "INFO";

      var detailsHtml = "";
      if (item.details) {
        detailsHtml = '<details style="margin-top:4px"><summary style="cursor:pointer;color:#94a3b8;font-size:11px">Ver detalhes técnicos / stack trace</summary><div class="syslog-details">' + escapeHtmlJs(item.details) + '</div></details>';
      }

      return '<div class="syslog-entry ' + levelClass + '">' +
        '<div class="syslog-meta">' +
          '<span class="syslog-time">[' + time + ']</span>' +
          '<span class="syslog-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
          '<span class="syslog-source">[' + escapeHtmlJs(item.source || "Sistema") + ']</span>' +
          (item.runId ? '<button type="button" onclick="openRunDetails(' + item.runId + ')" style="background:none;border:none;color:#60a5fa;cursor:pointer;font-size:11px;text-decoration:underline;padding:0">Execução #' + item.runId + '</button>' : '') +
        '</div>' +
        '<div class="syslog-msg">' + escapeHtmlJs(item.message || "") + '</div>' +
        detailsHtml +
      '</div>';
    }).join("");

    body.innerHTML = html;
  }

  function escapeHtmlJs(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.copySystemLogs = function() {
    if (!lastLogsData || lastLogsData.length === 0) {
      alert("Nenhum log para copiar.");
      return;
    }
    var text = lastLogsData.map(function(l){
      var t = l.timestamp ? l.timestamp.substring(11, 19) : "";
      var res = "[" + t + "] [" + (l.level || "info").toUpperCase() + "] [" + (l.source || "") + "] " + l.message;
      if (l.details) res += "\\n   " + l.details.replace(/\\n/g, "\\n   ");
      return res;
    }).join("\\n");

    navigator.clipboard.writeText(text).then(function(){
      var btn = document.getElementById("btn-copy-logs");
      if (btn) {
        var original = btn.innerHTML;
        btn.innerHTML = "Copiado!";
        setTimeout(function(){ btn.innerHTML = original; }, 2000);
      }
    });
  };

  window.clearSystemLogs = function() {
    if (!confirm("Deseja realmente limpar o histórico de logs em memória?")) return;
    fetch("/admin/api/logs/clear", { method: "POST" })
      .then(function(){ loadSystemLogs(); });
  };

  function checkAutoRefresh() {
    var checkbox = document.getElementById("syslog-auto-refresh");
    var isLogsTab = document.getElementById("tab-logs") && document.getElementById("tab-logs").classList.contains("active");
    if (checkbox && checkbox.checked && isLogsTab) {
      loadSystemLogs();
    }
  }

  setInterval(checkAutoRefresh, 3500);

  // Auto carregar quando clicar na aba logs
  document.addEventListener("click", function(e){
    var target = e.target && e.target.closest && e.target.closest("[data-tab='logs']");
    if (target) {
      setTimeout(loadSystemLogs, 100);
    }
  });

  document.addEventListener("DOMContentLoaded", function(){
    loadSystemLogs();
  });
})();
</script>`;
}

export function runDetailsModalJs(): string {
  return `
<script>
(function(){
  var currentRunLogs = "";

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.openRunDetails = function(runId) {
    var modal = document.getElementById("run-details-modal");
    var title = document.getElementById("rd-title");
    var subtitle = document.getElementById("rd-subtitle");
    var statusPill = document.getElementById("rd-status-pill");
    var content = document.getElementById("rd-content");
    if (!modal) return;

    modal.style.display = "grid";
    if (title) title.innerText = "Execução #" + runId;
    if (subtitle) subtitle.innerText = "Carregando dados da execução...";
    if (content) content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--c-text-muted)"><div class="spinner" style="margin-bottom:8px"></div>Obtendo diagnóstico e logs completos...</div>';
    currentRunLogs = "";

    fetch("/admin/api/runs/" + runId)
      .then(function(res){
        if (!res.ok) throw new Error("Execução não encontrada ou erro no servidor");
        return res.json();
      })
      .then(function(data){
        var run = data.run;
        var agentName = data.agentName || ("Agente #" + run.agentId);

        if (title) title.innerText = "Execução #" + run.id + " — " + agentName;

        var start = run.startedAt ? new Date(run.startedAt) : null;
        var finish = run.finishedAt ? new Date(run.finishedAt) : null;
        var durationStr = "—";
        if (start && finish) {
          var durMs = finish.getTime() - start.getTime();
          var durSec = Math.max(0, Math.round(durMs / 1000));
          durationStr = durSec + "s";
        } else if (run.status === "running") {
          durationStr = "Em andamento...";
        }

        var dateStr = start ? start.toLocaleString("pt-BR") : "—";
        if (subtitle) {
          subtitle.innerText = "Iniciada em " + dateStr + " • Duração: " + durationStr;
        }

        if (statusPill) {
          if (run.status === "success") {
            statusPill.className = "status-pill status-success";
            statusPill.innerText = "Sucesso";
          } else if (run.status === "running") {
            statusPill.className = "status-pill";
            statusPill.style.background = "#eff6ff";
            statusPill.style.color = "#1d4ed8";
            statusPill.style.borderColor = "#bfdbfe";
            statusPill.innerHTML = '<span class="pulse-dot"></span> Gerando...';
          } else {
            statusPill.className = "status-pill status-error";
            statusPill.innerText = "Erro";
          }
        }

        currentRunLogs = run.logs || "";

        // Diagnostic card for error
        var diagHtml = "";
        if (run.status === "error" || run.error) {
          var errMsg = run.error || "Execução interrompida sem mensagem de erro gravada.";
          var hint = "Verifique os parâmetros do agente e as chaves de API.";
          if (!run.error) {
            hint = "Esta execução foi iniciada antes da atualização do sistema de observabilidade ou foi suspensa pelo reinício da instância serverless do Deno Deploy antes de salvar o erro. O novo sistema agora captura e aguarda a execução completa.";
          } else if (errMsg.indexOf("401") !== -1 || errMsg.indexOf("Unauthorized") !== -1 || errMsg.indexOf("token") !== -1) {
            hint = "Erro de autorização (401). Verifique se o Token da API do Blog está correto em Configurações > Blogs, ou se sua chave do OpenRouter é válida.";
          } else if (errMsg.indexOf("429") !== -1 || errMsg.indexOf("Rate limit") !== -1) {
            hint = "Limite de requisições excedido (429). Adicione chaves reservas do OpenRouter em Configurações > Multi-Chaves ou aumente o cooldown entre posts.";
          } else if (errMsg.indexOf("reinício") !== -1 || errMsg.indexOf("interrompida") !== -1) {
            hint = "A execução foi interrompida porque o servidor ou a instância do Deno Deploy reiniciou enquanto o agente estava trabalhando.";
          } else if (errMsg.indexOf("Nenhum blog") !== -1 || errMsg.indexOf("Blog") !== -1) {
            hint = "Associe um blog ao agente na opção 'Editar' para que ele possa publicar artigos.";
          }

          diagHtml = '<div class="diag-card">' +
            '<div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:13.5px;margin-bottom:6px">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>' +
              'Diagnóstico de Falha' +
            '</div>' +
            '<div style="font-size:13px;font-weight:500;margin-bottom:6px;word-break:break-word">' + escapeHtml(errMsg) + '</div>' +
            '<div style="font-size:12px;color:#7f1d1d;line-height:1.4;background:rgba(255,255,255,.6);padding:8px 10px;border-radius:8px;border:1px solid rgba(239,68,68,.2)">' +
              '<strong>Recomendação:</strong> ' + escapeHtml(hint) +
            '</div>' +
          '</div>';
        }

        // Metrics Grid
        var metricsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px">' +
          '<div style="padding:10px 12px;background:var(--c-bg);border:1px solid var(--c-border);border-radius:10px">' +
            '<div style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase">Modelo IA</div>' +
            '<div style="font-size:12.5px;font-weight:600;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(run.model || "—") + '">' + escapeHtml(run.model || "—") + '</div>' +
          '</div>' +
          '<div style="padding:10px 12px;background:var(--c-bg);border:1px solid var(--c-border);border-radius:10px">' +
            '<div style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase">Tokens (Entrada+Saída)</div>' +
            '<div style="font-size:13px;font-weight:600;margin-top:2px">' + (run.tokensIn || 0) + ' + ' + (run.tokensOut || 0) + '</div>' +
          '</div>' +
          '<div style="padding:10px 12px;background:var(--c-bg);border:1px solid var(--c-border);border-radius:10px">' +
            '<div style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase">Custo em USD</div>' +
            '<div style="font-size:13px;font-weight:600;margin-top:2px;color:var(--c-success)">$' + (Number(run.cost || 0).toFixed(4)) + '</div>' +
          '</div>' +
          '<div style="padding:10px 12px;background:var(--c-bg);border:1px solid var(--c-border);border-radius:10px">' +
            '<div style="font-size:11px;color:var(--c-text-muted);text-transform:uppercase">Post Gerado</div>' +
            '<div style="font-size:12.5px;font-weight:500;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(run.title || run.postSlug || "—") + '">' + escapeHtml(run.title || run.postSlug || "—") + '</div>' +
          '</div>' +
        '</div>';

        // Logs terminal box
        var logsDisplay = run.logs
          ? '<div class="run-log-terminal">' + escapeHtml(run.logs) + '</div>'
          : '<div style="padding:24px;text-align:center;background:var(--c-bg);border-radius:10px;border:1px dashed var(--c-border);color:var(--c-text-muted)">Nenhum log textual persistido para esta execução.</div>';

        if (content) {
          content.innerHTML = diagHtml + metricsHtml +
            '<div style="font-size:12.5px;font-weight:600;color:var(--c-text);margin-bottom:6px;display:flex;align-items:center;justify-content:space-between">' +
              '<span>Log Passo a Passo da Execução:</span>' +
            '</div>' +
            logsDisplay;
        }
      })
      .catch(function(err){
        if (content) {
          content.innerHTML = '<div style="padding:20px;color:var(--c-danger);text-align:center">Erro ao carregar detalhes: ' + escapeHtml(err.message) + '</div>';
        }
      });
  };

  window.closeRunDetails = function() {
    var modal = document.getElementById("run-details-modal");
    if (modal) modal.style.display = "none";
  };

  window.copyRunLog = function() {
    if (!currentRunLogs) {
      alert("Nenhum log disponível para copiar.");
      return;
    }
    navigator.clipboard.writeText(currentRunLogs).then(function(){
      var btn = document.getElementById("btn-copy-run-log");
      if (btn) {
        var original = btn.innerHTML;
        btn.innerHTML = "Copiado!";
        setTimeout(function(){ btn.innerHTML = original; }, 2000);
      }
    });
  };

  // Close on Escape key
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape") closeRunDetails();
  });
})();
</script>`;
}

export function renderCreatePostTab(data: DashboardData): string {
  const blogs = data.blogs || [];
  const catsByBlog = data.categoriesByBlog || {};
  const models = data.models || [];
  const defaultModel = data.defaultModel || "deepseek/deepseek-chat";
  const imageModels = models.filter((m) => m.image);
  const imageModel = data.settings?.chatModel || "google/gemini-2.5-flash-image";
  const selectedBlogId = data.selectedBlogId ?? (blogs[0]?.id || null);

  const allCategories: { id: number; name: string; blogId: number; blogName: string }[] = [];
  for (const blog of blogs) {
    for (const c of (catsByBlog[blog.id] || [])) allCategories.push({ ...c, blogId: blog.id, blogName: blog.name });
  }
  const catsJson = JSON.stringify(allCategories);
  const blogsJson = JSON.stringify(blogs);

  return `
  <div class="post-create-layout">
    <div class="post-create-main">
      <!-- Top Context Bar -->
      <div class="post-header-bar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div style="font-weight:600;font-size:15px;color:var(--c-text);display:flex;align-items:center;gap:8px">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Novo Artigo
          </div>
          <span style="color:var(--c-text-muted)">•</span>
          <div style="display:flex;align-items:center;gap:6px">
            <label for="post-blog" style="font-size:12px;font-weight:500;color:var(--c-text-soft)">Blog:</label>
            <select id="post-blog" name="blog_id" style="height:32px;font-size:12.5px;padding:0 10px;border-radius:8px;background:var(--c-bg);border:1px solid var(--c-border);min-width:160px">
              ${blogs.map((b) => `<option value="${b.id}" ${b.id === selectedBlogId ? "selected" : ""}>${escapeHtml(b.name)}</option>`).join("")}
              ${blogs.length === 0 ? '<option value="">Nenhum blog conectado</option>' : ""}
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <label for="post-category" style="font-size:12px;font-weight:500;color:var(--c-text-soft)">Categoria:</label>
            <select id="post-category" name="category_id" style="height:32px;font-size:12.5px;padding:0 10px;border-radius:8px;background:var(--c-bg);border:1px solid var(--c-border);min-width:160px">
              <option value="">Carregando categorias...</option>
            </select>
          </div>
        </div>
        <div class="stats-counter-bar">
          <span class="stat-chip"><strong id="stat-words">0</strong> palavras</span>
          <span style="color:var(--c-border)">|</span>
          <span class="stat-chip"><strong id="stat-read-time">~0</strong> min leitura</span>
          <span style="color:var(--c-border)">|</span>
          <span class="stat-chip" id="stat-title-chip">Título: <strong id="stat-title-len">0</strong>/60</span>
        </div>
      </div>

      <!-- Main Form Card -->
      <section class="card" style="padding:22px">
        <form id="post-form" class="form-stack">
          <!-- Title & Slug -->
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <label for="post-title" style="margin:0;font-weight:600">Título do Artigo</label>
              <button type="button" class="button button-xs button-secondary" id="btn-quick-title-ai" title="Sugerir títulos atraentes com IA">
                Sugerir com IA
              </button>
            </div>
            <input id="post-title" name="title" placeholder="Ex.: Como Utilizar Inteligência Artificial no seu Dia a Dia em 2026" style="font-size:15px;font-weight:500;height:44px" required>
          </div>

          <div class="form-row">
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <label for="post-slug" style="margin:0;font-size:12px">Slug da URL</label>
                <button type="button" class="button button-xs button-secondary" id="btn-gen-slug" title="Gerar slug limpo a partir do título">Gerar Slug</button>
              </div>
              <input id="post-slug" name="slug" placeholder="como-utilizar-inteligencia-artificial-2026">
            </div>
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <label for="post-tags" style="margin:0;font-size:12px">Tags (separadas por vírgula)</label>
                <button type="button" class="button button-xs button-secondary" id="btn-quick-tags-ai" title="Sugerir tags automáticas">Sugerir Tags</button>
              </div>
              <input id="post-tags" name="tags" placeholder="ia, produtividade, tecnologia, futuro">
            </div>
          </div>

          <!-- Excerpt -->
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <label for="post-excerpt" style="margin:0;font-size:12px">Resumo / Meta-Description (<span id="excerpt-counter">0</span>/160 caracteres)</label>
              <button type="button" class="button button-xs button-secondary" id="btn-quick-excerpt-ai" title="Gerar resumo a partir do conteúdo">Gerar Resumo</button>
            </div>
            <textarea id="post-excerpt" name="excerpt" rows="2" placeholder="Breve resumo magnético para buscadores e redes sociais (ideal entre 120 e 155 caracteres)..."></textarea>
          </div>

          <!-- Cover Image Studio -->
          <div style="padding:16px;background:var(--c-bg);border:1px solid var(--c-border);border-radius:var(--radius)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
              <span style="font-weight:600;font-size:13px;color:var(--c-text);display:flex;align-items:center;gap:6px">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Imagem de Capa
              </span>
              <div style="display:flex;gap:6px">
                <label class="button button-sm button-secondary" style="cursor:pointer;margin:0;display:inline-flex;align-items:center;gap:5px" title="Upload do computador">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload do Computador
                  <input type="file" id="cover-file-input" accept="image/*" style="display:none">
                </label>
                <button type="button" class="button button-sm button-secondary" id="btn-switch-tab-pexels" style="display:inline-flex;align-items:center;gap:5px">
                  Fotos Pexels
                </button>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start">
              <div>
                <input id="post-cover" name="cover_image" placeholder="https://... ou faça upload ao lado" style="background:var(--c-surface)">
                <div id="cover-upload-status" style="margin-top:6px"></div>
                <div id="cover-preview-wrap" style="display:none;margin-top:10px;position:relative;border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--c-border);background:#000">
                  <img id="cover-preview-img" src="" alt="Prévia da Capa" style="width:100%;max-height:160px;object-fit:cover;display:block">
                  <div style="position:absolute;bottom:0;left:0;right:0;padding:4px 8px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;display:flex;justify-content:space-between;align-items:center">
                    <span>Capa Definida</span>
                    <button type="button" id="btn-remove-cover" style="color:#f87171;background:none;border:none;cursor:pointer;font-size:11px;font-weight:500">Remover</button>
                  </div>
                </div>
              </div>
              <div id="dropzone-box" class="dropzone-box">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--c-accent);margin-bottom:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <div style="font-size:12.5px;font-weight:500;color:var(--c-text)">Arraste uma imagem aqui</div>
                <div style="font-size:11px;color:var(--c-text-muted);margin-top:2px">PNG, JPG, WEBP até 10MB</div>
              </div>
            </div>
          </div>

          <!-- Content Editor Section -->
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px">
              <label for="post-content" style="margin:0;font-weight:600">Conteúdo do Artigo</label>
              <div class="editor-mode-nav">
                <button type="button" class="editor-mode-btn active" id="btn-mode-html">Editor HTML</button>
                <button type="button" class="editor-mode-btn" id="btn-mode-preview">Visualização ao Vivo</button>
              </div>
            </div>

            <!-- Toolbar -->
            <div class="editor-toolbar" id="editor-toolbar">
              <button type="button" class="editor-tool-btn" data-tag="h2" title="Subtítulo H2"><strong>H2</strong></button>
              <button type="button" class="editor-tool-btn" data-tag="h3" title="Subtítulo H3"><strong>H3</strong></button>
              <div class="editor-tool-sep"></div>
              <button type="button" class="editor-tool-btn" data-tag="b" title="Negrito"><strong>B</strong></button>
              <button type="button" class="editor-tool-btn" data-tag="i" title="Itálico"><em>I</em></button>
              <div class="editor-tool-sep"></div>
              <button type="button" class="editor-tool-btn" data-tag="ul" title="Lista com Marcadores">Lista</button>
              <button type="button" class="editor-tool-btn" data-tag="ol" title="Lista Numerada">1. Lista</button>
              <button type="button" class="editor-tool-btn" data-tag="quote" title="Citação">Citação</button>
              <div class="editor-tool-sep"></div>
              <button type="button" class="editor-tool-btn" data-tag="code" title="Bloco de Código">&lt;/&gt;</button>
              <button type="button" class="editor-tool-btn" data-tag="link" title="Inserir Link">Link</button>
              <button type="button" class="editor-tool-btn" data-tag="img" title="Inserir Imagem">Imagem</button>
              <div class="editor-tool-sep"></div>
              <button type="button" class="editor-tool-btn" data-tag="clear" title="Limpar quebras extras">Limpar</button>
            </div>

            <textarea id="post-content" name="content" rows="16" placeholder="<p>Escreva ou gere seu artigo em HTML semântico aqui...</p>" style="border-radius:0 0 var(--radius) var(--radius);font-family:var(--font-mono);font-size:13px;line-height:1.6" required></textarea>
            
            <div id="post-preview-rendered" class="article-preview-body" style="display:none"></div>
          </div>

          <!-- Social Options -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--c-bg);border-radius:var(--radius);border:1px solid var(--c-border-light);flex-wrap:gap:12px">
            <div class="checks-row">
              <label class="check-item">
                <input type="checkbox" name="published" value="1" checked>
                <span style="font-weight:500">Publicar imediatamente</span>
              </label>
              <label class="check-item">
                <input type="checkbox" name="pinterest_enabled" id="pinterest-toggle" value="1">
                <span style="font-weight:500">Ativar no Pinterest</span>
              </label>
            </div>
            <button type="button" class="button button-xs button-secondary" id="btn-clear-all" style="color:var(--c-danger)">Limpar Campos</button>
          </div>

          <!-- Actions Bar -->
          <div style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap;align-items:center">
            <button type="button" class="button" id="btn-publish-post" style="padding:0 24px;height:44px;font-size:14px">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Publicar Artigo no Blog
            </button>
            <button type="button" class="button button-secondary" id="btn-save-draft" style="height:44px">
              Salvar como Rascunho
            </button>
          </div>
          <div id="publish-status" style="margin-top:4px"></div>
        </form>
      </section>
    </div>

    <!-- Right Sidebar AI Studio -->
    <div class="post-create-sidebar">
      <section class="card" style="padding:18px">
        <div class="section-head" style="margin-bottom:12px">
          <div><p class="eyebrow">Assistente Inteligente</p><h2 style="font-size:15px">Estúdio de Criação IA</h2></div>
        </div>

        <div class="sidebar-subtabs">
          <button type="button" class="sidebar-subtab active" data-side="gen" title="Redator de Artigos com IA">Redator</button>
          <button type="button" class="sidebar-subtab" data-side="seo" title="Otimizador de SEO e Metadados">SEO</button>
          <button type="button" class="sidebar-subtab" data-side="pexels" title="Banco de Fotos Gratuitas Pexels">Pexels</button>
          <button type="button" class="sidebar-subtab" data-side="img" title="Gerador de Capa com IA">Capa IA</button>
        </div>

        <!-- Tab 1: Full Article Generator -->
        <div id="side-panel-gen" class="side-panel">
          <div class="form-stack">
            <div>
              <label for="gen-prompt" style="font-size:12px">Tópico ou Pauta do Artigo</label>
              <textarea id="gen-prompt" rows="3" placeholder="Ex.: Escreva um guia prático sobre como automatizar tarefas diárias usando agentes de inteligência artificial..." style="font-size:13px"></textarea>
            </div>
            
            <div class="prompt-chips">
              <span class="prompt-chip" data-prompt="Guia Completo de Tendências para 2026 no Brasil">Tendências 2026</span>
              <span class="prompt-chip" data-prompt="Passo a Passo Prático para Iniciantes: Guia Definitivo">Guia Passo a Passo</span>
              <span class="prompt-chip" data-prompt="Top 7 Ferramentas Gratuitas e Melhores Práticas">Top 7 Ferramentas</span>
            </div>

            <div>
              <label for="gen-model" style="font-size:12px">Modelo de Linguagem</label>
              <select id="gen-model" style="height:36px;font-size:12.5px">
                ${models.filter((m) => !m.image).length > 0 ? models.filter((m) => !m.image).slice(0, 25).map((m) => `<option value="${escapeHtml(m.id)}" ${m.id === defaultModel ? "selected" : ""}>${escapeHtml(m.name || m.id)}</option>`).join("") : `<option value="${escapeHtml(defaultModel)}">${escapeHtml(defaultModel)}</option>`}
              </select>
            </div>

            <div style="background:var(--c-bg);padding:10px 12px;border-radius:var(--radius);border:1px solid var(--c-border)">
              <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--c-text);cursor:pointer">
                <input type="checkbox" id="gen-web-search" value="1" checked style="accent-color:var(--c-accent);width:15px;height:15px">
                Pesquisa Web em Tempo Real (OpenRouter)
              </label>
              <p style="margin:4px 0 0 23px;font-size:11px;color:var(--c-text-soft);line-height:1.4">
                Consulta fatos recentes, notícias e fontes na internet antes de redigir o artigo.
              </p>
            </div>

            <button type="button" class="button" id="btn-generate-content" style="width:100%;height:40px">
              Gerar Artigo Completo
            </button>
          </div>
          <div id="gen-status" style="margin-top:8px"></div>
          <div id="gen-result" class="gen-result" style="display:none;margin-top:10px"></div>
          <button type="button" class="button button-sm button-secondary" id="btn-fill-form" style="display:none;margin-top:10px;width:100%">
            Preencher Formulário com este Artigo
          </button>
        </div>

        <!-- Tab 2: SEO Tools -->
        <div id="side-panel-seo" class="side-panel" style="display:none">
          <p class="muted" style="font-size:12px;margin-bottom:12px">Ferramentas de otimização de metadados:</p>
          <div class="ai-action-list">
            <button type="button" class="ai-action-btn" id="btn-seo-title">
              <span><strong>Gerar 3 Títulos com Alto CTR</strong></span>
              <span style="font-size:11px">→</span>
            </button>
            <button type="button" class="ai-action-btn" id="btn-seo-excerpt">
              <span><strong>Criar Resumo para Google</strong></span>
              <span style="font-size:11px">→</span>
            </button>
            <button type="button" class="ai-action-btn" id="btn-seo-tags">
              <span><strong>Sugerir 5 Tags Relevantes</strong></span>
              <span style="font-size:11px">→</span>
            </button>
            <button type="button" class="ai-action-btn" id="btn-seo-slug">
              <span><strong>Gerar Slug Otimizado</strong></span>
              <span style="font-size:11px">→</span>
            </button>
          </div>
          <div id="seo-status" style="margin-top:10px"></div>
          <div id="seo-result" class="gen-result" style="display:none;margin-top:10px"></div>
        </div>

        <!-- Tab 3: Pexels Stock -->
        <div id="side-panel-pexels" class="side-panel" style="display:none">
          <div style="display:flex;gap:6px;margin-bottom:10px">
            <input id="pexels-search-input" placeholder="Pesquisar fotos no Pexels..." style="height:36px;font-size:12.5px">
            <button type="button" class="button button-sm" id="btn-pexels-search">Buscar</button>
          </div>
          <div id="pexels-status"></div>
          <div id="pexels-grid" class="pexels-grid"></div>
        </div>

        <!-- Tab 4: AI Image Generator -->
        <div id="side-panel-img" class="side-panel" style="display:none">
          <div class="form-stack">
            <div>
              <label for="img-prompt" style="font-size:12px">Prompt da Imagem</label>
              <textarea id="img-prompt" rows="2" placeholder="Descreva a capa desejada ou clique em 'Sugerir da Pauta'..." style="font-size:12.5px"></textarea>
            </div>
            <button type="button" class="button button-xs button-secondary" id="btn-suggest-img-prompt" style="align-self:flex-start">Sugerir do Título</button>
            <div>
              <label for="img-model" style="font-size:12px">Modelo de Imagem</label>
              <select id="img-model" style="height:36px;font-size:12.5px">
                ${imageModels.length > 0 ? imageModels.map((m) => `<option value="${escapeHtml(m.id)}" ${m.id === imageModel ? "selected" : ""}>${escapeHtml(m.name || m.id)}</option>`).join("") : `<option value="google/gemini-2.5-flash-image">google/gemini-2.5-flash-image</option>`}
              </select>
            </div>
            <button type="button" class="button" id="btn-generate-image" style="width:100%;height:40px">Gerar Imagem com IA</button>
          </div>
          <div id="img-status" style="margin-top:8px"></div>
          <div id="img-result" style="display:none;margin-top:10px">
            <img id="img-preview" src="" alt="" style="width:100%;border-radius:var(--radius-sm);border:1px solid var(--c-border);display:block">
            <button type="button" class="button button-sm button-secondary" id="btn-use-image" style="margin-top:10px;width:100%">Usar esta Imagem como Capa</button>
          </div>
        </div>
      </section>
    </div>
  </div>
<script>
(function(){
  var blogs = ${blogsJson}, allCats = ${catsJson}, lastGen = null, lastImg = null;
  
  function api(url, body){
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function(r){ return r.json(); });
  }

  // --- Category Sync ---
  var bs = document.getElementById("post-blog");
  var cs = document.getElementById("post-category");
  function syncCategories(){
    if (!bs || !cs) return;
    var blogId = parseInt(bs.value) || 0;
    cs.innerHTML = '<option value="">Selecionar categoria...</option>';
    var matches = allCats.filter(function(c){ return c.blogId === blogId; });
    if (matches.length === 0) {
      cs.innerHTML = '<option value="1">Categoria Geral</option>';
    } else {
      matches.forEach(function(c){
        cs.innerHTML += '<option value="' + c.id + '">' + c.name + '</option>';
      });
    }
  }
  if (bs) bs.addEventListener("change", syncCategories);
  syncCategories();

  // --- Stats Counter ---
  var titleInput = document.getElementById("post-title");
  var contentInput = document.getElementById("post-content");
  var excerptInput = document.getElementById("post-excerpt");
  var statWords = document.getElementById("stat-words");
  var statRead = document.getElementById("stat-read-time");
  var statTitleLen = document.getElementById("stat-title-len");
  var excerptCounter = document.getElementById("excerpt-counter");

  function updateMetrics(){
    var text = contentInput ? contentInput.value.replace(/<[^>]+>/g, " ").trim() : "";
    var words = text ? text.split(/\\s+/).filter(Boolean).length : 0;
    var readMins = Math.max(1, Math.round(words / 200));
    if (statWords) statWords.textContent = words.toLocaleString("pt-BR");
    if (statRead) statRead.textContent = "~" + (words > 0 ? readMins : 0);
    
    var tLen = titleInput ? titleInput.value.trim().length : 0;
    if (statTitleLen) statTitleLen.textContent = tLen;

    var eLen = excerptInput ? excerptInput.value.length : 0;
    if (excerptCounter) excerptCounter.textContent = eLen;
  }

  if (contentInput) contentInput.addEventListener("input", updateMetrics);
  if (titleInput) titleInput.addEventListener("input", updateMetrics);
  if (excerptInput) excerptInput.addEventListener("input", updateMetrics);
  updateMetrics();

  // --- Mode Switching (HTML vs Preview) ---
  var btnModeHtml = document.getElementById("btn-mode-html");
  var btnModePreview = document.getElementById("btn-mode-preview");
  var postPreviewRendered = document.getElementById("post-preview-rendered");

  if (btnModeHtml && btnModePreview && postPreviewRendered && contentInput) {
    btnModeHtml.addEventListener("click", function(){
      btnModeHtml.classList.add("active");
      btnModePreview.classList.remove("active");
      contentInput.style.display = "block";
      postPreviewRendered.style.display = "none";
    });
    btnModePreview.addEventListener("click", function(){
      btnModePreview.classList.add("active");
      btnModeHtml.classList.remove("active");
      var htmlVal = contentInput.value.trim();
      postPreviewRendered.innerHTML = htmlVal || '<p class="muted">Nenhum conteúdo digitado ainda para visualizar.</p>';
      contentInput.style.display = "none";
      postPreviewRendered.style.display = "block";
    });
  }

  // --- Toolbar Insertion ---
  var toolbar = document.getElementById("editor-toolbar");
  if (toolbar && contentInput) {
    toolbar.querySelectorAll(".editor-tool-btn").forEach(function(btn){
      btn.addEventListener("click", function(e){
        e.preventDefault();
        var tag = btn.getAttribute("data-tag");
        var start = contentInput.selectionStart || 0;
        var end = contentInput.selectionEnd || 0;
        var sel = contentInput.value.substring(start, end);
        var insert = "";

        switch(tag){
          case "h2": insert = "\\n<h2>" + (sel || "Subtítulo Importante") + "</h2>\\n"; break;
          case "h3": insert = "\\n<h3>" + (sel || "Tópico Detalhado") + "</h3>\\n"; break;
          case "b": insert = "<strong>" + (sel || "texto em negrito") + "</strong>"; break;
          case "i": insert = "<em>" + (sel || "texto em itálico") + "</em>"; break;
          case "ul": insert = "\\n<ul>\\n  <li>" + (sel || "Item 1") + "</li>\\n  <li>Item 2</li>\\n</ul>\\n"; break;
          case "ol": insert = "\\n<ol>\\n  <li>" + (sel || "Primeiro passo") + "</li>\\n  <li>Segundo passo</li>\\n</ol>\\n"; break;
          case "quote": insert = "\\n<blockquote>" + (sel || "Citação ou destaque do artigo...") + "</blockquote>\\n"; break;
          case "code": insert = "\\n<pre><code>" + (sel || "// Código aqui") + "</code></pre>\\n"; break;
          case "link": insert = '<a href="https://" target="_blank" rel="noopener">' + (sel || "Texto do link") + '</a>'; break;
          case "img": insert = '\\n<figure><img src="https://" alt="' + (sel || "Descrição da imagem") + '"><figcaption>' + (sel || "Legenda") + '</figcaption></figure>\\n'; break;
          case "clear":
            contentInput.value = contentInput.value.replace(/\\n{3,}/g, "\\n\\n").trim();
            updateMetrics();
            return;
        }

        contentInput.setRangeText(insert, start, end, "end");
        contentInput.focus();
        updateMetrics();
      });
    });
  }

  // --- Cover Image & Dropzone ---
  var coverInput = document.getElementById("post-cover");
  var coverFileInput = document.getElementById("cover-file-input");
  var coverStatus = document.getElementById("cover-upload-status");
  var coverWrap = document.getElementById("cover-preview-wrap");
  var coverImg = document.getElementById("cover-preview-img");
  var removeCoverBtn = document.getElementById("btn-remove-cover");
  var dropzone = document.getElementById("dropzone-box");

  function setCoverImage(url) {
    if (coverInput) coverInput.value = url;
    if (url && coverWrap && coverImg) {
      coverImg.src = url;
      coverWrap.style.display = "block";
    } else if (coverWrap) {
      coverWrap.style.display = "none";
    }
  }

  if (coverInput) {
    coverInput.addEventListener("input", function(){ setCoverImage(this.value.trim()); });
  }
  if (removeCoverBtn) {
    removeCoverBtn.addEventListener("click", function(){
      setCoverImage("");
      if (coverStatus) coverStatus.innerHTML = "";
    });
  }

  function handleFileUpload(file){
    if (!file) return;
    var blogId = bs ? parseInt(bs.value) || 0 : 0;
    var fd = new FormData();
    fd.append("file", file);
    if (blogId > 0) fd.append("blog_id", String(blogId));
    if (coverStatus) coverStatus.innerHTML = '<div class="gen-loading"><div class="spinner"></div>Fazendo upload da imagem...</div>';

    fetch("/admin/create-post/upload-image", { method: "POST", body: fd })
      .then(function(r){ return r.json(); })
      .then(function(res){
        if (res.error) {
          if (coverStatus) coverStatus.innerHTML = '<span style="color:var(--c-danger);font-size:12px">Erro no upload: ' + res.error + '</span>';
        } else if (res.url) {
          setCoverImage(res.url);
          if (coverStatus) coverStatus.innerHTML = '<span style="color:var(--c-success);font-size:12px">Capa enviada com sucesso.</span>';
        }
      }).catch(function(err){
        if (coverStatus) coverStatus.innerHTML = '<span style="color:var(--c-danger);font-size:12px">Erro no upload: ' + err.message + '</span>';
      });
  }

  if (coverFileInput) {
    coverFileInput.addEventListener("change", function(){
      if (this.files && this.files[0]) handleFileUpload(this.files[0]);
    });
  }

  if (dropzone) {
    dropzone.addEventListener("click", function(){
      if (coverFileInput) coverFileInput.click();
    });
    dropzone.addEventListener("dragover", function(e){
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", function(){
      dropzone.classList.remove("dragover");
    });
    dropzone.addEventListener("drop", function(e){
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });
  }

  // --- Sidebar Subtabs ---
  var subtabs = document.querySelectorAll(".sidebar-subtab");
  var panels = {
    gen: document.getElementById("side-panel-gen"),
    seo: document.getElementById("side-panel-seo"),
    pexels: document.getElementById("side-panel-pexels"),
    img: document.getElementById("side-panel-img")
  };

  function switchSidebarTab(tabKey){
    subtabs.forEach(function(st){
      st.classList.toggle("active", st.getAttribute("data-side") === tabKey);
    });
    Object.keys(panels).forEach(function(k){
      if (panels[k]) panels[k].style.display = (k === tabKey ? "block" : "none");
    });
  }

  subtabs.forEach(function(st){
    st.addEventListener("click", function(){
      switchSidebarTab(st.getAttribute("data-side"));
    });
  });

  var btnSwitchPexels = document.getElementById("btn-switch-tab-pexels");
  if (btnSwitchPexels) {
    btnSwitchPexels.addEventListener("click", function(){
      switchSidebarTab("pexels");
      var title = titleInput ? titleInput.value.trim() : "";
      var pSearch = document.getElementById("pexels-search-input");
      if (pSearch && title && !pSearch.value) {
        pSearch.value = title.split(" ").slice(0, 3).join(" ");
        if (document.getElementById("btn-pexels-search")) document.getElementById("btn-pexels-search").click();
      }
    });
  }

  // --- Prompt Chips ---
  document.querySelectorAll(".prompt-chip").forEach(function(chip){
    chip.addEventListener("click", function(){
      var p = chip.getAttribute("data-prompt") || "";
      var gp = document.getElementById("gen-prompt");
      if (gp) { gp.value = p; gp.focus(); }
    });
  });

  // --- Slug Generator ---
  function slugify(text){
    return text.toString().toLowerCase().trim()
      .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\\s+/g, "-")
      .replace(/-+/g, "-");
  }

  var btnGenSlug = document.getElementById("btn-gen-slug");
  var slugInput = document.getElementById("post-slug");
  if (btnGenSlug && slugInput && titleInput) {
    btnGenSlug.addEventListener("click", function(){
      var t = titleInput.value.trim();
      if (t) slugInput.value = slugify(t);
    });
  }

  // --- AI Assistance Calls (SEO Panel) ---
  function runAiAssist(action, statusEl, resultEl){
    var title = titleInput ? titleInput.value.trim() : "";
    var content = contentInput ? contentInput.value.trim() : "";
    var model = document.getElementById("gen-model") ? document.getElementById("gen-model").value : "";

    if (!title && !content) {
      statusEl.innerHTML = '<span style="color:var(--c-danger);font-size:12px">Preencha ao menos o título ou conteúdo.</span>';
      return;
    }
    statusEl.innerHTML = '<div class="gen-loading"><div class="spinner"></div>Processando com IA...</div>';
    resultEl.style.display = "none";

    api("/admin/create-post/ai-assist", { action: action, title: title, content: content, model: model })
      .then(function(res){
        statusEl.innerHTML = "";
        if (res.error) {
          statusEl.innerHTML = '<span style="color:var(--c-danger);font-size:12px">' + res.error + '</span>';
          return;
        }
        resultEl.innerHTML = '<div style="margin-bottom:8px">' + escHtml(res.result) + '</div>' +
          '<button type="button" class="button button-xs button-secondary" id="btn-apply-seo">Aplicar no Formulário</button>';
        resultEl.style.display = "block";

        var applyBtn = document.getElementById("btn-apply-seo");
        if (applyBtn) {
          applyBtn.addEventListener("click", function(){
            if (action === "improve_title" && titleInput) {
              var first = res.result.split("\\n")[0].replace(/^\\d+[.\\s-]+/, "").replace(/^"|"$/g, "");
              titleInput.value = first;
            } else if (action === "generate_excerpt" && excerptInput) {
              excerptInput.value = res.result.replace(/^"|"$/g, "").trim();
            } else if (action === "suggest_tags" && document.getElementById("post-tags")) {
              document.getElementById("post-tags").value = res.result.trim();
            } else if (action === "generate_slug" && slugInput) {
              slugInput.value = slugify(res.result);
            }
            updateMetrics();
            resultEl.style.display = "none";
          });
        }
      }).catch(function(err){
        statusEl.innerHTML = '<span style="color:var(--c-danger);font-size:12px">Erro: ' + err.message + '</span>';
      });
  }

  function escHtml(s){
    return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\n/g,"<br>");
  }

  var seoStatus = document.getElementById("seo-status");
  var seoResult = document.getElementById("seo-result");

  var btnSeoTitle = document.getElementById("btn-seo-title");
  if (btnSeoTitle) btnSeoTitle.addEventListener("click", function(){ runAiAssist("improve_title", seoStatus, seoResult); });

  var btnSeoExcerpt = document.getElementById("btn-seo-excerpt");
  if (btnSeoExcerpt) btnSeoExcerpt.addEventListener("click", function(){ runAiAssist("generate_excerpt", seoStatus, seoResult); });

  var btnSeoTags = document.getElementById("btn-seo-tags");
  if (btnSeoTags) btnSeoTags.addEventListener("click", function(){ runAiAssist("suggest_tags", seoStatus, seoResult); });

  var btnSeoSlug = document.getElementById("btn-seo-slug");
  if (btnSeoSlug) btnSeoSlug.addEventListener("click", function(){ runAiAssist("generate_slug", seoStatus, seoResult); });

  var btnQuickTitleAi = document.getElementById("btn-quick-title-ai");
  if (btnQuickTitleAi) btnQuickTitleAi.addEventListener("click", function(){
    switchSidebarTab("seo");
    if (btnSeoTitle) btnSeoTitle.click();
  });

  var btnQuickExcerptAi = document.getElementById("btn-quick-excerpt-ai");
  if (btnQuickExcerptAi) btnQuickExcerptAi.addEventListener("click", function(){
    switchSidebarTab("seo");
    if (btnSeoExcerpt) btnSeoExcerpt.click();
  });

  var btnQuickTagsAi = document.getElementById("btn-quick-tags-ai");
  if (btnQuickTagsAi) btnQuickTagsAi.addEventListener("click", function(){
    switchSidebarTab("seo");
    if (btnSeoTags) btnSeoTags.click();
  });

  // --- Full Article Generation ---
  var bG = document.getElementById("btn-generate-content");
  var gS = document.getElementById("gen-status");
  var gR = document.getElementById("gen-result");
  var bF = document.getElementById("btn-fill-form");

  if (bG && gS && gR && bF) {
    bG.addEventListener("click", function(){
      var p = document.getElementById("gen-prompt") ? document.getElementById("gen-prompt").value.trim() : "";
      var m = document.getElementById("gen-model") ? document.getElementById("gen-model").value : "";
      var ws = document.getElementById("gen-web-search") ? document.getElementById("gen-web-search").checked : true;
      if (!p) {
        gS.innerHTML = '<span style="color:var(--c-danger);font-size:12px">Defina um tópico para o artigo.</span>';
        return;
      }
      gS.innerHTML = '<div class="gen-loading"><div class="spinner"></div>' + (ws ? 'Pesquisando na web e escrevendo artigo...' : 'Escrevendo artigo completo...') + '</div>';
      gR.style.display = "none";
      bF.style.display = "none";
      lastGen = null;

      api("/admin/create-post/generate-content", { prompt: p, model: m, web_search: ws }).then(function(r){
        gS.innerHTML = "";
        if (r.error) {
          gS.innerHTML = '<span style="color:var(--c-danger);font-size:12px">' + r.error + '</span>';
          return;
        }
        lastGen = r;
        gR.innerHTML = (r.title ? '<h4 style="margin:0 0 6px;font-size:13.5px">' + r.title + '</h4>' : '') +
          (r.excerpt ? '<p style="color:var(--c-text-soft);margin:0 0 8px;font-size:12px">' + r.excerpt + '</p>' : '') +
          '<div style="max-height:160px;overflow-y:auto;font-size:12px;color:var(--c-text-soft)">' + (r.content_html || r.content || "") + '</div>';
        gR.style.display = "block";
        bF.style.display = "block";
      }).catch(function(e){
        gS.innerHTML = '<span style="color:var(--c-danger);font-size:12px">Erro: ' + e.message + '</span>';
      });
    });
  }

  if (bF) {
    bF.addEventListener("click", function(){
      if (!lastGen) return;
      if (lastGen.title && titleInput) titleInput.value = lastGen.title;
      if (lastGen.excerpt && excerptInput) excerptInput.value = lastGen.excerpt;
      if (lastGen.content_html && contentInput) contentInput.value = lastGen.content_html;
      else if (lastGen.content && contentInput) contentInput.value = lastGen.content;
      if (lastGen.slug && slugInput) slugInput.value = lastGen.slug;
      if (lastGen.tags && document.getElementById("post-tags")) document.getElementById("post-tags").value = lastGen.tags;
      bF.style.display = "none";
      updateMetrics();
      if (gS) gS.innerHTML = '<span style="color:var(--c-success);font-size:12px">Formulário preenchido com sucesso.</span>';
    });
  }

  // --- Pexels Search ---
  var pSearchBtn = document.getElementById("btn-pexels-search");
  var pSearchInp = document.getElementById("pexels-search-input");
  var pStatus = document.getElementById("pexels-status");
  var pGrid = document.getElementById("pexels-grid");

  if (pSearchBtn && pSearchInp && pStatus && pGrid) {
    pSearchBtn.addEventListener("click", function(){
      var q = pSearchInp.value.trim();
      if (!q) return;
      pStatus.innerHTML = '<div class="gen-loading"><div class="spinner"></div>Buscando no Pexels...</div>';
      pGrid.innerHTML = "";

      api("/admin/create-post/search-pexels", { query: q }).then(function(res){
        pStatus.innerHTML = "";
        if (res.error) {
          pStatus.innerHTML = '<span style="color:var(--c-danger);font-size:12px">' + res.error + '</span>';
          return;
        }
        var photos = res.photos || [];
        if (photos.length === 0) {
          pStatus.innerHTML = '<span style="color:var(--c-text-muted);font-size:12px">Nenhuma foto encontrada para "' + q + '".</span>';
          return;
        }
        pGrid.innerHTML = photos.map(function(photo){
          return '<div class="pexels-item" data-url="' + photo.url + '" title="' + (photo.alt || 'Foto Pexels') + '">' +
            '<img src="' + photo.url + '" alt="">' +
            '<div class="pexels-overlay">Usar Capa</div>' +
          '</div>';
        }).join("");

        pGrid.querySelectorAll(".pexels-item").forEach(function(item){
          item.addEventListener("click", function(){
            var url = item.getAttribute("data-url");
            if (url) {
              setCoverImage(url);
              if (pStatus) pStatus.innerHTML = '<span style="color:var(--c-success);font-size:12px">Foto Pexels definida como capa.</span>';
            }
          });
        });
      }).catch(function(err){
        pStatus.innerHTML = '<span style="color:var(--c-danger);font-size:12px">Erro: ' + err.message + '</span>';
      });
    });
  }

  // --- AI Image Generator ---
  var bI = document.getElementById("btn-generate-image");
  var iS = document.getElementById("img-status");
  var iR = document.getElementById("img-result");
  var iP = document.getElementById("img-preview");
  var bU = document.getElementById("btn-use-image");
  var btnSuggestImgPrompt = document.getElementById("btn-suggest-img-prompt");

  if (btnSuggestImgPrompt && titleInput) {
    btnSuggestImgPrompt.addEventListener("click", function(){
      var t = titleInput.value.trim();
      var ip = document.getElementById("img-prompt");
      if (ip && t) ip.value = "Uma ilustração cinematográfica e moderna em alta resolução representando: " + t;
    });
  }

  if (bI && iS && iR && iP && bU) {
    bI.addEventListener("click", function(){
      var p = document.getElementById("img-prompt") ? document.getElementById("img-prompt").value.trim() : "";
      var m = document.getElementById("img-model") ? document.getElementById("img-model").value : "";
      if (!p) {
        iS.innerHTML = '<span style="color:var(--c-danger);font-size:12px">Descreva a imagem.</span>';
        return;
      }
      iS.innerHTML = '<div class="gen-loading"><div class="spinner"></div>Gerando imagem...</div>';
      iR.style.display = "none";
      lastImg = null;

      api("/admin/create-post/generate-image", { prompt: p, model: m }).then(function(r){
        iS.innerHTML = "";
        if (r.error) {
          iS.innerHTML = '<span style="color:var(--c-danger);font-size:12px">' + r.error + '</span>';
          return;
        }
        if (r.url) {
          lastImg = r.url;
          iP.src = r.url;
          iR.style.display = "block";
        }
      }).catch(function(e){
        iS.innerHTML = '<span style="color:var(--c-danger);font-size:12px">Erro: ' + e.message + '</span>';
      });
    });
  }

  if (bU) {
    bU.addEventListener("click", function(){
      if (lastImg) {
        setCoverImage(lastImg);
        if (iS) iS.innerHTML = '<span style="color:var(--c-success);font-size:12px">Imagem vinculada à capa.</span>';
      }
    });
  }

  // --- Publish & Draft ---
  function publish(ispub) {
    var t = titleInput ? titleInput.value.trim() : "";
    var c = contentInput ? contentInput.value.trim() : "";
    var s = document.getElementById("publish-status");
    if (!t || !c) {
      if (s) s.innerHTML = '<span style="color:var(--c-danger);font-weight:500">Título e conteúdo são obrigatórios.</span>';
      return;
    }
    var p = {
      title: t,
      content: c,
      excerpt: excerptInput ? excerptInput.value.trim() || undefined : undefined,
      slug: slugInput ? slugInput.value.trim() || undefined : undefined,
      tags: document.getElementById("post-tags") ? document.getElementById("post-tags").value.trim() || undefined : undefined,
      cover_image: coverInput ? coverInput.value.trim() || undefined : undefined,
      blog_id: bs ? parseInt(bs.value) || 0 : 0,
      category_id: cs ? parseInt(cs.value) || 0 : 0,
      published: ispub,
      pinterest_enabled: !!document.querySelector("input[name='pinterest_enabled']:checked")
    };
    if (!p.blog_id || !p.category_id) {
      if (s) s.innerHTML = '<span style="color:var(--c-danger);font-weight:500">Selecione o blog e a categoria de destino.</span>';
      return;
    }
    if (s) s.innerHTML = '<div class="gen-loading"><div class="spinner"></div>Publicando no blog...</div>';
    
    api("/admin/create-post/publish", p).then(function(r){
      if (!s) return;
      if (r.error) {
        s.innerHTML = '<span style="color:var(--c-danger);font-weight:500">' + r.error + '</span>';
      } else {
        var blogObj = blogs.find(function(b){ return b.id === p.blog_id; });
        var viewUrl = blogObj && r.slug ? blogObj.baseUrl.replace(/\\/api\\/cli\\/?$/, "") + "/" + r.slug : null;
        s.innerHTML = '<div style="padding:12px;background:var(--c-success-soft);border:1px solid rgba(34,197,94,.3);border-radius:var(--radius);color:var(--c-success);font-weight:500;display:flex;align-items:center;justify-content:space-between;gap:8px">' +
          '<span>Post #' + r.id + ' ' + (ispub ? 'publicado' : 'salvo como rascunho') + ' com sucesso.</span>' +
          (viewUrl ? '<a href="' + viewUrl + '" target="_blank" rel="noopener" class="button button-xs button-secondary" style="color:var(--c-accent)">Abrir no Blog</a>' : '') +
        '</div>';
      }
    }).catch(function(e){
      if (s) s.innerHTML = '<span style="color:var(--c-danger)">Erro: ' + e.message + '</span>';
    });
  }

  var btnPublish = document.getElementById("btn-publish-post");
  if (btnPublish) btnPublish.addEventListener("click", function(){ publish(true); });
  var btnDraft = document.getElementById("btn-save-draft");
  if (btnDraft) btnDraft.addEventListener("click", function(){ publish(false); });

  var btnClearAll = document.getElementById("btn-clear-all");
  if (btnClearAll) {
    btnClearAll.addEventListener("click", function(){
      if (confirm("Deseja realmente limpar todos os campos preenchidos?")) {
        if (titleInput) titleInput.value = "";
        if (contentInput) contentInput.value = "";
        if (excerptInput) excerptInput.value = "";
        if (slugInput) slugInput.value = "";
        if (document.getElementById("post-tags")) document.getElementById("post-tags").value = "";
        setCoverImage("");
        updateMetrics();
      }
    });
  }
})();
</script>`;
}
