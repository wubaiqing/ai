/**
 * 配置检查脚本
 * 用于验证AI简报生成所需的环境变量配置
 */

const fs = require('fs');
const path = require('path');

/**
 * 检查环境变量配置
 */
function checkEnvironmentConfig() {
  console.log('🔍 检查AI简报生成配置...');
  
  // 检查.env文件是否存在
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env文件不存在');
    console.log('\n🔧 解决方案：');
    console.log('1. 复制 .env.example 文件并重命名为 .env');
    console.log('2. 根据说明配置相应的环境变量');
    return false;
  }
  
  // 加载环境变量
  require('dotenv').config();
  
  const requiredVars = {
    'SILICONFLOW_API_KEY': {
      description: '硅基流动平台API密钥',
      url: 'https://siliconflow.cn/',
      placeholder: 'your_siliconflow_api_key_here'
    },
    'SUPABASE_URL': {
      description: 'Supabase数据库URL',
      url: 'https://supabase.com/',
      placeholder: null
    },
    'SUPABASE_ANON_KEY': {
      description: 'Supabase匿名密钥',
      url: 'https://supabase.com/',
      placeholder: null
    }
  };
  
  let allValid = true;
  const issues = [];
  
  console.log('\n📋 环境变量检查结果：');
  
  for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    
    if (!value) {
      console.log(`❌ ${varName}: 未设置`);
      issues.push({
        var: varName,
        issue: '未设置',
        solution: `请在.env文件中设置 ${varName}`,
        url: config.url
      });
      allValid = false;
    } else if (config.placeholder && value === config.placeholder) {
      console.log(`⚠️  ${varName}: 仍为占位符`);
      issues.push({
        var: varName,
        issue: '仍为占位符',
        solution: `请替换为真实的${config.description}`,
        url: config.url
      });
      allValid = false;
    } else {
      console.log(`✅ ${varName}: 已配置 (长度: ${value.length})`);
    }
  }
  
  if (!allValid) {
    console.log('\n🔧 需要解决的问题：');
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.var} - ${issue.issue}`);
      console.log(`   解决方案: ${issue.solution}`);
      if (issue.url) {
        console.log(`   获取地址: ${issue.url}`);
      }
    });
    
    console.log('\n📝 配置步骤：');
    console.log('1. 编辑 .env 文件');
    console.log('2. 设置或替换相应的环境变量值');
    console.log('3. 保存文件并重启应用程序');
    console.log('4. 重新运行此检查脚本验证配置');
  } else {
    console.log('\n🎉 所有配置检查通过！AI简报生成功能可以正常使用。');
  }
  
  return allValid;
}

/**
 * 测试API连接
 */
async function testAPIConnection() {
  if (!checkEnvironmentConfig()) {
    return false;
  }
  
  console.log('\n🔗 测试API连接...');
  
  try {
    const { aiContentService } = require('../src/services/aiService');
    
    // 验证配置
    const validation = aiContentService.validateConfiguration();
    if (!validation.isValid) {
      console.error('❌ AI服务配置验证失败:', validation.message);
      return false;
    }
    
    console.log('✅ AI服务配置验证通过');
    
    // 测试简单API调用
    const testContent = await aiContentService.generateContent(
      '请简短回答：什么是人工智能？（不超过50字）',
      { maxTokens: 100 }
    );
    
    console.log('✅ API连接测试成功');
    console.log('📝 测试响应:', testContent.substring(0, 100) + '...');
    
    return true;
  } catch (error) {
    console.error('❌ API连接测试失败:', error.message);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    console.log('🚀 AI简报配置检查工具\n');
    
    const configValid = checkEnvironmentConfig();
    
    if (configValid) {
      console.log('\n' + '='.repeat(50));
      await testAPIConnection();
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('检查完成。');
  })();
}

module.exports = {
  checkEnvironmentConfig,
  testAPIConnection
};