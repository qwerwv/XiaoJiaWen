#!/bin/bash

# =========================================
# eLuvLetter 生产环境部署脚本
# 适用于 Ubuntu 24.04 + Cloudflare CDN
# =========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查root权限
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用sudo运行此脚本"
        exit 1
    fi
}

# 检查系统要求
check_requirements() {
    log_info "检查系统要求..."

    # 检查Ubuntu版本
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [ "$VERSION_ID" != "24.04" ]; then
            log_warning "推荐使用Ubuntu 24.04，当前版本: $VERSION_ID"
        fi
    fi

    # 检查内存
    total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
    if [ $total_mem -lt 2 ]; then
        log_warning "建议至少2GB内存，当前内存: ${total_mem}GB"
    fi

    log_success "系统要求检查完成"
}

# 安装必要软件
install_dependencies() {
    log_info "安装必要软件..."

    # 更新包列表
    apt update

    # 安装基础工具
    apt install -y curl wget git unzip ufw

    # 安装Node.js 18.x
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt install -y nodejs
    fi

    # 安装Nginx
    if ! command -v nginx &> /dev/null; then
        apt install -y nginx
    fi

    # 安装PM2
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi

    log_success "必要软件安装完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."

    # 重置防火墙
    ufw --force reset

    # 允许SSH
    ufw allow 22/tcp comment 'SSH'

    # 允许HTTP/HTTPS
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
        ufw allow from $ip to any port 9090 comment 'Cloudflare IP'
    done

    # 启用防火墙
    ufw --force enable

    log_success "防火墙配置完成"
}

# 创建应用用户和目录
setup_user_and_directories() {
    log_info "创建应用用户和目录..."

    # 创建部署用户
    if ! id "eluvletter" &>/dev/null; then
        useradd -m -s /bin/bash eluvletter
        usermod -aG www-data eluvletter
    fi

    # 创建应用目录
    mkdir -p /var/www/eluvletter
    mkdir -p /var/log/eluvletter
    mkdir -p /etc/eluvletter

    # 设置权限
    chown -R eluvletter:www-data /var/www/eluvletter
    chown -R eluvletter:www-data /var/log/eluvletter
    chown -R eluvletter:www-data /etc/eluvletter

    chmod 755 /var/www/eluvletter
    chmod 755 /var/log/eluvletter
    chmod 755 /etc/eluvletter

    log_success "用户和目录设置完成"
}

