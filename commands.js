export const commands = [
    {
        name: "queue",
        description: "check if your level is in the verifier queue",
        options: [
            {
                name: "level url",
                description: "",
                required: true,
                type: 3
            }
        ],
        integration_types: [0, 1],
        contexts: [0, 1, 2]
    }
];
