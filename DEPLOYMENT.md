# 🚀 eLuvLetter 生产环境部署指南

## 📋 部署架构

```
用户访问 → Cloudflare CDN → Nginx反向代理 → Node.js应用 → PM2进程管理
```

## 🛠️ 环境要求

### 服务器配置
- **操作系统**: Ubuntu 24.04 LTS (64位)
- **内存**: 最低2GB，推荐4GB+
- **磁盘空间**: 最低10GB可用空间
- **网络**: 公网IP，开放80/443端口

### 软件要求
- Node.js 18.x
- Nginx 1.24+
- PM2 5.x
- UFW (防火墙)

## 🔧 快速部署

### 1. 一键部署脚本

```bash
# 下载并运行部署脚本
wget https://raw.githubusercontent.com/yourusername/eluvletter/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh --domain qingning.icu
```

### 2. 手动部署步骤

#### 2.1 系统准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y curl wget git unzip ufw nginx

# 安装Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs

# 安装PM2
sudo npm install -g pm2
```

#### 2.2 防火墙配置

```bash
# 配置UFW防火墙
sudo ufw --force reset
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# 只允许Cloudflare IP访问应用端口
sudo ufw allow from 173.245.48.0/20 to any port 9090
sudo ufw allow from 103.21.244.0/22 to any port 9090
sudo ufw allow from 103.22.200.0/22 to any port 9090
sudo ufw allow from 103.31.4.0/22 to any port 9090
sudo ufw allow from 141.101.64.0/18 to any port 9090
sudo ufw allow from 108.162.192.0/18 to any port 9090
sudo ufw allow from 190.93.240.0/20 to any port 9090
sudo ufw allow from 188.114.96.0/20 to any port 9090
sudo ufw allow from 197.234.240.0/22 to any port 9090
sudo ufw allow from 198.41.128.0/17 to any port 9090
sudo ufw allow from 162.158.132.0/22 to any port 9090
sudo ufw allow from 172.64.0.0/13 to any port 9090
sudo ufw allow from 131.0.72.0/22 to any port 9090

sudo ufw --force enable
```

#### 2.3 应用部署

```bash
# 创建应用用户
sudo useradd -m -s /bin/bash eluvletter
sudo usermod -aG www-data eluvletter

# 创建目录
sudo mkdir -p /var/www/eluvletter
sudo mkdir -p /var/log/eluvletter
sudo mkdir -p /etc/eluvletter

# 设置权限
sudo chown -R eluvletter:www-data /var/www/eluvletter
sudo chown -R eluvletter:www-data /var/log/eluvletter
sudo chown -R eluvletter:www-data /etc/eluvletter

# 部署应用文件
sudo -u eluvletter git clone https://github.com/yourusername/eluvletter.git /var/www/eluvletter
cd /var/www/eluvletter
sudo -u eluvletter npm install --production
```

#### 2.4 环境配置

```bash
# 创建生产环境配置文件
sudo -u eluvletter cat > /var/www/eluvletter/.env << 'EOF'
# eLuvLetter 生产环境配置
NODE_ENV=production

# 服务器配置
PORT=9090
HOST=0.0.0.0
DOMAIN=qingning.icu
HTTPS=false

# Cloudflare配置
CLOUDFLARE_PROXY=true
TRUST_PROXY=true

# CORS配置
ALLOWED_ORIGINS=https://qingning.icu,https://www.qingning.icu

# 安全配置
JWT_SECRET=your-production-jwt-secret-key-change-this

# API配置
API_BASE_URL=https://qingning.icu

# 日志配置
LOG_LEVEL=info
LOG_FILE=/var/log/eluvletter/server.log

# 数据库配置（根据需要配置）
DB_TYPE=none
EOF

# 设置文件权限
sudo chmod 600 /var/www/eluvletter/.env
sudo chown eluvletter:www-data /var/www/eluvletter/.env
```

#### 2.5 Nginx配置

```bash
# 备份原有配置
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# 复制新的Nginx配置
sudo cp /var/www/eluvletter/nginx.conf /etc/nginx/nginx.conf

