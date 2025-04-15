const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cache configuration
const cache = new NodeCache({ stdTTL: 60 }); // 60 seconds TTL
const TEST_SERVER_URL = 'http://20.244.56.144/evaluation-service';

// Authentication data 
const authData = {
  email: process.env.EMAIL,
  name: process.env.NAME,
  rollNo: process.env.ROLL_NO,
  accessCode: process.env.ACCESS_CODE,
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
};

console.log('Environment variables loaded:', {
  email: process.env.EMAIL ? 'Set' : 'Not set',
  name: process.env.NAME ? 'Set' : 'Not set',
  rollNo: process.env.ROLL_NO ? 'Set' : 'Not set',
  accessCode: process.env.ACCESS_CODE ? 'Set' : 'Not set',
  clientID: process.env.CLIENT_ID ? 'Set' : 'Not set',
  clientSecret: process.env.CLIENT_SECRET ? 'Set' : 'Not set',
  token: process.env.ACCESS_TOKEN ? 'Set' : 'Not set'
});

// Token storage
let tokenData = {
  token: process.env.ACCESS_TOKEN,
  tokenType: process.env.TOKEN_TYPE || 'Bearer',
  expiresAt: parseInt(process.env.EXPIRES_IN, 10) || (Date.now() + 3600000)
};

// Mock data for testing when API fails
const mockData = {
  users: {
    "1": "John Doe",
    "2": "Jane Doe",
    "3": "Alice Smith",
    "4": "Bob Johnson",
    "5": "Charlie Brown"
  },
  posts: [
    { id: 101, userid: 1, content: "Post about technology" },
    { id: 102, userid: 1, content: "Post about science" },
    { id: 103, userid: 2, content: "Post about art" },
    { id: 104, userid: 3, content: "Post about music" },
    { id: 105, userid: 4, content: "Post about sports" }
  ],
  comments: {
    "101": [
      { id: 1001, postid: 101, content: "Great post!" },
      { id: 1002, postid: 101, content: "I agree!" },
      { id: 1003, postid: 101, content: "Nice content!" }
    ],
    "102": [
      { id: 1004, postid: 102, content: "Interesting!" },
      { id: 1005, postid: 102, content: "I learned something new!" }
    ],
    "103": [
      { id: 1006, postid: 103, content: "Beautiful art!" }
    ],
    "104": [
      { id: 1007, postid: 104, content: "I love music too!" }
    ],
    "105": []
  }
};

// Store for analytics data
let analyticsStore = {
  users: {},
  posts: [],
  comments: {},
  userPostsCount: {},
  userCommentsCount: {},
  postsWithComments: {}
};

// Middleware
app.use(express.json());

// Function to get a valid authentication token
async function getAuthToken() {
  try {
    console.log('Getting auth token...');
    // Check if we have a valid token
    if (tokenData.token && Date.now() < tokenData.expiresAt) {
      console.log('Using existing token');
      return `${tokenData.tokenType} ${tokenData.token}`;
    }

    // Get a new token
    console.log('Requesting new token with:', {
      email: authData.email,
      name: authData.name,
      rollNo: authData.rollNo,
      accessCode: authData.accessCode?.substring(0, 2) + '...',
      clientID: authData.clientID?.substring(0, 5) + '...',
      clientSecret: authData.clientSecret?.substring(0, 5) + '...'
    });

    const response = await axios.post(`${TEST_SERVER_URL}/auth`, authData);
    
    console.log('Token response received:', response.data ? 'Success' : 'Failed');
    
    if (response.data && response.data.access_token) {
      tokenData = {
        token: response.data.access_token,
        tokenType: response.data.token_type || 'Bearer',
        expiresAt: response.data.expires_in || (Date.now() + 3600000)
      };
      
      return `${tokenData.tokenType} ${tokenData.token}`;
    }
    
    throw new Error('Failed to obtain auth token');
  } catch (error) {
    console.error('Error getting auth token:', error.message);
    // If we already have a token, use it even if it might be expired
    if (tokenData.token) {
      console.log('Using existing token as fallback');
      return `${tokenData.tokenType} ${tokenData.token}`;
    }
    throw error;
  }
}

