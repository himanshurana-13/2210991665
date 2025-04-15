# Social Media Analytics Microservice

A microservice that provides real-time analytical insights for a social media platform.

## Features

- Top Users API: Returns the top 5 users with the most commented posts
- Top/Latest Posts API: Returns the most popular posts (with the most comments) or the latest 5 posts
- Efficient data caching to minimize API calls to the third-party server
- Real-time data updates and analytics

## Installation

1. Install dependencies:
```
npm install
```

2. Start the server:
```
node index.js
```

The server will start on port 3000 by default.

## API Endpoints

### GET /users

Returns the top 5 users with the most commented posts.

#### Response Format

```json
{
  "users": [
    {
      "userId": "1",
      "name": "John Doe",
      "commentCount": 42
    },
    ...
  ]
}
```

### GET /posts?type=popular

Returns the post(s) with the maximum number of comments. If multiple posts have the same maximum count, all such posts are returned.

#### Query Parameters

- `type`: The type of posts to retrieve. Valid values are "popular" or "latest".

#### Response Format

```json
{
  "posts": [
    {
      "id": 123,
      "userId": "1",
      "userName": "John Doe",
      "content": "Post content",
      "commentCount": 42
    },
    ...
  ]
}
```

### GET /posts?type=latest

Returns the 5 latest posts, with the newest posts first.

#### Query Parameters

- `type`: The type of posts to retrieve. Valid values are "popular" or "latest".

#### Response Format

```json
{
  "posts": [
    {
      "id": 123,
      "userId": "1",
      "userName": "John Doe",
      "content": "Post content",
      "commentCount": 10
    },
    ...
  ]
}
```

## Configuration

- `PORT`: The port on which the server will run (default: 3000)
- Cache TTL: The time-to-live for cached data (default: 60 seconds) 