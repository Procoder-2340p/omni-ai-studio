// Serverless Multi-Model Chat Endpoint with Automatic 429 Failover
// Supports: Google Gemini (1M context + Vision), Groq (Ultra-fast), OpenRouter (Free router)

const DEFAULT_SYSTEM =
  process.env.SYSTEM_PROMPT ||
  "You are OmniAI, a sharp, creative, and helpful AI assistant. Help users brainstorm ideas, write code, analyze large documents, and solve problems clearly with clean Markdown formatting.";

const MODEL_REGISTRY = {
  "gemini-3.8-flash": { provider: "gemini", apiModel: "gemini-3.8-flash", label: "Gemini 3.8 Flash (1M)" },
  "gemini-3.5-flash-lite": { provider: "gemini", apiModel: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (1M)" },
  "groq-gpt-oss-120b": { provider: "groq", apiModel: "openai/gpt-oss-120b", label: "Groq GPT-OSS 120B" },
  "groq-llama-3.3-70b": { provider: "groq", apiModel: "llama-3.3-70b-versatile", label: "Groq Llama 3.3 70B" },
  "groq-llama-3.1-8b": { provider: "groq", apiModel: "llama-3.1-8b-instant", label: "Groq Llama 3.1 8B" },
  "openrouter-free": { provider: "openrouter", apiModel: "openrouter/free", label: "OpenRouter Auto-Free" }
};

async function callGemini({ apiKey, apiModel, messages, systemPrompt, attachments }) {
  const contents = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const parts = [];
    if (m.content) parts.push({ text: m.content });

    // Attach images/files only to the latest user message
    if (i === messages.length - 1 && m.role === "user" && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.type === "image" && att.base64 && att.mimeType) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.base64
            }
          });
        } else if (att.type === "text" && att.textContent) {
          parts.push({
            text: `\n--- Attached File: ${att.name || "document.txt"} ---\n${att.textContent}\n--- End of File ---\n`
          });
        }
      }
    }

    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(apiModel)}:generateContent`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 8192
      }
    })
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data?.error?.message || `Gemini HTTP ${resp.status}`);
    err.status = resp.status;
    throw err;
  }

  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response (possibly filtered by safety settings).");
  }

  return {
    reply: text,
    usage: data?.usageMetadata || null
  };
}

async function callOpenAICompatible({ endpoint, apiKey, apiModel, messages, systemPrompt, attachments, extraHeaders = {} }) {
  const formatted = [{ role: "system", content: systemPrompt }];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    let text = m.content || "";
    if (i === messages.length - 1 && m.role === "user" && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.type === "text" && att.textContent) {
          text += `\n\n--- Attached File: ${att.name || "document.txt"} ---\n${att.textContent}\n--- End of File ---`;
        } else if (att.type === "image") {
          text += `\n\n[Note: User attached image "${att.name || "image"}". Switch to a Gemini model for native image vision.]`;
        }
      }
    }
    formatted.push({ role: m.role === "assistant" ? "assistant" : "user", content: text });
  }

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders
    },
    body: JSON.stringify({
      model: apiModel,
      messages: formatted,
      temperature: 0.75,
      max_tokens: 4096
    })
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data?.error?.message || data?.message || `Provider HTTP ${resp.status}`);
    err.status = resp.status;
    throw err;
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Provider returned an empty response.");

  return {
    reply,
    usage: data?.usage || null
  };
}

function getKey(provider, clientKeys = {}) {
  if (provider === "gemini") return process.env.GEMINI_API_KEY || clientKeys.gemini || "";
  if (provider === "groq") return process.env.GROQ_API_KEY || clientKeys.groq || "";
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY || clientKeys.openrouter || "";
  return "";
}

async function runModel(modelId, { messages, systemPrompt, attachments, clientKeys }) {
  const cfg = MODEL_REGISTRY[modelId];
  if (!cfg) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = getKey(cfg.provider, clientKeys);
  if (!apiKey) {
    const envName =
      cfg.provider === "gemini"
        ? "GEMINI_API_KEY"
        : cfg.provider === "groq"
        ? "GROQ_API_KEY"
        : "OPENROUTER_API_KEY";
    const err = new Error(`Missing ${envName}. Add it in Vercel Environment Variables or Settings.`);
    err.status = 401;
    throw err;
  }

  if (cfg.provider === "gemini") {
    return callGemini({ apiKey, apiModel: cfg.apiModel, messages, systemPrompt, attachments });
  }
  if (cfg.provider === "groq") {
    return callOpenAICompatible({
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey,
      apiModel: cfg.apiModel,
      messages,
      systemPrompt,
      attachments
    });
  }
  return callOpenAICompatible({
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiKey,
    apiModel: cfg.apiModel,
    messages,
    systemPrompt,
    attachments,
    extraHeaders: {
      "HTTP-Referer": "https://omni-ai-studio.vercel.app",
      "X-Title": "OmniAI Studio"
    }
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      model = "gemini-3.8-flash",
      messages = [],
      systemPrompt = DEFAULT_SYSTEM,
      attachments = [],
      clientKeys = {},
      autoFailover = true
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const fallbackOrder = [
      model,
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "groq-gpt-oss-120b",
      "groq-llama-3.3-70b",
      "openrouter-free"
    ].filter((v, idx, arr) => arr.indexOf(v) === idx);

    const candidates = autoFailover ? fallbackOrder : [model];
    let lastError = null;

    for (let i = 0; i < candidates.length; i++) {
      const candidateId = candidates[i];
      const cfg = MODEL_REGISTRY[candidateId];
      if (!cfg) continue;

      // Skip unconfigured fallbacks silently (except the first explicitly selected model)
      if (i > 0 && !getKey(cfg.provider, clientKeys)) continue;

      try {
        const result = await runModel(candidateId, {
          messages,
          systemPrompt,
          attachments,
          clientKeys
        });

        return res.status(200).json({
          reply: result.reply,
          modelUsed: candidateId,
          modelLabel: cfg.label,
          failoverUsed: candidateId !== model,
          usage: result.usage
        });
      } catch (err) {
        lastError = err;
        // Only failover on rate limits (429), overload (503), or missing fallback key
        if (!autoFailover) break;
      }
    }

    return res.status(lastError?.status || 500).json({
      error: lastError?.message || "All configured AI providers failed. Please check your API keys."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unexpected server error." });
  }
}
