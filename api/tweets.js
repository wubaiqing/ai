const { getListTweets } = require('../serve/x.js');

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    // 从环境变量获取token和默认列表ID
    const X_TOKEN = process.env.PUBLIC_TOKEN;
    const defaultListId = process.env.PUBLIC_X_LIST_ID;
    
    const data = await getListTweets(defaultListId, X_TOKEN);
    
    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('获取推特数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};