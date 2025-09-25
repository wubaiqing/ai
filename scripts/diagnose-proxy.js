#!/usr/bin/env node

/**
 * 代理诊断脚本
 * 用于详细诊断代理连接问题
 */

require('dotenv').config();
const axios = require('axios');
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const net = require('net');

/**
 * 测试TCP连接到代理服务器
 */
function testTcpConnection(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 5000;
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`TCP连接超时 (${timeout}ms)`));
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });
    
    socket.connect(port, host);
  });
}

/**
 * 测试不同的代理配置
 */
async function testProxyVariations() {
  console.log('🔧 测试不同的代理配置...');
  
  const host = process.env.PROXY_HOST;
  const port = process.env.PROXY_PORT;
  const username = process.env.PROXY_USERNAME;
  const password = process.env.PROXY_PASSWORD;
  
  const configurations = [
    {
      name: '无认证代理',
      url: `http://${host}:${port}`
    },
    {
      name: '带认证代理',
      url: `http://${username}:${password}@${host}:${port}`
    }
  ];
  
  for (const config of configurations) {
    console.log(`\n📋 测试配置: ${config.name}`);
    console.log(`   代理URL: ${config.url.replace(/:([^:@]+)@/, ':***@')}`);
    
    try {
      const axiosInstance = axios.create({
        timeout: 8000,
        httpAgent: new HttpProxyAgent(config.url),
        httpsAgent: new HttpsProxyAgent(config.url)
      });
      
      // 测试简单的HTTP请求
      const response = await axiosInstance.get('http://httpbin.org/ip', {
        validateStatus: () => true // 接受所有状态码
      });
      
      console.log(`   ✅ 状态码: ${response.status}`);
      if (response.status === 200) {
        console.log(`   ✅ 响应数据:`, response.data);
      } else {
        console.log(`   ⚠️  响应头:`, Object.keys(response.headers));
      }
      
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
      if (error.response) {
        console.log(`   ❌ 状态码: ${error.response.status}`);
        console.log(`   ❌ 状态文本: ${error.response.statusText}`);
      }
    }
  }
}

/**
 * 主诊断函数
 */
async function diagnoseProxy() {
  console.log('🔍 开始代理诊断...');
  
  // 1. 检查环境变量
  console.log('\n📋 检查环境变量:');
  console.log(`   PROXY_HOST: ${process.env.PROXY_HOST || '未设置'}`);
  console.log(`   PROXY_PORT: ${process.env.PROXY_PORT || '未设置'}`);
  console.log(`   PROXY_USERNAME: ${process.env.PROXY_USERNAME ? '已设置' : '未设置'}`);
  console.log(`   PROXY_PASSWORD: ${process.env.PROXY_PASSWORD ? '已设置' : '未设置'}`);
  console.log(`   PROXY_URL: ${process.env.PROXY_URL ? process.env.PROXY_URL.replace(/:([^:@]+)@/, ':***@') : '未设置'}`);
  
  if (!process.env.PROXY_HOST || !process.env.PROXY_PORT) {
    console.error('❌ 代理配置不完整');
    return false;
  }
  
  // 2. 测试TCP连接
  console.log('\n🌐 测试TCP连接:');
  try {
    await testTcpConnection(process.env.PROXY_HOST, parseInt(process.env.PROXY_PORT));
    console.log('   ✅ TCP连接成功');
  } catch (error) {
    console.log(`   ❌ TCP连接失败: ${error.message}`);
    return false;
  }
  
  // 3. 测试不同代理配置
  await testProxyVariations();
  
  // 4. 测试直连（不使用代理）
  console.log('\n🚀 测试直连（不使用代理）:');
  try {
    const directResponse = await axios.get('http://httpbin.org/ip', { timeout: 5000 });
    console.log('   ✅ 直连成功:', directResponse.data);
  } catch (error) {
    console.log(`   ❌ 直连失败: ${error.message}`);
  }
  
  return true;
}

/**
 * 主函数
 */
async function main() {
  console.log('🛠️  代理诊断工具');
  console.log('=' .repeat(60));
  
  await diagnoseProxy();
  
  console.log('\n' + '=' .repeat(60));
  console.log('📝 诊断建议:');
  console.log('   1. 确认代理服务器正在运行');
  console.log('   2. 检查用户名和密码是否正确');
  console.log('   3. 确认代理服务器支持HTTP CONNECT方法');
  console.log('   4. 检查防火墙设置');
  console.log('   5. 尝试使用其他代理客户端测试');
}

// 运行诊断
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { diagnoseProxy };