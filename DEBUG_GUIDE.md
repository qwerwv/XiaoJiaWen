# 🔧 eLuvLetter 本地调试指南

## 🚀 快速开始

### 方法1: 使用开发启动脚本（推荐）
```bash
# Windows
双击运行 dev_start.bat

# 或使用命令行
dev_start.bat
```

### 方法2: 使用npm脚本
```bash
# 启动开发服务器（自动加载开发配置）
npm run dev

# 或使用PM2启动开发环境
npm run pm2-dev
```

### 方法3: 手动启动
```bash
# 复制开发环境配置
copy .env.development .env

# 启动开发服务器
node server.js

# 或使用nodemon（热重载）
nodemon server.js
```

## 🌐 本地访问地址

- **主页面**: http://localhost:9091/
- **登录页面**: http://localhost:9091/login
- **API接口**: http://localhost:9091/api
- **健康检查**: http://localhost:9091/health

## 🔐 默认登录账户

```
用户名: xiaojiawen
密码: 060821
```

## 🛠️ 开发环境特点

### 配置差异
- ✅ **端口**: 使用9091端口（避免与生产环境冲突）
- ✅ **HTTPS**: 禁用HTTPS，使用HTTP协议
- ✅ **Cloudflare**: 禁用Cloudflare代理支持
- ✅ **CORS**: 允许本地域名访问
- ✅ **日志级别**: 调试模式，输出详细信息
- ✅ **环境变量**: 使用开发专用配置

### 文件热重载
```bash
# 使用nodemon监控文件变化
npm run dev

# 或使用PM2监控模式
npm run pm2-dev
```

## 🔍 常见调试问题

### 1. 登录失败问题

#### 检查API地址
确保login.html中的API地址正确：
```javascript
// 应该自动检测环境
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:9091'
    : 'https://www.qingning.icu';
```

#### 检查CORS配置
确保.env.development中的CORS配置包含本地地址：
```env
ALLOWED_ORIGINS=http://localhost:9091,http://127.0.0.1:9091,http://localhost:3000,http://127.0.0.1:3000
```

#### 检查数据库连接
确保MySQL服务正常运行：
```bash
# 检查MySQL服务
sudo systemctl status mysql

# 测试数据库连接
mysql -u qingning -p@xiangyang qingning
```

### 2. 端口占用问题

#### 查找占用进程
```bash
# Windows
netstat -ano | findstr :9091

# Linux/Mac
lsof -i :9091
```

#### 终止占用进程
```bash
# Windows
taskkill /PID <进程ID> /F

# Linux/Mac
kill -9 <进程ID>
```

#### 重启应用
```bash
# 使用PM2重启
npm run pm2-restart-dev

# 或停止后重新启动
npm run pm2-stop-dev
npm run pm2-dev
```

### 3. 数据库连接问题

#### 检查MySQL服务状态
```bash
# Windows
sc query mysql

# Linux
sudo systemctl status mysql
```

#### 测试数据库连接
```bash
mysql -u qingning -p@xiangyang -h 127.0.0.1 -P 3306 qingning
```

#### 创建测试用户（如果需要）
```sql
-- 登录MySQL
mysql -u qingning -p@xiangyang

-- 检查用户表
USE qingning;
SELECT * FROM users;

-- 如果没有用户，重新初始化
-- 重启应用会自动创建默认用户
```

### 4. 前端资源加载问题

#### 检查静态文件路径
确保静态文件路径正确：
```html
<!-- 检查这些路径是否正确 -->
<link rel="stylesheet" href="css/login.css" />
<script src="js/main.js"></script>
<img src="img/logo.png" />
```

#### 清除浏览器缓存
- 按 Ctrl+Shift+R 强制刷新页面
- 清除浏览器缓存和Cookie
- 尝试无痕模式

### 5. API响应问题

