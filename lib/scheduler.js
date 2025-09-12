const cron = require('node-cron');
const { scrapeTwitterListWithAuthentication } = require('../serve/x');
const { formatTweetDataForStorage } = require('./twitter');
const { storeTweetDataToSupabase } = require('./database');
const applicationConfig = require('./config');

// 定时任务调度器实例
let scheduledTaskInstance = null;

/**
 * 执行推特数据收集任务
 */
async function executeTwitterDataCollectionTask() {
  try {
    console.log('[任务调度器] 开始执行推特数据收集任务');
    
    // 获取推特配置信息
    const twitterConfiguration = applicationConfig.getTwitterConfiguration();
    const { targetListId, maximumScrollCount } = twitterConfiguration;
    
    console.log(`[任务调度器] 任务配置 - 目标列表ID: ${targetListId}, 最大滚动次数: ${maximumScrollCount}`);
    
    // 执行推特数据爬取操作
    const rawTweetData = await scrapeTwitterListWithAuthentication(targetListId, maximumScrollCount);
    
    if (!rawTweetData || rawTweetData.length === 0) {
      console.warn('[任务调度器] 未能获取到有效的推特数据');
      return;
    }
    
    console.log(`[任务调度器] 成功爬取 ${rawTweetData.length} 条原始推特数据`);
    
    // 格式化推特数据以便存储
    const formattedTweetData = formatTweetDataForStorage(rawTweetData);
    console.log(`[任务调度器] 推特数据格式化完成，共 ${formattedTweetData.length} 条`);
    
    // 将格式化数据存储到数据库
    const storageResult = await storeTweetDataToSupabase(formattedTweetData);
    
    if (storageResult.success) {
      console.log(`[任务调度器] 推特数据收集任务执行完成，成功存储 ${storageResult.count} 条数据`);
    } else {
      console.error('[任务调度器] 推特数据存储操作失败:', storageResult.message);
    }
    
  } catch (error) {
    console.error('[任务调度器] 推特数据收集任务执行过程中发生错误:', error.message);
    console.error('[任务调度器] 详细错误信息:', error.stack);
  }
}

/**
 * 启动定时任务调度器
 * @param {string} cronScheduleExpression - cron 调度表达式，默认每小时执行一次
 */
function startTaskScheduler(cronScheduleExpression = '0 * * * *') {
  try {
    if (scheduledTaskInstance) {
      console.log('[任务调度器] 定时任务调度器已在运行中');
      return;
    }
    
    console.log(`[任务调度器] 正在启动定时任务调度器，执行频率: ${cronScheduleExpression}`);
    
    // 创建定时任务调度实例
    scheduledTaskInstance = cron.schedule(cronScheduleExpression, async () => {
      console.log('[任务调度器] 定时任务触发，开始执行推特数据收集');
      await executeTwitterDataCollectionTask();
    }, {
      scheduled: false // 创建时不立即启动，需要手动启动
    });
    
    // 启动定时任务
    scheduledTaskInstance.start();
    console.log('[任务调度器] 定时任务调度器启动成功');
    
  } catch (error) {
    console.error('[任务调度器] 启动定时任务调度器过程中发生错误:', error.message);
    throw error;
  }
}

/**
 * 停止定时任务调度器
 */
function stopTaskScheduler() {
  try {
    if (!scheduledTaskInstance) {
      console.log('[任务调度器] 定时任务调度器未在运行状态');
      return;
    }
    
    scheduledTaskInstance.stop();
    scheduledTaskInstance.destroy();
    scheduledTaskInstance = null;
    
    console.log('[任务调度器] 定时任务调度器已成功停止');
    
  } catch (error) {
    console.error('[任务调度器] 停止定时任务调度器过程中发生错误:', error.message);
    throw error;
  }
}

/**
 * 获取任务调度器运行状态
 * @returns {Object} 调度器状态信息
 */
function getTaskSchedulerStatus() {
  return {
    isSchedulerRunning: scheduledTaskInstance !== null && scheduledTaskInstance.running,
    hasActiveTask: scheduledTaskInstance !== null
  };
}

// 导出任务调度器模块
module.exports = {
  startTaskScheduler,
  stopTaskScheduler,
  getTaskSchedulerStatus,
  executeTwitterDataCollectionTask
};
