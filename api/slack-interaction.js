// Part 1/2: slack-interaction.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const payload = req.body.payload ? JSON.parse(req.body.payload) : {};

    if (payload.type === 'view_submission') {
      const values = payload.view.state.values;
      const privateMetadata = JSON.parse(payload.view.private_metadata || '{}');

      const extract = (blockId, actionId) =>
        values[blockId]?.[actionId]?.value || "";

      const submitted = {
        goal: extract("goal_shortterm_block", "goal_shortterm_input"),
        reasoning: extract("reasoning_block", "reasoning_input"),
        involvement: extract("involvement_block", "involvement_input"),
        next_move: extract("next_move_block", "next_move_input"),
        ownership_vision: extract("ownership_block", "ownership_input"),
        confidence: extract("confidence_block", "confidence_input"),
        title: privateMetadata.title,
        labels: privateMetadata.labels,
        result: privateMetadata.results,
        period: privateMetadata.period,
        target: privateMetadata.target,
        baseline: privateMetadata.baseline,
        owner: privateMetadata.owner,
        from_modal: true,
        slack_user: payload.user.username,
        slack_id: payload.user.id,
        thread_ts: privateMetadata.thread_ts || null,
        channel: privateMetadata.channel || null,
        timestamp: new Date().toISOString()
      };

      // Send to Zapier
      await fetch("https://hooks.zapier.com/hooks/catch/395556/2np7erm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitted)
      });

      // Post to thread
      if (privateMetadata.channel && privateMetadata.thread_ts) {
        const message = {
          channel: privateMetadata.channel,
          thread_ts: privateMetadata.thread_ts,
          text: `\uD83D\uDCDD Plan submitted for \"${submitted.title}\"`,
          blocks: [
            {
              type: "section",

              // Part 2/2: continuation of slack-interaction.js (modal with context blocks)

    if (payload.type === 'block_actions') {
      const action = payload.actions[0];
      const data = JSON.parse(action.value || '{}');
      const userId = payload.user.id;
      const username = payload.user.username;
      const thread_ts = payload.container?.message_ts;
      const channel = payload.container?.channel_id;

      const private_metadata = JSON.stringify({
        thread_ts,
        channel,
        title: data.title,
        labels: data.labels,
        results: data.results,
        period: data.period,
        target: data.target,
        baseline: data.baseline,
        owner: data.owner
      });

      const modal = {
        trigger_id: payload.trigger_id,
        view: {
          type: "modal",
          callback_id: "weekly_plan_modal",
          private_metadata,
          title: { type: "plain_text", text: "Weekly Plan" },
          submit: { type: "plain_text", text: "Submit" },
          close: { type: "plain_text", text: "Cancel" },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "👋 Let’s take a moment to reflect on this result and set your focus for the week ahead."
              }
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `*Objective Title:* ${data.title}` }]
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `*Focus:* ${data.labels}` }]
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `*Current Result:* ${data.results}` }]
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `*Period:* ${data.period}` }]
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `*Target:* ${data.target}` }]
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `*Baseline:* ${data.baseline}` }]
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `*Who owns this Objective?:* ${data.owner}` }]
            },
            {
              type: "input",
              block_id: "goal_shortterm_block",
              optional: true,
              label: {
                type: "plain_text",
                text: "What’s your goal for this result in the short term?"
              },
              element: {
                type: "plain_text_input",
                action_id: "goal_shortterm_input"
              }
            },
            {
              type: "input",
              block_id: "reasoning_block",
              optional: true,
              label: {
                type: "plain_text",
                text: "What’s your current theory for why this result is where it is?"
              },
              element: {
                type: "plain_text_input",
                action_id: "reasoning_input",
                multiline: true
              }
            },
            {
              type: "input",
              block_id: "involvement_block",
              optional: true,
              label: {
                type: "plain_text",
                text: "Who else needs to be involved or brought into focus here?"
              },
              element: {
                type: "plain_text_input",
                action_id: "involvement_input",
                multiline: true
              }
            },
            {
              type: "input",
              block_id: "next_move_block",
              optional: true,
              label: {
                type: "plain_text",
                text: "What’s one move you could make this week to support this result?"
              },
              element: {
                type: "plain_text_input",
                action_id: "next_move_input",
                multiline: true
              }
            },
            {
              type: "input",
              block_id: "ownership_block",
              optional: true,
              label: {
                type: "plain_text",
                text: "What would ‘10/10 ownership’ of this result look like from you right now?"
              },
              element: {
                type: "plain_text_input",
                action_id: "ownership_input",
                multiline: true
              }
            },
            {
              type: "input",
              block_id: "confidence_block",
              optional: true,
              label: {
                type: "plain_text",
                text: "On a scale of 1–10, how confident are you that this result will improve?"
              },
              element: {
                type: "plain_text_input",
                action_id: "confidence_input"
              }
            }
          ]
        }
      };

      await fetch("https://slack.com/api/views.open", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(modal)
      });
 }
      return res.status(200).json({ response_action: 'clear' });
    }

    return res.status(200).end();
  } catch (err) {
    console.error("❌ Slack handler error:", err);
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
}
