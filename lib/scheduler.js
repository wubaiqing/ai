const cron = require('node-cron');
const { getListTweets, formatTweetData } = require('./twitter');
const { storeTweetsToSupabase } = require('./database');

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
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('推特数据收集任务失败:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 启动定时任务调度器
 * @param {string} cronExpression - Cron表达式
 * @param {string} listId - 推特列表ID
 * @param {string} token - X.com API Token
 * @returns {Object} 调度器任务对象
 */
function startScheduler(cronExpression, listId, token) {
  if (!cronExpression || !listId || !token) {
    throw new Error('缺少必要的参数：cronExpression, listId, token');
  }

  console.log(`启动定时任务调度器，执行频率: ${cronExpression}`);
  
  const task = cron.schedule(cronExpression, async () => {
    console.log(`定时任务触发 - ${new Date().toISOString()}`);
    await collectTweetData(listId, token);
  }, {
    scheduled: true,
    timezone: "Asia/Shanghai"
  });

  console.log('定时任务调度器启动成功');
  return task;
}

/**
 * 停止定时任务
 * @param {Object} task - 调度器任务对象
 */
function stopScheduler(task) {
  if (task) {
    task.stop();
    console.log('定时任务已停止');
  }
}

module.exports = {
  collectTweetData,
  startScheduler,
  stopScheduler
};