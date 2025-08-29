const axios = require('axios');

async function getListTweets(token = process.env.X_TOKEN) {
  if (!token) {
    throw new Error(
      'Token is required. Please provide token parameter or set X_TOKEN environment variable.'
    );
  }
  const url = `https://rss.app/feeds/v1.1/8Ip2by1mveXm9llN.json`;

  try {
    const response = await axios.get(url, {
      proxy: false,
    });
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error(`Failed to fetch tweets: ${error.message}`);
  }
}

module.exports = {
  getListTweets,
};
