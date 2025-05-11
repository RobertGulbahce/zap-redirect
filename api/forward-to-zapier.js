export default async function handler(req, res) {
  // CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Respond to preflight
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const zapierUrl = "https://hooks.zapier.com/hooks/catch/395556/2ncbzdz/";

    const response = await fetch(zapierUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error(`Zapier responded with ${response.status}`);
    }

    res.status(200).json({ message: 'Successfully forwarded to Zapier' });
  } catch (error) {
    res.status(500).json({ message: 'Error forwarding to Zapier', error: error.message });
  }
}
