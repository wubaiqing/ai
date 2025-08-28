async function getListTweets(listId, token, maxRetries = 3) {
  // 如果没有提供listId，从环境变量获取默认值
  if (!listId) {
    listId = process.env.PUBLIC_X_LIST_ID;
  }
  
  // 如果没有提供token，从环境变量获取
  if (!token) {
    token = process.env.PUBLIC_TOKEN;
  }
  
  if (!token) {
    throw new Error('Token is required. Please provide token parameter or set PUBLIC_TOKEN environment variable.');
  }
  const url = `https://api.x.com/2/lists/${listId}/tweets`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const options = {
        method: "GET",
        headers: { 
          Authorization: `Bearer ${token}`,
          'User-Agent': 'DataCaptureBot/1.0'
        },
        signal: controller.signal
      };
      
      console.log(`Attempt ${attempt}/${maxRetries}: Fetching tweets from list ${listId}`);
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Successfully fetched tweets on attempt ${attempt}`);
      return data;
      
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        const errorMessage = error.name === 'AbortError' 
          ? 'Request timeout after 30 seconds'
          : `Network error: ${error.message}`;
        throw new Error(`Failed to fetch tweets after ${maxRetries} attempts. ${errorMessage}`);
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  getListTweets
};
