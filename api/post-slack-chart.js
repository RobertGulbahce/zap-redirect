export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const data = req.body;
    const chartUrl = data.chart_url;
    const metricName = data.title || "Untitled Metric";
    const location = data.labels || "Unknown Location";

    // ✅ Minimal Slack blocks, with validation
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*✅ Minimal Slack Test Message*\nMetric: " + metricName + "\nLocation: " + location
        }
      }
    ];

    if (chartUrl && chartUrl.startsWith("https://quickchart.io/")) {
      blocks.push({
        type: "image",
        image_url: chartUrl,
        alt_text: "Chart showing performance"
      });
    }

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: "C08QXCVUH6Y",
        text: `Heartbeat alert: ${metricName} for ${location}`, // required fallback
        blocks
      })
    });

    const result = await slackRes.json();
    console.log("📬 Slack response:", result);

    if (!result.ok) {
      throw new Error(result.error);
    }

    return res.status(200).json({ ok: true, message: "Slack test sent successfully." });

  } catch (err) {
    console.error("❌ Slack send failed:", err);
    return res.status(500).json({ error: "Slack post failed", detail: err.message });
  }
}
