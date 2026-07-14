/**
 * ========================================
 * 🛠️  eLuvLetter 配置文件
 * ========================================
 *
 * 📝 重要部署说明：
 * 1. 服务器部署时需要开放防火墙端口（默认：9090）
 * 2. 生产环境务必修改 JWT_SECRET
 * 3. 域名配置需要与实际部署域名一致
 * 4. CORS配置需要包含所有前端域名
 */

const config = {
    // 🔧 服务器配置
    // 📝 防火墙需要开放此端口才能外部访问
    // 📝 443端口是HTTPS默认端口，无需在URL中指定
    server: {
        port: process.env.PORT || 9090,
        host: process.env.HOST || '0.0.0.0',
        domain: process.env.DOMAIN || 'localhost',
        useHttps: process.env.HTTPS === 'true' || false,
        // Cloudflare代理支持
        trustProxy: process.env.TRUST_PROXY === 'true' || false,
        cloudflareProxy: process.env.CLOUDFLARE_PROXY === 'true' || false
    },

    // 安全配置
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15分钟
            max: 100 // 限制每个IP 100个请求
        }
    },

    // 数据库配置
    database: {
        type: process.env.DB_TYPE || 'none', // none, mysql, postgresql, mongodb
        // MySQL 配置
        mysql: {
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'your_username',
            password: process.env.DB_PASSWORD || 'your_password',
            database: process.env.DB_NAME || 'your_database_name'
        }
    },

    // 前端配置
    frontend: {
        apiBaseUrl: process.env.API_BASE_URL || '',
        loginPage: '/login',
        homePage: '/'
    },

    // 日志配置
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'server.log'
    }
};

module.exports = config;