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
      datasets: [
        {
          label: "Results",
          data: [actual],
          backgroundColor: barColor,
          borderColor: barColor,
          order: 2,
          borderWidth: 1,
          borderRadius: 8,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
          shadowBlur: 4,
          shadowColor: "rgba(0,0,0,0.10)",
          barPercentage: 0.6,
          categoryPercentage: 0.8
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
        text: [
          title,
          labels,
          ` ${data.resultsFormatted || formatValue(actual, metricType)}`,
          " "
        ],
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
            stepSize: metricType === "dollar" ? 20000 : (metricType === "percentage" ? 10 : undefined),
            callback: metricType === "dollar"
              ? function (v) { return "$" + v.toLocaleString(); }
              : (metricType === "percentage"
                  ? function (v) { return v + "%"; }
                  : function (v) { return v.toLocaleString(); })
          },
          gridLines: { color: "#f5f5f5" }
        }]
      },
      plugins: {
        datalabels: {
          color: "#fff",
          backgroundColor: null,
          font: { size: 20, weight: "bold" },
          anchor: "center",
          align: "center",
          clip: true,
          formatter: function () {
            return data.resultsFormatted || formatValue(actual, metricType);
          }
        },
        freetext: [
          {
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
          ...(targetNum ? [{
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
          }] : []),
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
