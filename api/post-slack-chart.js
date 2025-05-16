// File: /api/post-slack-chart.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const data = req.body;

    // Step 1: Send initial message without full values
    const initialPayload = {
      channel: "C08QXCVUH6Y",
      // plain-text fallback
      text: `*${data.title}* report  
*Focus:* ${data.labels}  
*Requested by:* ${data.user}  

Here's today's *${data.title}* data:`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `*${data.title}* report\n` +
              `*Focus:* ${data.labels}\n` +
              `*Requested by:* ${data.user}\n\n` +
              `Here's today's *${data.title}* data:`
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
                text: "Plan My Actions",
                emoji: false
              },
              value: "placeholder"
            },
            {
              type: "users_select",
              action_id: "select_recipient",
              placeholder: {
                type: "plain_text",
                text: "Choose a user",
                emoji: false
              }
            },
            {
              type: "button",
              action_id: "send_to_selected_user",
              text: {
                type: "plain_text",
                text: "Send File",
                emoji: false
              },
              style: "primary",
              value: "placeholder"
            }
          ]
        }
      ]
    };

    // Post the message
    const postRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(initialPayload)
    });
    const postJson = await postRes.json();
    if (!postJson.ok) {
      throw new Error(`Slack API error: ${postJson.error}`);
    }

    // Step 2: Build the full payload for button values
    const fullValue = JSON.stringify({
      channel: postJson.channel,
      ts: postJson.ts,
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

    // Step 3: Update the buttons with the real payload
    const updatedBlocks = initialPayload.blocks;
    const actionElems = updatedBlocks[2].elements;
    actionElems[0].value = fullValue; // Plan My Actions
    actionElems[2].value = fullValue; // Send File

    await fetch("https://slack.com/api/chat.update", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: postJson.channel,
        ts: postJson.ts,
        blocks: updatedBlocks,
        text: initialPayload.text
      })
    });

    return res.status(200).json({
      ok: true,
      channel: postJson.channel,
      ts: postJson.ts,
      message: "Chart sent and buttons updated."
    });

  } catch (err) {
    console.error("Error posting to Slack:", err);
    return res.status(500).json({ error: "Internal Server Error", detail: err.message });
  }
}
