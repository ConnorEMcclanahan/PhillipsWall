const config = {
  API_BASE: window.location.hostname.includes('loca.lt')
    ? ' https://yourappbackend.loca.lt'  // Use your actual backend tunnel URL
    : window.location.hostname.includes('localhost')
      ? 'http://localhost:5000'
      : 'http://145.93.96.212:5000'
};

export default config;