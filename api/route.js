const KEY = process.env.ORS_KEY;
const BASE = "https://api.openrouteservice.org";

async function geocode(text) {
  // focus point biases results toward San Diego (UCSD area)
  const url = `${BASE}/geocode/search?api_key=${KEY}`
    + `&text=${encodeURIComponent(text)}&size=1`
    + `&focus.point.lon=-117.24&focus.point.lat=32.88`;
  const data = await (await fetch(url)).json();
  const f = data.features && data.features[0];
  return f ? f.geometry.coordinates : null; // [lon, lat]
}

export default async function handler(req, res) {
  const msg = req.body.message || {};
  const call = (msg.toolCallList || msg.toolCalls || [])[0];
  const args = typeof call.function.arguments === "string"
    ? JSON.parse(call.function.arguments)
    : call.function.arguments;

  let result = "NO_ROUTE";
  try {
    const a = await geocode(args.origin);
    const b = await geocode(args.destination);
    if (a && b) {
      const url = `${BASE}/v2/directions/foot-walking?api_key=${KEY}`
        + `&start=${a[0]},${a[1]}&end=${b[0]},${b[1]}`;
      const data = await (await fetch(url)).json();
      const steps = data.features[0].properties.segments[0].steps;
      result = steps
        .filter(s => s.distance > 0 || s.instruction)
        .map((s, i) => `Step ${i + 1}: ${s.instruction}, for about ${Math.round(s.distance)} meters.`)
        .join(" ");
    }
  } catch (e) {}

  res.json({ results: [{ toolCallId: call.id, result }] });
}
