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
