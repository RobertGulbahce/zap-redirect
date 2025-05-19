export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  function getPerformanceStatus(actual, target, baseline, kpiType) {
    const hasTarget = typeof target === 'number' && !isNaN(target) && target > 0;

    if (kpiType === 'compliance' || !hasTarget) {
      return actual >= baseline ? "OnTrack" : "OffTrack";
    }

    const diffToTarget = (actual - target) / target;

    if (diffToTarget >= 0.1) return "Ahead";
    if (diffToTarget >= -0.05) return "OnTrack";
    if (actual >= baseline) return "SlightlyBehind";
    if (diffToTarget >= -0.2) return "FallingBehind";
    return "OffTrack";
  }

  function formatValue(value, metricType) {
    if (typeof value !== 'number') return value;

    switch (metricType) {
      case "percentage":
        return `${Math.round(value)}%`;
      case "dollar":
        return `$${Math.round(value).toLocaleString()}`;
      case "count":
      default:
        return `${Math.round(value).toLocaleString()}`;
    }
  }

  function buildNarrative(status, actual, target, baseline, metricName, location, metricType, kpiType) {
    const actualFormatted = formatValue(actual, metricType);
    const targetFormatted = formatValue(target, metricType);
    const baselineFormatted = formatValue(baseline, metricType);

    const redLine = `the ${baselineFormatted} red line`;
    const goal = (typeof target === 'number' && target > 0) ? `the ${targetFormatted} target` : null;

    const performanceTemplates = {
      Ahead: `✅ ${location} is ahead — ${metricName} climbed to ${actualFormatted}, smashing through ${goal} and far surpassing ${redLine}. A great position — now’s the time to scale.`,
      OnTrack: `⚖️ ${location} is holding strong — ${metricName} landed at ${actualFormatted}, right around ${goal} and comfortably above ${redLine}. Consistency is good — but now’s the time to push further.`,
      SlightlyBehind: `⚠️ ${location} is slightly behind — ${metricName} came in at ${actualFormatted}, just under ${goal} but still above ${redLine}. A small shift in focus can turn this around.`,
      FallingBehind: `🔻 ${location} is falling behind — ${metricName} reached ${actualFormatted}, trailing both ${goal} and hovering just above ${redLine}. Let's take action to avoid slipping further.`,
      OffTrack: `🔴 ${location} has fallen below critical thresholds — ${metricName} hit ${actualFormatted}, underperforming ${goal} and slipping beneath ${redLine}. It’s time for immediate intervention.`
    };

    const complianceTemplates = {
      Ahead: goal
        ? `✅ ${location} is exceeding expectations — ${metricName} reached ${actualFormatted}, well above ${goal} and safely past ${redLine}. Great discipline — keep it steady.`
        : `✅ ${location} is exceeding expectations — ${metricName} reached ${actualFormatted}, safely past ${redLine}. Great discipline — keep it steady.`,
      OnTrack: goal
        ? `📘 ${location} is compliant — ${metricName} came in at ${actualFormatted}, meeting ${goal} and comfortably above ${redLine}. Stay consistent.`
        : `📘 ${location} is compliant — ${metricName} came in at ${actualFormatted}, comfortably above ${redLine}. Stay consistent.`,
      SlightlyBehind: goal
        ? `⚠️ ${location} is edging close to limits — ${metricName} is at ${actualFormatted}, below ${goal} but still above ${redLine}. A quick correction can restore compliance.`
        : `⚠️ ${location} is edging close to limits — ${metricName} is at ${actualFormatted}, still above ${redLine}. A quick correction can restore compliance.`,
      FallingBehind: goal
        ? `🚧 ${location} is out of bounds — ${metricName} is ${actualFormatted}, trailing ${goal} and hovering near ${redLine}. Attention is needed before it worsens.`
        : `🚧 ${location} is out of bounds — ${metricName} is ${actualFormatted}, hovering near ${redLine}. Attention is needed before it worsens.`,
      OffTrack: goal
        ? `⛔️ ${location} is below compliance — ${metricName} dropped to ${actualFormatted}, under both ${goal} and ${redLine}. Standards have not been met — this requires urgent correction.`
        : `⛔️ ${location} is below compliance — ${metricName} dropped to ${actualFormatted}, slipping beneath ${redLine}. Standards have not been met — this requires urgent correction.`
    };

    const templates = kpiType === 'compliance' ? complianceTemplates : performanceTemplates;
    return templates[status];
  }

  try {
    const data = req.body;

    const actual = Number(data.results);
    const target = data.target === "" ? undefined : Number(data.target);
    const baseline = Number(data.baseline);

    const metricName = data.title;
    const location = data.labels;
    const period = data.period;
    const user = data.user;
    const owner = data.owner;
    const row = data.row;
    const timestamp = data.timestamp;
    const chartUrl = data.chart_url;

    const metricType = data.metricType || "count";
    const groupType = data.groupType || "";
    const kpiType = data.kpiType || "";

    const targetFormatted = data.targetFormatted || "";
    const baselineFormatted = data.baselineFormatted || "";
    const performanceStatus = data.performanceStatus || "";

    const status = getPerformanceStatus(actual, target, baseline, kpiType);
    const messageSummary = buildNarrative(
      status,
      actual,
      target,
      baseline,
      metricName,
      location,
      metricType,
      kpiType
    );

    const sendButtonText =
      status === "Ahead" || status === "OnTrack"
        ? "Share Win With Employee"
        : "Send to Employee";

    const blocks = [
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
          text: `*Responsibility:* ${owner}`
        }
      }
    ];

    if (groupType === "grouped") {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "_Tip: This chart compares multiple performers side-by-side. To plan actions or give feedback, click into each one individually from the Heartbeat dashboard._"
        }
      });
    } else {
      blocks.push(
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
      );
    }

    const initialPayload = {
      channel: "C08QXCVUH6Y",
      text:
        `*${metricName}* report\n` +
        `*Date:* ${period}\n` +
        `*Location:* ${location}\n` +
        `*Requested by:* ${user}\n\n` +
        `${messageSummary}\n\n` +
        `Here's the chart (sent by ${user}):`,
      blocks
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
      metricType,
      groupType,
      kpiType,
      targetFormatted,
      baselineFormatted,
      performanceStatus
    });

    const actionElems = blocks.find(b => b.type === "actions")?.elements;
    if (actionElems) {
      actionElems[0].value = fullValue;
      actionElems[2].value = fullValue;
    }

    await fetch("https://slack.com/api/chat.update", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: postJson.channel,
        ts: postJson.ts,
        blocks,
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
