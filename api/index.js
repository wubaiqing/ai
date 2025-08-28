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
  
  res.status(200).json({
    message: '数据采集服务已启动',
    endpoints: {
      '/tweets': 'GET - 获取推特列表数据',
      '/tweets/:listId': 'GET - 获取指定列表的推特数据',
      '/health': 'GET - 健康检查'
    },
    version: '1.0.0',
    platform: 'Vercel'
  });
};