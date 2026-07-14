#!/bin/bash

# ========================================
# eLuvLetter Ubuntu 24.04 专用安装脚本
# 适用于 Ubuntu 24.04 LTS 64位系统
# ========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为Ubuntu 24.04
check_ubuntu_version() {
    log_info "检查系统版本..."

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [ "$ID" = "ubuntu" ] && [ "$VERSION_ID" = "24.04" ]; then
            log_success "✅ Ubuntu 24.04 检测成功"
            return 0
        elif [ "$ID" = "ubuntu" ]; then
            log_warning "⚠️  检测到Ubuntu，但不是24.04版本 (当前: $VERSION_ID)"
            return 0
        else
            log_warning "⚠️  非Ubuntu系统 (当前: $ID $VERSION_ID)"
            return 1
        fi
    else
        log_warning "⚠️  无法检测系统版本"
        return 1
    fi
}

# 检查root权限
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用sudo运行此脚本"
        exit 1
    fi
}

# 系统优化
optimize_system() {
    log_info "优化系统配置..."

    # 更新包列表
    apt update

    # 升级系统
    log_info "升级系统软件包..."
    apt upgrade -y

    # 安装基础工具
    log_info "安装基础工具..."
    apt install -y curl wget git unzip ufw htop net-tools

    # 系统性能优化
    log_info "配置系统性能优化..."
    cat >> /etc/sysctl.conf << 'EOF'
# eLuvLetter 性能优化

# 网络优化
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30

# 文件描述符优化
fs.file-max = 100000

# 内存优化
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
EOF

    # 应用sysctl配置
    sysctl -p

    # 配置limits.conf
    log_info "配置系统limits..."
    cat >> /etc/security/limits.conf << 'EOF'
# eLuvLetter 应用限制
eluvletter soft nofile 65536
eluvletter hard nofile 65536
eluvletter soft nproc 65536
eluvletter hard nproc 65536
root soft nofile 65536
root hard nofile 65536
EOF

    log_success "系统优化完成"
}

# 安装Node.js
install_nodejs() {
    log_info "安装Node.js..."

    # 移除旧版本
    apt remove -y nodejs npm

    # 安装Node.js 18.x (Ubuntu 24.04推荐版本)
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs

    # 验证安装
    node_version=$(node --version)
    npm_version=$(npm --version)

    log_success "Node.js $node_version 安装成功"
    log_success "npm $npm_version 安装成功"

    # 配置npm
    npm config set registry https://registry.npmmirror.com
    npm config set loglevel warn

    log_success "Node.js环境配置完成"
}

# 安装PM2
install_pm2() {
    log_info "安装PM2进程管理器..."

    npm install -g pm2@latest

    # 验证安装
    pm2_version=$(pm2 --version)
    log_success "PM2 $pm2_version 安装成功"

    # 配置PM2开机自启
    pm2 startup systemd -u eluvletter --hp /home/eluvletter

    log_success "PM2配置完成"
}

# 安装Nginx
install_nginx() {
    log_info "安装Nginx..."

    apt install -y nginx

    # 验证安装
    nginx_version=$(nginx -v 2>&1)
    log_success "Nginx安装成功: $nginx_version"

    # 备份默认配置
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

    log_success "Nginx配置完成"
}

# 安装MySQL
install_mysql() {
    log_info "安装MySQL数据库..."

    apt install -y mysql-server

    # 安全配置MySQL
    log_info "配置MySQL安全设置..."
    mysql_secure_installation

    # 创建数据库和用户
    log_info "创建eLuvLetter数据库..."
    mysql -e "CREATE DATABASE IF NOT EXISTS qingning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -e "CREATE USER IF NOT EXISTS 'qingning'@'localhost' IDENTIFIED BY '@xiangyang';"
    mysql -e "GRANT ALL PRIVILEGES ON qingning.* TO 'qingning'@'localhost';"
    mysql -e "FLUSH PRIVILEGES;"

    log_success "MySQL配置完成"
}

# 创建应用用户
create_app_user() {
    log_info "创建应用用户..."

    if ! id "eluvletter" &>/dev/null; then
        useradd -m -s /bin/bash eluvletter
        usermod -aG www-data eluvletter
        log_success "应用用户 eluvletter 创建成功"
    else
        log_info "应用用户 eluvletter 已存在"
    fi
}

