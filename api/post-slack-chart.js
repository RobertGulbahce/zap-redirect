export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const data = req.body;
    console.log("📥 Incoming payload to post-slack-chart:", data);

    const actual = Number(data.results);
    const target = data.target === "" ? undefined : Number(data.target);
    const baseline = Number(data.baseline);

    const metricName = data.title || "Untitled Metric";
    const location = data.labels || "Unknown Location";
    const period = data.period || "Unknown Period";
    const user = data.user || "Someone";
    const owner = data.owner || "Not Specified";
    const row = data.row || "N/A";
    const timestamp = data.timestamp || new Date().toISOString();
    const chartUrl = data.chart_url || "";

    const metricType = data.metricType || "count";
    const groupType = data.groupType || "";
    const kpiType = data.kpiType || "";

    const targetFormatted = data.targetFormatted || "";
    const baselineFormatted = data.baselineFormatted || "";
    const performanceStatus = data.performanceStatus || "";

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

    const status = getPerformanceStatus(actual, target, baseline, kpiType);
    const messageSummary = buildNarrative(status, actual, target, baseline, metricName, location, metricType, kpiType);

    const sendButtonText =
      status === "Ahead" || status === "OnTrack"
        ? "Share Win With Employee"
        : "Send to Employee";

    const blocks = [];

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `Here's the chart (sent by *${user}*):`
      }
    });

    if (chartUrl) {
      blocks.push({
        type: "image",
        image_url: chartUrl,
        alt_text: `${metricName} chart`
      });
    }

    if (groupType !== "grouped") {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: messageSummary
        }
      });
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Responsibility:* ${owner}`
      }
    });

    if (groupType === "grouped") {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "💡 *Tip:* This chart compares multiple performers side-by-side. To plan actions or give feedback, click into each one individually from the Heartbeat dashboard."
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
                text: "Plan My Actions"
              },
              value: JSON.stringify({
                title: metricName,
                labels: location,
                results: actual,
                target,
                baseline,
                performanceStatus,
                metric: metricType,
                type: kpiType,
                targetFormatted,
                baselineFormatted,
                owner,
                user,
                row,
                period,
                timestamp,
                chart_url: chartUrl
              })
            },
            {
              type: "users_select",
              action_id: "select_recipient",
              placeholder: {
                type: "plain_text",
                text: sendButtonText
              }
            },
            {
              type: "button",
              action_id: "send_to_selected_user",
              text: {
                type: "plain_text",
                text: "Send Chart"
              },
              style: "primary",
              value: JSON.stringify({
                title: metricName,
                chart_url: chartUrl
              })
            }
          ]
        }
      );
    }

    const postRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: "C08QXCVUH6Y",
        text: `*${metricName}* report — ${location}`,
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
      message: "Chart posted to Slack successfully."
    });

  } catch (err) {
    console.error("❌ Error posting to Slack:", err);
    return res.status(500).json({ error: "Slack post failed", detail: err.message });
  }
}
