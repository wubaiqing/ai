// 加载环境变量
require('dotenv').config();

const Koa = require("koa");
const Router = require("koa-router");
const bodyParser = require("koa-bodyparser");
const cors = require("koa-cors");
const { createClient } = require("@supabase/supabase-js");
const { getListTweets } = require("./x.js");

const app = new Koa();
const router = new Router();

// 从环境变量获取X.com token和列表ID
const X_TOKEN = process.env.PUBLIC_TOKEN;
const X_LIST_ID = process.env.PUBLIC_X_LIST_ID;

// 从环境变量获取 Supabase 配置
// 需要在环境变量中设置以下值：
// SUPABASE_URL: 你的 Supabase 项目 URL
// SUPABASE_ANON_KEY: 你的 Supabase 匿名密钥
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// 初始化 Supabase 客户端
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("✅ Supabase 客户端初始化成功");
} else {
  console.warn("⚠️  Supabase 配置缺失，数据将不会存储到数据库");
  console.warn("   请设置环境变量: SUPABASE_URL 和 SUPABASE_ANON_KEY");
}

// 中间件
app.use(cors());
app.use(bodyParser());

// 存储推特数据到 Supabase 的辅助函数
async function storeTweetsToSupabase(tweets) {
  if (!supabase) {
    console.warn("Supabase 未配置，跳过数据存储");
    return { stored: 0, skipped: 0, errors: 0 };
  }

  let stored = 0;
  let skipped = 0;
  let errors = 0;

  if (!tweets.items || !Array.isArray(tweets.items)) {
    console.warn("推特数据格式不正确，跳过存储");
    return { stored, skipped, errors };
  }

  for (const item of tweets.items) {
    try {
      // 检查是否已存在相同 URL 的记录（去重）
      if (item.url) {
        const { data: existingData, error: checkError } = await supabase
          .from('tweets')
          .select('id')
          .eq('url', item.url)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 表示没有找到记录，这是正常的
          console.error("检查重复记录时出错:", checkError.message);
          errors++;
          continue;
        }

        if (existingData) {
          console.log(`跳过重复 URL: ${item.url}`);
          skipped++;
          continue;
        }
      }

      // 准备要存储的数据
      const tweetData = {
        url: item.url || null,
        title: item.title || null,
        content: item.content_text || item.content_html || null,
        published_date: item.date_published ? new Date(item.date_published).toISOString() : null,
        created_at: new Date().toISOString()
      };

      // 存储到 Supabase
      const { error: insertError } = await supabase
        .from('tweets')
        .insert([tweetData]);

      if (insertError) {
        console.error("存储推特数据失败:", insertError.message);
        errors++;
      } else {
        console.log(`成功存储推特: ${item.title || item.url}`);
        stored++;
      }
    } catch (error) {
      console.error("处理推特数据时出错:", error.message);
      errors++;
    }
  }

  return { stored, skipped, errors };
}

// 获取默认列表的推特数据
router.get("/", async (ctx) => {
  try {
    console.log("X_LIST_ID", X_LIST_ID);
    console.log("X_TOKEN", X_TOKEN);

    const data = await getListTweets(X_LIST_ID, X_TOKEN);
    
    // 存储数据到 Supabase
    const storageResult = await storeTweetsToSupabase(data);
    
    ctx.body = {
      success: true,
      data: data,
      storage: {
        enabled: !!supabase,
        stored: storageResult.stored,
        skipped: storageResult.skipped,
        errors: storageResult.errors,
        total_items: data.items ? data.items.length : 0
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("获取推特失败:", error.message);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
});

// 应用路由
app.use(router.routes());
app.use(router.allowedMethods());

// 错误处理
app.on("error", (err, ctx) => {
  console.error("服务器错误:", err);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 数据采集服务已启动`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`📋 API文档:`);
  console.log(`   GET /              - 服务信息`);
  console.log(`   GET /tweets        - 获取默认列表推特`);
  console.log(`   GET /health        - 健康检查`);
  console.log(`\n💡 部署说明:`);
  console.log(`   本地开发: npm run dev`);
  console.log(`   Vercel部署: npm run deploy`);
  console.log(`   查看部署文档: VERCEL_DEPLOY.md`);
});

// 导出app以支持测试
module.exports = app;
