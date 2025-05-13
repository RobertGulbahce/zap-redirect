export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const payload = req.body.payload ? JSON.parse(req.body.payload) : {};

    // 🔁 Modal Submission Handling
    if (payload.type === 'view_submission') {
      const values = payload.view.state.values;

      const extract = (blockId, actionId) =>
        values[blockId]?.[actionId]?.value || "";

      const submitted = {
        title: extract("title_block", "title_input"),
        result: extract("result_block", "result_input"),
        target: extract("target_block", "target_input"),
        baseline: extract("baseline_block", "baseline_input"),
        period: extract("period_block", "period_input"),
        owner: extract("owner_block", "owner_input"),
        goal: extract("goal_shortterm_block", "goal_shortterm_input"),
        reasoning: extract("reasoning_block", "reasoning_input"),
        involvement: extract("involvement_block", "involvement_input"),
        next_move: extract("next_move_block", "next_move_input"),
        ownership_vision: extract("ownership_block", "ownership_input"),
        confidence: extract("confidence_block", "confidence_input"),
        from_modal: true,
        slack_user: payload.user.username,
        slack_id: payload.user.id,
        timestamp: new Date().toISOString()
      };

      // 🔁 Send to Zapier
      await fetch("https://hooks.zapier.com/hooks/catch/395556/2np7erm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitted)
      });

      return res.status(200).json({ response_action: 'clear' }); // Close modal
    }

    // 🧠 Button Interaction Handling
    if (payload.type === 'block_actions') {
      const action = payload.actions[0];
      const actionId = action.action_id;
      const data = JSON.parse(action.value || '{}');
      const userId = payload.user.id;
      const username = payload.user.username;

      // 🔁 Send data to Zapier
      await fetch("https://hooks.zapier.com/hooks/catch/395556/2np7erm/", {
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

      // ✅ Confirmation message
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

      // 📝 Launch Modal (if applicable)
      if (actionId === "start_plan") {
        const modal = {
          trigger_id: payload.trigger_id,
          view: {
            type: "modal",
            callback_id: "weekly_plan_modal",
            title: { type: "plain_text", text: "Weekly Plan" },
            submit: { type: "plain_text", text: "Submit" },
            close: { type: "plain_text", text: "Cancel" },
            blocks: [
              {
                type: "input",
                block_id: "title_block",
                label: { type: "plain_text", text: "Title" },
                element: {
                  type: "plain_text_input",
                  action_id: "title_input",
                  initial_value: data.title || ""
                }
              },
              {
                type: "input",
                block_id: "result_block",
                label: { type: "plain_text", text: "Current Result" },
                element: {
                  type: "plain_text_input",
                  action_id: "result_input",
                  initial_value: data.results || ""
                }
              },
              {
                type: "input",
                block_id: "target_block",
                label: { type: "plain_text", text: "Target" },
                element: {
                  type: "plain_text_input",
                  action_id: "target_input",
                  initial_value: data.target || ""
                }
              },
              {
                type: "input",
                block_id: "baseline_block",
                label: { type: "plain_text", text: "Baseline" },
                element: {
                  type: "plain_text_input",
                  action_id: "baseline_input",
                  initial_value: data.baseline || ""
                }
              },
              {
                type: "input",
                block_id: "period_block",
                label: { type: "plain_text", text: "Period" },
                element: {
                  type: "plain_text_input",
                  action_id: "period_input",
                  initial_value: data.period || ""
                }
              },
              {
                type: "input",
                block_id: "owner_block",
                label: { type: "plain_text", text: "Who owns this Objective?" },
                element: {
                  type: "plain_text_input",
                  action_id: "owner_input",
                  initial_value: data.owner || ""
                }
              },
              {
                type: "input",
                block_id: "goal_shortterm_block",
                label: {
                  type: "plain_text",
                  text: "What’s your goal for this result in the short term?"
                },
                element: {
                  type: "plain_text_input",
                  action_id: "goal_shortterm_input",
                  multiline: true
                }
              },
              {
                type: "input",
                block_id: "reasoning_block",
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

        return res.status(200).json(confirmation);
      }

      // Default confirmation if no modal
      return res.status(200).json(confirmation);
    }

    return res.status(200).end();
  } catch (err) {
    console.error("❌ Slack handler error:", err);
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
}
