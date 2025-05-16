// File: /api/slack-interaction.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const payload = req.body.payload ? JSON.parse(req.body.payload) : {};

    //
    // 1) Handle the modal submission (weekly plan)
    //
    if (payload.type === 'view_submission' && payload.view.callback_id === 'weekly_plan_modal') {
      const summary = payload.view.state.values.plan_input_block.plan_input.value;
      const userId = payload.user.id;

      console.log(`✅ Weekly plan submitted by ${userId}:`, summary);

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
        const blocks = JSON.parse(JSON.stringify(payload.message.blocks));
        const actionsBlock = blocks.find(b => b.type === 'actions');

        const sendBtn = actionsBlock.elements.find(el => el.action_id === 'send_to_selected_user');
        const existing = sendBtn.value ? JSON.parse(sendBtn.value) : {};
        sendBtn.value = JSON.stringify({ ...existing, send_to: selectedUser });

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
          return res.status(200).json({
            response_action: 'errors',
            errors: {
              select_recipient: 'Please choose a user first.'
            }
          });
        }

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
      // 2c) “Plan My Actions” button clicked – open modal
      //
      if (action.action_id === 'start_plan') {
        const triggerId = payload.trigger_id;
        const data = JSON.parse(action.value || '{}');

        await fetch('https://slack.com/api/views.open', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            trigger_id: triggerId,
            view: {
              type: 'modal',
              callback_id: 'weekly_plan_modal',
              title: {
                type: 'plain_text',
                text: 'Weekly Plan'
              },
              submit: {
                type: 'plain_text',
                text: 'Submit'
              },
              close: {
                type: 'plain_text',
                text: 'Cancel'
              },
              private_metadata: JSON.stringify(data),
              blocks: [
                {
                  type: 'input',
                  block_id: 'plan_input_block',
                  element: {
                    type: 'plain_text_input',
                    action_id: 'plan_input',
                    multiline: true,
                    placeholder: {
                      type: 'plain_text',
                      text: 'What’s one move you could make this week?'
                    }
                  },
                  label: {
                    type: 'plain_text',
                    text: 'Your focus for the week'
                  }
                }
              ]
            }
          })
        });

        return res.status(200).end();
      }

      // fallback
      return res.status(200).end();
    }

    return res.status(200).end();
  } catch (err) {
    console.error('❌ Slack handler error:', err);
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
}
