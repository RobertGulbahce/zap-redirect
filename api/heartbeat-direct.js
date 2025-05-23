// File: /api/heartbeat-direct.js

export default async function handler(req, res) {
  // ✅ Enable CORS for WordPress frontend
  res.setHeader("Access-Control-Allow-Origin", "https://advanceddermatology.com.au");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Preflight success
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const payload = req.body;

    console.log("📥 Incoming payload to heartbeat-direct:", payload);

    const {
      labels, results, target, baseline,
      title, metricType, baselineBoxColor,
      barColor, resultsFormatted, targetFormatted,
      baselineFormatted, performanceStatus, max
    } = payload;

    const chartConfig = {
      version: "2",
      devicePixelRatio: 4,
      type: "bar",
      data: {
        labels: [labels],
        datasets: [{
          label: "Results",
          data: [parseFloat(results)],
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
        layout: { padding: { top: 20, bottom: 50, left: 15, right: 15 } },
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
              suggestedMax: metricType === "percentage"
                ? Math.max(100, Math.ceil(max / 10) * 10)
                : metricType === "dollar"
                  ? Math.ceil(max / 10000) * 10000
                  : Math.ceil(max / 1000) * 1000,
              stepSize: metricType === "percentage"
                ? 10
                : metricType === "dollar"
                  ? 20000
                  : undefined,
              callback: function (v) {
                if (metricType === "percentage") return v + "%";
                if (metricType === "dollar") return "$" + v.toLocaleString();
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
            font: {
              size: 12,
              family: "Arial",
              weight: "normal"
            },
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
              value: parseFloat(baseline),
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
              value: parseFloat(target),
              borderColor: "rgba(255,165,0,0.8)",
              borderWidth: target ? 2 : 0,
              label: {
                enabled: !!target,
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
              yMax: parseFloat(baseline),
              backgroundColor: baselineBoxColor,
              borderWidth: 0
            }
          ]
        }
      }
    };

    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    console.log("📤 Forwarding to /api/post-slack-chart with chart URL:", chartUrl);

    const forwardRes = await fetch("https://heartbeatai.vercel.app/api/post-slack-chart", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, chart_url: chartUrl })
    });

    const forwardText = await forwardRes.text();

    if (!forwardRes.ok) {
      console.error("❌ Slack forwarding failed:", forwardText);
      throw new Error(`Slack post failed: ${forwardText}`);
    }

    console.log("✅ Slack chart sent successfully.");
    return res.status(200).json({ status: "sent" });

  } catch (err) {
    console.error("🔥 Heartbeat Direct Error:", err);
    return res.status(500).json({ error: "Slack forwarding failed", detail: err.message });
  }
}
