#!/bin/bash

# DeepSeek 快速配置脚本

echo "=== DeepSeek V4 Flash 配置向导 ==="
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "✅ .env 文件已创建"
else
    echo "✅ .env 文件已存在"
fi

echo ""
echo "请按照以下步骤配置："
echo ""
echo "1. 获取 DeepSeek API Key："
echo "   访问 https://platform.deepseek.com 注册并获取 API Key"
echo ""
echo "2. 编辑 .env 文件："
echo "   AI_PROVIDER=deepseek"
echo "   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx"
echo ""
echo "3. 运行测试："
echo "   npm run test-deepseek"
echo ""

# 检查是否已配置
if grep -q "AI_PROVIDER=deepseek" .env 2>/dev/null; then
    if grep -q "DEEPSEEK_API_KEY=sk-" .env 2>/dev/null; then
        echo "✅ DeepSeek 配置检测完成"
        echo ""
        read -p "是否立即运行测试？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            node scripts/tests/deepseek.test.js
        fi
    else
        echo "⚠️  请配置 DEEPSEEK_API_KEY"
    fi
else
    echo "⚠️  请设置 AI_PROVIDER=deepseek"
fi
