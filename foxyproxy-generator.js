// FoxyProxy Configuration Generator for 922proxy
// Generates proper FoxyProxy JSON configuration with multiple proxies

class FoxyProxyGenerator {
  constructor(config = {}) {
    // Default configuration with original working values
    this.config = Object.assign({
      endpoint: 'na.proxys5.net',  // Original working endpoint
      port: '6200',               // Original working port
      region: 'US',               // USA region
      proxyCount: 10              // Default number of proxies
    }, config);
    
    // Credentials object (only username/password)
    this.credentials = {
      username: '85644296-zone-custom', // Default placeholder, will be overridden
      password: ''                      // Will be set from credentials form
    };

    // Predefined colors for proxies
    this.colors = [
      '#FF5722', '#FF9800', '#FFC107', '#FFEB3B', 
      '#CDDC39', '#8BC34A', '#4CAF50', '#009688',
      '#00BCD4', '#03A9F4', '#2196F3', '#3F51B5',
      '#1E90FF', '#FF69B4', '#FF8C00'
    ];
    
    // Unique icons for each proxy
    this.icons = [
      '🌟', '🔮', '🚀', '🌈', 
      '⚡', '🔥', '💎', '🌊',
      '🔶', '🔷', '🚩', '⭐'
    ];
  }

  // Generate a unique session ID
  generateSessionId() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Format current date as YYMMDD-HHMM
  formatDate() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}-${hours}${minutes}`;
  }

  // Generate a single proxy configuration
  generateProxyConfig(index) {
    const dateStr = this.formatDate();
    const sessionId = this.generateSessionId();
    const colorIndex = index % this.colors.length;
    const iconIndex = index % this.icons.length;
    
    // Get credentials (simplified to just username/password)
    let username = this.credentials.username || '85644296-zone-custom';
    let password = this.credentials.password || '9VTOEdg9';
    
    // Ensure correct username format with session ID for uniqueness
    const authUsername = `${username}-region-${this.config.region}-sessid-${sessionId}-sessTime-15`;
    
    // Create the proxy configuration object with simple numbering and unique icon
    return {
      active: true,
      title: `${index+1} ${this.icons[iconIndex]}`,  // Number first, followed by icon
      type: "socks5",
      hostname: this.config.endpoint,
      port: this.config.port,
      username: authUsername,
      password: password,
      cc: "",  // Leave empty as in original working version
      city: "",
      color: this.colors[colorIndex],  // Ensure unique color for each proxy
      pac: "",
      pacString: "",
      proxyDNS: true,
      include: [],
      exclude: [],
      tabProxy: []
    };
  }

  // Generate full FoxyProxy JSON configuration
  generateFullConfig() {
    const proxyCount = this.config.proxyCount;
    const proxyConfigs = [];
    
    for (let i = 0; i < proxyCount; i++) {
      proxyConfigs.push(this.generateProxyConfig(i));
    }
    
    return {
      mode: `${this.config.endpoint}:${this.config.port}`,
      sync: false,
      autoBackup: false,
      passthrough: "",
      theme: "",
      container: {},
      commands: {
        setProxy: "",
        setTabProxy: "",
        includeHost: "",
        excludeHost: ""
      },
      data: proxyConfigs
    };
  }

  // Generate and return the full configuration as a JSON string
  getConfigAsJson() {
    return JSON.stringify(this.generateFullConfig(), null, 2);
  }

  // Save the configuration as a JSON file
  downloadConfig() {
    const config = this.generateFullConfig();
    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const dateStr = this.formatDate();
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `922proxy-foxyproxy-config-${dateStr}.json`;
    
    // Trigger the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  }
}

// Export for usage in browser and module contexts
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = FoxyProxyGenerator;
} else {
  window.FoxyProxyGenerator = FoxyProxyGenerator;
}