# 部署应用文件
deploy_application() {
    log_info "部署应用文件..."

    # 复制应用文件到部署目录
    cp -r ./* /var/www/eluvletter/

    # 设置正确的权限
    chown -R eluvletter:www-data /var/www/eluvletter
    find /var/www/eluvletter -type d -exec chmod 755 {} \;
    find /var/www/eluvletter -type f -exec chmod 644 {} \;

    # 确保执行权限
    chmod +x /var/www/eluvletter/*.sh

    log_success "应用文件部署完成"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx..."

    # 备份原有配置
    if [ -f /etc/nginx/sites-available/default ]; then
        cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    fi

    # 复制Nginx配置
    cp nginx.conf /etc/nginx/nginx.conf

    # 创建网站配置
    cat > /etc/nginx/sites-available/eluvletter << EOF
server {
    listen 80;
    listen [::]:80;
    server_name qingning.icu www.qingning.icu;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name qingning.icu www.qingning.icu;

    # SSL配置 - 需要您提供证书
    ssl_certificate /etc/ssl/certs/qingning.icu.crt;
    ssl_certificate_key /etc/ssl/private/qingning.icu.key;

    # 其他配置从nginx.conf继承
    include /etc/nginx/nginx.conf;
}
EOF

    # 启用网站
    ln -sf /etc/nginx/sites-available/eluvletter /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # 测试Nginx配置
    nginx -t

    log_success "Nginx配置完成"
}

# 配置PM2
configure_pm2() {
    log_info "配置PM2..."

    # 切换到应用用户
    su - eluvletter << EOF
cd /var/www/eluvletter

# 安装依赖
npm install --production

# 创建PM2配置文件
cp ecosystem.config.js /var/www/eluvletter/

# 启动应用
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
EOF

    log_success "PM2配置完成"
}

# 配置日志轮转
configure_logrotate() {
    log_info "配置日志轮转..."

    cat > /etc/logrotate.d/eluvletter << EOF
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

    log_success "日志轮转配置完成"
}

# 配置SSL证书（自签名，生产环境建议使用Let's Encrypt）
configure_ssl() {
    log_info "配置SSL证书..."

    # 创建SSL目录
    mkdir -p /etc/ssl/certs /etc/ssl/private

    # 生成自签名证书（仅用于测试）
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/qingning.icu.key \
        -out /etc/ssl/certs/qingning.icu.crt \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=eLuvLetter/CN=qingning.icu"

    # 设置权限
    chmod 600 /etc/ssl/private/qingning.icu.key
    chmod 644 /etc/ssl/certs/qingning.icu.crt

    log_warning "已生成自签名证书，生产环境建议使用Let's Encrypt证书"
    log_success "SSL证书配置完成"
}

# 配置环境变量
configure_env() {
    log_info "配置环境变量..."

    cat > /var/www/eluvletter/.env << EOF
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
JWT_SECRET=$(openssl rand -base64 32)

# API配置
API_BASE_URL=https://qingning.icu

# 日志配置
LOG_LEVEL=info
LOG_FILE=/var/log/eluvletter/server.log

# 数据库配置（根据需要配置）
DB_TYPE=none
EOF

    # 设置权限
    chown eluvletter:www-data /var/www/eluvletter/.env
    chmod 600 /var/www/eluvletter/.env

    log_success "环境变量配置完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."

    # 启动Nginx
    systemctl enable nginx
    systemctl restart nginx

    # 启动PM2应用
    su - eluvletter -c "pm2 start /var/www/eluvletter/ecosystem.config.js --env production"

    # 设置PM2开机自启
    env PATH=\$PATH:/usr/bin pm2 startup systemd -u eluvletter --hp /home/eluvletter

    log_success "服务启动完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."

    # 检查端口
    if ! ss -tlnp | grep -q ":9090"; then
        log_error "应用端口9090未监听"
        return 1
    fi

    if ! ss -tlnp | grep -q ":80"; then
        log_error "Nginx端口80未监听"
        return 1
    fi

    if ! ss -tlnp | grep -q ":443"; then
        log_error "Nginx端口443未监听"
        return 1
    fi

    # 检查PM2状态
    if ! su - eluvletter -c "pm2 status" | grep -q "online"; then
        log_error "PM2应用未正常运行"
        return 1
    fi

    log_success "健康检查通过"
}

# 清理和优化
cleanup() {
    log_info "执行清理和优化..."

    # 清理临时文件
    apt autoremove -y
    apt clean

    # 优化系统参数
    cat >> /etc/sysctl.conf << EOF
# 网络优化
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
EOF

    sysctl -p

    log_success "清理和优化完成"
}

# 显示部署信息
show_deployment_info() {
    local domain="qingning.icu"

    echo ""
    echo "==========================================="
    echo " 🎉 eLuvLetter 部署完成!"
    echo "==========================================="
    echo ""
    echo "📡 访问地址:"
    echo "   主站点: https://$domain"
    echo "   登录页面: https://$domain/login"
    echo "   API接口: https://$domain/api"
    echo "   健康检查: https://$domain/health"
    echo ""
    echo "🔧 管理命令:"
    echo "   查看应用状态: sudo -u eluvletter pm2 status"
    echo "   查看应用日志: sudo -u eluvletter pm2 logs"
    echo "   重启应用: sudo -u eluvletter pm2 restart eLuvLetter"
    echo "   停止应用: sudo -u eluvletter pm2 stop eLuvLetter"
    echo ""
    echo "📊 监控信息:"
    echo "   应用日志: /var/log/eluvletter/"
    echo "   Nginx日志: /var/log/nginx/"
    echo "   PM2日志: sudo -u eluvletter pm2 logs"
    echo ""
    echo "🔒 安全提醒:"
    echo "   - 请更新SSL证书为Let's Encrypt证书"
    echo "   - 请修改.env文件中的JWT_SECRET"
    echo "   - 请配置正确的域名"
    echo "   - 请检查Cloudflare设置"
    echo ""
    echo "==========================================="
}

# 主函数
main() {
    echo ""
    echo "==========================================="
    echo " 🚀 eLuvLetter 生产环境部署"
    echo " Ubuntu 24.04 + Cloudflare CDN"
    echo "==========================================="
    echo ""

    # 执行部署步骤
    check_root
    check_requirements
    install_dependencies
    configure_firewall
    setup_user_and_directories
    deploy_application
    configure_nginx
    configure_ssl
    configure_env
    configure_pm2
    configure_logrotate
    start_services
    health_check
    cleanup

    show_deployment_info
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help     显示此帮助信息"
    echo "  --no-ssl   跳过SSL证书配置"
    echo "  --domain   指定域名"
    echo ""
    echo "示例:"
    echo "  sudo $0 --domain example.com"
    echo "  sudo $0 --no-ssl"
}

# 解析命令行参数
case "$1" in
    --help)
        show_help
        exit 0
        ;;
    --no-ssl)
        SKIP_SSL=true
        ;;
    --domain)
        if [ -n "$2" ]; then
            DOMAIN="$2"
        fi
        ;;
esac

# 运行主函数
main "$@"