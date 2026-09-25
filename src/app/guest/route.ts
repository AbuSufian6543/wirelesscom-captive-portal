export const dynamic = "force-dynamic";

export function GET() {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guest Wi-Fi</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px"><h1>Guest Wi-Fi is running</h1><p>UniFi must open <code>/guest/s/default/</code> with <code>ap</code>, <code>id</code>, <code>t</code>, <code>url</code>, and <code>ssid</code>.</p></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}
