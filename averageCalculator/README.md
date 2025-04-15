# Average Calculator Microservice

A simple REST API microservice that calculates the average of numbers fetched from a third-party server.

## Features

- Fetches numbers from a third-party server based on the number type:
  - 'p' for prime numbers
  - 'f' for Fibonacci numbers
  - 'e' for even numbers
  - 'r' for random numbers
- Manages a window of numbers with a configurable size (default: 10)
- Ignores duplicate numbers
- Ignores responses that take longer than 500ms
- Calculates the average of numbers in the window

## Installation

1. Install dependencies:
```
npm install
```

2. Start the server:
```
node index.js
```

The server will start on port 9876 by default.

## API Endpoints

### GET /numbers/:numberid

Fetches numbers from the third-party server based on the number ID and calculates their average.

- Valid number IDs: 'p', 'f', 'e', 'r'

#### Response Format

```json
{
  "windowPrevState": [],
  "windowCurrState": [1, 3, 5, 7],
  "numbers": [1, 3, 5, 7],
  "avg": 4.00
}
```

- `windowPrevState`: The state of the window before the current request
- `windowCurrState`: The state of the window after the current request
- `numbers`: The numbers received from the third-party server
- `avg`: The average of the numbers in the current window state

## Configuration

- `WINDOW_SIZE`: The maximum number of unique numbers to store (default: 10)
- `MAX_RESPONSE_TIME`: The maximum allowed response time in milliseconds (default: 500) 