const cron = require('node-cron');
const { getListTweets, formatTweetData } = require('./twitter');
const { storeTweetsToSupabase } = require('./database');

// 定时任务实例
let scheduledTask = null;

/**
 * 执行推特数据收集任务
 * @param {string} listId - 推特列表ID
 * @param {string} token - X.com API Token
 */
async function collectTweetData(listId, token) {
  try {
    console.log('开始执行推特数据收集任务...');

    // 获取推特数据
    const rawData = await getListTweets(listId, token);

    // 格式化数据
    const formattedData = formatTweetData(rawData);

    if (formattedData && formattedData.length > 0) {
      // 存储到数据库
      await storeTweetsToSupabase(formattedData);
      console.log(`推特数据收集完成，共处理 ${formattedData.length} 条数据`);
    } else {
      console.log('没有获取到新的推特数据');
    }

    return {
      success: true,
      count: formattedData?.length || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('推特数据收集任务失败:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 启动定时任务
 * @param {string} cronExpression - Cron 表达式
 * @param {string} listId - 推特列表ID
 * @param {string} token - X.com API Token
 */
function startScheduler(cronExpression = '0 * * * *', listId, token) {
  if (scheduledTask) {
    console.log('定时任务已在运行中，先停止现有任务');
    stopScheduler();
  }

  if (!listId || !token) {
    console.error('启动定时任务失败：缺少必要的参数 (listId 或 token)');
    return false;
  }

  try {
    scheduledTask = cron.schedule(
      cronExpression,
      async () => {
        console.log(`定时任务执行 - ${new Date().toISOString()}`);
        await collectTweetData(listId, token);
      },
      {
        scheduled: true,
        timezone: 'Asia/Shanghai',
      }
    );

    console.log(`定时任务已启动，Cron 表达式: ${cronExpression}`);
    return true;
  } catch (error) {
    console.error('启动定时任务失败:', error);
    return false;
  }
}

/**
 * 停止定时任务
 */
function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('定时任务已停止');
    return true;
  }
  console.log('没有运行中的定时任务');
  return false;
}

/**
 * 获取定时任务状态
 */
function getSchedulerStatus() {
  return {
    isRunning: scheduledTask !== null,
    taskExists: scheduledTask !== null,
  };
}

module.exports = {
  collectTweetData,
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
};
