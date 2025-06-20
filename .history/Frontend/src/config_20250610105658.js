const config = {
  API_BASE: (() => {
    // For localtunnel, use exact backend URL with your actual subdomain
    if (window.location.hostname.includes('loca.lt')) {
      return 'https://aibackend123.loca.lt'; // REPLACE with your actual tunnel URL
    }
    
    // For local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // School network IP
      return 'http://145.93.96.212:5000';
    }
    
    // Default case - use current hostname
    return `http://${window.location.hostname}:5000`;
  })()
};

console.log("Using API base:", config.API_BASE);

export default config;