import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

config(); // carica .env

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // sicurezza headers HTTP
app.use(cors());                                    // abilita CORS per API esterne
app.use(morgan("dev"));                             // logging richieste in console
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// ── In-memory state (sostituibile con Redis/SQLite) ──────────────────────────
const conversationHistory = {}; // sessionId -> messages[]
const agentConfig = {
  systemPrompt: `Sei un assistente AI esperto e professionale. Il tuo compito è aiutare l'utente in modo preciso e conciso.
Regole:
- Rispondi sempre in italiano
- Sii diretto e concreto
- Se non sai qualcosa, dillo onestamente
- Non inventare informazioni`,
  model: "claude-sonnet-4-20250514",
  temperature: 0.7,
  maxTokens: 1000,
};

// ── API: health check ────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API: configurazione agente ───────────────────────────────────────────────
app.get("/api/config", (req, res) => {
  res.json(agentConfig);
});

app.post("/api/config", (req, res) => {
  const { systemPrompt, temperature, maxTokens } = req.body;
  if (systemPrompt !== undefined) agentConfig.systemPrompt = systemPrompt;
  if (temperature  !== undefined) agentConfig.temperature  = parseFloat(temperature);
  if (maxTokens    !== undefined) agentConfig.maxTokens    = parseInt(maxTokens);
  res.json({ ok: true, config: agentConfig });
});

// ── API: chat con l'agente ───────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { message, sessionId = "default" } = req.body;
  if (!message) return res.status(400).json({ error: "Messaggio mancante" });

  if (!conversationHistory[sessionId]) conversationHistory[sessionId] = [];

  conversationHistory[sessionId].push({ role: "user", content: message });

  // Sliding window: tieni solo gli ultimi 20 messaggi (Fase 5 - Memoria)
  if (conversationHistory[sessionId].length > 20)
    conversationHistory[sessionId] = conversationHistory[sessionId].slice(-20);

  const startTime = Date.now();

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY non impostata nel file .env");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: agentConfig.model,
        max_tokens: agentConfig.maxTokens,
        system: agentConfig.systemPrompt,
        messages: conversationHistory[sessionId],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Errore API Anthropic");
    }

    const data = await response.json();
    const latency = Date.now() - startTime;
    const assistantMessage = data.content[0].text;

    conversationHistory[sessionId].push({ role: "assistant", content: assistantMessage });

    res.json({
      reply: assistantMessage,
      latency,
      tokens: {
        input: data.usage?.input_tokens,
        output: data.usage?.output_tokens,
      },
      sessionId,
      historyLength: conversationHistory[sessionId].length,
    });
  } catch (err) {
    console.error("❌ Errore:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: reset sessione (cancella memoria) ───────────────────────────────────
app.delete("/api/session/:sessionId", (req, res) => {
  delete conversationHistory[req.params.sessionId];
  res.json({ ok: true });
});

// ── Catch-all: serve frontend ────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅  Agente AI attivo → http://localhost:${PORT}`);
  console.log(`📋  Middleware: cors · helmet · morgan · dotenv`);
  console.log(`🔑  API Key: ${process.env.ANTHROPIC_API_KEY ? "✓ trovata" : "✗ MANCANTE — aggiungi al .env"}`);
});