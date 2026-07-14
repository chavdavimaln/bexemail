module.exports = {
  apps: [
    {
      name: 'bexemail-api',
      script: './server.js',
      instances: 1, // Can scale up based on CPU cores for API
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'bexemail-worker',
      script: './src/workers/cron.js', // Or queueProcessor.js if decoupled completely
      instances: 1, // Keep worker to 1 instance to avoid race conditions/duplicate sending in MySQL
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
