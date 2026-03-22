module.exports = {
    apps: [
        {
            name: '9tail-bot',
            script: 'bot/index.js',
            watch: false,
            restart_delay: 3000,
            max_restarts: 10,
            env: {
                NODE_ENV: 'production',
            },
        },
        {
            name: '9tail-api',
            script: 'api/server.js',
            watch: false,
            restart_delay: 3000,
            max_restarts: 10,
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};