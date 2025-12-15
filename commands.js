export const commands = [
  {
    name: "queue",
    description: "check if a level is in the verifier queue",
    options: [
      {
        name: "level_url",
        description: "grab level url",
        type: 3,
        required: true
      }
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  },

  {
    name: "publish_time",
    description: "view the publish time for a level",
    options: [
      {
        name: "level_url",
        description: "grab level url",
        type: 3,
        required: true
      }
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  }
];
