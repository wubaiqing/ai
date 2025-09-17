/**
 * AI科技简报生成器 - 主入口文件
 * @module AIReportGenerator
 * @requires ./src/services/reportGenerator
 * @requires ./src/lib/config
 */

const { aiReportGenerator } = require('../src/reports/reportGenerator');
const { applicationConfig, validateEnvironmentVariables } = require('../src/reports/reportConfig');
const { Logger, ErrorHandler } = require('../src/lib/utils');

/**
 * 执行AI科技简报生成任务
 * @returns {Promise<void>}
 * @throws {Error} 生成过程错误时抛出
 */
async function executeAIReportGeneration(options = {}) {
  const taskStartTime = Date.now();
  
  try {
    Logger.info('开始执行AI简报生成任务...');
    
    // 验证环境变量
    validateEnvironmentVariables();
    
    // 生成报告
    const generationResult = await aiReportGenerator.generateCompleteReport(options);
    
    const totalExecutionTime = Date.now() - taskStartTime;
    
    if (generationResult.success) {
      Logger.info('\n✅ AI简报生成成功！');
      Logger.info(`📄 报告路径: ${generationResult.filePath}`);
      Logger.info(`📊 处理推文数量: ${generationResult.metadata.tweetsProcessed}`);
      Logger.info(`⏱️  生成耗时: ${generationResult.summary.duration}`);
      
      if (options.showContent) {
        Logger.info('\n=== 生成的简报内容 ===');
        Logger.info(generationResult.reportContent);
        Logger.info('=== 简报内容结束 ===\n');
      }
    } else {
      Logger.error('\n❌ AI简报生成失败:', { error: generationResult.error });
      process.exit(1);
    }
    
  } catch (error) {
    const totalExecutionTime = Date.now() - taskStartTime;
    
    Logger.error('AI简报生成任务失败', {
      error: error.message,
      executionTimeMs: totalExecutionTime
    });
    Logger.error('\n❌ AI简报生成失败:', { error: error.message });
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
  -h, --help     显示此帮助信息
  -v, --version  显示版本信息

描述:
  自动从数据库获取推文数据，使用AI分析生成科技资讯简报
  
配置:
  请确保已正确配置以下环境变量:
  - SILICONFLOW_API_KEY: 硅基流动平台API密钥
  
输出:
  生成的简报将保存到 reports/ 目录下
`);
}

/**
 * 初始化应用程序
 * @returns {Promise<void>}
 */
async function initializeApplication() {
  const commandLineArguments = process.argv.slice(2);
  
  // 处理命令行参数
  if (commandLineArguments.includes('-h') || commandLineArguments.includes('--help')) {
    displayApplicationHelp();
    return;
  }
  
  if (commandLineArguments.includes('-v') || commandLineArguments.includes('--version')) {
    Logger.info('AI简报生成器 v1.0.0');
    return;
  }
  
  const options = {
    showContent: commandLineArguments.includes('--show-content')
  };
  
  await executeAIReportGeneration(options);
}

// 如果直接运行此文件，则执行主程序
if (require.main === module) {
  initializeApplication().catch(error => {
    Logger.error('程序执行失败:', { error: error.message });
    process.exit(1);
  });
}

// 导出主函数供其他模块使用
module.exports = {
  executeAIReportGeneration,
  displayApplicationHelp,
  initializeApplication
};