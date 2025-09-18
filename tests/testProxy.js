/**
 * 代理配置检查和测试脚本
 * @module ProxyTester
 * @requires fs
 * @requires path
 * @requires axios
 * @requires https-proxy-agent
 * @requires http-proxy-agent
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const Logger = require('../src/lib/utils').Logger;

// IP检测服务列表（精简为2个可靠服务）
const IP_SERVICES = [
  { name: 'ifconfig.me', url: 'http://ifconfig.me/ip' },
  { name: 'ipinfo.io', url: 'http://ipinfo.io/ip' }
];

/**
 * 检查代理配置环境变量
 * @returns {Object} 配置状态和详细信息
 */
function checkProxyConfig() {
  Logger.info('\n=== Clash代理配置检查 ===');
  
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    Logger.error('❌ .env文件不存在');
    return false;
  }
  
  require('dotenv').config({ path: envPath });
  
  const requiredVars = ['PROXY_HOST', 'PROXY_PORT'];
  const optionalVars = ['PROXY_USERNAME', 'PROXY_PASSWORD'];
  
  Logger.info('必需的环境变量:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    Logger.info(`  ${varName}: ${value ? '✓' : '✗'} ${value || '未设置'}`);
  });
  
  Logger.info('可选的认证环境变量:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    Logger.info(`  ${varName}: ${value ? '✓' : '✗'} ${value || '未设置'}`);
  });
  
  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  if (missingRequired.length > 0) {
    Logger.error(`\n❌ 缺少必需的环境变量: ${missingRequired.join(', ')}`);
    return false;
  }
  
  Logger.info('\n✅ Clash代理配置检查通过');
  return true;
}

/**
 * 构建代理服务器URL
 * @returns {string|null} 代理URL或null
 */
function buildProxyUrl() {
  const host = process.env.PROXY_HOST;
  const port = process.env.PROXY_PORT || '7890';
  
  return `http://${host}:${port}`;
}

/**
 * 获取当前IP地址
 * @param {Object} [agent] - 代理对象
 * @returns {Promise<string>} IP地址
 * @throws {Error} 无法获取IP时抛出
 */
async function getIP(useProxy = false) {
  Logger.info(`🌍 检测${useProxy ? '代理' : '直连'}IP地址...`);
  const results = [];
  
  for (const service of IP_SERVICES) {
    try {
      const config = { timeout: 5000, maxRedirects: 3 };
      
      if (useProxy) {
        const proxyUrl = buildProxyUrl();
        const agent = service.url.startsWith('https') 
          ? new HttpsProxyAgent(proxyUrl)
          : new HttpProxyAgent(proxyUrl);
        
        config.httpAgent = service.url.startsWith('http:') ? agent : undefined;
        config.httpsAgent = service.url.startsWith('https:') ? agent : undefined;
        config.timeout = 10000;
      }
      
      const response = await axios.get(service.url, config);
      const ip = response.data.trim();
      
      if (ip) {
        results.push({ service: service.name, ip, success: true });
        Logger.info(`   ✅ ${service.name}: ${ip}`);
      }
    } catch (error) {
      results.push({ service: service.name, ip: null, success: false, error: error.message });
      Logger.error(`   ❌ ${service.name}: ${error.message}`);
    }
  }
  
  return results;
}

/**
 * 对比直连和代理的IP地址
 * @returns {Promise<Object>} 测试结果和IP信息
 */
function compareIPs(directResults, proxyResults) {
  Logger.info('\n📊 IP地址对比:');
  
  const directIPs = directResults.filter(r => r.success).map(r => r.ip);
  const proxyIPs = proxyResults.filter(r => r.success).map(r => r.ip);
  
  if (directIPs.length === 0) {
    Logger.error('❌ 无法获取直连IP地址');
    return false;
  }
  
  if (proxyIPs.length === 0) {
    Logger.error('❌ 无法获取代理IP地址');
    return false;
  }
  
  Logger.info(`直连IP: ${directIPs.join(', ')}`);
  Logger.info(`代理IP: ${proxyIPs.join(', ')}`);
  
  const proxyWorking = !directIPs.some(ip => proxyIPs.includes(ip));
  Logger.info(proxyWorking ? '✅ 代理生效' : '❌ 代理未生效');
  
  return proxyWorking;
}

/**
 * 测试代理连接性能
 * @returns {Promise<Object>} 性能测试结果
 */
async function testProxy(url, isHttps = false) {
  Logger.info(`🌐 测试${isHttps ? 'HTTPS' : 'HTTP'}代理连接...`);
  
  try {
    const proxyUrl = buildProxyUrl();
    const agent = isHttps ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
    
    const config = {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 400
    };
    
    if (isHttps) {
      config.httpsAgent = agent;
    } else {
      config.httpAgent = agent;
    }
    
    const response = await axios.get(url, config);
    
    if (response.status === 200) {
      Logger.info(`✅ ${isHttps ? 'HTTPS' : 'HTTP'}代理连接成功`);
      return true;
    }
    return false;
  } catch (error) {
    Logger.error(`❌ ${isHttps ? 'HTTPS' : 'HTTP'}代理连接失败: ${error.message}`);
    return false;
  }
}



/**
 * 运行所有代理测试
 * @returns {Promise<void>}
 */
async function runAllProxyTests() {
  Logger.info('🚀 开始代理服务器测试\n');
  
  // 1. 检查代理配置
  Logger.info('📋 检查代理配置...');
  const configValid = checkProxyConfig();
  if (!configValid) {
    Logger.error('❌ 代理配置检查失败');
    return false;
  }
  
  // 2. IP检测测试
  Logger.info('\n🔍 IP检测测试...');
  const directIP = await getIP();
  const proxyIP = await getIP(true);
  
  if (!directIP || !proxyIP) {
    Logger.error('❌ IP检测失败');
    return false;
  }
  
  const ipResult = compareIPs(directIP, proxyIP);
  
  // 3. 代理连接测试
  Logger.info('\n🌐 代理连接测试...');
  const httpResult = await testProxy('http://www.baidu.com', false);
  const httpsResult = await testProxy('https://www.google.com', true);
  
  // 4. 测试结果
  Logger.info('\n📊 测试结果:');
  Logger.info(`代理配置: ${configValid ? '✅' : '❌'}`);
  Logger.info(`IP检测: ${ipResult ? '✅' : '❌'}`);
  Logger.info(`HTTP代理: ${httpResult ? '✅' : '❌'}`);
  Logger.info(`HTTPS代理: ${httpsResult ? '✅' : '❌'}`);
  
  const allPassed = configValid && ipResult && httpResult && httpsResult;
  Logger.info(`\n${allPassed ? '🎉 所有测试通过！' : '⚠️ 部分测试失败'}`);
  
  return allPassed;
}

// 运行测试
if (require.main === module) {
  runAllProxyTests().catch(error => {
    Logger.error('测试失败:', { error: error.message });
    process.exit(1);
  });
}

module.exports = { runAllProxyTests };