#### 测试API端点
```bash
# 测试健康检查
curl http://localhost:9091/health

# 测试API状态
curl http://localhost:9091/api/status

# 测试登录API
curl -X POST http://localhost:9091/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"xiaojiawen","password":"060821"}'
```

#### 检查服务器日志
```bash
# 查看实时日志
npm run pm2-logs-dev

# 或查看应用输出
node server.js
```

## 📊 调试工具

### 浏览器开发者工具
1. 按 F12 打开开发者工具
2. 查看Console标签页的错误信息
3. 查看Network标签页的API请求
4. 查看Application标签页的本地存储

### PM2监控
```bash
# 查看应用状态
pm2 status

# 实时监控
pm2 monit

# 查看日志
pm2 logs eLuvLetter-dev

# 重新加载日志
pm2 reloadLogs
```

### 数据库监控
```bash
# 查看数据库连接
mysqladmin -u qingning -p@xiangyang processlist

# 查看访问日志
SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT 10;
```

## 🧪 测试脚本

### API测试
```bash
#!/bin/bash
# test_local_api.sh

echo "🧪 本地API测试"
echo "=================="

# 测试健康检查
echo "1. 测试健康检查..."
curl -s http://localhost:9091/health | jq .

# 测试API状态
echo "2. 测试API状态..."
curl -s http://localhost:9091/api/status | jq .

# 测试登录
echo "3. 测试登录..."
curl -s -X POST http://localhost:9091/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"xiaojiawen","password":"060821"}' | jq .

echo "✅ 测试完成"
```

### 前端测试
```javascript
// 在浏览器Console中运行
console.log('API基础地址:', API_BASE);

// 测试API连接
fetch(API_BASE + '/api/status')
  .then(response => response.json())
  .then(data => console.log('API状态:', data))
  .catch(error => console.error('API错误:', error));
```

## 🔄 环境切换

### 切换到开发环境
```bash
# 方法1: 使用脚本
npm run dev

# 方法2: 手动切换
copy .env.development .env
node server.js
```

### 切换到生产环境
```bash
# 方法1: 使用生产配置
copy .env.production .env
npm start

# 方法2: 使用PM2生产模式
pm2 start ecosystem.config.js --env production
```

## 📝 调试技巧

### 1. 启用详细日志
```javascript
// 在server.js中添加调试日志
console.log('🔧 开发模式启动');
console.log('📡 服务器监听端口:', PORT);
console.log('🗄️  数据库连接:', config.database.type);
```

### 2. 使用断点调试
```javascript
// 在代码中添加debugger语句
debugger; // 在这里暂停执行

// 或使用Node.js调试器
node inspect server.js
```

### 3. 网络请求调试
```javascript
// 在浏览器Console中监控API调用
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('📡 API请求:', args[0], args[1]);
    return originalFetch.apply(this, args)
        .then(response => {
            console.log('📥 API响应:', args[0], response.status);
            return response;
        });
};
```

## 🚨 故障排除流程

1. **检查服务状态**
   ```bash
   pm2 status
   netstat -an | findstr :9091
   ```

2. **检查配置文件**
   ```bash
   # 确认使用开发配置
   type .env | findstr "NODE_ENV"
   ```

3. **检查数据库连接**
   ```bash
   mysql -u qingning -p@xiangyang qingning -e "SELECT 1;"
   ```

4. **测试API端点**
   ```bash
   curl http://localhost:9091/health
   ```

5. **查看日志**
   ```bash
   pm2 logs eLuvLetter-dev --lines 100
   ```

6. **重启服务**
   ```bash
   pm2 restart eLuvLetter-dev
   ```

---

## 🎉 调试成功标志

- ✅ 能够访问 http://localhost:9091
- ✅ 能够正常登录
- ✅ API返回正确响应
- ✅ 无CORS错误
- ✅ 数据库连接正常
- ✅ 日志输出正常

**如果遇到任何问题，请按照上述步骤逐一排查。** 🔧