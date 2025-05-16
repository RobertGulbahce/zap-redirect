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
          text: 'My Weekly Plan'
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
            block_id: 'plan_summary',
            element: {
              type: 'plain_text_input',
              multiline: true,
              action_id: 'summary_input',
              placeholder: {
                type: 'plain_text',
                text: 'What will you focus on this week?'
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