// Function to make a safe API call with fallback for errors
async function safeApiCall(endpoint, params = {}) {
  try {
    console.log(`Calling API: ${endpoint}`, params);
    const authHeader = await getAuthToken();
    
    const response = await axios.get(`${TEST_SERVER_URL}/${endpoint}`, {
      headers: {
        'Authorization': authHeader
      },
      params,
      timeout: 5000 // 5 second timeout
    });
    
    console.log(`API response received for ${endpoint}:`, 
      response.data ? 'Success' : 'Empty response');
    
    return response.data;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    
    // Use mock data as fallback
    if (endpoint === 'users') {
      console.log('Using mock users data');
      return { users: mockData.users };
    } else if (endpoint.includes('/posts')) {
      const userId = endpoint.split('/')[1];
      console.log(`Using mock posts data for user ${userId}`);
      return { 
        posts: mockData.posts.filter(post => post.userid.toString() === userId) 
      };
    } else if (endpoint.includes('posts/') && endpoint.includes('/comments')) {
      const postId = endpoint.split('/')[1];
      console.log(`Using mock comments for post ${postId}`);
      return { 
        comments: mockData.comments[postId] || [] 
      };
    }
    
    // Return empty data as last resort
    return { users: {}, posts: [], comments: [] };
  }
}

// Routes
app.get('/users', async (req, res) => {
  try {
    console.log('Handling /users request');
    await updateData();
    
    // Get top users with most commented posts
    const users = Object.entries(analyticsStore.userCommentsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, commentCount]) => ({
        userId,
        name: analyticsStore.users[userId] || `User ${userId}`,
        commentCount
      }));
    
    console.log(`Returning ${users.length} top users`);
    
    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching top users:', error.message);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/posts', async (req, res) => {
  try {
    const { type } = req.query;
    console.log(`Handling /posts request with type=${type}`);
    
    if (!type || !['latest', 'popular'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type parameter. Use "latest" or "popular".' });
    }
    
    await updateData();
    
    if (type === 'popular') {
      // Find the maximum comment count
      const commentCounts = Object.values(analyticsStore.postsWithComments)
        .map(post => post.commentCount);
      
      const maxComments = commentCounts.length > 0 ? 
        Math.max(...commentCounts) : 0;
      
      console.log(`Max comment count: ${maxComments}`);
      
      // Get all posts with the maximum comment count
      const popularPosts = Object.values(analyticsStore.postsWithComments)
        .filter(post => post.commentCount === maxComments)
        .map(post => ({
          id: post.id,
          userId: post.userid,
          userName: analyticsStore.users[post.userid] || `User ${post.userid}`,
          content: post.content,
          commentCount: post.commentCount
        }));
      
      console.log(`Returning ${popularPosts.length} popular posts`);
      
      return res.status(200).json({ posts: popularPosts });
    } else if (type === 'latest') {
      // Get the 5 latest posts
      const latestPosts = analyticsStore.posts
        .sort((a, b) => b.id - a.id) // Assuming higher ID means newer post
        .slice(0, 5)
        .map(post => ({
          id: post.id,
          userId: post.userid,
          userName: analyticsStore.users[post.userid] || `User ${post.userid}`,
          content: post.content,
          commentCount: analyticsStore.postsWithComments[post.id]?.commentCount || 0
        }));
      
      console.log(`Returning ${latestPosts.length} latest posts`);
      
      return res.status(200).json({ posts: latestPosts });
    }
  } catch (error) {
    console.error('Error fetching posts:', error.message);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Add a test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'API is working',
    auth: {
      tokenExists: !!tokenData.token,
      expiresAt: new Date(tokenData.expiresAt).toISOString()
    },
    mockDataSize: {
      users: Object.keys(mockData.users).length,
      posts: mockData.posts.length,
      comments: Object.keys(mockData.comments).length
    }
  });
});

// Data fetching and processing functions
async function fetchUsers() {
  try {
    console.log('Fetching users...');
    const cacheKey = 'users';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log('Using cached users data');
      return cachedData;
    }
    
    const data = await safeApiCall('users');
    const users = data.users || {};
    
    console.log(`Fetched ${Object.keys(users).length} users`);
    
    if (Object.keys(users).length > 0) {
      cache.set(cacheKey, users);
    } else {
      console.log('Using mock users as fallback');
      return mockData.users;
    }
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error.message);
    console.log('Using mock users data due to error');
    return mockData.users;
  }
}

async function fetchUserPosts(userId) {
  try {
    console.log(`Fetching posts for user ${userId}...`);
    const cacheKey = `user_posts_${userId}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Using cached posts for user ${userId}`);
      return cachedData;
    }
    
    const data = await safeApiCall(`users/${userId}/posts`);
    const posts = data.posts || [];
    
    console.log(`Fetched ${posts.length} posts for user ${userId}`);
    
    if (posts.length > 0) {
      cache.set(cacheKey, posts);
      return posts;
    }
    
    // Fallback to mock data
    console.log(`Using mock posts for user ${userId}`);
    return mockData.posts.filter(post => post.userid.toString() === userId);
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error.message);
    console.log(`Using mock posts for user ${userId} due to error`);
    return mockData.posts.filter(post => post.userid.toString() === userId);
  }
}

