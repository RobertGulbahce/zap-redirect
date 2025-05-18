function buildNarrative(status, actual, target, baseline, metricName, location, metricType, kpiType) {
  const actualFormatted = formatValue(actual, metricType);
  const targetFormatted = formatValue(target, metricType);
  const baselineFormatted = formatValue(baseline, metricType);

  const redLine = `the ${baselineFormatted} red line`;
  const goal = target ? `the ${targetFormatted} target` : null;

  const performanceTemplates = {
    Ahead:       `✅ ${location} is ahead — ${metricName} climbed to ${actualFormatted}, smashing through ${goal} and far surpassing ${redLine}. A great position — now’s the time to scale.`,
    OnTrack:     `⚖️ ${location} is holding strong — ${metricName} landed at ${actualFormatted}, right around ${goal} and comfortably above ${redLine}. Consistency is good — but now’s the time to push further.`,
    SlightlyBehind: `⚠️ ${location} is slightly behind — ${metricName} came in at ${actualFormatted}, just under ${goal} but still above ${redLine}. A small shift in focus can turn this around.`,
    FallingBehind:  `🔻 ${location} is falling behind — ${metricName} reached ${actualFormatted}, trailing both ${goal} and hovering just above ${redLine}. Let's take action to avoid slipping further.`,
    OffTrack:    `🔴 ${location} has fallen below critical thresholds — ${metricName} hit ${actualFormatted}, underperforming ${goal} and slipping beneath ${redLine}. It’s time for immediate intervention.`
  };

  const complianceTemplates = {
    Ahead:         goal
      ? `✅ ${location} is exceeding expectations — ${metricName} reached ${actualFormatted}, well above ${goal} and safely past ${redLine}. Great discipline — keep it steady.`
      : `✅ ${location} is exceeding expectations — ${metricName} reached ${actualFormatted}, safely past ${redLine}. Great discipline — keep it steady.`,
    OnTrack:       goal
      ? `📘 ${location} is compliant — ${metricName} came in at ${actualFormatted}, meeting ${goal} and comfortably above ${redLine}. Stay consistent.`
      : `📘 ${location} is compliant — ${metricName} came in at ${actualFormatted}, comfortably above ${redLine}. Stay consistent.`,
    SlightlyBehind: goal
      ? `⚠️ ${location} is edging close to limits — ${metricName} is at ${actualFormatted}, below ${goal} but still above ${redLine}. A quick correction can restore compliance.`
      : `⚠️ ${location} is edging close to limits — ${metricName} is at ${actualFormatted}, still above ${redLine}. A quick correction can restore compliance.`,
    FallingBehind:  goal
      ? `🚧 ${location} is out of bounds — ${metricName} is ${actualFormatted}, trailing ${goal} and hovering near ${redLine}. Attention is needed before it worsens.`
      : `🚧 ${location} is out of bounds — ${metricName} is ${actualFormatted}, hovering near ${redLine}. Attention is needed before it worsens.`,
    OffTrack:      goal
      ? `⛔️ ${location} is below compliance — ${metricName} dropped to ${actualFormatted}, under both ${goal} and ${redLine}. Standards have not been met — this requires urgent correction.`
      : `⛔️ ${location} is below compliance — ${metricName} dropped to ${actualFormatted}, slipping beneath ${redLine}. Standards have not been met — this requires urgent correction.`
  };

  const templates = kpiType === 'compliance' ? complianceTemplates : performanceTemplates;
  return templates[status];
}
