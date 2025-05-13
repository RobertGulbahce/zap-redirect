// /api/slack-interaction.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const payload = req.body.payload ? JSON.parse(req.body.payload) : {};

    // Handle modal submission
    if (payload.type === 'view_submission') {
      const values = payload.view.state.values;

      const goal = values.goal_block.goal_input.value;
      const obstacle = values.challenge_block.challenge_input.value;
      const confidence = values.confidence_block.confidence_input.value;

      console.log("🔁 Submitted plan:", { goal, obstacle, confidence });

      // You could also POST this to Zapier or log it elsewhere here
      return res.status(200).json({ response_action: 'clear' });
    }

    // Handle button clicks
    if (payload.type === 'block_actions') {
      const action = payload.actions[0];
      const actionId = action.action_id;
      const data = JSON.parse(action.value || '{}');
      const userId = payload.user.id;
      const username = payload.user.username;

      // ✅ Send data to Zapier
      const zapierURL = "https://hooks.zapier.com/hooks/catch/395556/2np7erm/";
      await fetch(zapierURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionId,
          slack_user: username,
          slack_id: userId,
          ...data,
          timestamp: new Date().toISOString()
        })
      });

      // ✅ Post confirmation message in Slack
      const confirmation = {
        response_action: "update",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✅ *${action.text.text}* triggered by <@${userId}> for *${data.owner}*`
            }
          }
        ]
      };

      // ✅ If button was "start_plan", open a modal too
      if (actionId === "start_plan") {
        const modal = {
          trigger_id: payload.trigger_id,
          view: {
            type: "modal",
            callback_id: "weekly_plan_modal",
            title: {
              type: "plain_text",
              text: "Weekly Plan"
            },
            submit: {
              type: "plain_text",
              text: "Submit"
            },
            close: {
              type: "plain_text",
              text: "Cancel"
            },
            blocks: [
              {
                type: "input",
                block_id: "goal_block",
                label: {
                  type: "plain_text",
                  text: "Your Goal This Week"
                },
                element: {
                  type: "plain_text_input",
                  action_id: "goal_input"
                }
              },
              {
                type: "input",
                block_id: "challenge_block",
                label: {
                  type: "plain_text",
                  text: "What Might Hold You Back?"
                },
                element: {
                  type: "plain_text_input",
                  action_id: "challenge_input"
                }
              },
              {
                type: "input",
                block_id: "confidence_block",
                label: {
                  type: "plain_text",
                  text: "Confidence Level (1–10)"
                },
                element: {
                  type: "plain_text_input",
                  action_id: "confidence_input"
                }
              }
            ]
          }
        };

        // Open the modal
        await fetch("https://slack.com/api/views.open", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(modal)
        });

        // Still return a visible message in the thread
        return res.status(200).json(confirmation);
      }

      // If not "start_plan", just show confirmation
      return res.status(200).json(confirmation);
    }

    return res.status(200).end();
  } catch (err) {
    console.error("❌ Slack handler error:", err);
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
}  
