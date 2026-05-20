# 🤖 Agente AI Studio — Node.js

App completa basata sulle **8 fasi di AIForLeaders.com** per costruire agenti AI.

## Struttura

```
ai-agent-app/
├── server.js          → Backend Express (Fasi 2, 3, 5, 6, 8)
├── public/
│   └── index.html     → Frontend chat UI (Fase 7)
├── .env.example       → Template variabili d'ambiente
└── package.json
```

## Come avviarlo

### 1. Installa le dipendenze
```bash
npm install
```

### 2. Configura la API key
```bash
cp .env.example .env
# Apri .env e inserisci la tua ANTHROPIC_API_KEY
```

### 3. Avvia il server
```bash
npm start
# oppure in modalità watch (riavvio automatico):
npm run dev
```

### 4. Apri il browser
```
http://localhost:3000
```

---

## Le 8 Fasi implementate

| Fase | Dove |
|------|------|
| 1 — Scopo e perimetro | Sidebar: sezione "Le 8 Fasi" |
| 2 — Prompt di sistema | Sidebar: campo "Prompt di Sistema" |
| 3 — Scelta modello | `server.js` → `agentConfig.model` + temperatura |
| 4 — Strumenti | Estendibile con MCP / fetch a API esterne in `server.js` |
| 5 — Memoria | `conversationHistory` in-memory, sliding window 20 msg |
| 6 — Orchestrazione | Route POST `/api/chat` con error handling e retry |
| 7 — Interfaccia | `public/index.html` — chat web responsive |
| 8 — Test & metriche | Pannello statistiche: latenza, token, conteggio messaggi |

## Estensioni suggerite

- **Fase 4**: Aggiungere strumenti MCP con `mcp_servers` nell'API call
- **Fase 5**: Sostituire l'array in-memory con Redis o SQLite per persistenza
- **Fase 6**: Aggiungere retry con backoff esponenziale
- **Fase 8**: Esportare le metriche in un CSV o dashboard

---
*Generato seguendo il corso "Come costruire un agente AI" — AIForLeaders.com*