# 创建应用目录
create_app_directories() {
    log_info "创建应用目录..."

    mkdir -p /var/www/eluvletter
    mkdir -p /var/log/eluvletter
    mkdir -p /etc/eluvletter
    mkdir -p /var/backups/eluvletter

    # 设置权限
    chown -R eluvletter:www-data /var/www/eluvletter
    chown -R eluvletter:www-data /var/log/eluvletter
    chown -R eluvletter:www-data /etc/eluvletter
    chown -R eluvletter:www-data /var/backups/eluvletter

    chmod 755 /var/www/eluvletter
    chmod 755 /var/log/eluvletter
    chmod 755 /etc/eluvletter

    log_success "应用目录创建完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."

    # 重置防火墙
    ufw --force reset

    # 允许基本服务
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'

    # 允许Cloudflare IP访问应用端口
    local cloudflare_ips=(
        "173.245.48.0/20"
        "103.21.244.0/22"
        "103.22.200.0/22"
        "103.31.4.0/22"
        "141.101.64.0/18"
        "108.162.192.0/18"
        "190.93.240.0/20"
        "188.114.96.0/20"
        "197.234.240.0/22"
        "198.41.128.0/17"
        "162.158.132.0/22"
        "172.64.0.0/13"
        "131.0.72.0/22"
    )

    for ip in "${cloudflare_ips[@]}"; do
        ufw allow from $ip to any port 9091 comment 'Cloudflare IP'
    done

    # 启用防火墙
    ufw --force enable

    log_success "防火墙配置完成"
}

# 创建Ubuntu专用服务文件
create_systemd_service() {
    log_info "创建Systemd服务文件..."

    cat > /etc/systemd/system/eluvletter.service << 'EOF'
[Unit]
Description=eLuvLetter Application
After=network.target mysql.service
Requires=mysql.service

[Service]
Type=forking
User=eluvletter
Group=www-data
WorkingDirectory=/var/www/eluvletter
Environment=NODE_ENV=production
ExecStart=/usr/bin/pm2 start /var/www/eluvletter/ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload eLuvLetter
ExecStop=/usr/bin/pm2 stop eLuvLetter
Restart=always
RestartSec=10

# 安全配置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

# 资源限制
LimitNOFILE=65536
LimitNPROC=65536
MemoryLimit=2G

[Install]
WantedBy=multi-user.target
EOF

    # 启用服务
    systemctl daemon-reload
    systemctl enable eluvletter.service

    log_success "Systemd服务配置完成"
}

# 创建Ubuntu专用环境配置
create_ubuntu_env() {
    log_info "创建Ubuntu专用环境配置..."

    cat > /var/www/eluvletter/.env.ubuntu << 'EOF'
# ========================================
# 🐧 eLuvLetter Ubuntu 24.04 生产环境配置
# ========================================

# 🔌 服务器配置
PORT=9091
HOST=0.0.0.0
DOMAIN=www.qingning.icu
HTTPS=false

# 🔐 安全配置
JWT_SECRET=your-production-jwt-secret-key-ubuntu-24-04

# 🗄️ 数据库配置
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=qingning
DB_PASSWORD=@xiangyang
DB_NAME=qingning

# 🌐 域名配置
CLOUDFLARE_PROXY=true
TRUST_PROXY=true

# 🔓 CORS配置
ALLOWED_ORIGINS=https://qingning.icu,https://www.qingning.icu,https://cdn.qingning.icu

# 🛠️ Ubuntu 24.04 特定配置
NODE_ENV=production
LOG_LEVEL=info

# 📁 日志配置
LOG_FILE=/var/log/eluvletter/server.log
ACCESS_LOG_FILE=/var/log/eluvletter/access.log
ERROR_LOG_FILE=/var/log/eluvletter/error.log

# 🔄 性能配置
UV_THREADPOOL_SIZE=16
NODE_OPTIONS=--max-old-space-size=2048

# 📊 监控配置
MONITORING_ENABLED=true
METRICS_PORT=9092

# API配置
API_BASE_URL=https://www.qingning.icu
EOF

    chown eluvletter:www-data /var/www/eluvletter/.env.ubuntu
    chmod 600 /var/www/eluvletter/.env.ubuntu

    log_success "Ubuntu环境配置创建完成"
}

# 创建监控脚本
create_monitoring_script() {
    log_info "创建系统监控脚本..."

    cat > /usr/local/bin/monitor-eluvletter.sh << 'EOF'
#!/bin/bash

# eLuvLetter Ubuntu监控脚本

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查应用状态
check_app_status() {
    log_info "检查eLuvLetter应用状态..."

    if pm2 show eLuvLetter > /dev/null 2>&1; then
        log_success "✅ 应用正在运行"
        pm2 show eLuvLetter
    else
        log_error "❌ 应用未运行"
        return 1
    fi
}

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源..."

    # 内存使用
    memory_usage=$(free -h | awk 'NR==2{printf "%.2f%%", $3*100/$2}')
    log_info "内存使用: $memory_usage"

    # CPU使用
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    log_info "CPU使用: $cpu_usage%"

    # 磁盘使用
    disk_usage=$(df -h / | awk 'NR==2{print $5}')
    log_info "磁盘使用: $disk_usage"

    # 检查是否超过阈值
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        log_warning "⚠️  CPU使用率过高"
    fi
}

# 检查服务端口
check_ports() {
    log_info "检查服务端口..."

    ports=(9091 9092 80 443 3306)
    for port in "${ports[@]}"; do
        if ss -tlnp | grep -q ":$port"; then
            log_success "✅ 端口 $port 正在监听"
        else
            log_warning "⚠️  端口 $port 未监听"
        fi
    done
}

