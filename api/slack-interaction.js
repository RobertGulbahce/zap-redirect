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
