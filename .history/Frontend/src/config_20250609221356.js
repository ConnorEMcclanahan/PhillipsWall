const config = {
  API_BASE: window.location.hostname.includes('loca.lt')
    ? 'https://aibackend123.loca.lt'  // Use your actual backend tunnel URL
    : window.location.hostname.includes('localhost')
      ? 'http://localhost:5000'
      : 'http://10.15.0.22:5000'
};

export default config;