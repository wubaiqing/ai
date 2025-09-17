const { Logger } = require('./src/lib/utils');
const { applicationConfig } = require('./src/reports/reportConfig');
const path = require('path');
const fs = require('fs');

// 测试Logger的文件写入功能
console.log('开始测试Logger功能...');
console.log('应用配置日志级别:', applicationConfig.logging.levels);

// 测试日志文件路径生成
const logFilePath = Logger.getLogFilePath();
console.log('日志文件路径:', logFilePath);

// 检查logs目录是否存在
const logsDir = path.dirname(logFilePath);
console.log('logs目录:', logsDir);
console.log('logs目录是否存在:', fs.existsSync(logsDir));

Logger.info('这是一条测试信息日志');
Logger.warn('这是一条测试警告日志');
Logger.error('这是一条测试错误日志', { testData: 'test value' });

// 检查日志文件是否创建
console.log('日志文件是否存在:', fs.existsSync(logFilePath));
if (fs.existsSync(logFilePath)) {
  const content = fs.readFileSync(logFilePath, 'utf8');
  console.log('日志文件内容:');
  console.log(content);
}

console.log('Logger测试完成，请检查logs目录');