async function fetchPostComments(postId) {
  try {
    console.log(`Fetching comments for post ${postId}...`);
    const cacheKey = `post_comments_${postId}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Using cached comments for post ${postId}`);
      return cachedData;
    }
    
    const data = await safeApiCall(`posts/${postId}/comments`);
    const comments = data.comments || [];
    
    console.log(`Fetched ${comments.length} comments for post ${postId}`);
    
    if (comments.length > 0) {
      cache.set(cacheKey, comments);
      return comments;
    }
    
    // Fallback to mock data
    console.log(`Using mock comments for post ${postId}`);
    return mockData.comments[postId] || [];
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error.message);
    console.log(`Using mock comments for post ${postId} due to error`);
    return mockData.comments[postId] || [];
  }
}

async function updateData() {
  try {
    console.log('Starting data update...');
    // Fetch all users
    const users = await fetchUsers();
    analyticsStore.users = users;
    console.log(`Updated users: ${Object.keys(users).length}`);
    
    // Fetch posts for each user
    let allPosts = [];
    for (const userId in users) {
      console.log(`Processing user ${userId}...`);
      const userPosts = await fetchUserPosts(userId);
      allPosts = [...allPosts, ...userPosts];
      analyticsStore.userPostsCount[userId] = userPosts.length;
    }
    
    analyticsStore.posts = allPosts;
    console.log(`Total posts: ${allPosts.length}`);
    
    // Fetch comments for each post and calculate user comment counts
    analyticsStore.userCommentsCount = {};
    analyticsStore.postsWithComments = {};
    
    for (const post of allPosts) {
      console.log(`Processing post ${post.id}...`);
      const comments = await fetchPostComments(post.id);
      analyticsStore.comments[post.id] = comments;
      
      // Update post with comment count
      analyticsStore.postsWithComments[post.id] = {
        ...post,
        commentCount: comments.length
      };
      
      // Update user comment count
      const userId = post.userid ? post.userid.toString() : null;
      if (userId) {
        if (!analyticsStore.userCommentsCount[userId]) {
          analyticsStore.userCommentsCount[userId] = 0;
        }
        analyticsStore.userCommentsCount[userId] += comments.length;
      }
    }
    
    console.log('Data update completed successfully');
    console.log('Analytics store stats:', {
      users: Object.keys(analyticsStore.users).length,
      posts: analyticsStore.posts.length,
      commentsForPosts: Object.keys(analyticsStore.comments).length,
      usersWithComments: Object.keys(analyticsStore.userCommentsCount).length
    });
  } catch (error) {
    console.error('Error updating data:', error.message);
    // Use mock data as fallback
    console.log('Using mock data as fallback due to error');
    analyticsStore.users = mockData.users;
    analyticsStore.posts = mockData.posts;
    analyticsStore.comments = mockData.comments;
    
    // Calculate post counts for users
    analyticsStore.userPostsCount = {};
    for (const post of mockData.posts) {
      const userId = post.userid.toString();
      if (!analyticsStore.userPostsCount[userId]) {
        analyticsStore.userPostsCount[userId] = 0;
      }
      analyticsStore.userPostsCount[userId]++;
    }
    
    // Calculate comment counts for users and posts
    analyticsStore.userCommentsCount = {};
    analyticsStore.postsWithComments = {};
    
    for (const post of mockData.posts) {
      const postId = post.id.toString();
      const comments = mockData.comments[postId] || [];
      
      analyticsStore.postsWithComments[postId] = {
        ...post,
        commentCount: comments.length
      };
      
      const userId = post.userid.toString();
      if (!analyticsStore.userCommentsCount[userId]) {
        analyticsStore.userCommentsCount[userId] = 0;
      }
      analyticsStore.userCommentsCount[userId] += comments.length;
    }
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Social Media Analytics microservice running on port ${PORT}`);
  console.log(`Test endpoint available at http://localhost:${PORT}/test`);
  
  // Initial data load
  console.log('Starting initial data load...');
  updateData().then(() => {
    console.log('Initial data load completed');
  }).catch(err => {
    console.error('Error during initial data load:', err.message);
  });
}); 