/**
 * eLuvLetter PM2 配置文件
 * 用于生产环境进程管理
 */

module.exports = {
  apps: [{
    name: 'eLuvLetter',
    script: 'server.js',

    // 实例配置
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster', // 集群模式

    // 日志配置
    output: '/var/log/eluvletter/access.log',
    error: '/var/log/eluvletter/error.log',
    log: '/var/log/eluvletter/combined.log',

    // 日志轮转
    log_date_format: 'YYYY-MM-DD HH:mm Z',

    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 9090,
      HOST: '0.0.0.0',
      CLOUDFLARE_PROXY: 'true',
      TRUST_PROXY: 'true',
      LOG_LEVEL: 'info',
      HTTPS: 'false' // Nginx处理HTTPS
    },

    env_production: {
      NODE_ENV: 'production',
      PORT: 9090,
      HOST: '0.0.0.0',
      CLOUDFLARE_PROXY: 'true',
      TRUST_PROXY: 'true',
      LOG_LEVEL: 'info',
      HTTPS: 'false'
    },

    // 进程管理
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    // 重启策略
    min_uptime: '60s',
    max_restarts: 10,
    restart_delay: 4000,

    // 监控配置
    vizion: true,
    ignore_watch: [
      'node_modules',
      'logs',
      '.git',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*'
    ],

    // 钩子函数
    exp_backoff_restart_delay: 100,

    // 部署配置
    deploy: {
      production: {
        user: 'deploy',
        host: 'your-server-ip',
        ref: 'origin/main',
        repo: 'https://github.com/yourusername/eluvletter.git',
        path: '/var/www/eluvletter',
        'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
      }
    }
  }]
};

// PM2 监控和告警配置
const monitoring = {
  // 内存监控
  memory: {
    alert_threshold: 800 * 1024 * 024, // 800MB
    restart_threshold: 1024 * 1024 * 1024 // 1GB
  },

  // CPU监控
  cpu: {
    alert_threshold: 80, // 80%
    restart_threshold: 95  // 95%
  },

  // 磁盘监控
  disk: {
    alert_threshold: 90 // 90%使用率
  }
};

// 导出监控配置
module.exports.monitoring = monitoring;