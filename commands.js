export const commands = [
  {
    name: "queue",
    description: "Check if your level is in the verifier queue",
    options: [
      {
        name: "level_url", 
        description: "GRAB level URL",
        required: true,
        type: 3
      }
    ],
    integration_types: [0, 1],
    contexts: [0, 1, 2]
  }
];
