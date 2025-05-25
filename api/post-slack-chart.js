export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*✅ Slack Test Successful!*\nThis is a hardcoded test message from your Vercel server."
        }
      },
      {
        type: "image",
        image_url: "https://quickchart.io/chart?c={type:'bar',data:{labels:['Test'],datasets:[{label:'Value',data:[100]}]}}",
        alt_text: "Sample chart"
      }
    ];

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: "C08QXCVUH6Y", // replace if needed
        text: "Slack test message",
        blocks
      })
    });

    const json = await response.json();
    console.log("📬 Slack response:", json);

    if (!json.ok) {
      throw new Error(json.error);
    }

    return res.status(200).json({ ok: true, message: "Test message sent to Slack." });

  } catch (err) {
    console.error("❌ Slack send failed:", err);
    return res.status(500).json({ error: "Slack post failed", detail: err.message });
  }
}
