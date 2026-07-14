/**
 * eLuvLetter 后端服务器
 *
 * 📡 部署说明：
 * - 服务器端口：通过 .env 文件的 PORT 配置（当前：9090）
 * - 防火墙需要开放：9090 端口（或您配置的端口）
 * - CORS配置：ALLOWED_ORIGINS 中配置允许的域名
 * - 生产环境建议：使用反向代理（Nginx）和HTTPS
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
require('dotenv').config();

// 加载配置
const config = require('./config');

// 数据库连接（如果配置了MySQL）
let mysqlConnection = null;
if (config.database.type === 'mysql') {
    try {
        const mysql = require('mysql2');
        mysqlConnection = mysql.createConnection({
            host: config.database.mysql.host,
            port: config.database.mysql.port,
            user: config.database.mysql.user,
            password: config.database.mysql.password,
            database: config.database.mysql.database
        });

        // 测试数据库连接
        mysqlConnection.connect((err) => {
            if (err) {
                console.error('❌ MySQL数据库连接失败:', err.message);
            } else {
                console.log('✅ MySQL数据库连接成功');

                // 创建必要的表
                createTables();
            }
        });
    } catch (error) {
        console.error('❌ 加载MySQL模块失败:', error.message);
    }
}
11
const app = express();
const PORT = config.server.port;

// Cloudflare代理支持
if (config.server.trustProxy || config.server.cloudflareProxy) {
    // 信任Cloudflare代理头
    app.set('trust proxy', true);
    console.log('☁️  Cloudflare代理支持已启用');
}

// 访问日志存储
let accessLogs = [];
let pageSessions = new Map(); // 存储页面会话信息

// 确保logs目录存在
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// 创建数据库表
function createTables() {
    if (!mysqlConnection) return;

    const createAccessLogTable = `
        CREATE TABLE IF NOT EXISTS access_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ip VARCHAR(45) NOT NULL,
            timestamp DATETIME NOT NULL,
            page VARCHAR(255) NOT NULL,
            action VARCHAR(50) NOT NULL,
            user_agent TEXT,
            duration INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    mysqlConnection.query(createAccessLogTable, (err) => {
        if (err) {
            console.error('❌ 创建访问日志表失败:', err.message);
        } else {
            console.log('✅ 访问日志表创建成功');
        }
    });

    mysqlConnection.query(createUsersTable, async (err) => {
        if (err) {
            console.error('❌ 创建用户表失败:', err.message);
        } else {
            console.log('✅ 用户表创建成功');
            // 初始化默认用户
            await initializeDefaultUser();
        }
    });
}

// 初始化默认用户
async function initializeDefaultUser() {
    if (!mysqlConnection) return;

    try {
        // 检查是否已存在默认用户
        const checkQuery = 'SELECT * FROM users WHERE username = ?';
        mysqlConnection.query(checkQuery, ['xiaojiawen'], async (err, results) => {
            if (err) {
                console.error('❌ 检查用户失败:', err.message);
                return;
            }

            if (results.length === 0) {
                // 创建默认用户（密码：060821）
                const hashedPassword = await bcrypt.hash('060821', 10);
                const insertQuery = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
                mysqlConnection.query(insertQuery, ['xiaojiawen', hashedPassword, 'xiaojiawen@example.com'], (err) => {
                    if (err) {
                        console.error('❌ 创建默认用户失败:', err.message);
                    } else {
                        console.log('✅ 默认用户创建成功 (用户名: xiaojiawen, 密码: 060821)');
                    }
                });
            } else {
                console.log('✅ 默认用户已存在');
            }
        });
    } catch (error) {
        console.error('❌ 初始化用户失败:', error.message);
    }
}

// 保存访问日志到数据库
function saveAccessLogToDB(logEntry) {
    if (!mysqlConnection) return;

    const query = `
        INSERT INTO access_logs (ip, timestamp, page, action, user_agent, duration)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    mysqlConnection.query(
        query,
        [logEntry.ip, logEntry.timestamp, logEntry.page, logEntry.action, logEntry.userAgent, logEntry.duration],
        (err, results) => {
            if (err) {
                console.error('❌ 保存访问日志到数据库失败:', err.message);
            }
        }
    );
}

// 记录访问日志的函数
function logAccess(req, page = null, action = 'visit', duration = null) {
    // 支持Cloudflare代理，获取真实IP
    const clientIp = config.server.cloudflareProxy
        ? req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown'
        : req.ip || req.connection.remoteAddress || 'unknown';
    const timestamp = new Date().toISOString();
    const userAgent = req.get('User-Agent') || 'unknown';
    const visitedPage = page || req.path || 'unknown';

    const logEntry = {
        ip: clientIp,
        timestamp: timestamp,
        page: visitedPage,
        action: action,
        userAgent: userAgent,
        duration: duration // 页面停留时间（毫秒）
    };

    accessLogs.push(logEntry);

    // 限制内存中的日志数量（最多1000条）
    if (accessLogs.length > 1000) {
        accessLogs = accessLogs.slice(-1000);
    }

    // 保存到数据库（如果配置了MySQL）
    if (mysqlConnection) {
        saveAccessLogToDB(logEntry);
    }

    // 写入文件日志
    const logFile = path.join(logsDir, `access_${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';

    fs.appendFile(logFile, logLine, (err) => {
        if (err) {
            console.error('写入访问日志失败:', err);
        }
    });

    console.log(`📊 访问日志: IP=${clientIp}, 页面=${visitedPage}, 时间=${timestamp}, 动作=${action}`);
}

// 页面会话管理中间件
function trackPageSession(req, res, next) {
    // 支持Cloudflare代理，获取真实IP
    const clientIp = config.server.cloudflareProxy
        ? req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown'
        : req.ip || req.connection.remoteAddress || 'unknown';
    const page = req.path;

    // 记录页面进入
    if (page && (page.includes('.html') || page === '/' || page === '/login' || page === '/page2.html')) {
        const sessionKey = `${clientIp}_${page}`;
        const enterTime = Date.now();

        // 如果用户离开上一个页面，记录停留时间
        for (const [key, session] of pageSessions.entries()) {
            if (key.startsWith(clientIp) && key !== sessionKey) {
                const duration = enterTime - session.enterTime;
                logAccess(req, session.page, 'leave', duration);
                pageSessions.delete(key);
            }
        }

        // 记录新页面会话
        pageSessions.set(sessionKey, {
            page: page,
            enterTime: enterTime
        });

        logAccess(req, page, 'visit');
    }

    next();
}

// 中间件
// CORS配置
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || config.security.allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};
app.use(cors(corsOptions));

// 速率限制
const limiter = rateLimit({
    windowMs: config.security.rateLimit.windowMs,
    max: config.security.rateLimit.max,
    message: '请求过于频繁，请稍后再试'
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use(trackPageSession); // 应用页面会话跟踪

// 模拟用户数据库（当未配置MySQL时使用）
const users = [
    {
        id: 1,
        username: 'xiaojiawen',
        // 密码: 060821 (已加密)
        password: '$2b$10$ROcfONqfqUgJGQ4aN.F6WOrSDgOn2/ZFCqn0J8XxZ9lAiPH0Bpk0q',
        email: 'xiaojiawen@example.com'
    }
];

// 登录API
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }

        let user = null;

        // 如果配置了MySQL，从数据库查询用户
        if (mysqlConnection) {
            const query = 'SELECT * FROM users WHERE username = ?';
            mysqlConnection.query(query, [username], async (err, results) => {
                if (err) {
                    console.error('数据库查询错误:', err);
                    return res.status(500).json({
                        success: false,
                        message: '服务器错误'
                    });
                }

                if (results.length === 0) {
                    return res.status(401).json({
                        success: false,
                        message: '用户名或密码错误'
                    });
                }

                user = results[0];

                // 验证密码
                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) {
                    return res.status(401).json({
                        success: false,
                        message: '用户名或密码错误'
                    });
                }

                // 生成JWT令牌
                const token = jwt.sign(
                    { userId: user.id, username: user.username },
                    config.security.jwtSecret,
                    { expiresIn: '24h' }
                );

                res.json({
                    success: true,
                    message: '登录成功',
                    token: token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    }
                });
            });
        } else {
            // 使用内存中的用户数据
            user = users.find(u => u.username === username);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            // 验证密码
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            // 生成JWT令牌
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                config.security.jwtSecret,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                message: '登录成功',
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        }

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 验证令牌API
app.get('/api/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: '未提供令牌'
            });
        }

        const decoded = jwt.verify(token, config.security.jwtSecret);

        res.json({
            success: true,
            user: decoded
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            message: '令牌无效或已过期'
        });
    }
});

// 登出API
app.post('/api/logout', (req, res) => {
    // 在实际项目中，这里应该处理令牌黑名单等
    res.json({
        success: true,
        message: '登出成功'
    });
});

// 获取服务器状态API
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: '服务器运行正常',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 获取访问日志API
app.get('/api/access-logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;

        // 如果配置了MySQL，从数据库获取日志
        if (mysqlConnection) {
            const query = 'SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT ?';
            mysqlConnection.query(query, [limit], (err, results) => {
                if (err) {
                    console.error('数据库查询错误:', err);
                    return res.status(500).json({
                        success: false,
                        message: '获取访问日志失败'
                    });
                }

                res.json({
                    success: true,
                    total: results.length,
                    returned: results.length,
                    logs: results
                });
            });
        } else {
            // 返回内存中的访问日志
            const recentLogs = accessLogs.slice(-limit).reverse();

            res.json({
                success: true,
                total: accessLogs.length,
                returned: recentLogs.length,
                logs: recentLogs
            });
        }
    } catch (error) {
        console.error('获取访问日志错误:', error);
        res.status(500).json({
            success: false,
            message: '获取访问日志失败'
        });
    }
});

// 接收页面停留时间API
app.post('/api/page-duration', (req, res) => {
    try {
        const { page, duration, timestamp } = req.body;

        if (page && duration) {
            logAccess(req, page, 'duration', duration);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('记录页面停留时间错误:', error);
        res.status(500).json({ success: false });
    }
});

// 接收页面事件API
app.post('/api/page-event', (req, res) => {
    try {
        const { event, page, timestamp, data } = req.body;

        if (event && page) {
            logAccess(req, page, `event_${event}`, null);
            console.log(`📊 页面事件: ${event}, 页面: ${page}, 数据:`, data);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('记录页面事件错误:', error);
        res.status(500).json({ success: false });
    }
});

// 获取页面统计信息API
app.get('/api/page-stats', (req, res) => {
    try {
        const pageStats = {};

        // 统计每个页面的访问次数和总停留时间
        accessLogs.forEach(log => {
            if (!pageStats[log.page]) {
                pageStats[log.page] = {
                    visits: 0,
                    totalDuration: 0,
                    averageDuration: 0
                };
            }

            pageStats[log.page].visits++;

            if (log.duration) {
                pageStats[log.page].totalDuration += log.duration;
            }
        });

        // 计算平均停留时间
        Object.keys(pageStats).forEach(page => {
            const stats = pageStats[page];
            const leaveLogs = accessLogs.filter(log => log.page === page && log.action === 'leave');
            if (leaveLogs.length > 0) {
                stats.averageDuration = Math.round(stats.totalDuration / leaveLogs.length / 1000); // 转换为秒
            }
            delete stats.totalDuration; // 不需要返回总时间
        });

        res.json({
            success: true,
            stats: pageStats,
            totalLogs: accessLogs.length
        });
    } catch (error) {
        console.error('获取页面统计错误:', error);
        res.status(500).json({
            success: false,
            message: '获取页面统计失败'
        });
    }
});

// 健康检查API
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: Date.now() });
});

// 静态文件服务
app.get('*', (req, res) => {
    // 根据路径返回相应的HTML文件
    if (req.path === '/login' || req.path === '/login.html') {
        res.sendFile(path.join(__dirname, 'login.html'));
    } else if (req.path === '/' || req.path === '/index.html') {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        // 对于其他不存在的路由，返回404
        res.status(404).sendFile(path.join(__dirname, 'login.html'));
    }
});

// 启动服务器
const server = app.listen(PORT, config.server.host, () => {
    const protocol = config.server.useHttps ? 'https' : 'http';
    const domain = config.server.domain || 'localhost';

    // 如果端口是标准端口，URL中不需要显示端口号
    const url = (PORT === 80 || PORT === 443)
        ? `${protocol}://${domain}`
        : `${protocol}://${domain}:${PORT}`;

    console.log(`🚀 服务器运行在端口 ${PORT}`);
    console.log(`🌐 前端访问地址: ${url}`);
    console.log(`🔌 API基础地址: ${url}/api`);
    console.log(`🔐 登录页面: ${url}/login`);
    console.log(`📊 访问日志API: ${url}/api/access-logs`);
    console.log(`📈 页面统计API: ${url}/api/page-stats`);

    // 数据库状态
    if (config.database.type === 'mysql') {
        console.log(`🗄️  数据库: MySQL (${config.database.mysql.host}:${config.database.mysql.port})`);
    } else {
        console.log(`🗄️  数据库: 内存模式 (未配置MySQL)`);
    }

    console.log(`📝 部署指南: 查看 DEPLOYMENT.md 文件`);

    // 检查是否可以使用pm2进行进程管理
    try {
        require('child_process').execSync('pm2 --version', { stdio: 'pipe' });
        console.log(`💡 提示: 可以使用 'pm2 start server.js' 来后台运行服务器`);
    } catch (error) {
        console.log(`💡 提示: 如需后台运行，请安装 pm2: npm install -g pm2`);
    }
}).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ 错误: 端口 ${PORT} 已被占用`);
        console.error(`💡 解决方案:`);
        console.error(`   1. 使用其他端口: 修改 .env 文件中的 PORT 设置`);
        console.error(`   2. 停止占用端口的进程`);
        console.error(`   3. 使用 pm2 管理服务器: pm2 start server.js`);
        console.error(`   4. 重启服务器会自动清理占用`);
        process.exit(1);
    } else {
        console.error('❌ 服务器启动错误:', error.message);
        process.exit(1);
    }
});

// 服务器关闭时的清理
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');

    // 记录所有活动会话的离开时间
    const exitTime = Date.now();
    for (const [key, session] of pageSessions.entries()) {
        const duration = exitTime - session.enterTime;
        const clientIp = key.split('_')[0];
        const page = session.page;

        // 创建一个模拟的req对象来记录日志
        const mockReq = {
            ip: clientIp,
            path: page,
            get: () => 'Server Shutdown'
        };

        logAccess(mockReq, page, 'leave', duration);
    }

    console.log(`📊 已记录 ${accessLogs.length} 条访问日志`);

    // 关闭数据库连接
    if (mysqlConnection) {
        mysqlConnection.end();
        console.log('🔌 MySQL数据库连接已关闭');
    }

    console.log('👋 服务器已安全关闭');
    process.exit(0);
});

module.exports = app;