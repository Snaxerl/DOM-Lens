import { inspectElement, type ElementSnapshot } from "../core/inspect";

type PanelTab = "overview" | "selectors" | "styles" | "accessibility" | "attributes" | "structure";

const state: { active:boolean; selected:Element|null; hovered:Element|null; tab:PanelTab; theme:"dark"|"light" } = {
  active:false, selected:null, hovered:null, tab:"overview", theme:"dark"
};

const host = document.createElement("div");
host.id = "dom-lens-root";
host.style.cssText = "all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647";
const shadow = host.attachShadow({mode:"open"});
document.documentElement.appendChild(host);

shadow.innerHTML = `
<style>${getCssText()}</style>
<div id="highlight" hidden></div>
<aside id="panel" hidden></aside>`;

const highlight = shadow.querySelector<HTMLDivElement>("#highlight")!;
const panel = shadow.querySelector<HTMLElement>("#panel")!;

function isInspectable(target: EventTarget | null): target is Element {
  return target instanceof Element && target !== host && !host.contains(target);
}

function updateHighlight(element: Element | null): void {
  if (!state.active || !element) { highlight.hidden = true; return; }
  const rect = element.getBoundingClientRect();
  highlight.hidden = false;
  highlight.style.left = `${Math.max(0, rect.left)}px`;
  highlight.style.top = `${Math.max(0, rect.top)}px`;
  highlight.style.width = `${Math.max(0, rect.width)}px`;
  highlight.style.height = `${Math.max(0, rect.height)}px`;
  highlight.dataset.label = `${element.localName}${element.id ? `#${element.id}` : ""} · ${Math.round(rect.width)}×${Math.round(rect.height)}`;
}

function onPointerMove(event: PointerEvent): void {
  if (!state.active || state.selected || !isInspectable(event.target)) return;
  state.hovered = event.target;
  updateHighlight(event.target);
}

function onClick(event: MouseEvent): void {
  if (!state.active || !isInspectable(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  state.selected = event.target;
  state.hovered = event.target;
  updateHighlight(event.target);
  renderPanel();
}

function onKeyDown(event: KeyboardEvent): void {
  if (!state.active) return;
  if (event.key === "Escape") {
    if (state.selected) { state.selected = null; renderPanel(); updateHighlight(state.hovered); }
    else stopInspector();
  }
}

function onViewportChange(): void { updateHighlight(state.selected ?? state.hovered); }

document.addEventListener("pointermove", onPointerMove, true);
document.addEventListener("click", onClick, true);
document.addEventListener("keydown", onKeyDown, true);
window.addEventListener("scroll", onViewportChange, true);
window.addEventListener("resize", onViewportChange);

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (typeof message !== "object" || message === null) return;
  const command = (message as {command?:string}).command;
  if (command === "toggle-inspector") {
    state.active ? stopInspector() : startInspector();
    sendResponse({active:state.active});
  }
  if (command === "get-status") sendResponse({active:state.active});
});

async function startInspector(): Promise<void> {
  state.active = true;
  const stored = await chrome.storage.local.get("theme");
  state.theme = stored.theme === "light" ? "light" : "dark";
  panel.hidden = false;
  renderPanel();
}

function stopInspector(): void {
  state.active = false; state.selected = null; state.hovered = null;
  panel.hidden = true; highlight.hidden = true;
}

function renderPanel(): void {
  panel.dataset.theme = state.theme;
  const element = state.selected;
  if (!element) {
    panel.innerHTML = shell(`<div class="empty"><div class="target-icon">⌖</div><h2>Pick an element</h2><p>Move over the page and click an element to inspect it.</p><div class="shortcut"><kbd>Esc</kbd><span>close inspector</span></div></div>`);
    bindShellActions();
    return;
  }
  const snapshot = inspectElement(element);
  panel.innerHTML = shell(`${breadcrumbs(snapshot)}${header(snapshot)}${tabs()}<div class="content">${tabContent(snapshot)}</div>`);
  bindShellActions();
  bindContentActions(snapshot);
}

function shell(body: string): string { return `
  <div class="topbar"><div class="brand"><span class="logo">DL</span><strong>DOM Lens</strong></div><div class="top-actions"><button data-action="theme" title="Toggle theme">${state.theme === "dark" ? "☀" : "☾"}</button><button data-action="close" title="Close">×</button></div></div>${body}`; }

