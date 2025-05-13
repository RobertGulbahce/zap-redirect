// File: /api/post-slack-chart.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const {
      owner,
      user,
      row,
      labels,
      results,
      target,
      baseline,
      title,
      period,
      timestamp,
      chart_url, // You must pass this from Zapier
      channel = "C08QXCVUH6Y"
    } = req.body;

    const payload = {
      channel,
      text: `Here's today's ${title} report:`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Here's today's *${title}* report:`
          }
        },
        {
          type: "image",
          image_url: chart_url,
          alt_text: `${title} chart`
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              action_id: "start_plan",
              text: {
                type: "plain_text",
                text: "📝 Plan My Actions",
                emoji: true
              },
              value: JSON.stringify({
                owner,
                user,
                row,
                labels,
                results,
                target,
                baseline,
                title,
                period,
                timestamp
              })
            }
          ]
        }
      ]
    };

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) throw new Error(slackData.error);

    return res.status(200).json({ ok: true, slack_ts: slackData.ts });
  } catch (err) {
    console.error("Failed to post to Slack:", err);
    return res.status(500).json({ error: err.message });
  }
}
