export default [
  {
    name: "queue",
    description: "Check if a level is in the verification queue",
    options: [
      {
        type: 3,
        name: "level_url",
        description: "Level URL containing identifier",
        required: true
      }
    ]
  },
  {
    name: "publish_time",
    description: "Show the publish time of a level",
    options: [
      {
        type: 3,
        name: "level_url",
        description: "Level URL containing identifier",
        required: true
      }
    ]
  },
  {
    name: "leaderboard_search",
    description: "Find a user's best time on a specific level",
    options: [
      {
        type: 3,
        name: "username",
        description: "User name to search",
        required: true
      },
      {
        type: 3,
        name: "level_url",
        description: "Level URL containing identifier",
        required: true
      }
    ]
  }
];
