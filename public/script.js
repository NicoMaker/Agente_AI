// ── State ─────────────────────────────────────────────────────────────────
const SESSION_ID = "session_" + Date.now();
let msgCount = 0;
let totalLatency = 0;
let totalIn = 0;
let totalOut = 0;

// ── Init ──────────────────────────────────────────────────────────────────
async function init() {
  const cfg = await fetch("/api/config").then((r) => r.json());
  document.getElementById("sysPrompt").value = cfg.systemPrompt;
  document.getElementById("tempRange").value = cfg.temperature;
  document.getElementById("tempVal").textContent = cfg.temperature;
  document.getElementById("tokensRange").value = cfg.maxTokens;
  document.getElementById("tokensVal").textContent = cfg.maxTokens;
}

// ── Config save ───────────────────────────────────────────────────────────
async function saveConfig() {
  const body = {
    systemPrompt: document.getElementById("sysPrompt").value,
    temperature: parseFloat(document.getElementById("tempRange").value),
    maxTokens: parseInt(document.getElementById("tokensRange").value),
  };
  const r = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.ok) toast("✅ Configurazione salvata");
  else toast("❌ Errore nel salvataggio", true);
}

// ── Reset sessione (cancella memoria) ─────────────────────────────────────
async function resetSession() {
  await fetch("/api/session/" + SESSION_ID, { method: "DELETE" });
  document.getElementById("messages").innerHTML = "";
  document.getElementById("emptyState") || showEmpty();
  msgCount = totalLatency = totalIn = totalOut = 0;
  updateStats(null);
  toast("🗑 Memoria conversazione cancellata");
}

// ── Send message ──────────────────────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input.value.trim();
  if (!message) return;

  hideEmpty();
  appendMsg("user", message);
  input.value = "";
  autoGrow(input);

  const typingEl = appendTyping();
  document.getElementById("sendBtn").disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId: SESSION_ID }),
    });
    const data = await res.json();
    typingEl.remove();

    if (!res.ok) throw new Error(data.error || "Errore server");

    appendMsg("ai", data.reply, data.latency, data.tokens);

    // Aggiorna metriche
    msgCount++;
    totalLatency += data.latency;
    totalIn += data.tokens?.input || 0;
    totalOut += data.tokens?.output || 0;
    updateStats(data);
  } catch (err) {
    typingEl.remove();
    appendMsg("ai", "⚠️ Errore: " + err.message);
    toast("Errore: " + err.message, true);
  }

  document.getElementById("sendBtn").disabled = false;
  scrollBottom();
}

function sendSuggestion(text) {
  document.getElementById("userInput").value = text;
  sendMessage();
}

// ── DOM helpers ───────────────────────────────────────────────────────────
function appendMsg(role, text, latency, tokens) {
  const wrap = document.getElementById("messages");
  const el = document.createElement("div");
  el.className = "msg " + role;

  const avatar = role === "user" ? "👤" : "🤖";
  const meta = latency
    ? `${latency}ms · ${(tokens?.input || 0) + (tokens?.output || 0)} tok`
    : "";

  el.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-body">
      <div class="msg-bubble">${escapeHtml(text)}</div>
      ${meta ? `<div class="msg-meta">${meta}</div>` : ""}
    </div>`;
  wrap.appendChild(el);
  scrollBottom();
  return el;
}

function appendTyping() {
  const wrap = document.getElementById("messages");
  const el = document.createElement("div");
  el.className = "msg ai";
  el.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-body">
      <div class="msg-bubble" style="background:var(--ai-bg);border:1px solid rgba(110,200,232,0.12)">
        <div class="typing-indicator">
          <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
        </div>
      </div>
    </div>`;
  wrap.appendChild(el);
  scrollBottom();
  return el;
}

function hideEmpty() {
  const e = document.getElementById("emptyState");
  if (e) e.remove();
}

function updateStats(data) {
  document.getElementById("statMsgs").textContent = msgCount;
  document.getElementById("statLatency").textContent =
    msgCount > 0 ? Math.round(totalLatency / msgCount) + "ms" : "—";
  document.getElementById("statIn").textContent = totalIn;
  document.getElementById("statOut").textContent = totalOut;
}

function scrollBottom() {
  const m = document.getElementById("messages");
  m.scrollTop = m.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toast(msg, isError = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Textarea auto-grow ────────────────────────────────────────────────────
function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

document.getElementById("userInput").addEventListener("input", function () {
  autoGrow(this);
});
document.getElementById("userInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Range slider live updates
document.getElementById("tempRange").addEventListener("input", function () {
  document.getElementById("tempVal").textContent = parseFloat(
    this.value,
  ).toFixed(2);
});
document.getElementById("tokensRange").addEventListener("input", function () {
  document.getElementById("tokensVal").textContent = this.value;
});

init();