function breadcrumbs(s: ElementSnapshot): string { return `<div class="breadcrumbs">${s.breadcrumbs.map((part,i) => `<button data-crumb="${i}" title="${escapeHtml(part.tag)}">${escapeHtml(part.tag)}${part.id ? `#${escapeHtml(part.id)}` : ""}</button>`).join(`<span>›</span>`)}</div>`; }
function header(s: ElementSnapshot): string { return `<div class="element-head"><div><span class="tag">&lt;${escapeHtml(s.tag)}&gt;</span><h1>${escapeHtml(s.accessibleName || s.text || s.tag)}</h1></div><span class="size">${Math.round(s.rect.width)} × ${Math.round(s.rect.height)}</span></div>`; }
function tabs(): string { const items:PanelTab[]=["overview","selectors","styles","accessibility","attributes","structure"]; return `<nav class="tabs">${items.map(t=>`<button class="${state.tab===t?"active":""}" data-tab="${t}">${({overview:"Overview",selectors:"Selectors",styles:"Styles",accessibility:"A11y",attributes:"Attributes",structure:"DOM"})[t]}</button>`).join("")}</nav>`; }

function tabContent(s: ElementSnapshot): string {
  if (state.tab === "overview") return overview(s);
  if (state.tab === "selectors") return selectors(s);
  if (state.tab === "styles") return styles(s);
  if (state.tab === "accessibility") return accessibility(s);
  if (state.tab === "attributes") return attributes(s);
  return structure(s);
}

function overview(s: ElementSnapshot): string { return `
  <section><h3>Element</h3><div class="grid">${row("Tag",s.tag)}${row("Role",s.role||"—")}${row("ID",s.id||"—")}${row("Classes",s.classes.length?s.classes.join(" "):"—")}${row("Position",`${Math.round(s.rect.x)}, ${Math.round(s.rect.y)}`)}${row("Size",`${Math.round(s.rect.width)} × ${Math.round(s.rect.height)} px`)}</div></section>
  <section><h3>Best selector</h3>${codeCard(s.selector.value,s.selector.quality,s.selector.reason,"css")}</section>
  <section><h3>Explanation</h3><p class="explain">${explain(s)}</p></section>`; }

function selectors(s: ElementSnapshot): string { return `
  <section><h3>CSS selector</h3>${codeCard(s.selector.value,s.selector.quality,s.selector.reason,"css")}</section>
  <section><h3>XPath</h3>${codeCard(s.xpath,"likely-stable","DOM path","xpath")}</section>
  <section><h3>Playwright</h3>${codeCard(s.playwright,s.playwright.includes("getBy")?"stable":"likely-stable","Preferred locator when possible","playwright")}</section>
  <section><h3>JavaScript</h3>${codeCard(`document.querySelector(${JSON.stringify(s.selector.value)})`,s.selector.quality,"querySelector","javascript")}</section>`; }

function styles(s: ElementSnapshot): string { return `
  <section><h3>Box model</h3><div class="box-model"><div class="margin">margin <b>${escapeHtml(s.box.margin)}</b><div class="border">border <b>${escapeHtml(s.box.border)}</b><div class="padding">padding <b>${escapeHtml(s.box.padding)}</b><div class="content-box">${Math.round(s.rect.width)} × ${Math.round(s.rect.height)}</div></div></div></div></div></section>
  <section><h3>Computed styles</h3><div class="style-list">${Object.entries(s.styles).map(([k,v])=>`<div><code>${escapeHtml(k)}</code><span>${escapeHtml(v||"—")}</span></div>`).join("")}</div></section>`; }

function accessibility(s: ElementSnapshot): string { return `
  <section><h3>Accessibility</h3><div class="grid">${row("Role",s.role||"—")}${row("Accessible name",s.accessibleName||"—")}</div></section>
  <section><h3>Checks</h3><div class="checks">${s.checks.map(c=>`<div class="check ${c.status}"><span>${c.status==="pass"?"✓":c.status==="warning"?"!":"i"}</span><div><b>${escapeHtml(c.label)}</b>${c.detail?`<small>${escapeHtml(c.detail)}</small>`:""}</div></div>`).join("")}</div></section>`; }

function attributes(s: ElementSnapshot): string { return `<section><h3>${s.attributes.length} attributes</h3><div class="attributes">${s.attributes.length?s.attributes.map(a=>`<div><code>${escapeHtml(a.name)}</code><span>${escapeHtml(a.value)}</span><button data-copy="${escapeAttribute(a.value)}">Copy</button></div>`).join(""):`<p class="muted">No attributes.</p>`}</div></section>`; }
function structure(s: ElementSnapshot): string { return `<section><h3>DOM path</h3><div class="tree">${s.breadcrumbs.map((p,i)=>`<div style="padding-left:${i*14}px"><span>&lt;${escapeHtml(p.tag)}${p.id?` id=&quot;${escapeHtml(p.id)}&quot;`:""}&gt;</span></div>`).join("")}</div></section><section><h3>Text</h3><pre class="text-preview">${escapeHtml(s.text||"No visible text")}</pre></section>`; }

