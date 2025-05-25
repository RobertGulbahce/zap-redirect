// File: /api/post-slack-chart.js
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
      metricType = "count",
      groupType = "",
      kpiType = "",
      targetFormatted = "",
      baselineFormatted = "",
      performanceStatus = "",
      barColor = "rgba(0,0,0,0.8)",
      baselineBoxColor = "rgba(0,0,0,0)",
      max = "",
      resultsFormatted = ""
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

    const narrative = (() => {
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
    })();

    const perfStatus = getPerformanceStatus(actual, targetNum, baselineNum, kpiType);

    const chartConfig = {
      version: "2",
      devicePixelRatio: 4,
      width: 900,
      height: 600,
      format: "png",
      backgroundColor: "white",
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
            categoryPercentage: 0.8
          }]
        },
        options: {
          responsive: true,
          layout: {
            padding: { top: 20, bottom: 50, left: 15, right: 15 }
          },
          title: {
            display: true,
            text: [title, labels, ` ${resultsFormatted || formatValue(actual, metricType)}`, " "],
            fontSize: 26,
            fontStyle: "bold",
            fontColor: "#555"
          },
          legend: { display: false },
          scales: {
            xAxes: [{
              gridLines: { display: false },
              ticks: {
                fontSize: 14,
                fontStyle: "bold",
                fontColor: "#333"
              }
            }],
            yAxes: [{
              ticks: {
                beginAtZero: true,
                padding: 10,
                suggestedMax: Number(max) || undefined,
                stepSize: metricType === "percentage" ? 10 : 20000,
                callback: function (v) {
                  return metricType === "percentage" ? v + "%" : metricType === "dollar" ? "$" + v.toLocaleString() : v.toLocaleString();
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
            freetext: [
              {
                text: `Performance Status: ${perfStatus}`,
                x: 15,
                y: 580,
                font: {
                  size: 12,
                  family: "Arial",
                  weight: "normal"
                },
                color: "#666",
                align: "start"
              }
            ]
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
              {
                type: "line",
                mode: "horizontal",
                scaleID: "y-axis-0",
                value: targetNum,
                borderColor: targetNum ? "rgba(255,165,0,0.8)" : null,
                borderWidth: targetNum ? 2 : 0,
                label: {
                  enabled: !!targetNum,
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
              },
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
        text: {
          type: "mrkdwn",
          text: narrative
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Responsibility:* ${owner}`
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

    if (!result.ok) {
      throw new Error(result.error);
    }

    return res.status(200).json({ ok: true, message: "Slack post sent successfully." });

  } catch (err) {
    console.error("❌ Slack send failed:", err);
    return res.status(500).json({ error: "Slack post failed", detail: err.message });
  }
}
