const { getListTweets } = require('../../serve/x.js');

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
    // 从查询参数或路径参数获取listId
    const listId = req.query.listId || req.query.id;
    
    if (!listId) {
      res.status(400).json({
        success: false,
        error: 'listId parameter is required'
      });
      return;
    }
    
    // 从环境变量获取token
    const X_TOKEN = process.env.PUBLIC_TOKEN;
    
    const data = await getListTweets(listId, X_TOKEN);
    
    res.status(200).json({
      success: true,
      data: data,
      listId: listId
    });
  } catch (error) {
    console.error('获取指定列表推特数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};