// /api/slack-interaction.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const payload = req.body.payload ? JSON.parse(req.body.payload) : null;
  if (!payload || !payload.actions || !payload.actions[0]) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const action = payload.actions[0];
  const actionType = action.action_id;
  const data = JSON.parse(action.value);

  // Send this to your Zapier webhook
  const zapierURL = "https://hooks.zapier.com/hooks/catch/395556/2np7erm/";

  try {
    await fetch(zapierURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        action: actionType,
        slack_user: payload.user.username,
        slack_id: payload.user.id,
        timestamp: new Date().toISOString(),
      })
    });

    // Respond to Slack
    return res.status(200).json({
      response_action: 'update',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *${action.text.text}* triggered for *${data.owner}* by <@${payload.user.id}>`
          }
        }
      ]
    });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to forward to Zapier', detail: err.message });
  }
}
