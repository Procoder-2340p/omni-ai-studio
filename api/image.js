// Serverless Multi-Provider Image Generation Endpoint
// 1. Cloudflare Workers AI: @cf/black-forest-labs/flux-1-schnell (FREE 10,000 Neurons/day!)
// 2. Google Gemini Nano Banana 2.1: gemini-nano-banana-2.1 (Highest quality 1K-4K, requires Gemini API billing)

async function generateWithCloudflare({ accountId, apiToken, prompt, steps = 4 }) {
  const safeSteps = Math.min(8, Math.max(1, Number(steps) || 4));
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: prompt.slice(0, 2048),
      steps: safeSteps
    })
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.result?.image) {
    const errMsg = data?.errors?.[0]?.message || data?.error || `Cloudflare AI HTTP ${resp.status}`;
    throw new Error(errMsg);
  }

  return {
    imageUrl: `data:image/jpeg;base64,${data.result.image}`,
    providerUsed: "Cloudflare FLUX.1 Schnell (Free)"
  };
}

async function generateWithNanoBanana({ apiKey, prompt, aspectRatio = "1:1" }) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent";
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: aspectRatio || "1:1"
        }
      }
    })
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error?.message || `Nano Banana HTTP ${resp.status}`);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p) => p.inlineData?.data);
  const textPart = parts.find((p) => p.text);

  if (!imgPart) {
    throw new Error(textPart?.text || "Nano Banana did not return an image (note: Gemini image models require billing enabled on Google AI Studio).");
  }

  const mime = imgPart.inlineData.mimeType || "image/png";
  return {
    imageUrl: `data:${mime};base64,${imgPart.inlineData.data}`,
    caption: textPart?.text || "",
    providerUsed: "Google Nano Banana 2.1"
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      prompt = "",
      engine = "cloudflare-flux",
      steps = 4,
      aspectRatio = "1:1",
      clientKeys = {}
    } = req.body || {};

    if (!prompt.trim()) {
      return res.status(400).json({ error: "Image prompt is required." });
    }

    if (engine === "nano-banana-2.1") {
      const geminiKey = process.env.GEMINI_API_KEY || clientKeys.gemini || "";
      if (!geminiKey) {
        return res.status(401).json({
          error: "Missing GEMINI_API_KEY. Add it in Vercel Environment Variables or Settings."
        });
      }
      const result = await generateWithNanoBanana({ apiKey: geminiKey, prompt, aspectRatio });
      return res.status(200).json(result);
    }

    // Default: Cloudflare FLUX.1 Schnell (Free 10,000 Neurons/day)
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || clientKeys.cfAccountId || "";
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || clientKeys.cfToken || "";

    if (!accountId || !apiToken) {
      return res.status(401).json({
        error: "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN. Get them free at dash.cloudflare.com -> Workers AI -> Use REST API."
      });
    }

    const result = await generateWithCloudflare({ accountId, apiToken, prompt, steps });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Image generation failed." });
  }
}
