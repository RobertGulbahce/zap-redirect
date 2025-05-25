export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const data = req.body;
    console.log("📥 Incoming payload to post-slack-chart:", data);

    const {
      results,
      target,
      baseline,
      title,
      labels,
      period,
      user,
      owner,
      row,
      timestamp,
      chart_url,
      metricType = "count",
      groupType = "",
      kpiType = "",
      targetFormatted = "",
      baselineFormatted = "",
      performanceStatus = ""
    } = data;

    const actual = Number(results);
    const targetNum = target ? Number(target) : undefined;
    const baselineNum = Number(baseline);
    const chartUrl = chart_url && chart_url.startsWith("https://") ? chart_url : undefined;

    const formatValue = (value, type) => {
      if (typeof value !== 'number' || isNaN(value)) return "-";
      switch (type) {
        case "percentage": return `${Math.round(value)}%`;
        case "dollar": return `$${Math.round(value).toLocaleString()}`;
        default: return `${Math.round(value).toLocaleString()}`;
      }
    };

    const getPerformanceStatus = (actual, target, baseline, kpiType) => {
      const hasTarget = typeof target === 'number' && !isNaN(target) && target > 0;
      if (kpiType === 'compliance' || !hasTarget) {
        return actual >= baseline ? "OnTrack" : "OffTrack";
      }

      const diff = (actual - target) / target;
      if (diff >= 0.1) return "Ahead";
      if (diff >= -0.05) return "OnTrack";
      if (actual >= baseline) return "SlightlyBehind";
      if (diff >= -0.2) return "FallingBehind";
      return "OffTrack";
    };

    const buildNarrative = () => {
      const actualF = formatValue(actual, metricType);
      const targetF = formatValue(targetNum, metricType);
      const baselineF = formatValue(baselineNum, metricType);
      const redLine = `the ${baselineF} red line`;
      const goal = targetNum ? `the ${targetF} target` : null;

      const performance = {
        Ahead: `✅ ${labels} is ahead — ${title} climbed to ${actualF}, smashing through ${goal} and far surpassing ${redLine}. A great position — now’s the time to scale.`,
        OnTrack: `⚖️ ${labels} is holding strong — ${title} landed at ${actualF}, right around ${goal} and comfortably above ${redLine}. Consistency is good — but now’s the time to push further.`,
        SlightlyBehind: `⚠️ ${labels} is slightly behind — ${title} came in at ${actualF}, just under ${goal} but still above ${redLine}. A small shift in focus can turn this around.`,
        FallingBehind: `🔻 ${labels} is falling behind — ${title} reached ${actualF}, trailing both ${goal} and hovering just above ${redLine}. Let's take action to avoid slipping further.`,
        OffTrack: `🔴 ${labels} has fallen below critical thresholds — ${title} hit ${actualF}, underperforming ${goal} and slipping beneath ${redLine}. It’s time for immediate intervention.`
      };

      const compliance = {
        Ahead: `✅ ${labels} is exceeding expectations — ${title} reached ${actualF}, well above ${goal} and safely past ${redLine}. Great discipline — keep it steady.`,
        OnTrack: `📘 ${labels} is compliant — ${title} came in at ${actualF}, meeting ${goal} and comfortably above ${redLine}. Stay consistent.`,
        SlightlyBehind: `⚠️ ${labels} is edging close to limits — ${title} is at ${actualF}, below ${goal} but still above ${redLine}. A quick correction can restore compliance.`,
        FallingBehind: `🚧 ${labels} is out of bounds — ${title} is ${actualF}, trailing ${goal} and hovering near ${redLine}. Attention is needed before it worsens.`,
        OffTrack: `⛔️ ${labels} is below compliance — ${title} dropped to ${actualF}, under both ${goal} and ${redLine}. Standards have not been met — this requires urgent correction.`
      };

      const status = getPerformanceStatus(actual, targetNum, baselineNum, kpiType);
      return (kpiType === "compliance" ? compliance : performance)[status];
    };

    const narrative = buildNarrative();
    const perfStatus = getPerformanceStatus(actual, targetNum, baselineNum, kpiType);
    const sendButtonText = perfStatus === "Ahead" || perfStatus === "OnTrack"
      ? "Share Win With Employee"
      : "Send to Employee";

    const blocks = [];

    // Heading
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${title}* for *${labels}* — shared by *${user}*`
      }
    });

    // Chart image
    if (chartUrl) {
      blocks.push({
        type: "image",
        image_url: chartUrl,
        alt_text: `${title} chart`
      });
    }

    // Narrative
    if (groupType !== "grouped") {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: narrative
        }
      });
    }

    // Responsibility
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Responsibility:* ${owner}`
      }
    });

    // Tip or Actions
    if (groupType === "grouped") {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "💡 *Tip:* This chart compares multiple performers side-by-side. Click into each one individually from Heartbeat to plan actions."
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
                title,
                labels,
                results: actual,
                target: targetNum,
                baseline: baselineNum,
                performanceStatus: perfStatus,
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
                title,
                chart_url: chartUrl
              })
            }
          ]
        }
      );
    }

    const post = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: "C08QXCVUH6Y",
        text: `Report: ${title} (${labels})`, // required fallback
        blocks
      })
    });

    const result = await post.json();
    console.log("📬 Slack response:", result);

    if (!result.ok) {
      throw new Error(result.error);
    }

    return res.status(200).json({ ok: true, message: "Slack post sent successfully." });

  } catch (err) {
    console.error("❌ Slack send failed:", err);
    return res.status(500).json({ error: "Slack post failed", detail: err.message });
  }
}
