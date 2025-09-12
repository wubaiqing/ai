const cron = require("node-cron");

// 定时任务实例
let scheduledTask = null;

/**
 * 执行推特数据收集任务
 * 注意：此函数为定时任务框架，实际数据收集逻辑在serve/x.js中实现
 */
async function collectTweetData() {
  try {
    console.log("定时任务触发 - 推特数据收集");

    // 实际的数据收集逻辑已移至serve/x.js
    // 这里只是定时任务的占位符
    console.log("推特数据收集任务已触发");

    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("推特数据收集任务失败:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 启动定时任务
 * @param {string} cronExpression - Cron 表达式，默认每小时执行一次
 */
function startScheduler(cronExpression = "0 * * * *") {
  if (scheduledTask) {
    console.log("定时任务已在运行中，先停止现有任务");
    stopScheduler();
  }

  try {
    scheduledTask = cron.schedule(
      cronExpression,
      async () => {
        console.log(`定时任务执行 - ${new Date().toISOString()}`);
        await collectTweetData();
      },
      {
        scheduled: true,
        timezone: "Asia/Shanghai",
      }
    );

    console.log(`定时任务已启动，Cron 表达式: ${cronExpression}`);
    return true;
  } catch (error) {
    console.error("启动定时任务失败:", error);
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
    console.log("定时任务已停止");
    return true;
  }
  console.log("没有运行中的定时任务");
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
