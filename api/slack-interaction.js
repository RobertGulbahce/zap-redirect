// File: /api/slack-interaction.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const payload = req.body.payload
      ? JSON.parse(req.body.payload)
      : {};

    //
    // 1) Handle the modal submission (weekly plan)
    //
    if (payload.type === 'view_submission') {
      // … your existing view_submission logic unchanged …
      // (omitted here for brevity; copy–paste your existing block)
      return res.status(200).json({ response_action: 'clear' });
    }

    //
    // 2) Handle block actions (buttons + user-picker)
    //
    if (payload.type === 'block_actions') {
      const action = payload.actions[0];

      //
      // 2a) User picked a recipient – stash it into the “Send File” button
      //
      if (action.action_id === 'select_recipient') {
        const selectedUser = action.selected_user;
        // Copy the existing blocks, locate the actions block
        const blocks = JSON.parse(JSON.stringify(payload.message.blocks));
        const actionsBlock = blocks.find(b => b.type === 'actions');

        // Find the “send_to_selected_user” button and merge in the selected user
        const sendBtn = actionsBlock.elements.find(el => el.action_id === 'send_to_selected_user');
        const existing = sendBtn.value ? JSON.parse(sendBtn.value) : {};
        sendBtn.value = JSON.stringify({ ...existing, send_to: selectedUser });

        // Update the message so the button now carries the user in its value
        await fetch('https://slack.com/api/chat.update', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: payload.container.channel_id,
            ts: payload.container.message_ts,
            blocks,
            text: payload.message.text
          })
        });
        return res.status(200).end();
      }

      //
      // 2b) “Send File” button clicked – DM the chart to that user
      //
      if (action.action_id === 'send_to_selected_user') {
        const data = JSON.parse(action.value || '{}');
        const recipient = data.send_to;
        if (!recipient) {
          // no user selected
          return res.status(200).json({
            response_action: 'errors',
            errors: {
              select_recipient: 'Please choose a user first.'
            }
          });
        }

        // 1) Open a DM with that user
        const conv = await fetch('https://slack.com/api/conversations.open', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ users: recipient })
        }).then(r => r.json());

        if (!conv.ok) throw new Error(conv.error);

        const dmChannel = conv.channel.id;

        // 2) Post the chart image in the DM
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: dmChannel,
            text: `Here's the chart for *${data.title}*:`,
            blocks: [
              {
                type: 'image',
                image_url: data.chart_url,
                alt_text: `${data.title} chart`
              }
            ]
          })
        });

        return res.status(200).end();
      }

      //
      // 2c) The existing “Plan My Actions” button
      //
      if (action.action_id !== 'start_plan') {
        return res.status(200).end();
      }

      // … your existing start_plan logic unchanged …
      // (copy–paste the code that opens your modal here)

      return res.status(200).end();
    }

    return res.status(200).end();
  } catch (err) {
    console.error('❌ Slack handler error:', err);
    return res
      .status(500)
      .json({ error: 'Internal Server Error', detail: err.message });
  }
}
