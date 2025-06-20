const API_BASE = (() => {
    // For localtunnel, use exact backend URL with your actual subdomain
    if (window.location.hostname.includes('loca.lt')) {
        return 'https://aibackend123.loca.lt'; // Replace with your actual tunnel URL
    }
    
    // For local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Try school network IP first
        return 'http://145.93.96.212:5000';
    }
    
    // Default case - use current hostname
    return `http://${window.location.hostname}:5000`;
})();

console.log("Using API base:", API_BASE);

export default API_BASE;