// File: /api/post-slack-chart.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // Helper: Determine performance status
  function getPerformanceStatus(actual, target, baseline) {
    const diffToTarget = (actual - target) / target;

    if (diffToTarget >= 0.1) return "Ahead";
    if (diffToTarget >= -0.05) return "OnTrack";
    if (actual >= baseline) return "SlightlyBehind";
    if (diffToTarget >= -0.2) return "FallingBehind";
    return "OffTrack";
  }

  // Helper: Build message based on status
  function buildNarrative(status, actual, target, baseline, metric, location) {
    const actualFormatted = `$${Number(actual).toLocaleString()}`;
    const targetFormatted = `$${Number(target).toLocaleString()}`;
    const baselineFormatted = `$${Number(baseline).toLocaleString()}`;

    const templates = {
      Ahead: `✅ ${location} is ahead of target  
${metric} reached ${actualFormatted}, outperforming the ${targetFormatted} target and the ${baselineFormatted} baseline.  
Now’s the time to build on this momentum.`,

      OnTrack: `⚖️ ${location} is on track  
${metric} came in at ${actualFormatted}, right around the ${targetFormatted} goal and comfortably above the ${baselineFormatted}.  
Steady performance — let’s keep it up.`,

      SlightlyBehind: `⚠️ ${location} is slightly behind target  
${metric} reached ${actualFormatted}, just under the ${targetFormatted} but still ahead of the ${baselineFormatted}.  
A small nudge could make the difference.`,

      FallingBehind: `🔻 ${location} is underperforming  
${metric} was ${actualFormatted}, below the target of ${targetFormatted} and trailing the ${baselineFormatted}.  
Let’s rally support and take action early.`,

      OffTrack: `🔴 ${location} is off track  
${metric} fell to ${actualFormatted}, well below the ${targetFormatted} and the ${baselineFormatted}.  
This is a critical moment to step in and redirect.`
    };

    return templates[status];
  }

  try {
    const data = req.body;
    const actual = Number(data.results);
    const target = Number(data.target);
    const baseline = Number(data.baseline);

    const status = getPerformanceStatus(actual, target, baseline);
    const messageSummary = buildNarrative(
      status,
      actual,
      target,
      baseline,
      data.title,
      data.labels
    );

    // Step 1: Send initial message
    const initialPayload = {
      channel: "C08QXCVUH6Y",
      text:
        `*${data.title}* report  \n` +
        `*Date:* ${data.period}  \n` +
        `*Location:* ${data.labels}  \n` +
        `*Requested by:* ${data.user}\n\n` +
        `${messageSummary}\n\n` +
        `Here's the chart:\n\n` +
        `Plan your next steps:`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: messageSummary
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Here's the chart:"
          }
        },
        {
          type: "image",
          image_url: data.chart_url,
          alt_text: `${data.title} chart`
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Plan your next steps:*"
          }
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
                text: "Send to employee",
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
    const actionElems = updatedBlocks[4].elements;
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
