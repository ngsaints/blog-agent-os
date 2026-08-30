import type { ChatProposal, ProposalType } from "./chat.ts";
import type { ChatConversation, Blog } from "./turso_store.ts";
import { proposalTypeLabel } from "./chat.ts";
import type { ModelInfo } from "./openrouter.ts";
import type { PanelSettings } from "./settings.ts";
import { escapeHtml, styles, renderBlogFavicon } from "./dashboard.ts";

export interface ChatPageData {
  conversations: ChatConversation[];
  models: ModelInfo[];
  blogs?: Blog[];
  settings: PanelSettings;
  defaultModel: string;
  credits: string | null;
}

export function chatPage(data: ChatPageData): Response {
  const chatStyles = `
  .chat-shell{display:flex;flex-direction:column;height:100dvh;background:#f2f2f7;overflow:hidden;font-family:"Segoe UI Variable Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;transition:background .2s ease;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
  .menu-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;min-height:40px;padding:0;border-radius:50%;border:1px solid rgba(0,0,0,.08);background:#ffffff;color:#1e293b;cursor:pointer;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:all .15s ease}
  .menu-btn:hover{transform:scale(1.05);color:#007aff;background:#f8fafc}
  .menu-btn:active{transform:scale(.95)}
  
  .sidebar-backdrop{display:none;position:fixed;inset:0;z-index:998;background:rgba(15,23,42,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .25s ease}
  .sidebar-backdrop.open{display:block;opacity:1}
  
  .chat-sidebar{display:flex;flex-direction:column;gap:14px;padding:16px;position:fixed;top:0;left:0;bottom:0;width:min(320px,88vw);max-height:100dvh;z-index:999;background:#ffffff;box-shadow:12px 0 40px rgba(0,0,0,.2);transform:translateX(-105%);transition:transform .28s cubic-bezier(.32,.72,.26,1),background .2s ease;overflow-y:auto}
  .chat-sidebar.open{transform:translateX(0)}
  
  .sidebar-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:12px;border-bottom:1px solid rgba(0,0,0,.06)}
  .close-sidebar-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;min-height:32px;padding:0;border-radius:50%;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:14px;cursor:pointer;transition:all .15s ease}
  .close-sidebar-btn:hover{background:#fee2e2;color:#ef4444;border-color:#fecaca}
  
  .chat-main{display:flex;flex-direction:column;min-height:0;flex:1;position:relative;background:#f2f2f7;transition:background .2s ease}
  .chat-main::before{content:"";position:absolute;inset:0;background:radial-gradient(900px 320px at 50% -120px,rgba(0,122,255,.09),transparent 62%);pointer-events:none;z-index:0}
  .chat-main>*{position:relative;z-index:1}
  .chat-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:rgba(248,248,252,.85);backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);border-bottom:1px solid rgba(0,0,0,.06);transition:background .2s ease}
  .chat-header-left{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
  .status-dot{flex-shrink:0;width:8px;height:8px;border-radius:50%;background:#34c759;animation:pulse 2.2s ease infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 3px rgba(52,199,89,.16)}50%{box-shadow:0 0 0 7px rgba(52,199,89,.04)}}
  .app-title{font-size:15px;font-weight:500;letter-spacing:-.015em;color:#0f172a;line-height:1.2}
  #chat-model-label{font-size:11.5px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;line-height:1.2}
  @media(min-width:768px){
    #chat-model-label{max-width:420px}
  }
  .icon-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;min-height:34px;padding:0;border-radius:50%;border:1px solid rgba(0,0,0,.07);background:rgba(255,255,255,.92);color:#3c3c43;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.06);transition:all .15s ease;flex-shrink:0}
  .icon-btn:hover{transform:translateY(-1px);color:#007aff}
  .messages{flex:1;overflow-y:auto;padding:16px 14px 132px;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;display:flex;flex-direction:column;gap:14px}
  .messages::-webkit-scrollbar{display:none}
  .msg{display:flex;width:100%;box-sizing:border-box;animation:msgIn .25s ease both}
  @keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .msg.user{justify-content:flex-end}
  .msg.user .msg-content-wrap{display:flex;flex-direction:column;align-items:flex-end;max-width:min(86%,560px)}
  .msg.assistant{justify-content:flex-start;gap:9px;align-items:flex-end}
  .msg.assistant .msg-content-wrap{display:flex;flex-direction:column;align-items:flex-start;max-width:min(86%,560px);min-width:0}
  .msg-avatar{flex-shrink:0;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:500;color:#fff;letter-spacing:.02em;background:linear-gradient(135deg,#0a84ff,#5e5ce6);box-shadow:0 4px 12px rgba(0,122,255,.35);margin-bottom:18px}
  .msg-bubble{position:relative;width:fit-content;padding:10px 14px;border-radius:18px;font-size:13.5px;line-height:1.55;overflow-wrap:anywhere;letter-spacing:-.005em}
  .msg.user .msg-bubble{background:linear-gradient(180deg,#0a84ff,#007aff);color:#fff;border-bottom-right-radius:4px;box-shadow:0 4px 14px rgba(0,122,255,.25)}
  .msg.assistant .msg-bubble{background:#fff;color:#1e293b;border:1px solid rgba(0,0,0,.06);border-bottom-left-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
  .msg-bubble strong{font-weight:500;color:#0f172a}
  .msg-bubble code{background:#f2f2f7;border:1px solid rgba(0,0,0,.06);padding:1px 6px;border-radius:7px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
  .msg-bubble pre{margin:9px 0 2px;padding:11px 13px;border-radius:12px;background:#f2f2f7;border:1px solid rgba(0,0,0,.06);overflow:auto;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;line-height:1.55;white-space:pre-wrap}
  .msg-bubble a{color:#007aff;text-decoration:underline;text-underline-offset:2px}
  .msg-bubble ul,.msg-bubble ol{margin:6px 0;padding-left:20px}
  .msg-time{margin-top:3px;font-size:10.5px;color:#8e8e93;padding:0 4px}
  .msg.user .msg-time{text-align:right}
  .msg.assistant .msg-time{text-align:left}
  .copy-btn{position:absolute;top:8px;right:8px;display:grid;place-items:center;width:26px;height:26px;border-radius:8px;border:1px solid rgba(0,0,0,.08);background:rgba(255,255,255,.95);color:#8e8e93;cursor:pointer;opacity:0;transition:opacity .16s,transform .16s,color .16s;box-shadow:0 2px 6px rgba(0,0,0,.08);padding:0;min-height:0}
  .msg.assistant:hover .copy-btn{opacity:1}
  .copy-btn:hover{color:#007aff;transform:scale(1.06)}
  .copy-btn.done{opacity:1;color:#1f9d5b;border-color:rgba(31,157,91,.4)}
  .proposal-card{margin:14px 0;border:1px solid rgba(16,185,129,.25);border-radius:20px;background:#ffffff;padding:20px;font-size:13.5px;box-shadow:0 12px 36px rgba(16,185,129,.12),0 2px 8px rgba(0,0,0,.04);position:relative;overflow:hidden;animation:msgIn .32s ease both}
  .proposal-card::before{content:"";position:absolute;inset:0 auto 0 0;width:5px;background:linear-gradient(180deg,#10b981,#059669)}
  .proposal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,.06)}
  .proposal-type{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:#047857}
  .proposal-type::before{content:"";width:9px;height:9px;border-radius:50%;background:#10b981;box-shadow:0 0 0 4px rgba(16,185,129,.2)}
  .proposal-summary{font-weight:500;font-size:15px;color:#0f172a;margin-bottom:10px;line-height:1.4}
  .proposal-detail{margin-top:10px;padding:12px 14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;font-size:13px;line-height:1.6}
  .proposal-actions{display:flex;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap}
  .btn-approve{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 22px;font-size:14px;border-radius:14px;cursor:pointer;transition:all .18s cubic-bezier(.4,0,.2,1);font-weight:500;border:none;background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 8px 22px rgba(16,185,129,.35)}
  .btn-approve:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(16,185,129,.45);filter:brightness(1.06)}
  .btn-approve:active{transform:scale(.98)}
  .btn-reject{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 18px;font-size:13px;border-radius:14px;cursor:pointer;transition:all .15s ease;font-weight:500;background:#f8fafc;color:#64748b;border:1px solid #cbd5e1}
  .btn-reject:hover{background:#fee2e2;color:#ef4444;border-color:#fecaca}
  .proposal-result{margin-top:12px;padding:12px 16px;border-radius:12px;font-size:13.5px;font-weight:500;line-height:1.5;animation:msgIn .25s ease both}
  .proposal-result.ok{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}
  .proposal-result.err{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
  .typing{display:flex;gap:10px;align-items:center;animation:msgIn .25s ease both}
  .typing-bubble{display:flex;align-items:center;gap:5px;background:#fff;border:1px solid rgba(0,0,0,.05);border-radius:20px;border-bottom-left-radius:6px;padding:13px 17px;box-shadow:0 3px 12px rgba(0,0,0,.07)}
  .typing-dots{display:inline-flex;gap:4px}
  .typing-dots span{width:7px;height:7px;border-radius:50%;background:#007aff;animation:typing 1.2s infinite ease-in-out}
  .typing-dots span:nth-child(2){animation-delay:.15s}
  .typing-dots span:nth-child(3){animation-delay:.3s}
  @keyframes typing{0%,60%,100%{transform:translateY(0);opacity:.3}30%{transform:translateY(-4px);opacity:1}}
  
  .chat-input-wrap{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:10px 14px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(242,242,247,0),rgba(242,242,247,.95) 40%)}
  .chat-input-form{display:flex;gap:9px;align-items:flex-end}
  .chat-input-form textarea{min-height:44px;max-height:140px;resize:none;border-radius:24px;background:#fff;border:1px solid rgba(0,0,0,.09);box-shadow:0 4px 18px rgba(0,0,0,.09);font-size:15px;padding:11px 16px;transition:border-color .15s,box-shadow .15s}
  .chat-input-form textarea:focus{border-color:#007aff;box-shadow:0 0 0 4px rgba(0,122,255,.14)}
  .chat-input-form button{flex-shrink:0;width:44px;height:44px;min-height:44px;padding:0;border-radius:50%;border:none;background:linear-gradient(180deg,#0a84ff,#007aff);color:#fff;display:grid;place-items:center;box-shadow:0 8px 18px rgba(0,122,255,.38);transition:all .15s ease;cursor:pointer}
  .chat-input-form button:hover{transform:translateY(-1px) scale(1.03);box-shadow:0 10px 22px rgba(0,122,255,.45)}
  .chat-input-form button:disabled{opacity:.5;transform:none;box-shadow:none;cursor:default}
  .chat-hint{padding:8px 2px 0;color:#8e8e93;font-size:11px;text-align:center}
  
  .conv-side-head{display:flex;align-items:center;gap:10px;justify-content:space-between;margin-top:2px}
  #new-chat-btn{background:linear-gradient(180deg,#0a84ff,#007aff);color:#fff;border:none;font-weight:500;border-radius:12px;box-shadow:0 4px 12px rgba(0,122,255,.28);transition:all .15s ease}
  #new-chat-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,122,255,.38)}
  .conv-list{display:flex;flex-direction:column;gap:4px;overflow-y:auto;min-height:0;flex:1;-webkit-overflow-scrolling:touch}
  
  .conv-item{display:flex;align-items:center;justify-content:space-between;gap:6px;width:100%;padding:9px 11px;border-radius:11px;border:1px solid transparent;background:transparent;cursor:pointer;text-align:left;font-size:13px;color:#334155;transition:all .15s ease;min-height:38px;position:relative}
  .conv-item:hover{background:rgba(0,0,0,.04);color:#0f172a}
  .conv-item.active{background:#e0f2fe;color:#0284c7;font-weight:500;border-color:rgba(2,132,199,.15)}
  .conv-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
  
  .conv-del-btn{flex-shrink:0;display:grid;place-items:center;width:28px;height:28px;border-radius:7px;border:none;background:transparent;color:#94a3b8;cursor:pointer;min-height:0;padding:0;box-shadow:none;transition:all .15s ease;opacity:.7}
  .conv-item:hover .conv-del-btn{opacity:1;color:#64748b}
  .conv-del-btn:hover{background:#fee2e2;color:#ef4444;transform:scale(1.1)}
  
  .conv-confirm-box{display:flex;align-items:center;gap:4px;animation:msgIn .18s ease both}
  .btn-confirm-del{padding:3px 8px;font-size:11px;font-weight:500;border-radius:6px;border:none;cursor:pointer;background:#ef4444;color:#fff}
  .btn-confirm-del:hover{background:#dc2626}
  .btn-cancel-del{padding:3px 8px;font-size:11px;font-weight:500;border-radius:6px;border:none;cursor:pointer;background:#e2e8f0;color:#475569}
  .btn-cancel-del:hover{background:#cbd5e1}

  .sidebar-nav-section{margin-top:auto;padding-top:14px;border-top:1px solid rgba(0,0,0,.06);display:flex;flex-direction:column;gap:3px}
  .sidebar-nav-link{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:10px;font-size:13px;font-weight:500;color:#475569;text-decoration:none;transition:all .15s ease}
  .sidebar-nav-link:hover{background:#f1f5f9;color:#0f172a}
  .sidebar-nav-link svg{flex-shrink:0;color:#64748b}
  
  .chat-table-wrap{margin:12px 0;overflow-x:auto;border-radius:14px;border:1px solid #e2e8f0;background:#ffffff;box-shadow:0 3px 12px rgba(0,0,0,.04)}
  .chat-table{width:100%;border-collapse:collapse;font-size:12.5px;text-align:left}
  .chat-table th{background:#f8fafc;padding:9px 12px;font-weight:500;color:#475569;border-bottom:1px solid #e2e8f0;white-space:nowrap}
  .chat-table td{padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#1e293b;vertical-align:middle}
  .chat-table tr:last-child td{border-bottom:none}
  .chat-table tr:hover td{background:#f8fafc}
  .chat-bar-cell{display:flex;align-items:center;gap:8px}
  .chat-bar-track{flex:1;height:7px;background:#e2e8f0;border-radius:99px;overflow:hidden;min-width:32px;max-width:70px}
  .chat-bar-fill{height:100%;background:linear-gradient(90deg,#0a84ff,#6366f1);border-radius:99px}
  
  .topic-card{margin:8px 0;padding:12px 14px;border-radius:14px;background:#ffffff;border:1px solid rgba(0,0,0,.08);transition:all .18s ease;cursor:pointer;position:relative;text-align:left;box-shadow:0 2px 6px rgba(0,0,0,.03)}
  .topic-card:hover{background:#f8fafc;border-color:#0a84ff;box-shadow:0 6px 18px rgba(10,132,255,.12);transform:translateY(-1px)}
  .topic-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:9px;margin-bottom:4px}
  .topic-num{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:6px;background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:500;flex-shrink:0;margin-top:1px}
  .topic-title{font-size:13.5px;font-weight:500;color:#0f172a;flex:1;line-height:1.45;letter-spacing:-.01em}
  .topic-action{font-size:11.5px;font-weight:500;color:#007aff;display:inline-flex;align-items:center;gap:3px;flex-shrink:0;padding-top:2px}
  .topic-card:hover .topic-action{text-decoration:underline}
  .topic-desc{font-size:12.5px;color:#64748b;line-height:1.45;margin:0;padding-left:29px}
  
  .chat-empty{display:grid;place-items:center;flex:1;color:#8e8e93;font-size:13.5px;text-align:center;padding:30px 20px}
  .orb{width:84px;height:84px;border-radius:27px;margin:0 auto 18px;position:relative;display:grid;place-items:center;color:#fff;background:conic-gradient(from 210deg,#0a84ff,#5e5ce6,#ff375f,#0a84ff);animation:spin 10s linear infinite;box-shadow:0 20px 48px rgba(0,122,255,.4)}
  .orb::before{content:"";position:absolute;inset:5px;border-radius:22px;background:rgba(17,19,24,.62);backdrop-filter:blur(3px)}
  .orb svg{position:relative;z-index:1}
  @keyframes spin{to{transform:rotate(360deg)}}
  .chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:20px;max-width:540px}
  .chip{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:9px 16px;font-size:12.5px;font-weight:500;color:#007aff;cursor:pointer;transition:all .16s ease;box-shadow:0 2px 6px rgba(0,0,0,.05)}
  .chip svg{flex-shrink:0;color:#007aff}
  .chip:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(0,122,255,.16);background:#f4f9ff}
  
  @media(max-width:767px){
    #clear-view-btn{display:none}
  }
  
  @media(min-width:768px){
    body{padding:26px 0}
    .chat-shell{max-width:1120px;height:calc(100dvh - 52px);margin:0 auto;border-radius:32px;border:1px solid rgba(0,0,0,.1);box-shadow:0 40px 90px rgba(0,0,0,.22),0 2px 10px rgba(0,0,0,.08);flex-direction:row;gap:0;overflow:hidden}
    .chat-sidebar{position:static;transform:none;max-height:none;width:302px;border-radius:0;box-shadow:none;background:rgba(248,248,252,.95);border-right:1px solid rgba(0,0,0,.06);padding:18px 16px}
    .chat-sidebar.open{transform:none}
    .menu-btn{display:none}
    .close-sidebar-btn{display:none}
    .sidebar-backdrop{display:none!important}
    .chat-model-select{max-width:100%}
  }
  `;

  const models = data.models.filter((m) => !m.image).slice(0, 200);
  const activeChatModel = (data.settings?.chatModel || data.defaultModel || (models[0]?.id ?? "")).trim();
  const blogs = data.blogs || [];

  const blogsHtml = blogs.length > 0
    ? blogs.map((b) => `
        <a href="${escapeHtml(b.baseUrl.replace(/\/api\/cli\/?$/, ""))}" target="_blank" rel="noopener" class="sidebar-nav-link" style="justify-content:space-between;padding:7px 9px;border-radius:9px;background:rgba(0,0,0,.02)">
          <span style="display:inline-flex;align-items:center;gap:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${renderBlogFavicon(b.baseUrl, b.name, 18)}
            <span style="font-weight:500;font-size:12.5px;color:inherit">${escapeHtml(b.name)}</span>
          </span>
          <span style="font-size:11px;color:#0a84ff;font-weight:500">Abrir ↗</span>
        </a>
      `).join("")
    : '<p class="muted" style="font-size:11.5px;padding:4px">Nenhum blog conectado.</p>';

  const conversationsHtml = data.conversations
    .map(
      (c) =>
        `<div class="conv-item" data-conv="${c.id}" data-title="${escapeHtml(c.title)}">
          <span class="conv-title">${escapeHtml(c.title)}</span>
          <button class="conv-del-btn" data-del="${c.id}" title="Excluir conversa" aria-label="Excluir conversa">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>`,
    )
    .join("");

  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#f2f2f7">
<title>Chat com Agent OS — Blog Agent OS</title>
<style>${styles}\n${chatStyles}
body{background:#f2f2f7}
@media(min-width:768px){body{background:radial-gradient(1200px 700px at 50% -200px,#dbe8fb,transparent 60%),#e9ecf2}}</style></head><body>
<main class="chat-shell">
  <div id="sidebar-backdrop" class="sidebar-backdrop" onclick="window.closeChatSidebar && window.closeChatSidebar()"></div>
  <aside class="chat-sidebar" id="chat-sidebar">
    <div class="sidebar-header">
      <div style="display:flex;align-items:center;gap:9px">
        <div class="msg-avatar assistant" style="width:30px;height:30px;font-size:11px">OS</div>
        <div>
          <div style="font-weight:500;font-size:14px;color:#0f172a">Agent OS</div>
          <div style="font-size:11px;color:#64748b">Menu do Painel</div>
        </div>
      </div>
      <button id="close-sidebar-btn" class="close-sidebar-btn" title="Fechar menu" aria-label="Fechar menu" onclick="window.closeChatSidebar && window.closeChatSidebar()"></button>
    </div>
    
    <div class="conv-side-head">
      <p class="eyebrow" style="margin:0">Conversas</p>
      <button id="new-chat-btn" class="button button-sm">+ Nova</button>
    </div>
    
    <div class="conv-list" id="conv-list">${conversationsHtml || '<p class="muted" style="padding:12px 6px;font-size:12px">Nenhuma conversa anterior.</p>'}</div>
    
    <!-- Blogs Conectados -->
    <div style="padding:10px 0 4px;border-top:1px solid rgba(0,0,0,.06)">
      <p class="eyebrow" style="margin:0 0 6px">Blogs Conectados (${blogs.length})</p>
      <div style="display:flex;flex-direction:column;gap:4px">${blogsHtml}</div>
    </div>

    <div class="sidebar-nav-section">
      <p class="eyebrow" style="margin:4px 0 6px">Navegação Rápida</p>
      <a href="/admin?tab=agents" class="sidebar-nav-link">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>
        Agentes &amp; Operações
      </a>
      <a href="/admin?tab=create-post" class="sidebar-nav-link">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        Criar Post
      </a>
      <a href="/admin?tab=ranking" class="sidebar-nav-link">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
        Arena &amp; Ranking
      </a>
      <a href="/admin?tab=database" class="sidebar-nav-link">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        Banco de Dados
      </a>
      <a href="/admin?tab=settings" class="sidebar-nav-link">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Configurações &amp; Blogs
      </a>
      <form method="post" action="/admin/logout" style="margin:4px 0 0">
        <button class="sidebar-nav-link" type="submit" style="width:100%;border:none;background:none;cursor:pointer;color:#ef4444">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sair do Painel
        </button>
      </form>
    </div>
  </aside>
  
  <section class="chat-main">
    <div class="chat-header">
      <div class="chat-header-left">
        <button id="menu-btn" class="menu-btn" title="Abrir menu" aria-label="Abrir menu" onclick="window.openChatSidebar && window.openChatSidebar()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
        </button>
        <span class="status-dot" title="Conectado ao painel"></span>
        <div class="msg-avatar assistant">OS</div>
        <div style="min-width:0">
          <div class="app-title">Agent OS</div>
          <div class="muted" style="font-size:11px" id="chat-model-label">${escapeHtml(activeChatModel || "modelo padrão")} · painel, ranking, posts e banco</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${data.credits ? `<span class="status-pill status-pill-credits">${data.credits}</span>` : ""}
        <a class="icon-btn" href="/admin" title="Voltar ao painel">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>
        </a>
        <form method="post" action="/admin/logout" style="margin:0"><button class="icon-btn" title="Sair" type="submit">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button></form>
        <button id="clear-view-btn" class="button-secondary button-sm" title="Iniciar nova conversa">+ Nova</button>
      </div>
    </div>
    <div class="messages" id="messages">
      <div class="chat-empty" id="chat-empty">
        <div>
          <div class="orb"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="16" y1="16" x2="16" y2="16.01"/></svg></div>
          <span style="font-weight:500;font-size:16px;color:#1c1c1e">Converse com o agente do seu painel</span>
          <p class="muted" style="max-width:440px;margin:8px auto 0;line-height:1.6">Pergunte sobre agentes, ranking, posts e banco de dados. Peça para criar um post ou gerenciar agentes — as ações entram como propostas com botão de <span style="font-weight:500">Aprovar</span>.</p>
          <div class="chips">
            <button class="chip" data-prompt="Qual é o ranking dos posts hoje?">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
              Ranking de hoje
            </button>
            <button class="chip" data-prompt="Liste os agentes e seus status">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="16" y1="16" x2="16" y2="16.01"/></svg>
              Meus agentes
            </button>
            <button class="chip" data-prompt="Sugira 3 temas de artigos para o blog DailyitGirl">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Sugerir temas de post
            </button>
            <button class="chip" data-prompt="Como está o saldo de créditos da OpenRouter?">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Saldo de créditos
            </button>
          </div>
        </div>
      </div>
      <button id="load-more" class="button-secondary button-sm" style="align-self:center;display:none" hidden>Carregar mensagens anteriores</button>
    </div>
    <div class="chat-input-wrap">
      <form id="chat-form" class="chat-input-form">
        <textarea id="chat-input" rows="1" placeholder="Mensagem para o Agent OS…" autofocus></textarea>
        <button type="submit" id="send-btn" title="Enviar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </form>
      <div class="chat-hint">Enter ou Shift+Enter envia a mensagem · Ações exigem sua aprovação</div>
    </div>
  </section>
</main>
<script>
(function(){
  var currentConv = null;
  var oldestMsgId = null;
  var busy = false;
  var activeModelName = ${JSON.stringify(activeChatModel || "modelo padrão")};
  var messagesEl = document.getElementById("messages");
  var chatEmpty = document.getElementById("chat-empty");
  var inputEl = document.getElementById("chat-input");
  var formEl = document.getElementById("chat-form");
  var sendBtn = document.getElementById("send-btn");
  var loadMoreBtn = document.getElementById("load-more");
  var modelLabel = document.getElementById("chat-model-label");
  var convList = document.getElementById("conv-list");
  var sidebar = document.querySelector(".chat-sidebar");
  var backdrop = document.getElementById("sidebar-backdrop");
  var menuBtn = document.getElementById("menu-btn");
  var closeSidebarBtn = document.getElementById("close-sidebar-btn");

  function openSidebar(){
    var sb = sidebar || document.getElementById("chat-sidebar");
    var bd = backdrop || document.getElementById("sidebar-backdrop");
    if(sb) sb.classList.add("open");
    if(bd) bd.classList.add("open");
  }
  
  function closeSidebar(){
    var sb = sidebar || document.getElementById("chat-sidebar");
    var bd = backdrop || document.getElementById("sidebar-backdrop");
    if(sb) sb.classList.remove("open");
    if(bd) bd.classList.remove("open");
  }
  
  window.openChatSidebar = openSidebar;
  window.closeChatSidebar = closeSidebar;

  window.selectTopic = function(el){
    var topic = el.getAttribute("data-topic") || "";
    var num = el.getAttribute("data-num") || "";
    if(!inputEl || !formEl) return;
    inputEl.value = "Quero a Opção " + num + ': "' + topic + '"';
    if(typeof autoGrow === "function") autoGrow();
    if(formEl.requestSubmit){
      formEl.requestSubmit();
    } else {
      formEl.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  };

  function isMobile(){ return window.innerWidth < 768; }

  if(menuBtn) menuBtn.addEventListener("click", function(e){ e.stopPropagation(); openSidebar(); });
  if(closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", function(e){ if(e.key === "Escape") closeSidebar(); });

  function esc(s){
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderMd(t){
    var s = esc(t);
    var fence = String.fromCharCode(96,96,96);
    var backtick = String.fromCharCode(96);
    var linkRegex = new RegExp("https?://[^ \\t\\r\\n<]+", "g");

    var parts = s.split(fence);
    return parts.map(function(block, idx){
      if(idx % 2 === 1) return "<pre>" + block + "</pre>";

      var lines = block.split(String.fromCharCode(10));
      var out = [];
      var inTable = false;
      var tableHeader = [];
      var tableRows = [];

      function flushTable(){
        if(!inTable) return "";
        inTable = false;
        if(tableHeader.length === 0 && tableRows.length === 0) return "";
        
        var colMaxes = [];
        tableRows.forEach(function(row){
          row.forEach(function(cell, cIdx){
            var clean = cell.replace(/<[^>]+>/g, "").trim();
            var val = parseFloat(clean.replace(/[^0-9.]/g, ""));
            if(!isNaN(val) && val > 0 && !clean.includes("/") && clean.length < 12){
              colMaxes[cIdx] = Math.max(colMaxes[cIdx] || 0, val);
            }
          });
        });

        var html = '<div class="chat-table-wrap"><table class="chat-table">';
        if(tableHeader.length > 0){
          html += '<thead><tr>' + tableHeader.map(function(h){ return '<th>' + h + '</th>'; }).join('') + '</tr></thead>';
        }
        html += '<tbody>';
        tableRows.forEach(function(row){
          html += '<tr>' + row.map(function(cell, cIdx){
            var clean = cell.replace(/<[^>]+>/g, "").trim();
            var numVal = parseFloat(clean.replace(/[^0-9.]/g, ""));
            var maxVal = colMaxes[cIdx];
            var isNumeric = !isNaN(numVal) && maxVal && maxVal > 1 && !clean.includes("/") && clean.length < 10;
            if(isNumeric){
              var pct = Math.min(100, Math.max(12, Math.round((numVal / maxVal) * 100)));
              return '<td><div class="chat-bar-cell"><span style="font-weight:500">' + cell + '</span><div class="chat-bar-track" title="' + cell + '"><div class="chat-bar-fill" style="width:' + pct + '%"></div></div></div></td>';
            }
            return '<td>' + cell + '</td>';
          }).join('') + '</tr>';
        });
        html += '</tbody></table></div>';
        tableHeader = [];
        tableRows = [];
        return html;
      }

      for(var i = 0; i < lines.length; i++){
        var line = lines[i].trim();
        
        if(line.indexOf("|") === 0 && line.lastIndexOf("|") === line.length - 1){
          var cells = line.slice(1, -1).split("|").map(function(c){ return c.trim(); });
          var isSep = cells.every(function(c){ return /^[-:]+$/.test(c); });
          if(isSep){
            inTable = true;
            continue;
          }
          if(!inTable && tableHeader.length === 0){
            tableHeader = cells;
            inTable = true;
          } else {
            tableRows.push(cells);
          }
          continue;
        } else if(inTable){
          out.push(flushTable());
        }

        // Ignora linhas divisórias repetidas '---' para não criar buracos gigantes
        if(line.indexOf("---") === 0){
          continue;
        }

        // Detecta opções numeradas (ex: '### 1. "Titulo"' ou '1. **"Titulo"**')
        var cleanLine = line.split("###").join("").split("**").join("").trim();
        var firstChar = cleanLine.charAt(0);
        var secondChar = cleanLine.charAt(1);
        var isNumOption = (firstChar >= '1' && firstChar <= '9') && (secondChar === '.' || secondChar === ')' || secondChar === ':');
        if(isNumOption){
          var num = firstChar;
          var title = cleanLine.slice(2).trim().split('&quot;').join('').split('&amp;quot;').join('').split('&#39;').join('').split('&apos;').join('').split('"').join('').split("'").join('').split('“').join('').split('”').join('').trim();
          var desc = "";
          if(i + 1 < lines.length && lines[i+1].trim()){
            var nextL = lines[i+1].trim();
            var nextClean = nextL.split("###").join("").trim();
            var nextFirst = nextClean.charAt(0);
            var nextSecond = nextClean.charAt(1);
            var nextIsNum = (nextFirst >= '1' && nextFirst <= '9') && (nextSecond === '.' || nextSecond === ')' || nextSecond === ':');
            if(!nextIsNum && nextL.indexOf("|") !== 0 && nextL.indexOf("---") !== 0){
              desc = nextL.split("**").join("").trim();
              i++;
            }
          }
          out.push(
            '<div class="topic-card" onclick="window.selectTopic && window.selectTopic(this)" data-num="' + esc(num) + '" data-topic="' + esc(title) + '">' +
              '<div class="topic-card-head">' +
                '<span class="topic-num">' + esc(num) + '</span>' +
                '<div class="topic-title">' + esc(title) + '</div>' +
                '<span class="topic-action">Escolher </span>' +
              '</div>' +
              (desc ? '<p class="topic-desc">' + esc(desc) + '</p>' : '') +
            '</div>'
          );
          continue;
        }

        if(line.indexOf("### ") === 0){
          out.push('<h4 style="margin:8px 0 2px;font-size:14px;font-weight:500;color:#0f172a">' + line.slice(4) + '</h4>');
          continue;
        }
        if(line.indexOf("## ") === 0){
          out.push('<h3 style="margin:10px 0 4px;font-size:15px;font-weight:500;color:#0f172a">' + line.slice(3) + '</h3>');
          continue;
        }
        if(line.indexOf("> ") === 0){
          out.push('<blockquote style="margin:4px 0;padding:4px 10px;border-left:3px solid #0a84ff;background:#f8fafc;border-radius:0 6px 6px 0;color:#475569;font-size:12.5px">' + line.slice(2) + '</blockquote>');
          continue;
        }

        if(line.indexOf("- ") === 0 || line.indexOf("* ") === 0){
          out.push('<div style="margin:2px 0;padding-left:4px">• ' + line.slice(2) + '</div>');
          continue;
        }

        // Evita múltiplos espaços em branco vazios seguidos
        if(!line){
          if(out.length > 0 && out[out.length-1] !== "") out.push("");
          continue;
        }

        out.push(line);
      }

      if(inTable){
        out.push(flushTable());
      }

      var textBlock = out.join("<br>");

      return textBlock.split(backtick).map(function(inline, bi){
        if(bi % 2 === 1) return "<code>" + inline + "</code>";
        return inline.split("**").map(function(bold, b){
          if(b % 2 === 1) return "<span style="font-weight:500">" + bold + "</span>";
          return bold.replace(linkRegex, function(u){ return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>'; });
        }).join("");
      }).join("");
    }).join("");
  }

  function fmtTime(iso){
    try{
      return new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
    }catch(e){return ""}
  }

  async function api(url, opts){
    var res = await fetch(url, opts);
    var data = await res.json().catch(function(){return {}});
    if(!res.ok) throw new Error(data.error || ("HTTP " + res.status));
    return data;
  }

  function copyIcon(){
    return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  }

  function trashIcon(){
    return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
  }

  function proposalCard(p){
    var labels = {
      create_post:" Publicar Post no Blog", create_agent:" Criar Novo Agente", update_agent:" Editar Agente",
      delete_agent:" Excluir Agente", run_agent:" Executar Agente", toggle_agent:" Alternar Status",
      delegate_task:" Delegar Tarefa a um Agente"
    };
    var type = labels[p.type] || p.type;
    var d = {};
    try{
      d = typeof p.detail === "string" ? JSON.parse(p.detail) : (p.detail || {});
    }catch(e){ d = {}; }

    var detailHtml = "";
    if(p.type === "create_post"){
      detailHtml = '<div style="display:flex;flex-direction:column;gap:6px">' +
        (d.title ? '<div><span style="color:#64748b;font-size:11px;font-weight:500;text-transform:uppercase">Título:</span> <span style="font-weight:500;font-size:14px;color:#0f172a">"' + esc(d.title) + '"</span></div>' : '') +
        (d.excerpt ? '<div><span style="color:#64748b;font-size:11px;font-weight:500;text-transform:uppercase">Resumo:</span> <span style="color:#334155">' + esc(d.excerpt) + '</span></div>' : '') +
        (d.tags ? '<div><span style="color:#64748b;font-size:11px;font-weight:500;text-transform:uppercase">Tags:</span> <code style="background:#e2e8f0;padding:2px 6px;border-radius:6px;font-size:11.5px">' + esc(d.tags) + '</code></div>' : '') +
        (d.pinterest_enabled ? '<div style="font-size:12px;color:#e11d48;font-weight:500">Pinterest Habilitado</div>' : '') +
      '</div>';
    } else if(p.type === "create_agent" || p.type === "update_agent"){
      detailHtml = '<div style="display:flex;flex-direction:column;gap:7px">' +
        (d.name ? '<div><span style="color:#64748b;font-size:11px;font-weight:500;text-transform:uppercase">Nome:</span> <span style="font-weight:500;font-size:14px;color:#0f172a">' + esc(d.name) + '</span> <span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:6px;font-weight:500">' + esc(d.role || "writer") + '</span></div>' : '') +
        (d.description ? '<div><span style="color:#64748b;font-size:11px;font-weight:500;text-transform:uppercase">Foco Editorial:</span> <span style="color:#334155">' + esc(d.description) + '</span></div>' : '') +
        '<div><span style="color:#64748b;font-size:11px;font-weight:500;text-transform:uppercase">Modelos:</span> <code style="background:#f1f5f9;padding:2px 6px;border-radius:6px;font-size:11.5px">' + esc(d.model || "padrão") + '</code>' + (d.imageModel || d.image_model ? ' + <code style="background:#fdf2f8;color:#be185d;padding:2px 6px;border-radius:6px;font-size:11.5px">' + esc(d.imageModel || d.image_model) + '</code>' : '') + '</div>' +
        (d.prompt ? '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:12px;color:#0a84ff;font-weight:500">Ver Prompt Refinado da IA ▾</summary><pre style="margin:6px 0 0;padding:8px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:11.5px;max-height:140px;overflow:auto;white-space:pre-wrap">' + esc(d.prompt) + '</pre></details>' : '') +
      '</div>';
    } else if(p.type === "delegate_task"){
      detailHtml = '<div style="display:flex;flex-direction:column;gap:4px">' +
        '<div><span style="color:#64748b;font-size:11px;font-weight:500;text-transform:uppercase">Tarefa:</span> <span style="font-weight:500">' + esc(d.task || p.summary) + '</span></div>' +
      '</div>';
    } else {
      try{
        detailHtml = '<pre style="margin:0;font-size:11.5px;max-height:160px;overflow:auto">' + esc(JSON.stringify(d, null, 2)) + '</pre>';
      }catch(e){
        detailHtml = esc(String(p.detail || ""));
      }
    }

    var approveLabels = {
      create_post: "Aprovar e Publicar",
      create_agent: "Aprovar e Criar Agente",
      update_agent: "Aprovar e Salvar Agente",
      delete_agent: "Confirmar Exclusão",
      run_agent: "Executar Agente Agora",
      toggle_agent: "Alternar Status",
      delegate_task: "Aprovar e Delegar Tarefa"
    };
    var approveText = approveLabels[p.type] || "Aprovar Ação";

    var div = document.createElement("div");
    div.className = "proposal-card";
    div.dataset.pid = p.id;
    div.innerHTML =
      '<div class="proposal-head">' +
        '<span class="proposal-type">' + esc(type) + '</span>' +
        '<span style="font-size:11.5px;font-weight:500;color:#059669;display:inline-flex;align-items:center;gap:4px">Ação Requer Aprovação</span>' +
      '</div>' +
      '<div class="proposal-summary">' + esc(p.summary || p.label || type) + '</div>' +
      '<div class="proposal-detail">' + detailHtml + '</div>' +
      '<div class="proposal-actions">' +
        '<button class="btn-approve" data-act="approve"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ' + esc(approveText) + '</button>' +
        '<button class="btn-reject" data-act="reject">Recusar</button>' +
      '</div>';
    div.addEventListener("click", function(ev){
      var btn = ev.target.closest("[data-act]");
      if(!btn) return;
      var act = btn.dataset.act;
      var url = "/chat/api/proposals/" + encodeURIComponent(p.id) + "/" + act;
      btn.disabled = true;
      btn.textContent = act === "approve" ? "Executando…" : "Recusando…";
      fetch(url, {method:"POST"}).then(function(r){return r.json()}).then(function(res){
        var result = document.createElement("div");
        result.className = "proposal-result " + (res.ok ? "ok" : "err");
        result.textContent = res.message || (res.ok ? "Concluído." : "Falha.");
        div.querySelector(".proposal-actions").remove();
        div.appendChild(result);
      }).catch(function(err){
        btn.disabled = false;
        btn.innerHTML = act === "approve" ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Aprovar e Publicar' : " Recusar";
      });
    });
    return div;
  }

  function bubbleHtml(role, content){
    var html = renderMd(content);
    if(role === "assistant"){
      html = '<button class="copy-btn" title="Copiar resposta">' + copyIcon() + '</button>' + html;
    }
    return html;
  }

  function addMessage(role, content, time){
    var wrap = document.createElement("div");
    wrap.className = "msg " + role;
    var avatar = role === "assistant" ? '<div class="msg-avatar assistant">OS</div>' : "";
    wrap.innerHTML =
      avatar +
      '<div class="msg-content-wrap">' +
        '<div class="msg-bubble">' + bubbleHtml(role, content) + '</div>' +
        '<div class="msg-time">' + fmtTime(time) + '</div>' +
      '</div>';
    attachCopy(wrap, content);
    messagesEl.appendChild(wrap);
  }

  function attachCopy(wrap, content){
    var btn = wrap.querySelector(".copy-btn");
    if(!btn) return;
    btn.addEventListener("click", function(){
      navigator.clipboard.writeText(content).then(function(){
        btn.classList.add("done");
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(function(){
          btn.classList.remove("done");
          btn.innerHTML = copyIcon();
        }, 1600);
      }).catch(function(){});
    });
  }

  function addProposals(proposals){
    proposals.forEach(function(p){ messagesEl.appendChild(proposalCard(p)); });
  }

  function renderConvList(convs){
    convList.innerHTML = convs.map(function(c){
      return '<div class="conv-item' + (currentConv === c.id ? " active" : "") + '" data-conv="' + c.id + '" data-title="' + esc(c.title) + '">' +
        '<span class="conv-title">' + esc(c.title) + '</span>' +
        '<button class="conv-del-btn" data-del="' + c.id + '" title="Excluir conversa" aria-label="Excluir conversa">' + trashIcon() + '</button>' +
      '</div>';
    }).join("") || '<p class="muted" style="padding:12px 6px;font-size:12px">Nenhuma conversa anterior.</p>';
  }

  async function refreshConvs(selectId){
    var convs = await api("/chat/api/conversations");
    renderConvList(convs);
    if(selectId && !convs.some(function(c){return c.id === selectId})){
      selectId = null;
    }
    return convs;
  }

  function clearMessages(){
    messagesEl.querySelectorAll(".msg, .proposal-card").forEach(function(n){n.remove()});
    loadMoreBtn.hidden = true;
    oldestMsgId = null;
    chatEmpty.style.display = "grid";
  }

  async function loadConversation(id){
    currentConv = id;
    clearMessages();
    chatEmpty.style.display = "none";
    var convs = await refreshConvs(id);
    var conv = convs.find(function(c){return c.id === id});
    if(conv && conv.model){
      modelLabel.textContent = (conv.model || activeModelName) + " · painel, ranking, posts e banco";
    } else {
      modelLabel.textContent = activeModelName + " · painel, ranking, posts e banco";
    }
    await loadMessages(false);
    var items = messagesEl.querySelectorAll(".msg");
    if(items.length > 0){ items[items.length-1].scrollIntoView({block:"end"}); }
    if(isMobile()) closeSidebar();
  }

  async function loadMessages(more){
    if(!currentConv) return;
    var url = "/chat/api/conversations/" + currentConv + "/messages?limit=30";
    if(more && oldestMsgId) url += "&before=" + oldestMsgId;
    var msgs = await api(url);
    if(msgs.length === 0){
      if(!more){ clearMessages(); }
      loadMoreBtn.hidden = true;
      return;
    }
    var frag = document.createDocumentFragment();
    msgs.forEach(function(m){
      var wrap = document.createElement("div");
      wrap.className = "msg " + m.role;
      var avatar = m.role === "assistant" ? '<div class="msg-avatar assistant">OS</div>' : "";
      wrap.innerHTML =
        avatar +
        '<div class="msg-content-wrap">' +
          '<div class="msg-bubble">' + bubbleHtml(m.role, m.content) + '</div>' +
          '<div class="msg-time">' + fmtTime(m.createdAt) + '</div>' +
        '</div>';
      attachCopy(wrap, m.content);
      frag.appendChild(wrap);
    });
    if(more){
      messagesEl.insertBefore(frag, messagesEl.firstChild);
      oldestMsgId = msgs[0].id;
    }else{
      messagesEl.appendChild(frag);
      oldestMsgId = msgs[0].id;
    }
    chatEmpty.style.display = "none";
    var older = await api("/chat/api/conversations/" + currentConv + "/messages?limit=1&before=" + oldestMsgId);
    loadMoreBtn.hidden = older.length === 0;
  }

  loadMoreBtn.addEventListener("click", function(){ loadMessages(true).catch(function(e){console.error(e)}) });

  async function newConversation(){
    var conv = await api("/chat/api/conversations", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({})});
    currentConv = conv.id;
    clearMessages();
    await refreshConvs(conv.id);
    modelLabel.textContent = activeModelName + " · painel, ranking, posts e banco";
    inputEl.focus();
    if(isMobile()) closeSidebar();
  }

  document.getElementById("new-chat-btn").addEventListener("click", newConversation);
  document.getElementById("clear-view-btn").addEventListener("click", function(){ newConversation(); if(isMobile()) closeSidebar(); });

  convList.addEventListener("click", function(ev){
    // 1. Click no botão de excluir (ativa confirmação inline suave)
    var delBtn = ev.target.closest("[data-del]");
    if(delBtn){
      ev.stopPropagation();
      var item = delBtn.closest(".conv-item");
      if(!item) return;
      var id = Number(delBtn.dataset.del);
      
      // Renderiza botões de confirmação inline
      delBtn.style.display = "none";
      var confirmBox = document.createElement("div");
      confirmBox.className = "conv-confirm-box";
      confirmBox.innerHTML =
        '<button class="btn-confirm-del" title="Confirmar exclusão">Apagar</button>' +
        '<button class="btn-cancel-del" title="Cancelar"></button>';
      item.appendChild(confirmBox);
      
      confirmBox.querySelector(".btn-cancel-del").addEventListener("click", function(e){
        e.stopPropagation();
        confirmBox.remove();
        delBtn.style.display = "grid";
      });
      
      confirmBox.querySelector(".btn-confirm-del").addEventListener("click", async function(e){
        e.stopPropagation();
        confirmBox.innerHTML = '<span style="font-size:10px;color:#ef4444">Apagando…</span>';
        try{
          await api("/chat/api/conversations/" + id, {method:"DELETE"});
          item.style.opacity = "0";
          item.style.transform = "translateX(-15px)";
          setTimeout(async function(){
            if(currentConv === id){
              currentConv = null;
              clearMessages();
            }
            await refreshConvs(currentConv);
          }, 200);
        }catch(err){
          alert("Falha ao excluir conversa: " + err.message);
          confirmBox.remove();
          delBtn.style.display = "grid";
        }
      });
      return;
    }

    // 2. Click no item da conversa para carregar
    var item = ev.target.closest("[data-conv]");
    if(item && !ev.target.closest(".conv-confirm-box")){
      var id = Number(item.dataset.conv);
      if(id !== currentConv) loadConversation(id).catch(function(e){console.error(e)});
    }
  });

  document.querySelectorAll(".chip").forEach(function(chip){
    chip.addEventListener("click", function(){
      inputEl.value = chip.dataset.prompt || "";
      autoGrow();
      formEl.requestSubmit();
    });
  });

  function autoGrow(){
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(140, inputEl.scrollHeight) + "px";
  }
  inputEl.addEventListener("input", autoGrow);
  inputEl.addEventListener("keydown", function(ev){
    if(ev.key === "Enter"){
      ev.preventDefault();
      formEl.requestSubmit();
    }
  });

  formEl.addEventListener("submit", function(ev){
    ev.preventDefault();
    if(busy) return;
    var text = inputEl.value.trim();
    if(!text) return;

    if(!currentConv){
      api("/chat/api/conversations", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({})})
        .then(function(conv){ currentConv = conv.id; return sendMessage(conv.id, text); })
        .catch(function(e){ alert(e.message); });
      return;
    }
    sendMessage(currentConv, text);
  });

  async function sendMessage(convId, text){
    busy = true;
    sendBtn.disabled = true;
    chatEmpty.style.display = "none";
    addMessage("user", text, new Date().toISOString());

    var typing = document.createElement("div");
    typing.className = "typing";
    typing.innerHTML = '<div class="msg-avatar assistant">OS</div><div class="typing-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    inputEl.value = "";
    autoGrow();

    try{
      var res = await api("/chat/api/conversations/" + convId + "/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({text:text})
      });
      typing.remove();
      if(res.reply) addMessage("assistant", res.reply, new Date().toISOString());
      if(res.proposals && res.proposals.length > 0) addProposals(res.proposals);
      if(res.model) modelLabel.textContent = res.model + " · painel, ranking, posts e banco";
      refreshConvs(convId).catch(function(){});
    }catch(err){
      typing.remove();
      var wrap = document.createElement("div");
      wrap.className = "msg assistant";
      wrap.innerHTML = '<div class="msg-avatar assistant">OS</div><div class="msg-content-wrap"><div class="msg-bubble" style="background:#fff5f5;border-color:rgba(255,59,48,.25);color:#ff3b30">' + esc(err.message || "Erro desconhecido") + '</div></div>';
      messagesEl.appendChild(wrap);
    }finally{
      busy = false;
      sendBtn.disabled = false;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }
})();
</script></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}