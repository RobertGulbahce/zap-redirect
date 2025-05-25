export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const data = req.body;
    console.log("📥 Incoming payload to post-slack-chart:", data);

    const chartUrl = data.chart_url || "";
    const metricName = data.title || "Untitled Metric";
    const location = data.labels || "Unknown Location";

    // ✅ Simple Slack message blocks for testing
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*✅ Minimal test message* from Heartbeat via Vercel.\nThis confirms the Slack bot, token, and channel are all working.\n\n*Metric:* " + metricName + "\n*Location:* " + location
        }
      },
      {
        type: "image",
        image_url: chartUrl,
        alt_text: "Test chart"
      }
    ];

    const postRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: "C08QXCVUH6Y", // Replace if testing in a different channel
        text: `Minimal test message — ${location}`,
        blocks
      })
    });

    const result = await postRes.json();
    console.log("📬 Slack response:", result);

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return res.status(200).json({
      ok: true,
      message: "Minimal chart posted to Slack successfully."
    });

  } catch (err) {
    console.error("❌ Error posting to Slack:", err);
    return res.status(500).json({ error: "Slack post failed", detail: err.message });
  }
}  
