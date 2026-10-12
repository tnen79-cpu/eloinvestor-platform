
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async function (req) {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers });

  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, provider: "Azure Translator" }), { status: 200, headers });
  }

  try {
    const body = await req.json().catch(function () { return {}; });
    const text = body.text || "";
    const source = body.source || "ar";
    const target = body.target || "en";

    if (!text) return new Response(JSON.stringify({ error: "Missing text" }), { status: 400, headers });

    const key = Deno.env.get("AZURE_TRANSLATOR_KEY");
    const region = Deno.env.get("AZURE_TRANSLATOR_REGION");
    let endpoint = Deno.env.get("AZURE_TRANSLATOR_ENDPOINT");

    if (!key || !region || !endpoint) {
      return new Response(JSON.stringify({ error: "Missing Azure secrets", hasKey: !!key, hasRegion: !!region, hasEndpoint: !!endpoint }), { status: 500, headers });
    }

    if (!endpoint.endsWith("/")) endpoint += "/";

    const url = endpoint + "translate?api-version=3.0&from=" + encodeURIComponent(source) + "&to=" + encodeURIComponent(target);

    const azureResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([{ Text: text }])
    });

    const raw = await azureResponse.text();

    if (!azureResponse.ok) {
      return new Response(JSON.stringify({ error: "Azure translation failed", status: azureResponse.status, raw: raw }), { status: 500, headers });
    }

    const data = JSON.parse(raw);
    const translated = data && data[0] && data[0].translations && data[0].translations[0] ? data[0].translations[0].text : text;

    return new Response(JSON.stringify({ translated: translated, provider: "Azure Translator" }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Function failed", message: String(err) }), { status: 500, headers });
  }
});
