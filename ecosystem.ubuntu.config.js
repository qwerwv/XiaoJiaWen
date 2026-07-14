/**
 * eLuvLetter Ubuntu 24.04 PM2配置文件
 * 针对Ubuntu 24.04 64位系统优化
 */

module.exports = {
  apps: [{
    name: 'eLuvLetter',
    script: 'server.js',

    // Ubuntu 24.04 实例配置
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster', // 集群模式

    // Ubuntu专用日志配置
    output: '/var/log/eluvletter/access.log',
    error: '/var/log/eluvletter/error.log',
    log: '/var/log/eluvletter/combined.log',

    // Ubuntu日志轮转
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Ubuntu 24.04环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 9091,
      HOST: '0.0.0.0',
      CLOUDFLARE_PROXY: 'true',
      TRUST_PROXY: 'true',
      LOG_LEVEL: 'info',
      HTTPS: 'false', // Nginx处理HTTPS

      // Ubuntu 24.04 性能优化
      UV_THREADPOOL_SIZE: 16,
      NODE_OPTIONS: '--max-old-space-size=2048',

      // Ubuntu专用路径
      LOG_FILE: '/var/log/eluvletter/server.log',
      ACCESS_LOG_FILE: '/var/log/eluvletter/access.log',
      ERROR_LOG_FILE: '/var/log/eluvletter/error.log'
    },

    env_production: {
      NODE_ENV: 'production',
      PORT: 9091,
      HOST: '0..0.0.0',
      CLOUDFLARE_PROXY: 'true',
      TRUST_PROXY: 'true',
      LOG_LEVEL: 'info',
      HTTPS: 'false',

      // Ubuntu 24.04 性能优化
      UV_THREADPOOL_SIZE: 16,
      NODE_OPTIONS: '--max-old-space-size=2048',

      // Ubuntu专用路径
      LOG_FILE: '/var/log/eluvletter/server.log',
      ACCESS_LOG_FILE: '/var/log/eluvletter/access.log',
      ERROR_LOG_FILE: '/var/log/eluvletter/error.log'
    },

    // Ubuntu 24.04 进程管理
    autorestart: true,
    watch: false,
    max_memory_restart: '2G', // Ubuntu 24.04 内存限制

    // Ubuntu重启策略
    min_uptime: '60s',
    max_restarts: 10,
    restart_delay: 4000,

    // Ubuntu监控配置
    vizion: true,
    ignore_watch: [
      'node_modules',
      'logs',
      '.git',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      '.cache',
      'tmp'
    ],

    // Ubuntu 24.04 性能优化
    exp_backoff_restart_delay: 100,

    // Ubuntu专用钩子函数
    kill_timeout: 30000, // Ubuntu系统兼容性
    listen_timeout: 10000,

    // Ubuntu 24.04 部署配置
    deploy: {
      production: {
        user: 'eluvletter',
        host: 'your-server-ip',
        ref: 'origin/main',
        repo: 'https://github.com/yourusername/eluvletter.git',
        path: '/var/www/eluvletter',
        'post-deploy': 'npm install --production && pm2 reload ecosystem.ubuntu.config.js --env production'
      }
    }
  }]
};

// Ubuntu 24.04 监控和告警配置
const ubuntuMonitoring = {
  // Ubuntu内存监控
  memory: {
    alert_threshold: 1536 * 1024 * 1024, // 1.5GB
    restart_threshold: 2048 * 1024 * 1024 // 2GB
  },

  // Ubuntu CPU监控
  cpu: {
    alert_threshold: 80, // 80%
    restart_threshold: 95  // 95%
  },

  // Ubuntu磁盘监控
  disk: {
    alert_threshold: 90 // 90%使用率
  },

  // Ubuntu系统负载监控
  load: {
    alert_threshold: 4.0, // 系统负载阈值
    critical_threshold: 8.0
  }
};

// Ubuntu 24.04 性能调优建议
const ubuntuOptimizations = {
  // Node.js优化
  nodejs: {
    // Ubuntu 24.04 推荐设置
    max_old_space_size: 2048, // MB
    max_semi_space_size: 16,
    stack_size: 256,
    uv_threadpool_size: 16
  },

  // PM2优化
  pm2: {
    // Ubuntu 24.04集群优化
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '2G',
    kill_timeout: 30000
  },

  // 系统优化
  system: {
    // Ubuntu 24.04系统限制
    file_descriptors: 65536,
    processes: 65536,
    memory_limit: '4G'
  }
};

// Ubuntu 24.04 导出配置
module.exports.ubuntuMonitoring = ubuntuMonitoring;
module.exports.ubuntuOptimizations = ubuntuOptimizations;

// Ubuntu 24.04 健康检查配置
module.exports.healthCheck = {
  // 应用健康检查
  app: {
    endpoint: '/health',
    interval: 30000, // 30秒
    timeout: 5000,
    retries: 3
  },

  // Ubuntu系统健康检查
  system: {
    check_interval: 60000, // 1分钟
    metrics: ['cpu', 'memory', 'disk', 'load'],
    alert_thresholds: {
      cpu: 80,
      memory: 85,
      disk: 90,
      load: 4.0
    }
  }
};

// Ubuntu 24.04 日志配置
module.exports.logging = {
  // 日志级别
  levels: {
    development: 'debug',
    production: 'info',
    staging: 'warn'
  },

  // Ubuntu日志轮转
  rotation: {
    interval: '1d', // 每天
    size: '100m', // 最大100MB
    compress: true,
    maxFiles: 30 // 保留30天
  },

  // Ubuntu日志路径
  paths: {
    application: '/var/log/eluvletter/app.log',
    access: '/var/log/eluvletter/access.log',
    error: '/var/log/eluvletter/error.log',
    combined: '/var/log/eluvletter/combined.log'
  }
};

// Ubuntu 24.04 安全配置
module.exports.security = {
  // 进程安全
  process: {
    user: 'eluvletter',
    group: 'www-data',
    umask: 0o027
  },

  // Ubuntu防火墙规则
  firewall: {
    allowed_ports: [22, 80, 443, 9091],
    cloudflare_ips: true,
    rate_limiting: true
  },

  // 文件权限
  file_permissions: {
    config_files: 0o600,
    log_files: 0o644,
    app_files: 0o755
  }
};