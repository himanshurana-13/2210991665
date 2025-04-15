const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 9876;

// Configuration
const WINDOW_SIZE = 10;
const TEST_SERVER_URL = 'http://20.244.56.144/evaluation-service';
const MAX_RESPONSE_TIME = 500; // ms

// Authentication data
const authData = {
  email: process.env.EMAIL,
  name: process.env.NAME,
  rollNo: process.env.ROLL_NO,
  accessCode: process.env.ACCESS_CODE,
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
};

// Storage for numbers
let numberStore = {
  windowState: [],
  lastAddedTime: Date.now()
};

// Token storage
let tokenData = {
  token: process.env.ACCESS_TOKEN,
  tokenType: process.env.TOKEN_TYPE,
  expiresAt: parseInt(process.env.EXPIRES_IN, 10)
};

// Middleware to parse JSON
app.use(express.json());

// Function to get a valid authentication token
async function getAuthToken() {
  try {
    // Check if we have a valid token
    if (tokenData.token && Date.now() < tokenData.expiresAt) {
      return `${tokenData.tokenType} ${tokenData.token}`;
    }

    // Get a new token
    const response = await axios.post(`${TEST_SERVER_URL}/auth`, authData);
    
    if (response.data && response.data.access_token) {
      tokenData = {
        token: response.data.access_token,
        tokenType: response.data.token_type,
        expiresAt: response.data.expires_in
      };
      
      return `${tokenData.tokenType} ${tokenData.token}`;
    }
    
    throw new Error('Failed to obtain auth token');
  } catch (error) {
    console.error('Error getting auth token:', error.message);
    // If we already have a token, use it even if it might be expired
    if (tokenData.token) {
      return `${tokenData.tokenType} ${tokenData.token}`;
    }
    throw error;
  }
}

// Function to make a safe API call with fallback for errors
async function safeApiCall(endpoint) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MAX_RESPONSE_TIME);
  
  try {
    // Get auth token
    const authHeader = await getAuthToken();
    
    const startTime = Date.now();
    const response = await axios.get(`${TEST_SERVER_URL}/${endpoint}`, {
      signal: controller.signal,
      headers: {
        'Authorization': authHeader
      },
      timeout: MAX_RESPONSE_TIME
    });
    const endTime = Date.now();
    
    if (endTime - startTime > MAX_RESPONSE_TIME) {
      console.log(`Request to ${endpoint} timed out`);
      return { numbers: [] };
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    return { numbers: [] };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Route for numbers with specific types
app.get('/numbers/:numberid', async (req, res) => {
  try {
    const { numberid } = req.params;
    
    // Validate the number ID
    if (!['p', 'f', 'e', 'r'].includes(numberid)) {
      return res.status(400).json({ error: 'Invalid number ID. Use p, f, e, or r.' });
    }
    
    // Map the number ID to the corresponding endpoint
    const endpointMap = {
      p: 'primes',
      f: 'fibo',
      e: 'even',
      r: 'rand'
    };
    
    const endpoint = endpointMap[numberid];
    const windowPrevState = [...numberStore.windowState];
    
    // Call API with retries
    console.log(`Fetching ${endpoint} numbers...`);
    const data = await safeApiCall(endpoint);
    const fetchedNumbers = data.numbers || [];
    
    console.log(`Received numbers:`, fetchedNumbers);
    
    // If no numbers were fetched, return current state
    if (fetchedNumbers.length === 0) {
      console.log('No numbers received from the API');
      return res.status(200).json({
        windowPrevState,
        windowCurrState: numberStore.windowState,
        numbers: [],
        avg: calculateAverage(numberStore.windowState)
      });
    }
    
    // Update the window state with unique numbers
    updateWindowState(fetchedNumbers);
    
    // Calculate the average
    const avg = calculateAverage(numberStore.windowState);
    
    // Return the response
    return res.status(200).json({
      windowPrevState,
      windowCurrState: numberStore.windowState,
      numbers: fetchedNumbers,
      avg
    });
  } catch (error) {
    console.error('Error in number processing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Also support POST method for the same endpoint
app.post('/numbers/:numberid', (req, res) => {
  // Just redirect to the GET handler
  app._router.handle(req, res);
});

// Function to update the window state with unique numbers
function updateWindowState(newNumbers) {
  // Filter out duplicates and add new unique numbers
  const uniqueNewNumbers = newNumbers.filter(num => !numberStore.windowState.includes(num));
  
  if (uniqueNewNumbers.length === 0) {
    return;
  }
  
  // Add new unique numbers to the window state
  let updatedState = [...numberStore.windowState];
  
  for (const num of uniqueNewNumbers) {
    if (updatedState.length < WINDOW_SIZE) {
      // Window is not full, add the number
      updatedState.push(num);
    } else {
      // Window is full, replace the oldest number
      updatedState.shift();
      updatedState.push(num);
    }
  }
  
  numberStore.windowState = updatedState;
  numberStore.lastAddedTime = Date.now();
}

// Function to calculate the average of numbers
function calculateAverage(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  const avg = sum / numbers.length;
  
  // Format to 2 decimal places
  return Number(avg.toFixed(2));
}

// Hardcoded test data as fallback
const testData = {
  primes: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29],
  fibo: [1, 1, 2, 3, 5, 8, 13, 21, 34, 55],
  even: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
  rand: [7, 12, 23, 45, 67, 89, 102, 234, 567, 890]
};

// Add a test route that doesn't rely on the external API
app.get('/test-numbers/:numberid', (req, res) => {
  try {
    const { numberid } = req.params;
    
    if (!['p', 'f', 'e', 'r'].includes(numberid)) {
      return res.status(400).json({ error: 'Invalid number ID. Use p, f, e, or r.' });
    }
    
    const endpointMap = {
      p: 'primes',
      f: 'fibo',
      e: 'even',
      r: 'rand'
    };
    
    const dataType = endpointMap[numberid];
    const windowPrevState = [...numberStore.windowState];
    
    // Use hardcoded data instead of API call
    const fetchedNumbers = testData[dataType];
    
    // Update the window state with unique numbers
    updateWindowState(fetchedNumbers);
    
    // Calculate the average
    const avg = calculateAverage(numberStore.windowState);
    
    return res.status(200).json({
      windowPrevState,
      windowCurrState: numberStore.windowState,
      numbers: fetchedNumbers,
      avg
    });
  } catch (error) {
    console.error('Error in test number processing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Average Calculator microservice running on port ${PORT}`);
  console.log(`Test endpoint available at http://localhost:${PORT}/test-numbers/:numberid`);
}); 