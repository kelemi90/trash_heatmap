module.exports = {
  apps: [
    {
      name: 'trash_heatmap',
      script: 'server/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // SESSION_SECRET should be provided via environment in production
        SESSION_SECRET: process.env.SESSION_SECRET || 'KuMm!tus'
      }
    }
  ]
}
