/**
 * Cloudflare Worker: refluxio-api (api.insightio.co.uk)
 *
 * This file documents the weather route addition. Merge the weather block
 * into the deployed worker alongside the existing "claude" and "pollen"
 * handlers without modifying those routes.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const body = await request.json();

      // Existing "claude" route — unchanged
      // Existing "pollen" route — unchanged

      if (body.target === 'weather') {
        const { lat, lng } = body.location;
        const weatherUrl = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${env.GOOGLE_API_KEY}&location.latitude=${lat}&location.longitude=${lng}`;
        const weatherResp = await fetch(weatherUrl);
        const weatherData = await weatherResp.json();

        return new Response(JSON.stringify(weatherData), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ error: 'Unknown target' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Request failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
