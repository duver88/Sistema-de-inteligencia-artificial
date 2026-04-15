/** @type {import('@types/pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'lionscore-comments',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,          // Single instance — scale up with cluster mode if needed
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      // Log rotation
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'lionscore-worker',
      script: 'node_modules/.bin/tsx',
      args: 'lib/workers/comment-processor.ts',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-worker-error.log',
      out_file: './logs/pm2-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
