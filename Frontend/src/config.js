const config = {
  API_BASE: window.location.hostname.includes('loca.lt')
    ? 'https://phillipswall-backend.loca.lt'  // Using phillipswall subdomain
    : window.location.hostname.includes('localhost')
      ? 'http://localhost:5000'
      : 'http://145.93.96.212:5000'
};

// Add logging to help with debugging
console.log("Config loaded. Using API base:", config.API_BASE);
console.log("Current hostname:", window.location.hostname);

export default config;