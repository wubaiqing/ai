const axios = require("axios");

async function getListTweets(
  listId = process.env.PUBLIC_X_LIST_ID,
  token = process.env.PUBLIC_TOKEN
) {
  if (!token) {
    throw new Error(
      "Token is required. Please provide token parameter or set PUBLIC_TOKEN environment variable."
    );
  }
  const url = `https://api.x.com/2/lists/${listId}/tweets?max_results=200`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
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