# 创建网站配置
sudo cat > /etc/nginx/sites-available/eluvletter << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name qingning.icu www.qingning.icu;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name qingning.icu www.qingning.icu;

    # SSL配置
    ssl_certificate /etc/ssl/certs/qingning.icu.crt;
    ssl_certificate_key /etc/ssl/private/qingning.icu.key;

    # 其他配置从nginx.conf继承
    include /etc/nginx/nginx.conf;
}
EOF

# 启用网站配置
sudo ln -sf /etc/nginx/sites-available/eluvletter /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试并重启Nginx
sudo nginx -t
sudo systemctl restart nginx
```

#### 2.6 SSL证书配置

```bash
# 创建SSL目录
sudo mkdir -p /etc/ssl/certs /etc/ssl/private

# 方法1: 自签名证书（测试用）
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/qingning.icu.key \
    -out /etc/ssl/certs/qingning.icu.crt \
    -subj "/C=CN/ST=Beijing/L=Beijing/O=eLuvLetter/CN=qingning.icu"

# 方法2: Let's Encrypt证书（推荐）
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d qingning.icu -d www.qingning.icu

# 设置权限
sudo chmod 600 /etc/ssl/private/qingning.icu.key
sudo chmod 644 /etc/ssl/certs/qingning.icu.crt
```

#### 2.7 PM2配置

```bash
# 切换到应用用户
sudo -u eluvletter bash
cd /var/www/eluvletter

# 复制PM2配置文件
cp ecosystem.config.js /var/www/eluvletter/

