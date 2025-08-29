const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('koa-cors');

// 导入自定义模块
const config = require('../lib/config');
const { getTweetsFromSupabase } = require('../lib/database');
const { collectTweetData, startScheduler } = require('../lib/scheduler');

const app = new Koa();
const router = new Router();

// 获取配置
const { twitter: twitterConfig, server: serverConfig } = config.getAllConfig();

// 中间件
app.use(cors());
app.use(bodyParser());

// 获取推特数据
router.get('/tweets', async ctx => {
  try {
    console.log('收到获取推特数据请求');

    const limit = parseInt(ctx.query.limit) || 100;
    const data = await getTweetsFromSupabase(limit);

    ctx.body = {
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('获取推特数据失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
});

// 健康检查路由
router.get('/health', async ctx => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    deployment: 'docker-container',
    scheduler: 'node-cron',
  };
});

// 手动触发数据收集
router.post('/collect', async ctx => {
  try {
    console.log('收到手动触发数据收集请求');

    const result = await collectTweetData(
      twitterConfig.listId,
      twitterConfig.token
    );

    ctx.body = {
      success: result.success,
      message: result.success ? '数据收集完成' : '数据收集失败',
      result: result,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('手动数据收集失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
});

// 根路径重定向到健康检查
router.get('/', async ctx => {
  ctx.redirect('/health');
});

// 应用路由
app.use(router.routes());
app.use(router.allowedMethods());

// 错误处理
app.on('error', (err, ctx) => {
  console.error('服务器错误:', err);
});

// 启动服务器
const PORT = process.env.PORT || 8095;
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📊 Supabase 客户端初始化成功`);

  // 启动定时任务
  const schedulerEnabled = process.env.SCHEDULER_ENABLED !== 'false';
  if (schedulerEnabled) {
    const cronExpression = process.env.CRON_EXPRESSION || '0 * * * *'; // 默认每小时执行一次
    const success = startScheduler(
      cronExpression,
      twitterConfig.listId,
      twitterConfig.token
    );
    if (success) {
      console.log('⏰ 定时任务已启动，使用 node-cron 进行调度');
      // 启动时执行一次数据收集
      setTimeout(async () => {
        console.log('🔄 执行初始数据收集...');
        await collectTweetData(twitterConfig.listId, twitterConfig.token);
      }, 5000); // 延迟5秒执行，确保服务器完全启动
    } else {
      console.error('❌ 定时任务启动失败');
    }
  } else {
    console.log('⏸️ 定时任务已禁用');
  }
});

// 导出app以支持测试
module.exports = app;
