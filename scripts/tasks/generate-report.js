/**
 * AI科技简报生成器 - 主入口文件
 * @module AIReportGenerator
 * @requires ./src/services/reportGenerator
 * @requires ./src/lib/config
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { aiReportGenerator } = require('../core/reports/generator');
const { applicationConfig, validateEnvironmentVariables } = require('../core/reports/config');
const { Logger, ErrorHandler } = require('../core/lib/utils');
const { TimezoneUtils } = require('../core/lib/timezone');
const { closeAllConnections } = require('../core/data/database');

/**
 * 执行AI科技简报生成任务
 * @returns {Promise<void>}
 * @throws {Error} 生成过程错误时抛出
 */
async function executeAIReportGeneration(options = {}) {
  const taskStartTime = Date.now();
  
  try {
    console.log(`[${TimezoneUtils.getTimestamp()}] [REPORT-START] 开始执行AI简报生成任务...`);
    Logger.info('开始执行AI简报生成任务...');
    
    // 验证环境变量
    validateEnvironmentVariables();
    
    // 生成报告
    const generationResult = await aiReportGenerator.generateCompleteReport(options);
    
    const totalExecutionTime = Date.now() - taskStartTime;
    
    if (generationResult.success) {
      console.log(`[${TimezoneUtils.getTimestamp()}] [REPORT-SUCCESS] AI简报生成成功，处理推文数量: ${generationResult.metadata.tweetsProcessed}`);
      Logger.info('\n✅ AI简报生成成功！');
      Logger.info(`📄 报告路径: ${generationResult.filePath}`);
      Logger.info(`📊 处理推文数量: ${generationResult.metadata.tweetsProcessed}`);
      Logger.info(`⏱️  生成耗时: ${generationResult.summary.duration}`);
      
      if (options.showContent) {
        Logger.info('\n=== 生成的简报内容 ===');
        Logger.info(generationResult.reportContent);
        Logger.info('=== 简报内容结束 ===\n');
      }
      
      // 关闭数据库连接并退出进程
      await closeAllConnections();
      process.exit(0);
    } else {

      console.error(`[${TimezoneUtils.getTimestamp()}] [REPORT-ERROR] AI简报生成失败: ${generationResult.error}`);
      Logger.error('\n❌ AI简报生成失败:', { error: generationResult.error });
      await closeAllConnections();
      process.exit(1);
    }
    
  } catch (error) {
    const totalExecutionTime = Date.now() - taskStartTime;
    
    console.error(`[${TimezoneUtils.getTimestamp()}] [REPORT-ERROR] AI简报生成任务失败: ${error.message}`);
    Logger.error('AI简报生成任务失败', {
      error: error.message,
      executionTimeMs: totalExecutionTime
    });
    Logger.error('\n❌ AI简报生成失败:', { error: error.message });
    await closeAllConnections();
    process.exit(1);
  }
}

/**
 * 显示应用程序帮助信息
 */
function displayApplicationHelp() {
  Logger.info(`
使用方法: node scripts/generate-report.js [选项]

选项:
  -h, --help        显示此帮助信息
  -v, --version     显示版本信息
  -d, --date DATE   指定生成简报的日期 (格式: YYYY-MM-DD，默认为当天)
  --show-content    显示生成的简报内容

描述:
  自动从数据库获取推文数据，使用AI分析生成科技资讯简报
  
配置:
  请确保已正确配置以下环境变量:
  - DEEPSEEK_API_KEY: DeepSeek平台API密钥
  
输出:
  生成的简报将保存到 outputs/ 目录下

示例:
  node scripts/generate-report.js                    # 生成当天简报
  node scripts/generate-report.js -d 2024-01-15      # 生成指定日期简报
  node scripts/generate-report.js --date 2024-01-15  # 生成指定日期简报
`);
}

/**
 * 解析日期参数
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化的日期字符串 (YYYY-MM-DD)
 * @throws {Error} 日期格式无效时抛出错误
 */
function parseDateArgument(dateStr) {
  if (!dateStr) {
    // 默认返回当天日期
    return new Date().toISOString().split('T')[0];
  }
  
  // 验证日期格式 YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    throw new Error(`无效的日期格式: ${dateStr}，请使用 YYYY-MM-DD 格式`);
  }
  
  // 验证日期是否有效
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`无效的日期: ${dateStr}`);
  }
  
  // 验证日期不能是未来日期
  const today = new Date();
  today.setHours(23, 59, 59, 999); // 设置为当天最后一刻
  if (date > today) {
    throw new Error(`日期不能是未来日期: ${dateStr}`);
  }
  
  return dateStr;
}

/**
 * 解析命令行参数
 * @param {string[]} args - 命令行参数数组
 * @returns {Object} 解析后的选项对象
 */
function parseCommandLineArguments(args) {
  const options = {
    showContent: false,
    targetDate: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--show-content') {
      options.showContent = true;
    } else if (arg === '-d' || arg === '--date') {
      if (i + 1 >= args.length) {
        throw new Error('日期参数缺少值');
      }
      options.targetDate = parseDateArgument(args[i + 1]);
      i++; // 跳过下一个参数（日期值）
    }
  }
  
  // 如果没有指定日期，使用当天
  if (!options.targetDate) {
    options.targetDate = parseDateArgument();
  }
  
  return options;
}

/**
 * 初始化应用程序
 * @returns {Promise<void>}
 */
async function initializeApplication() {
  const commandLineArguments = process.argv.slice(2);
  
  // 处理帮助和版本参数
  if (commandLineArguments.includes('-h') || commandLineArguments.includes('--help')) {
    displayApplicationHelp();
    process.exit(0);
    return;
  }
  
  if (commandLineArguments.includes('-v') || commandLineArguments.includes('--version')) {
    Logger.info('AI简报生成器 v1.0.0');
    process.exit(0);
    return;
  }
  
  try {
    // 解析命令行参数
    const options = parseCommandLineArguments(commandLineArguments);
    
    Logger.info(`生成日期: ${options.targetDate}`);
    
    await executeAIReportGeneration(options);
  } catch (error) {
    Logger.error('参数解析错误:', { error: error.message });
    displayApplicationHelp();
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行主程序
if (require.main === module) {
  initializeApplication().catch(async error => {
    Logger.error('程序执行失败:', { error: error.message });
    await closeAllConnections();
    process.exit(1);
  });
}

// 导出主函数供其他模块使用
module.exports = {
  executeAIReportGeneration,
  displayApplicationHelp,
  initializeApplication
};
