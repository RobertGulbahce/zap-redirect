export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  function getPerformanceStatus(actual, target, baseline) {
    const diffToTarget = (actual - target) / target;

    if (diffToTarget >= 0.1) return "Ahead";
    if (diffToTarget >= -0.05) return "OnTrack";
    if (actual >= baseline) return "SlightlyBehind";
    if (diffToTarget >= -0.2) return "FallingBehind";
    return "OffTrack";
  }

  function formatValue(value, type) {
    if (typeof value !== 'number') return value;

    switch (type) {
      case "percentage":
        return `${Math.round(value)}%`;
      case "dollar":
        return `$${Math.round(value).toLocaleString()}`;
      case "count":
      default:
        return `${Math.round(value).toLocaleString()}`;
    }
  }

  function buildNarrative(status, actual, target, baseline, metricName, location, metricType, kpiType, type) {
    const actualFormatted = formatValue(actual, metricType);
    const targetFormatted = formatValue(target, metricType);
    const baselineFormatted = formatValue(baseline, metricType);

    const templates = {
      Ahead: `✅ ${location} is ahead of target — ${metricName} reached ${actualFormatted}, outperforming the ${targetFormatted} target and the ${baselineFormatted} red line. Now’s the time to build on this momentum.`,
      OnTrack: `⚖️ ${location} is on track — ${metricName} came in at ${actualFormatted}, right around the ${targetFormatted} goal and comfortably above the ${baselineFormatted} red line. Steady performance — let’s keep it up.`,
      SlightlyBehind: `⚠️ ${location} is slightly behind target — ${metricName} reached ${actualFormatted}, just under the ${targetFormatted} but still ahead of the ${baselineFormatted} red line. A small nudge could make the difference.`,
      FallingBehind: `🔻 ${location} is underperforming — ${metricName} was ${actualFormatted}, below the target of ${targetFormatted} and trailing the ${baselineFormatted} red line. Let’s rally support and take action early.`,
      OffTrack: `🔴 ${location} is off track — ${metricName} fell to ${actualFormatted}, well below the ${targetFormatted} and the ${baselineFormatted} red line. This is a critical moment to step in and redirect.`
    };

    return templates[status];
  }

  try {
    const data = req.body;

    const actual = Number(data.results);
    const target = Number(data.target);
    const baseline = Number(data.baseline);

    const metricName = data.title;
    const location = data.labels;
    const period = data.period;
    const user = data.user;
    const owner = data.owner;
    const row = data.row;
    const timestamp = data.timestamp;
    const chartUrl = data.chart_url;

    const metricType = data.metric || "count";
    const kpiType = data.kpiType || ""; // ✅ NEW
    const type = data.type || "";        // ✅ NEW

    const targetFormatted = data.targetFormatted || "";
    const baselineFormatted = data.baselineFormatted || "";
    const performanceStatus = data.performanceStatus || "";

    const status = getPerformanceStatus(actual, target, baseline);
    const messageSummary = buildNarrative(
      status,
      actual,
      target,
      baseline,
      metricName,
      location,
      metricType,
      kpiType,
      type // ✅ NEW
    );

    const sendButtonText =
      status === "Ahead" || status === "OnTrack"
        ? "Share Win With Employee"
        : "Send to Employee";

    const initialPayload = {
      channel: "C08QXCVUH6Y",
      text:
        `*${metricName}* report\n` +
        `*Date:* ${period}\n` +
        `*Location:* ${location}\n` +
        `*Requested by:* ${user}\n\n` +
        `${messageSummary}\n\n` +
        `Here's the chart (sent by ${user}):\n\n` +
        `Plan your next steps:`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Here's the chart (sent by ${user}):`
          }
        },
        {
          type: "image",
          image_url: chartUrl,
          alt_text: `${metricName} chart`
        },
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
                text: sendButtonText,
                emoji: false
              }
            },
            {
              type: "button",
              action_id: "send_to_selected_user",
              text: {
                type: "plain_text",
                text: "Send Chart",
                emoji: false
              },
              style: "primary",
              value: "placeholder"
            }
          ]
        }
      ]
    };

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

    const fullValue = JSON.stringify({
      channel: postJson.channel,
      ts: postJson.ts,
      owner,
      user,
      row,
      labels: location,
      results: actual,
      target,
      baseline,
      title: metricName,
      period,
      timestamp,
      chart_url: chartUrl,
      metric: metricType,
      kpiType,     // ✅ NEW
      type,        // ✅ NEW
      targetFormatted,
      baselineFormatted,
      performanceStatus
    });

    const updatedBlocks = initialPayload.blocks;
    const actionElems = updatedBlocks[4].elements;
    actionElems[0].value = fullValue; // Plan My Actions
    actionElems[2].value = fullValue; // Send Chart

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
