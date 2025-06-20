// Updated serve.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());  // Enable CORS

// Static files
const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

// Simple catch-all route with no regexp
app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// HTTPS options
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

// Start the server
const port = 3000;
https.createServer(options, app).listen(port, '0.0.0.0', () => {
  console.log(`HTTPS server running on https://10.15.0.22:${port}`);
});