/**
 * 检测 DeepSeek 模型名是否可用
 * 用法: DEEPSEEK_API_KEY=your_key node scripts/tests/check-model-names.js
 */

require('dotenv').config();
const OpenAI = require('openai');

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com';
const MODELS = ['deepseek-v4-flash', 'deepseek-flash'];

if (!API_KEY) {
  console.error('请设置 DEEPSEEK_API_KEY 环境变量');
  console.error('用法: DEEPSEEK_API_KEY=your_key node scripts/tests/check-model-names.js');
  process.exit(1);
}

const client = new OpenAI({ baseURL: BASE_URL, apiKey: API_KEY });

async function testModel(modelName) {
  try {
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: '回复"OK"' }],
      max_tokens: 10,
      stream: false
    });

    const content = completion.choices?.[0]?.message?.content;
    const finishReason = completion.choices?.[0]?.finish_reason;
    const actualModel = completion.model;

    return { ok: !!content, content, finishReason, actualModel };
  } catch (error) {
    const msg = error.message || String(error);
    const status = error.status;
    return { ok: false, error: `${status ? `HTTP ${status}: ` : ''}${msg}` };
  }
}

(async () => {
  console.log(`Base URL: ${BASE_URL}\n`);

  for (const model of MODELS) {
    process.stdout.write(`测试 ${model} ... `);
    const result = await testModel(model);

    if (result.ok) {
      console.log(`✅ 可用 (actual model: ${result.actualModel}, finish_reason: ${result.finishReason}, content: ${result.content})`);
    } else {
      console.log(`❌ 不可用 - ${result.error}`);
    }
  }
})();