# 启动应用
pm2 start ecosystem.config.js --env production

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
exit
```

#### 2.8 日志轮转配置

```bash
sudo cat > /etc/logrotate.d/eluvletter << 'EOF'
/var/log/eluvletter/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 eluvletter www-data
    sharedscripts
    postrotate
        pm2 reloadLogs > /dev/null 2>&1 || true
    endscript
}
EOF
```

## ☁️ Cloudflare 配置

### 1. DNS设置

```
类型: A
名称: @ (或您的子域名)
IPv4地址: 您的服务器公网IP
代理状态: 已代理 (橙色云图标)
TTL: 自动
```

### 2. SSL/TLS设置

1. **SSL/TLS模式**: 选择 **完全（Full）**
2. **边缘证书**:
   - 启用 "始终使用HTTPS"
   - 启用 "自动HTTPS重写"
   - 设置 "最小TLS版本" 为 1.2

### 3. 缓存配置

```
页面规则:
1. URL匹配: *qingning.icu/static/*
   设置: Cache Level = Cache Everything
   Edge Cache TTL = 1 month

2. URL匹配: *qingning.icu/api/*
   设置: Cache Level = Bypass
   防火墙: 适当的安全级别
```

### 4. 防火墙规则

- 启用Cloudflare防火墙
- 设置适当的速率限制
- 只允许Cloudflare IP访问源服务器

## 🔧 管理命令

### PM2管理

```bash
# 查看应用状态
sudo -u eluvletter pm2 status

# 查看应用日志
sudo -u eluvletter pm2 logs

# 重启应用
sudo -u eluvletter pm2 restart eLuvLetter

# 停止应用
sudo -u eluvletter pm2 stop eLuvLetter

# 开机自启
sudo -u eluvletter pm2 startup
sudo -u eluvletter pm2 save
```

### Nginx管理

```bash
# 检查配置
sudo nginx -t

# 重启服务
sudo systemctl restart nginx

# 查看状态
sudo systemctl status nginx

# 查看日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 系统管理

```bash
# 查看应用日志
sudo tail -f /var/log/eluvletter/access.log
sudo tail -f /var/log/eluvletter/error.log

# 检查端口占用
sudo ss -tlnp | grep :9090
sudo ss -tlnp | grep :80
sudo ss -tlnp | grep :443

# 监控资源使用
htop
sudo -u eluvletter pm2 monit
```

## 🌐 访问地址

### 生产环境
- **主站点**: https://qingning.icu
- **登录页面**: https://qingning.icu/login
- **API接口**: https://qingning.icu/api
- **健康检查**: https://qingning.icu/health

### 监控端点
- **访问日志**: https://qingning.icu/api/access-logs
- **页面统计**: https://qingning.icu/api/page-stats
- **服务器状态**: https://qingning.icu/api/status

## 🔒 安全配置

### 1. 服务器安全
- ✅ 配置防火墙，只允许必要端口
- ✅ 只允许Cloudflare IP访问应用端口
- ✅ 使用非root用户运行应用
- ✅ 设置适当的文件权限

### 2. 应用安全
- ✅ 启用HTTPS
- ✅ 配置CORS策略
- ✅ 启用速率限制
- ✅ 使用安全的JWT密钥
- ✅ 启用Cloudflare代理支持

### 3. 监控安全
- ✅ 定期检查访问日志
- ✅ 监控异常访问模式
- ✅ 启用Cloudflare安全功能

## 📊 监控和维护

### 日常监控

```bash
# 检查应用状态
sudo -u eluvletter pm2 status

# 检查日志
sudo tail -f /var/log/eluvletter/access.log

# 检查资源使用
free -h
df -h

# 检查Nginx状态
sudo systemctl status nginx
```

### 定期维护

```bash
# 清理日志
sudo logrotate -f /etc/logrotate.d/eluvletter

# 更新系统
sudo apt update && sudo apt upgrade -y

# 备份数据
sudo tar -czf /backup/eluvletter-$(date +%Y%m%d).tar.gz /var/www/eluvletter
```

## 🚨 故障排除

### 常见问题

1. **502 Bad Gateway**
   - 检查Node.js应用是否运行: `pm2 status`
   - 检查端口占用: `ss -tlnp | grep :9090`
   - 检查Nginx配置: `nginx -t`

2. **SSL证书错误**
   - 检查证书路径和权限
   - 重新生成证书
   - 检查Cloudflare SSL模式

3. **Cloudflare真实IP问题**
   - 确认`CLOUDFLARE_PROXY=true`
   - 检查Nginx真实IP配置
   - 验证Cloudflare代理状态（橙色云）

4. **性能问题**
   - 检查服务器资源使用
   - 调整PM2集群模式
   - 优化Nginx配置

### 日志分析

```bash
# 分析访问日志
sudo tail -n 100 /var/log/eluvletter/access.log

# 查找错误
sudo grep -i error /var/log/eluvletter/error.log

# 统计访问量
sudo awk '{print $1}' /var/log/eluvletter/access.log | sort | uniq -c | sort -nr
```

## 📈 性能优化

### Nginx优化
- 启用Gzip压缩
- 配置静态资源缓存
- 启用HTTP/2
- 优化缓冲区设置

### Node.js优化
- 使用PM2集群模式
- 启用日志轮转
- 监控内存使用
- 优化数据库连接

### Cloudflare优化
- 启用Brotli压缩
- 配置页面规则
- 启用图片优化
- 设置适当的缓存策略

## 🔄 更新和升级

### 应用更新

```bash
# 进入应用目录
cd /var/www/eluvletter

# 拉取最新代码
sudo -u eluvletter git pull origin main

# 安装依赖
sudo -u eluvletter npm install --production

# 重启应用
sudo -u eluvletter pm2 restart eLuvLetter
```

### 系统更新

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 更新Node.js
sudo npm install -g npm@latest
sudo npm install -g pm2@latest

# 重启服务
sudo systemctl restart nginx
sudo -u eluvletter pm2 restart all
```

---

## 🎉 部署完成检查清单

- [ ] Cloudflare DNS配置正确
- [ ] SSL证书配置完成
- [ ] Nginx反向代理工作正常
- [ ] PM2应用运行正常
- [ ] 防火墙规则生效
- [ ] 所有API端点可访问
- [ ] 前端页面正常加载
- [ ] 访问日志记录正常
- [ ] 健康检查通过
- [ ] 安全配置已应用

**恭喜！您的eLuvLetter已成功部署到生产环境！** 🚀