function row(label:string,value:string):string{return `<div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div>`;}
function codeCard(value:string, quality:string, reason:string, kind:string):string{return `<div class="code-card"><div class="code-top"><span class="quality ${quality}">${quality.replace("-"," ")}</span><button data-copy="${escapeAttribute(value)}">Copy</button></div><code>${escapeHtml(value)}</code><small>${escapeHtml(reason)} · ${escapeHtml(kind)}</small></div>`;}
function explain(s:ElementSnapshot):string{const pieces=[`This is a ${s.role||s.tag} element`]; if(s.accessibleName)pieces.push(`with the accessible name “${s.accessibleName}”`); pieces.push(`measuring ${Math.round(s.rect.width)} by ${Math.round(s.rect.height)} pixels`); pieces.push(s.selector.quality==="stable"?"It has a strong selector suitable for automation.":"Its selector depends partly on the current page structure."); return pieces.join(" ");}

function bindShellActions():void{
  panel.querySelector<HTMLElement>('[data-action="close"]')?.addEventListener("click",stopInspector);
  panel.querySelector<HTMLElement>('[data-action="theme"]')?.addEventListener("click",async()=>{state.theme=state.theme==="dark"?"light":"dark";await chrome.storage.local.set({theme:state.theme});renderPanel();});
  panel.querySelectorAll<HTMLElement>("[data-tab]").forEach(button=>button.addEventListener("click",()=>{state.tab=button.dataset.tab as PanelTab;renderPanel();}));
}
function bindContentActions(snapshot:ElementSnapshot):void{
  panel.querySelectorAll<HTMLElement>("[data-copy]").forEach(button=>button.addEventListener("click",async()=>{await navigator.clipboard.writeText(button.dataset.copy??""); const old=button.textContent;button.textContent="Copied";setTimeout(()=>button.textContent=old,900);}));
  panel.querySelectorAll<HTMLElement>("[data-crumb]").forEach(button=>button.addEventListener("click",()=>{const index=Number(button.dataset.crumb);let node:Element|null=state.selected;const path:Element[]=[];while(node&&path.length<8){path.unshift(node);node=node.parentElement;}const target=path[index];if(target){state.selected=target;updateHighlight(target);renderPanel();}}));
  void snapshot;
}
function escapeHtml(value:string):string{return value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));}
function escapeAttribute(value:string):string{return escapeHtml(value).replace(/`/g,"&#96;");}

function getCssText(): string { return `
:host{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#highlight{position:fixed;box-sizing:border-box;border:2px solid #7c5cff;background:rgba(124,92,255,.08);pointer-events:none;z-index:2147483646;transition:left .04s,top .04s,width .04s,height .04s}
#highlight:after{content:attr(data-label);position:absolute;left:-2px;top:-28px;background:#6d4aff;color:white;font:600 11px/1.2 system-ui;padding:5px 7px;border-radius:5px;white-space:nowrap;max-width:360px;overflow:hidden;text-overflow:ellipsis}
#panel{position:fixed;right:14px;top:14px;bottom:14px;width:390px;box-sizing:border-box;pointer-events:auto;border-radius:16px;overflow:hidden;box-shadow:0 18px 70px rgba(0,0,0,.34);font-size:12px;z-index:2147483647}
#panel[data-theme="dark"]{--bg:#111216;--panel:#17191f;--panel2:#20232b;--text:#f3f4f7;--muted:#989eaa;--line:#2b2f39;--accent:#8b72ff;--green:#42d392;--yellow:#f2b84b;background:var(--bg);color:var(--text)}
#panel[data-theme="light"]{--bg:#f7f7fa;--panel:#fff;--panel2:#f0f1f5;--text:#17181c;--muted:#6c7280;--line:#e2e4ea;--accent:#6747e8;--green:#168c5a;--yellow:#a36c00;background:var(--bg);color:var(--text)}
button{font:inherit}.topbar{height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid var(--line);background:var(--panel)}.brand{display:flex;align-items:center;gap:9px;font-size:13px}.logo{display:grid;place-items:center;width:27px;height:27px;border-radius:8px;background:linear-gradient(135deg,#8b72ff,#4b7cff);color:#fff;font-weight:800;font-size:10px}.top-actions{display:flex;gap:5px}.top-actions button{border:0;background:transparent;color:var(--muted);width:30px;height:30px;border-radius:7px;font-size:18px;cursor:pointer}.top-actions button:hover{background:var(--panel2);color:var(--text)}
.breadcrumbs{display:flex;align-items:center;gap:3px;padding:8px 12px;overflow:auto;border-bottom:1px solid var(--line);background:var(--bg);scrollbar-width:none}.breadcrumbs button{border:0;background:none;color:var(--muted);cursor:pointer;padding:3px;font-size:10px;white-space:nowrap}.breadcrumbs button:hover{color:var(--accent)}.breadcrumbs span{color:var(--muted)}
.element-head{padding:15px 14px 13px;display:flex;justify-content:space-between;gap:12px;background:var(--panel)}.element-head h1{font-size:14px;margin:5px 0 0;max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tag{color:var(--accent);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:700}.size{color:var(--muted);white-space:nowrap}.tabs{display:flex;overflow:auto;border-bottom:1px solid var(--line);background:var(--panel);scrollbar-width:none}.tabs button{border:0;border-bottom:2px solid transparent;background:none;color:var(--muted);padding:10px 9px;cursor:pointer;white-space:nowrap;font-size:11px}.tabs button.active{color:var(--text);border-color:var(--accent)}
.content{height:calc(100vh - 185px);max-height:calc(100% - 150px);overflow:auto;padding-bottom:20px}section{padding:14px;border-bottom:1px solid var(--line)}h3{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 10px}.grid{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px 12px}.label{color:var(--muted)}.value{min-width:0;overflow-wrap:anywhere}.code-card{border:1px solid var(--line);background:var(--panel);border-radius:10px;padding:10px}.code-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.code-card code{display:block;font:11px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere;color:var(--text)}.code-card small{display:block;color:var(--muted);margin-top:7px}.code-card button,.attributes button{border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:6px;padding:4px 7px;cursor:pointer}.quality{font-size:9px;text-transform:uppercase;border-radius:10px;padding:3px 6px}.quality.stable{color:var(--green);background:color-mix(in srgb,var(--green) 12%,transparent)}.quality.likely-stable{color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}.quality.fragile{color:var(--yellow);background:color-mix(in srgb,var(--yellow) 12%,transparent)}.explain{line-height:1.55;margin:0;color:var(--text)}
.box-model{text-align:center;font:10px/1.5 ui-monospace,monospace}.margin,.border,.padding,.content-box{padding:8px;border-radius:7px}.margin{background:rgba(241,184,74,.18)}.border{margin-top:5px;background:rgba(240,130,70,.18)}.padding{margin-top:5px;background:rgba(66,211,146,.15)}.content-box{margin-top:5px;background:rgba(75,124,255,.18);font-weight:700}.style-list>div,.attributes>div{display:grid;grid-template-columns:120px minmax(0,1fr) auto;gap:8px;align-items:start;padding:7px 0;border-bottom:1px solid var(--line)}.style-list code,.attributes code{color:var(--accent);font-size:10px}.style-list span,.attributes span{overflow-wrap:anywhere}.checks{display:grid;gap:8px}.check{display:flex;gap:9px;align-items:flex-start;background:var(--panel);border:1px solid var(--line);padding:9px;border-radius:9px}.check>span{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;font-weight:800}.check.pass>span{background:rgba(66,211,146,.15);color:var(--green)}.check.warning>span{background:rgba(242,184,75,.15);color:var(--yellow)}.check.info>span{background:rgba(139,114,255,.15);color:var(--accent)}.check small{display:block;color:var(--muted);margin-top:3px;line-height:1.35}.tree{font:11px/1.65 ui-monospace,monospace;color:var(--accent)}.text-preview{white-space:pre-wrap;word-break:break-word;background:var(--panel);border:1px solid var(--line);padding:10px;border-radius:8px;color:var(--text);max-height:180px;overflow:auto}.muted{color:var(--muted)}
.empty{height:calc(100vh - 78px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;color:var(--muted)}.empty h2{color:var(--text);font-size:16px;margin:14px 0 6px}.empty p{max-width:250px;line-height:1.5}.target-icon{width:58px;height:58px;display:grid;place-items:center;border:1px solid var(--line);border-radius:18px;background:var(--panel);font-size:28px;color:var(--accent)}.shortcut{display:flex;align-items:center;gap:8px;margin-top:16px;font-size:10px}.shortcut kbd{border:1px solid var(--line);background:var(--panel);border-radius:5px;padding:3px 6px;color:var(--text)}
`;
}
