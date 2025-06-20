const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const buildPath = path.join(__dirname, 'build');

app.use(express.static(buildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(3000, '0.0.0.0', () => {
  console.log('HTTPS server running on https://10.15.0.22:3000');
});