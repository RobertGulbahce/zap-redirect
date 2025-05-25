export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

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
      metricType = "count",
      groupType = "",
      kpiType = "",
      targetFormatted = "",
      baselineFormatted = "",
      performanceStatus = "",
      barColor = "rgba(0,0,0,0.8)",
      baselineBoxColor = "rgba(0,0,0,0)",
      max = "",
      resultsFormatted = "",
    } = data;

    const actual = Number(results);
    const targetNum = target ? Number(target) : undefined;
    const baselineNum = Number(baseline);

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

    const narrativeMap = {
      Ahead: `✅ ${labels} is ahead — ${title} climbed to ${resultsFormatted}, smashing through ${targetFormatted} and far surpassing ${baselineFormatted}.`,
      OnTrack: `⚖️ ${labels} is on track — ${title} landed at ${resultsFormatted}, around ${targetFormatted} and above ${baselineFormatted}.`,
      SlightlyBehind: `⚠️ ${labels} is slightly behind — ${title} came in at ${resultsFormatted}, just under ${targetFormatted} but above ${baselineFormatted}.`,
      FallingBehind: `🔻 ${labels} is falling behind — ${title} reached ${resultsFormatted}, trailing ${targetFormatted} and near ${baselineFormatted}.`,
      OffTrack: `🔴 ${labels} has dropped — ${title} hit ${resultsFormatted}, under both ${targetFormatted} and ${baselineFormatted}.`
    };

    const perfStatus = getPerformanceStatus(actual, targetNum, baselineNum, kpiType);
    const narrative = narrativeMap[perfStatus];

    const chartConfig = {
      version: "2",
      width: 900,
      height: 600,
      format: "png",
      backgroundColor: "white",
      devicePixelRatio: 4,
      chart: {
        type: "bar",
        data: {
          labels: [labels],
          datasets: [{
            label: "Results",
            data: [actual],
            backgroundColor: barColor,
            borderColor: barColor,
            borderWidth: 1,
            borderRadius: 8,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowBlur: 4,
            shadowColor: "rgba(0,0,0,0.10)",
            barPercentage: 0.6,
            categoryPercentage: 0.8,
            order: 2
          }]
        },
        options: {
          responsive: true,
          layout: {
            padding: { top: 20, bottom: 50, left: 15, right: 15 }
          },
          title: {
            display: true,
            text: [title, labels, ` ${resultsFormatted}`, " "],
            fontSize: 26,
            fontStyle: "bold",
            fontColor: "#555"
          },
          legend: { display: false },
          scales: {
            xAxes: [{
              gridLines: { display: false },
              ticks: { fontSize: 14, fontStyle: "bold", fontColor: "#333" }
            }],
            yAxes: [{
              ticks: {
                beginAtZero: true,
                padding: 10,
                suggestedMax: Number(max) || undefined,
                stepSize: metricType === "dollar" ? 20000 : undefined,
                callback: (v) => {
                  if (metricType === "percentage") return `${v}%`;
                  if (metricType === "dollar") return `$${v.toLocaleString()}`;
                  return v.toLocaleString();
                }
              },
              gridLines: { color: "#f5f5f5" }
            }]
          },
          plugins: {
            datalabels: {
              color: "#fff",
              font: { size: 20, weight: "bold" },
              anchor: "center",
              align: "center",
              clip: true,
              formatter: () => resultsFormatted
            },
            freetext: [{
              text: `Performance Status: ${performanceStatus}`,
              x: 15,
              y: 580,
              font: { size: 12, family: "Arial", weight: "normal" },
              color: "#666",
              align: "start"
            }]
          },
          annotation: {
            annotations: [
              {
                type: "line",
                mode: "horizontal",
                scaleID: "y-axis-0",
                value: baselineNum,
                borderColor: "rgba(255,165,0,0.8)",
                borderWidth: 2,
                label: {
                  enabled: true,
                  content: baselineFormatted,
                  anchor: "start",
                  position: "start",
                  xAdjust: -248,
                  yAdjust: 15,
                  backgroundColor: "rgba(255,165,0,0.85)",
                  fontColor: "#fff",
                  fontSize: 14,
                  borderRadius: 10,
                  padding: { top: 4, bottom: 4, left: 6, right: 6 }
                }
              },
              ...(targetNum
                ? [{
                    type: "line",
                    mode: "horizontal",
                    scaleID: "y-axis-0",
                    value: targetNum,
                    borderColor: "rgba(255,165,0,0.8)",
                    borderWidth: 2,
                    label: {
                      enabled: true,
                      content: targetFormatted,
                      anchor: "start",
                      position: "start",
                      xAdjust: -244,
                      yAdjust: -15,
                      backgroundColor: "rgba(255,165,0,0.85)",
                      fontColor: "#fff",
                      fontSize: 14,
                      borderRadius: 10,
                      padding: { top: 4, bottom: 4, left: 6, right: 6 }
                    }
                  }]
                : []),
              {
                type: "box",
                drawTime: "beforeDatasetsDraw",
                xScaleID: "x-axis-0",
                yScaleID: "y-axis-0",
                yMin: 0,
                yMax: baselineNum,
                backgroundColor: baselineBoxColor,
                borderWidth: 0
              }
            ]
          }
        }
      }
    };

    const chartUrl = `https://quickchart.io/chart?key=q-y4knct0mjdl0o6igbakfz5eyogjcvdz6&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `:bar_chart: *${title} report for ${labels}*\n` +
            `*Period:* ${period}\n` +
            `*Requested by:* ${user}`
        }
      },
      {
        type: "image",
        image_url: chartUrl,
        alt_text: `${title} chart`
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: narrative }
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `_Responsibility: ${owner}_` }
        ]
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            action_id: "start_plan",
            text: { type: "plain_text", text: "Plan My Actions" },
            value: JSON.stringify({
              title, labels, results: actual, target: targetNum, baseline: baselineNum,
              performanceStatus: perfStatus, metric: metricType, type: kpiType,
              targetFormatted, baselineFormatted, owner, user, row, period,
              timestamp, chart_url: chartUrl
            }).slice(0, 2000)
          },
          {
            type: "users_select",
            action_id: "select_recipient",
            placeholder: {
              type: "plain_text",
              text: perfStatus === "Ahead" || perfStatus === "OnTrack"
                ? "Share Win With Employee"
                : "Send to Employee"
            }
          },
          {
            type: "button",
            action_id: "send_to_selected_user",
            text: { type: "plain_text", text: "Send Chart" },
            style: "primary",
            value: JSON.stringify({ title, chart_url: chartUrl }).slice(0, 2000)
          }
        ]
      }
    ];

    const post = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: "C08QXCVUH6Y",
        text: `Report: ${title} (${labels})`,
        blocks
      })
    });

    const result = await post.json();
    console.log("📬 Slack response:", result);
    if (!result.ok) throw new Error(result.error);

    return res.status(200).json({ ok: true, message: "Slack post sent successfully." });

  } catch (err) {
    console.error("❌ Slack send failed:", err);
    return res.status(500).json({ error: "Slack post failed", detail: err.message });
  }
}  
