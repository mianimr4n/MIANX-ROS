const html = await (await fetch("https://telepizza-website.vercel.app/")).text();
const match = html.match(/assets\/([^"']+\.js)/);
const js = match
  ? await (await fetch(`https://telepizza-website.vercel.app/assets/${match[1]}`)).text()
  : "";
const jwt = (js.match(/eyJ[A-Za-z0-9_-]{20,}/g) || []).length;
console.log(
  JSON.stringify(
    {
      jsAsset: match?.[1] ?? null,
      hasApi: js.includes("telepizza-api.onrender.com"),
      hasSupabase: js.includes("pyeowxvacgypohrbvgee.supabase.co"),
      jwtTokens: jwt,
      hasAnonKeyName: js.includes("VITE_SUPABASE_ANON_KEY"),
      hasWrongKeyName: js.includes("anonpublickey"),
    },
    null,
    2,
  ),
);
