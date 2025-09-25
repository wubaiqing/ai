#!/usr/bin/env node

/**
 * 代理连接测试脚本
 * 用于验证HTTP代理配置是否正常工作
 */

require('dotenv').config();
const axios = require('axios');
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

/**
 * 测试代理连接
 */
async function testProxyConnection() {
  console.log('🔍 开始测试代理连接...');
  
  // 检查代理环境变量
  if (!process.env.PROXY_HOST || !process.env.PROXY_PORT) {
    console.error('❌ 代理配置缺失：请在.env文件中设置PROXY_HOST和PROXY_PORT');
    return false;
  }
  
  // 构建代理URL
  let proxyUrl;
  if (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
    proxyUrl = `http://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}@${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;
    console.log(`📡 使用带认证的代理: ${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`);
  } else {
    proxyUrl = `http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;
    console.log(`📡 使用无认证代理: ${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`);
  }
  
  // 配置axios实例
  const axiosInstance = axios.create({
    timeout: 10000,
    httpAgent: new HttpProxyAgent(proxyUrl),
    httpsAgent: new HttpsProxyAgent(proxyUrl)
  });
  
  try {
    // 测试HTTP请求
    console.log('🌐 测试HTTP连接...');
    const httpResponse = await axiosInstance.get('http://httpbin.org/ip');
    console.log('✅ HTTP请求成功:', httpResponse.data);
    
    // 测试HTTPS请求
    console.log('🔒 测试HTTPS连接...');
    const httpsResponse = await axiosInstance.get('https://httpbin.org/ip');
    console.log('✅ HTTPS请求成功:', httpsResponse.data);
    
    // 测试访问X.com
    console.log('🐦 测试访问X.com...');
    const xResponse = await axiosInstance.get('https://x.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('✅ X.com访问成功，状态码:', xResponse.status);
    
    console.log('🎉 所有代理测试通过！');
    return true;
    
  } catch (error) {
    console.error('❌ 代理测试失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 建议检查：');
      console.error('   1. 代理服务器地址和端口是否正确');
      console.error('   2. 代理服务器是否正在运行');
      console.error('   3. 网络连接是否正常');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 建议检查：');
      console.error('   1. 代理服务器域名是否正确');
      console.error('   2. DNS解析是否正常');
    } else if (error.response && error.response.status === 407) {
      console.error('💡 建议检查：');
      console.error('   1. 代理用户名和密码是否正确');
      console.error('   2. 代理服务器是否需要认证');
    }
    
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 代理配置测试工具');
  console.log('=' .repeat(50));
  
  const success = await testProxyConnection();
  
  console.log('=' .repeat(50));
  if (success) {
    console.log('✅ 代理配置测试完成，所有测试通过！');
    process.exit(0);
  } else {
    console.log('❌ 代理配置测试失败，请检查配置后重试。');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testProxyConnection };