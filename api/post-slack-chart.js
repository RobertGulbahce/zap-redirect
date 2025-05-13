export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const data = req.body;

    // Step 1: Send initial message without full value
    const initialPayload = {
      channel: "C08QXCVUH6Y",
      text: `Here's today's ${data.title} report:`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Here's today's *${data.title}* report:`
          }
        },
        {
          type: "image",
          image_url: data.chart_url,
          alt_text: `${data.title} chart`
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              action_id: "start_plan",
              text: {
                type: "plain_text",
                text: "🗘️ Plan My Actions",
                emoji: true
              },
              value: "placeholder"
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
      body: JSON.stringify(initialPayload)
    });

    const slackData = await slackRes.json();

    if (!slackData.ok) {
      throw new Error(`Slack API error: ${slackData.error}`);
    }

    // Step 2: Create final value with channel + ts
    const fullValue = JSON.stringify({
      channel: slackData.channel,
      ts: slackData.ts,
      owner: data.owner,
      user: data.user,
      row: data.row,
      labels: data.labels,
      results: data.results,
      target: data.target,
      baseline: data.baseline,
      title: data.title,
      period: data.period,
      timestamp: data.timestamp,
      chart_url: data.chart_url
    });

    // Step 3: Update original message with final value in button
    const finalBlocks = initialPayload.blocks;
    finalBlocks[2].elements[0].value = fullValue;

    await fetch("https://slack.com/api/chat.update", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: slackData.channel,
        ts: slackData.ts,
        blocks: finalBlocks,
        text: initialPayload.text
      })
    });

    return res.status(200).json({
      ok: true,
      channel: slackData.channel,
      ts: slackData.ts,
      message: "Chart sent and button updated."
    });
  } catch (err) {
    console.error("Error posting to Slack:", err);
    return res.status(500).json({ error: "Internal Server Error", detail: err.message });
  }
}
