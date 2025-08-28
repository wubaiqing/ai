const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('koa-cors');
const { getListTweets } = require('./x.js');

const app = new Koa();
const router = new Router();

// 从环境变量获取X.com token和列表ID
const X_TOKEN = process.env.PUBLIC_TOKEN;
const DEFAULT_LIST_ID = process.env.PUBLIC_X_LIST_ID;

// 中间件
app.use(cors());
app.use(bodyParser());

// 路由定义
router.get('/', async (ctx) => {
  ctx.body = {
    message: '数据采集服务已启动',
    endpoints: {
      '/tweets': 'GET - 获取推特列表数据',
      '/tweets/:listId': 'GET - 获取指定列表的推特数据'
    }
  };
});

// 获取默认列表的推特数据
router.get('/tweets', async (ctx) => {
  try {
    const data = await getListTweets(DEFAULT_LIST_ID, X_TOKEN);
    ctx.body = {
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('获取推特失败:', error.message);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

// 获取指定列表的推特数据
router.get('/tweets/:listId', async (ctx) => {
  try {
    const { listId } = ctx.params;
    const data = await getListTweets(listId, X_TOKEN);
    ctx.body = {
      success: true,
      data: data
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message
    };
  }
});

// 健康检查端点
router.get('/health', async (ctx) => {
  ctx.body = {
    status: 'healthy',
    timestamp: new Date().toISOString()
  };
});

// 应用路由
app.use(router.routes());
app.use(router.allowedMethods());

// 错误处理
app.on('error', (err, ctx) => {
  console.error('服务器错误:', err);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 数据采集服务已启动`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`📋 API文档:`);
  console.log(`   GET /              - 服务信息`);
  console.log(`   GET /tweets        - 获取默认列表推特`);
  console.log(`   GET /tweets/:listId - 获取指定列表推特`);
  console.log(`   GET /health        - 健康检查`);
  console.log(`\n💡 部署说明:`);
  console.log(`   本地开发: npm run dev`);
  console.log(`   Vercel部署: npm run deploy`);
  console.log(`   查看部署文档: VERCEL_DEPLOY.md`);
});

// 导出app以支持测试
module.exports = app;