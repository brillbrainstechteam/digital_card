module.exports = {
  apps: [
    {
      name: 'digital-card',
      script: './server/src/server.js',
      cwd: '/home/digital-card/app',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
