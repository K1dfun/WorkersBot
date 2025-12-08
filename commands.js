export const commands = [
    {
        name: "Queue",
        description: "Check if your level is in the verifier queue",
        options: [
            {
                name: "Level URL",
                description: "",
                required: true,
                type: 3
            }
        ],
        integration_types: [0, 1],
        contexts: [0, 1, 2]
    }
];