# 检查日志
check_logs() {
    log_info "检查应用日志..."

    if [ -f /var/log/eluvletter/error.log ]; then
        error_count=$(tail -n 100 /var/log/eluvletter/error.log | grep -i error | wc -l)
        if [ $error_count -gt 0 ]; then
            log_warning "⚠️  发现 $error_count 个错误日志"
        else
            log_success "✅ 无错误日志"
        fi
    fi
}

# 主函数
main() {
    echo "🐧 eLuvLetter Ubuntu监控系统"
    echo "="$(seq 1 40 | tr '\n' '=')
    echo "时间: $(date)"
    echo

    check_app_status
    echo
    check_system_resources
    echo
    check_ports
    echo
    check_logs
    echo

    log_info "监控检查完成"
}

main "$@"
EOF

    chmod +x /usr/local/bin/monitor-eluvletter.sh

    log_success "监控脚本创建完成"
}

# 创建定时任务
create_cron_jobs() {
    log_info "创建定时任务..."

    # 为eluvletter用户创建cron任务
    cat > /etc/cron.d/eluvletter-monitoring << 'EOF'
# eLuvLetter 监控定时任务

# 每小时检查系统状态
0 * * * * eluvletter /usr/local/bin/monitor-eluvletter.sh >> /var/log/eluvletter/monitor.log 2>&1

# 每天凌晨2点备份数据
0 2 * * * eluvletter /var/www/eluvletter/backup.sh >> /var/log/eluvletter/backup.log 2>&1

# 每周日凌晨3点清理日志
0 3 * * 0 root /usr/sbin/logrotate /etc/logrotate.d/eluvletter
EOF

    log_success "定时任务配置完成"
}

# 创建备份脚本
create_backup_script() {
    log_info "创建备份脚本..."

    cat > /var/www/eluvletter/backup.sh << 'EOF'
#!/bin/bash

# eLuvLetter 数据备份脚本

BACKUP_DIR="/var/backups/eluvletter"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份数据库
backup_database() {
    echo "备份数据库..."
    mysqldump -u qingning -p@xiangyang qingning > "$BACKUP_DIR/database_$DATE.sql"

    if [ $? -eq 0 ]; then
        echo "✅ 数据库备份成功"
    else
        echo "❌ 数据库备份失败"
        return 1
    fi
}

# 备份应用文件
backup_app_files() {
    echo "备份应用文件..."
    tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" /var/www/eluvletter --exclude="node_modules" --exclude="logs"

    if [ $? -eq 0 ]; then
        echo "✅ 应用文件备份成功"
    else
        echo "❌ 应用文件备份失败"
        return 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    echo "清理旧备份..."
    find "$BACKUP_DIR" -name "*.sql" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    echo "✅ 旧备份清理完成"
}

# 主函数
main() {
    echo "🔄 eLuvLetter 备份开始 $(date)"

    backup_database
    backup_app_files
    cleanup_old_backups

    echo "✅ 备份完成 $(date)"
}

main "$@"
EOF

    chmod +x /var/www/eluvletter/backup.sh
    chown eluvletter:www-data /var/www/eluvletter/backup.sh

    log_success "备份脚本创建完成"
}

# 主安装函数
main() {
    echo "🐧 eLuvLetter Ubuntu 24.04 专用安装"
    echo "="$(seq 1 50 | tr '\n' '=')

    check_root
    check_ubuntu_version

    log_info "开始Ubuntu 24.04优化安装..."

    # 执行安装步骤
    optimize_system
    install_nodejs
    install_pm2
    install_nginx
    install_mysql
    create_app_user
    create_app_directories
    configure_firewall
    create_systemd_service
    create_ubuntu_env
    create_monitoring_script
    create_cron_jobs
    create_backup_script

    log_success "🎉 Ubuntu 24.04 安装完成！"

    echo
    echo "📋 后续步骤:"
    echo "1. 部署应用文件到 /var/www/eluvletter"
    echo "2. 配置Cloudflare DNS"
    echo "3. 配置SSL证书"
    echo "4. 启动服务: sudo systemctl start eluvletter"
    echo "5. 监控状态: sudo monitor-eluvletter.sh"
    echo
    echo "🌐 访问地址: https://www.qingning.icu"
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  --help     显示此帮助信息"
    echo "  --no-mysql 跳过MySQL安装"
    echo "  --no-nginx 跳过Nginx安装"
    echo
    echo "示例:"
    echo "  sudo $0"
    echo "  sudo $0 --no-mysql"
}

# 解析参数
case "$1" in
    --help)
        show_help
        exit 0
        ;;
    --no-mysql)
        NO_MYSQL=true
        ;;
    --no-nginx)
        NO_NGINX=true
        ;;
esac

# 运行主函数
main "$@"