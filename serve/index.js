const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('koa-cors');

// 导入自定义模块
const config = require('../lib/config');
const { getTweetsFromSupabase } = require('../lib/database');
const { startScheduler, collectTweetData } = require('../lib/scheduler');

const app = new Koa();
const router = new Router();

// 获取配置
const { twitter: twitterConfig, server: serverConfig, scheduler: schedulerConfig } = config.getAllConfig();

// 中间件
app.use(cors());
app.use(bodyParser());



// 获取推特数据
router.get('/tweets', async (ctx) => {
  try {
    console.log("收到获取推特数据请求");
    
    const limit = parseInt(ctx.query.limit) || 100;
    const data = await getTweetsFromSupabase(limit);
    
    ctx.body = {
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("获取推特数据失败:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

// 健康检查路由
router.get('/health', async (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      scheduler_enabled: schedulerConfig.enabled,
      cron_expression: schedulerConfig.cronExpression
    }
  };
});

// 手动触发数据收集
router.post('/collect', async (ctx) => {
  try {
    console.log("收到手动触发数据收集请求");
    
    const result = await collectTweetData(twitterConfig.listId, twitterConfig.token);
    
    ctx.body = {
      success: result.success,
      message: result.success ? '数据收集完成' : '数据收集失败',
      result: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("手动数据收集失败:", error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

// 根路径重定向到健康检查
router.get('/', async (ctx) => {
  ctx.redirect('/health');
});

// 应用路由
app.use(router.routes());
app.use(router.allowedMethods());

// 错误处理
app.on("error", (err, ctx) => {
  console.error("服务器错误:", err);
});

// 启动服务器
const PORT = serverConfig.port;
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📊 Supabase 客户端初始化成功`);
  
  // 启动定时任务调度器
  if (schedulerConfig.enabled) {
    try {
      startScheduler(
        schedulerConfig.cronExpression,
        twitterConfig.listId,
        twitterConfig.token
      );
      
      console.log(`⏰ 定时任务已启动，执行频率: ${schedulerConfig.cronExpression}`);
      
      // 立即执行一次数据收集
      console.log('🔄 执行初始数据收集...');
      collectTweetData(twitterConfig.listId, twitterConfig.token);
    } catch (error) {
      console.error('启动调度器失败:', error);
    }
  } else {
    console.log('⚠️  定时任务调度器已禁用');
  }
});

// 导出app以支持测试
module.exports = app;
