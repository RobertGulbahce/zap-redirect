export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const data = req.body;

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
          block_id: "action_buttons_block",
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
                chart_url: data.chart_url,
                title: data.title,
                labels: data.labels,
                results: data.results,
                period: data.period,
                target: data.target,
                baseline: data.baseline,
                owner: data.owner
              })
            },
            {
              type: "button",
              action_id: "download_chart",
              text: {
                type: "plain_text",
                text: "📅 Download",
                emoji: true
              },
              url: data.chart_url
            }
          ]
        }
      ]
    };

    // Step 1: Send message
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

    // Step 2: Add metadata to update button value (optional step for tracking)
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

    const updatedBlocks = initialPayload.blocks;
    updatedBlocks[2].elements[0].value = fullValue; // overwrite start_plan button

    await fetch("https://slack.com/api/chat.update", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: slackData.channel,
        ts: slackData.ts,
        blocks: updatedBlocks,
        text: initialPayload.text
      })
    });

    return res.status(200).json({
      ok: true,
      channel: slackData.channel,
      ts: slackData.ts,
      message: "Chart sent and updated."
    });

  } catch (err) {
    console.error("❌ Slack POST error:", err);
    return res.status(500).json({ error: "Internal Server Error", detail: err.message });
  }
}
