#!/bin/bash
# eLuvLetter PM2部署脚本

echo "🚀 开始使用PM2部署 eLuvLetter..."

# 1. 检查Node.js和npm
if ! command -v /f/nodejs/node &> /dev/null; then
    echo "❌ Node.js未找到，请先安装Node.js"
    exit 1
fi

if ! command -v /f/nodejs/npm &> /dev/null; then
    echo "❌ npm未找到，请先安装npm"
    exit 1
fi

echo "✅ Node.js和npm已安装"

# 2. 安装依赖
echo "📦 安装依赖..."
/f/nodejs/npm install

if [ $? -eq 0 ]; then
    echo "✅ 依赖安装成功"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

# 3. 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，请创建环境变量配置"
    exit 1
fi

echo "✅ 环境配置检查完成"

# 4. 安装PM2（如果未安装）
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    /f/nodejs/npm install -g pm2
fi

# 5. 使用PM2启动应用
echo "🌐 使用PM2启动应用..."
/f/nodejs/npm run pm2-start

if [ $? -eq 0 ]; then
    echo "✅ 应用启动成功"
    echo "📊 查看状态: pm2 status"
    echo "📝 查看日志: pm2 logs"
else
    echo "❌ 应用启动失败"
    exit 1
fi