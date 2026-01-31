#!/bin/bash

# Finance Sidecar 快速开始脚本

set -e

echo "=================================="
echo "Finance Sidecar 快速开始"
echo "=================================="

# 检查 Python 版本
echo ""
echo "检查 Python 版本..."
python_version=$(python3 --version 2>&1 | grep -oP '\d+\.\d+')
required_version="3.13"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Python 版本不满足要求 (需要 >= 3.13, 当前: $python_version)"
    exit 1
fi
echo "✓ Python 版本: $python_version"

# 检查 PDM
echo ""
echo "检查 PDM..."
if ! command -v pdm &> /dev/null; then
    echo "❌ PDM 未安装"
    echo "请运行: pip install -g pdm"
    exit 1
fi
echo "✓ PDM 已安装: $(pdm --version)"

# 安装依赖
echo ""
echo "安装依赖..."
pdm install

# 检查环境变量
echo ""
echo "检查环境变量..."
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，创建示例配置..."
    cp .env.example .env
    echo "✓ 已创建 .env 文件"
    echo ""
    echo "请编辑 .env 文件并配置:"
    echo "  - API_KEY (必须)"
    echo "  - TUSHARE_TOKEN (可选，推荐配置)"
    echo ""
    read -p "按回车继续..."
fi

# 运行数据源测试
echo ""
echo "运行数据源测试..."
echo ""
pdm run python test_datasources.py

# 运行性能测试
echo ""
echo ""
read -p "是否运行性能测试? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pdm run python test_performance.py
fi

# 启动服务
echo ""
echo ""
echo "=================================="
echo "准备启动服务"
echo "=================================="
echo ""
echo "服务将在 http://localhost:8001 启动"
echo "API 文档: http://localhost:8001/docs"
echo ""
read -p "按回车启动服务... (Ctrl+C 退出)"

pdm run uvicorn main:app --reload --port 8001
