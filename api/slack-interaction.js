// File: /api/slack-interaction.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const payload = req.body.payload ? JSON.parse(req.body.payload) : {};

    //
    // 1) Handle modal submission
    //
    if (payload.type === 'view_submission' && payload.view.callback_id === 'weekly_plan_modal') {
      const values = payload.view.state.values;
      const user = payload.user.id;
      const metadata = JSON.parse(payload.view.private_metadata || '{}');

      const response = {
        user,
        goal: values.goal_block.goal_input.value,
        move: values.move_block.move_input.value,
        ownership: values.ownership_block?.ownership_input?.value || '',
        confidence: values.confidence_block.confidence_input.selected_option.value
      };

      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: metadata.channel,
          thread_ts: metadata.ts,
          text: `📝 <@${user}> just submitted a weekly plan:\n• *Goal:* ${response.goal}\n• *Action:* ${response.move}\n• *Ownership:* ${response.ownership}\n• *Confidence:* ${response.confidence}/10`
        })
      });

      return res.status(200).json({ response_action: 'clear' });
    }

    //
    // 2) Handle block actions
    //
    if (payload.type === 'block_actions') {
      const action = payload.actions[0];

      //
      // 2a) User picked a recipient
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
      // 2b) "Send File" clicked
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

        // 1. Open a DM
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

        // 2. Fetch channel name (optional)
        const info = await fetch('https://slack.com/api/conversations.info', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ channel: dmChannel })
        }).then(r => r.json());

        const readableName = info.ok && info.channel?.name
          ? info.channel.name
          : 'direct message';

        // 3. Send chart to DM
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

        // 4. Confirm back in thread
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: payload.container.channel_id,
            thread_ts: payload.container.message_ts,
            text: `✅ Chart sent to <@${recipient}> via ${readableName}`
          })
        });

        return res.status(200).end();
      }

      //
      // 2c) Plan My Actions
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
                text: 'Plan My Actions'
              },
              submit: {
                type: 'plain_text',
                text: 'Submit'
              },
              close: {
                type: 'plain_text',
                text: 'Cancel'
              },
              private_metadata: JSON.stringify({
                ...data,
                channel: payload.container.channel_id,
                ts: payload.container.message_ts,
                performanceStatus: data.performanceStatus,
                metricType: data.metric,
                type: data.type,
                targetFormatted: data.targetFormatted,
                baselineFormatted: data.baselineFormatted,
                owner: data.owner,
                user: data.user,
                row: data.row,
                period: data.period,
                timestamp: data.timestamp
              }),
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `📊 *${data.title}* for *${data.labels}*\nTarget: *${data.target}* │ Result: *${data.results}*`
                  }
                },
                {
                  type: 'input',
                  block_id: 'goal_block',
                  element: {
                    type: 'plain_text_input',
                    action_id: 'goal_input',
                    placeholder: {
                      type: 'plain_text',
                      text: 'E.g. Improve acceptance rate by 5%'
                    }
                  },
                  label: {
                    type: 'plain_text',
                    text: 'What’s your goal for this result?'
                  }
                },
                {
                  type: 'input',
                  block_id: 'move_block',
                  element: {
                    type: 'plain_text_input',
                    action_id: 'move_input',
                    multiline: true,
                    placeholder: {
                      type: 'plain_text',
                      text: 'What’s one move you could make this week to support this result?'
                    }
                  },
                  label: {
                    type: 'plain_text',
                    text: 'Weekly action'
                  }
                },
                {
                  type: 'input',
                  block_id: 'ownership_block',
                  element: {
                    type: 'plain_text_input',
                    action_id: 'ownership_input',
                    placeholder: {
                      type: 'plain_text',
                      text: 'E.g. Focus more on plan presentation...'
                    }
                  },
                  label: {
                    type: 'plain_text',
                    text: 'What would “10/10 ownership” of this result look like?'
                  },
                  optional: true
                },
                {
                  type: 'input',
                  block_id: 'confidence_block',
                  element: {
                    type: 'static_select',
                    action_id: 'confidence_input',
                    options: Array.from({ length: 10 }, (_, i) => ({
                      text: {
                        type: 'plain_text',
                        text: `${i + 1}/10`
                      },
                      value: `${i + 1}`
                    }))
                  },
                  label: {
                    type: 'plain_text',
                    text: 'How confident are you this result will improve?'
                  }
                }
              ]
            }
          })
        });

        return res.status(200).end();
      }

      return res.status(200).end(); // fallback
    }

    return res.status(200).end(); // default
  } catch (err) {
    console.error('❌ Slack handler error:', err);
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
}
