# Backend Internship Evaluation

This repository contains two microservices:

1. **Average Calculator** - A microservice that calculates the average of numbers fetched from a third-party server.
2. **Social Media Analytics** - A microservice that provides real-time analytical insights for a social media platform.

## Project Structure

```
├── averageCalculator/     # Average Calculator microservice
│   ├── index.js           # Main server file
│   ├── package.json       # Dependencies and scripts
│   └── README.md          # Documentation
│
├── socialMediaAnalytics/  # Social Media Analytics microservice
│   ├── index.js           # Main server file
│   ├── package.json       # Dependencies and scripts
│   └── README.md          # Documentation
│
├── .gitignore             # Git ignore file
└── README.md              # Main README file
```

## Getting Started

### Average Calculator Microservice

1. Change to the averageCalculator directory:
```
cd averageCalculator
```

2. Install dependencies:
```
npm install
```

3. Start the server:
```
npm start
```

4. For development with auto-restart on file changes:
```
npm run dev
```

The Average Calculator microservice will run on port 9876.

#### Testing the Average Calculator

You can test the Average Calculator microservice using:

1. Regular endpoint (uses the external API):
```
http://localhost:9876/numbers/e
```

2. Test endpoint (uses hardcoded data for reliable testing):
```
http://localhost:9876/test-numbers/e
```

Replace 'e' with:
- 'p' for prime numbers
- 'f' for Fibonacci numbers
- 'r' for random numbers

### Social Media Analytics Microservice

1. Change to the socialMediaAnalytics directory:
```
cd socialMediaAnalytics
```

2. Install dependencies:
```
npm install
```

3. Start the server:
```
npm start
```

4. For development with auto-restart on file changes:
```
npm run dev
```

The Social Media Analytics microservice will run on port 3000.

## API Endpoints

Please refer to the individual README files in each microservice directory for detailed information about the available API endpoints. 