const config = {
  API_BASE: window.location.hostname.includes('loca.lt')
    ? 'https://yourappbackend.loca.lt'  // Replace with your actual backend URL
    : window.location.hostname.includes('localhost')
      ? 'http://localhost:5000'
      : 'http://145.93.96.212:5000',
  
  // Add WebSocket URL configuration
  WS_BASE: window.location.hostname.includes('loca.lt')
    ? 'wss://yourappbackend.loca.lt'  // No port in WebSocket URL
    : window.location.hostname.includes('localhost')
      ? 'ws://localhost:5000'
      : 'ws://145.93.96.212:5000'
};

console.log("Config loaded. Using API base:", config.API_BASE);
console.log("WebSocket base:", config.WS_BASE);

export default config;