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
      performanceStatus = ""
    } = data;

    const actual = Number(results);
    const targetNum = target ? Number(target) : undefined;
    const baselineNum = Number(baseline);

    const chartConfig = {
      version: "2",
      width: 900,
      height: 600,
      devicePixelRatio: 4,
      type: "bar",
      data: {
        labels: [labels],
        datasets: [
          {
            label: "Results",
            data: [actual],
            backgroundColor: data.barColor,
            borderColor: data.barColor,
            borderWidth: 1,
            borderRadius: 8,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowBlur: 4,
            shadowColor: "rgba(0,0,0,0.10)",
            barPercentage: 0.6,
            categoryPercentage: 0.8,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        layout: {
          padding: { top: 20, bottom: 50, left: 15, right: 15 }
        },
        title: {
          display: true,
          text: [title, labels, ` ${data.resultsFormatted}`, " "],
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
              suggestedMax: Math.round(Number(data.max)),
              stepSize: 20000
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
            clip: true
          },
          freetext: [
            {
              text: `Performance Status: ${performanceStatus}`,
              x: 15,
              y: 580,
              font: { size: 12, family: "Arial", weight: "normal" },
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
            },
            {
              type: "box",
              drawTime: "beforeDatasetsDraw",
              xScaleID: "x-axis-0",
              yScaleID: "y-axis-0",
              yMin: 0,
              yMax: baselineNum,
              backgroundColor: data.baselineBoxColor,
              borderWidth: 0
            }
          ]
        }
      }
    };

    const chartUrl = `https://quickchart.io/chart?key=q-y4knct0mjdl0o6igbakfz5eyogjcvdz6&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
    console.log("📤 Forwarding to /api/post-slack-chart with chart URL:", chartUrl);

    const forwardRes = await fetch("https://heartbeatai.vercel.app/api/post-slack-chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, chart_url: chartUrl })
    });

    const result = await forwardRes.json();
    console.log(result.ok ? "✅ Slack chart sent successfully." : "❌ Slack forwarding failed:", result);

    if (!result.ok) {
      throw new Error(`Slack post failed: ${JSON.stringify(result)}`);
    }

    return res.status(200).json({ ok: true, message: "Chart sent to Slack." });

  } catch (err) {
    console.error("🔥 Heartbeat Direct Error:", err);
    return res.status(500).json({ error: "Slack post failed", detail: err.message });
  }
}
