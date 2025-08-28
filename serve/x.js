async function getListTweets(listId = process.env.PUBLIC_X_LIST_ID, token = process.env.PUBLIC_TOKEN) {
  if (!token) {
    throw new Error('Token is required. Please provide token parameter or set PUBLIC_TOKEN environment variable.');
  }
  const url = `https://api.x.com/2/lists/${listId}/tweets`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`,
        'User-Agent': 'DataCaptureBot/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch tweets: ${error.message}`);
  }
}

module.exports = {
  getListTweets
};
