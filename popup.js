// Enhanced Popup Script for 922Proxy Smart Container Manager
// FoxyProxy Edition v3.0

// Constants
const DEFAULT_IP_CHECK_URL = 'https://ipinfo.io/what-is-my-ip';
const IPIFY_API_URL = 'https://api.ipify.org/?format=json';
const IPINFO_API_URL = 'https://ipinfo.io';
const IPAPI_FALLBACK_URL = 'https://ipapi.co/json/';
const IP_REFRESH_INTERVAL_MS = 30000; // 30 seconds
const FLASH_DURATION_MS = 1000; // 1 second for update flash effect
const MESSAGE_DISPLAY_DURATION_MS = 3000; // 3 seconds for success/error messages
const RANDOM_NAME_RANGE = 1000; // Range for random proxy names
const DEBUG = false; // Set to true for verbose logging

function logInfo(message, ...args) {
    if (DEBUG) console.log(`[922Proxy] ${message}`, ...args);
}

class PopupManager {
    constructor() {
        this.containers = [];
        this.proxyGenerator = new FoxyProxyGenerator();
        this.currentConfig = null;
        this.ipUpdateInterval = null;
        this.credentialsValid = false;
        this.tempUsername = ''; // To store username temporarily during password copying
        this.init();
    }

    async init() {
        logInfo('Initializing popup interface...');

        // Set up event listeners
        this.setupEventListeners();
        
        // Load saved proxy credentials first (needed for validation)
        await this.loadProxyCredentials();
        
        // Update UI based on credential status
        this.updateCredentialStatus();
        
        // Load containers
        await this.loadContainers();
        
        // Load saved config if available
        await this.loadSavedConfig();
    }
    
    async loadSavedConfig() {
        try {
            const result = await browser.storage.local.get('foxyProxyConfig');
            if (result.foxyProxyConfig) {
                this.currentConfig = result.foxyProxyConfig;
                logInfo('Loaded saved FoxyProxy config');
            }
        } catch (error) {
            console.error('[922Proxy] Error loading saved config:', error);
        }
    }

    setupEventListeners() {
        // FoxyProxy generator buttons
        document.getElementById('generateBtn').addEventListener('click', () => this.generateProxyConfig());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadProxyConfig());
        
        // Container management buttons
        document.getElementById('newContainerBtn').addEventListener('click', () => this.createNewContainer());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadContainers());
        document.getElementById('deleteAllContainersBtn').addEventListener('click', () => this.deleteAllContainers());
        
        // Setup button
        document.getElementById('setupFoxyProxyBtn').addEventListener('click', () => this.openFoxyProxySetup());
        
        // Credential management buttons
        document.getElementById('saveCredentialsBtn').addEventListener('click', () => this.saveProxyCredentials());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logoutProxy());
        document.getElementById('showPasswordBtn').addEventListener('click', () => this.togglePasswordVisibility());
        
        // Save username to a temporary variable when it's modified
        document.getElementById('proxyUsername').addEventListener('input', (e) => {
            this.tempUsername = e.target.value;
        });
        
        // Restore username if it's accidentally cleared
        document.getElementById('proxyUsername').addEventListener('blur', () => {
            const usernameField = document.getElementById('proxyUsername');
            if (!usernameField.value && this.tempUsername) {
                usernameField.value = this.tempUsername;
            }
        });
        
        // Proxy count selector
        document.getElementById('proxyCount').addEventListener('change', (e) => {
            this.proxyGenerator.config.proxyCount = parseInt(e.target.value);
        });
        
        // Region selector
        document.getElementById('proxyRegion').addEventListener('change', (e) => {
            this.proxyGenerator.config.region = e.target.value;
        });
    }
    
    // Toggle password visibility
    togglePasswordVisibility() {
        const passwordField = document.getElementById('proxyPassword');
        const button = document.getElementById('showPasswordBtn');
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            `;
            button.title = 'Hide Password';
        } else {
            passwordField.type = 'password';
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;
            button.title = 'Show Password';
        }
    }

    // Generate new proxy configuration
    async generateProxyConfig() {
        try {
            const generateBtn = document.getElementById('generateBtn');
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="spinner"></span> Generating...';
            
            // Get values from form
            const proxyCount = parseInt(document.getElementById('proxyCount').value);
            const region = document.getElementById('proxyRegion').value;
            
            // Update generator config
            this.proxyGenerator.config.proxyCount = proxyCount;
            this.proxyGenerator.config.region = region;
            
            // Generate configuration
            this.currentConfig = this.proxyGenerator.generateFullConfig();
            
            // Save to storage for future use
            if (typeof browser !== 'undefined') {
                await browser.storage.local.set({ foxyProxyConfig: this.currentConfig });
            }
            
            // Show success message
            this.showMessage('success', `Successfully generated ${proxyCount} unique proxies!`);
            
            // Re-enable button
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<span class="button-icon">🔄</span> Generate New Proxies';
            
            return this.currentConfig;
        } catch (error) {
            console.error('[922Proxy] Error generating proxy config:', error);
            this.showMessage('error', `Error: ${error.message}`);
            
            // Re-enable button
            const generateBtn = document.getElementById('generateBtn');
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<span class="button-icon">🔄</span> Generate New Proxies';
            
            return null;
        }
    }

    // Download the current proxy configuration
    downloadProxyConfig() {
        try {
            if (!this.currentConfig) {
                // Generate a new configuration if none exists
                this.generateProxyConfig().then(config => {
                    if (config) {
                        this.proxyGenerator.downloadConfig();
                    }
                });
                return;
            }
            
            // Use the existing configuration
            this.proxyGenerator.downloadConfig();
            this.showMessage('success', 'Configuration downloaded successfully!');
        } catch (error) {
            console.error('[922Proxy] Error downloading configuration:', error);
            this.showMessage('error', `Error: ${error.message}`);
        }
    }

    // Load and display Firefox containers
    async loadContainers() {
        try {
            const loadingElement = document.getElementById('loadingContainers');
            const containerListElement = document.getElementById('containerList');
            const emptyStateElement = document.getElementById('emptyState');

            if (loadingElement) loadingElement.style.display = 'block';
            if (containerListElement) containerListElement.style.display = 'none';
            if (emptyStateElement) emptyStateElement.style.display = 'none';
            
            // Check if browser API is available
            if (typeof browser === 'undefined' || !browser.contextualIdentities) {
                this.showContainerError();
                return;
            }
            
            // Query all containers
            const containers = await browser.contextualIdentities.query({});
            this.containers = containers;
            
            // Update the UI
            this.updateContainerList(containers);

            if (loadingElement) loadingElement.style.display = 'none';

            if (containers.length === 0) {
                if (emptyStateElement) emptyStateElement.style.display = 'block';
            } else {
                if (containerListElement) containerListElement.style.display = 'block';
            }
            
            // Start periodic IP detection (every 30 seconds)
            this.startPeriodicIPDetection();
        } catch (error) {
            console.error('[922Proxy] Error loading containers:', error);
            this.showContainerError();
            const loadingElement = document.getElementById('loadingContainers');
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    // Show container API error
    showContainerError() {
        const containerList = document.getElementById('containerList');
        if (!containerList) return;

        containerList.innerHTML = `
            <div style="background: rgba(244, 67, 54, 0.2); padding: 15px; border-radius: 6px; margin: 10px 0; text-align: center;">
                <h3 style="margin-top: 0;">⚠️ Firefox Containers Not Available</h3>
                <p>This extension requires Firefox Multi-Account Containers to be enabled.</p>
                <a href="https://addons.mozilla.org/en-US/firefox/addon/multi-account-containers/" target="_blank" class="button primary">Get Multi-Account Containers</a>
            </div>
        `;
    }

    // Update container list in UI
    updateContainerList(containers) {
        const containerList = document.getElementById('containerList');
        if (!containerList) return;

        containerList.innerHTML = '';

        if (containers.length === 0) {
            return;
        }
        
        for (const container of containers) {
            const containerDiv = document.createElement('div');
            containerDiv.className = 'container-item';
            
            // Get container IP info if available
            const ipInfo = { ip: 'Detecting...', location: 'Detecting...' };
            
            // Create container UI
            containerDiv.innerHTML = `
                <div class="container-header">
                    <div class="container-color" style="background-color: ${container.colorCode || '#1a73e8'}"></div>
                    <div class="container-name">${container.name}</div>
                    <div class="container-actions">
                        <button class="button action-btn" data-container-id="${container.cookieStoreId}" id="refreshIpBtn-${container.cookieStoreId}" title="Refresh IP" aria-label="Refresh IP address for ${container.name}">
                            <span style="font-size: 16px;" aria-hidden="true">↻</span>
                        </button>
                        <button class="button action-btn delete-btn" data-container-id="${container.cookieStoreId}" id="deleteBtn-${container.cookieStoreId}" title="Delete Container" aria-label="Delete container ${container.name}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="white"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="proxy-info">
                    <div><strong>IP:</strong> <span class="ip-address" data-container-id="${container.cookieStoreId}">${ipInfo.ip}</span></div>
                    <div><strong>Location:</strong> <span class="ip-location" data-container-id="${container.cookieStoreId}">${ipInfo.location}</span></div>
                </div>
                <div class="proxy-stats" style="margin-top: 8px;">
                    <button class="button" style="font-size: 11px; padding: 4px 8px;" data-container-id="${container.cookieStoreId}" id="openBtn-${container.cookieStoreId}">
                        Open in Container
                    </button>
                    <button class="button" style="font-size: 11px; padding: 4px 8px;" data-container-id="${container.cookieStoreId}" id="switchBtn-${container.cookieStoreId}">
                        Switch To
                    </button>
                </div>
            `;
            
            containerList.appendChild(containerDiv);
            
            // Add event listeners for the buttons
            document.getElementById(`openBtn-${container.cookieStoreId}`).addEventListener('click', () => {
                this.openInContainer(container);
            });
            
            document.getElementById(`switchBtn-${container.cookieStoreId}`).addEventListener('click', () => {
                this.switchToContainer(container);
            });
            
            document.getElementById(`deleteBtn-${container.cookieStoreId}`).addEventListener('click', () => {
                this.deleteContainer(container);
            });
            
            // Add event listener for refreshing container IP
            document.getElementById(`refreshIpBtn-${container.cookieStoreId}`).addEventListener('click', () => {
                this.refreshContainerIP(container);
            });
        }
        
        // Start IP detection for each container
        this.detectContainerIPs(containers);
    }

    // Detect and update IPs for each container
    async detectContainerIPs(containers) {
        // Display loading state for all containers first
        for (const container of containers) {
            const ipElement = document.querySelector(`.ip-address[data-container-id="${container.cookieStoreId}"]`);
            const locationElement = document.querySelector(`.ip-location[data-container-id="${container.cookieStoreId}"]`);
            
            if (ipElement) ipElement.textContent = 'Detecting...';
            if (locationElement) locationElement.textContent = 'Detecting...';
        }
        
        // Use Promise.all to detect IPs for all containers in parallel
        await Promise.all(containers.map(container => this.refreshContainerIP(container)));
    }
    
    /**
     * Updates the container IP and location information in the UI
     * @param {string} cookieStoreId - The container ID
     * @param {Object} ipInfo - Object containing IP and location information
     */
    updateContainerIP(cookieStoreId, ipInfo) {
        const ipElement = document.querySelector(`.ip-address[data-container-id="${cookieStoreId}"]`);
        const locationElement = document.querySelector(`.ip-location[data-container-id="${cookieStoreId}"]`);
        
        if (ipElement) ipElement.textContent = ipInfo.ip || 'Unknown';
        if (locationElement) locationElement.textContent = ipInfo.location || 'Unknown';
        
        // Update the container row to show it's updated
        const containerRow = document.querySelector(`.container-row[data-container-id="${cookieStoreId}"]`);
        if (containerRow) {
            containerRow.classList.remove('updating');
            
            // Flash effect to show update complete
            containerRow.classList.add('updated');
            setTimeout(() => {
                containerRow.classList.remove('updated');
            }, FLASH_DURATION_MS);
        }
    }
    
    /**
     * Refreshes the IP address and location for a specific container
     * @param {Object} container - The container to refresh IP for
     * @return {Promise<Object>} - Promise resolving to IP info object
     */
    async refreshContainerIP(container) {
        // Display refreshing state in UI
        const ipElement = document.querySelector(`.ip-address[data-container-id="${container.cookieStoreId}"]`);
        const locationElement = document.querySelector(`.ip-location[data-container-id="${container.cookieStoreId}"]`);
        
        if (ipElement) ipElement.textContent = 'Refreshing...';
        if (locationElement) locationElement.textContent = 'Refreshing...';
        
        // Update the container row to show it's updating
        const containerRow = document.querySelector(`.container-row[data-container-id="${container.cookieStoreId}"]`);
        if (containerRow) {
            containerRow.classList.add('updating');
        }
        
        try {
            // Only try to find an active tab in this container - avoid creating new tabs
            const tabs = await browser.tabs.query({ cookieStoreId: container.cookieStoreId, active: true });
            
            if (tabs && tabs.length > 0) {
                try {
                    // Execute script in the tab to detect IP
                    const result = await browser.tabs.executeScript(tabs[0].id, {
                        code: `
                            (async function() {
                                try {
                                    // Try ipify first
                                    const response = await fetch('${IPIFY_API_URL}');
                                    const data = await response.json();
                                    const ip = data.ip;

                                    // Get detailed location info
                                    const ipinfoResponse = await fetch('${IPINFO_API_URL}/' + ip + '/json');
                                    const info = await ipinfoResponse.json();

                                    return {
                                        ip: ip,
                                        location: (info.city || '') + ', ' + (info.region || '') + ' ' + (info.country || '')
                                    };
                                } catch (error) {
                                    console.error('IP detection error:', error);

                                    // Fallback to another service
                                    try {
                                        const response = await fetch('${IPAPI_FALLBACK_URL}');
                                        const data = await response.json();
                                        return {
                                            ip: data.ip,
                                            location: (data.city || '') + ', ' + (data.region || '') + ' ' + (data.country_name || '')
                                        };
                                    } catch (fallbackError) {
                                        return { ip: 'Error detecting', location: 'Unknown' };
                                    }
                                }
                            })();
                        `
                    });
                    
                    if (result && result[0]) {
                        // Update the UI with the results
                        this.updateContainerIP(container.cookieStoreId, result[0]);
                        return result[0];
                    }
                } catch (scriptError) {
                    logInfo('Script execution error:', scriptError);
                }
            }
            
            // If no active tabs or script execution failed, use background script
            // DO NOT create new tabs - this was causing multiple ipinfo.io tabs
            try {
                const response = await browser.runtime.sendMessage({
                    action: 'getContainerInfo',
                    cookieStoreId: container.cookieStoreId
                });
                
                if (response && response.ip) {
                    this.updateContainerIP(container.cookieStoreId, response);
                    return response;
                } else if (response && response.success && response.ipInfo) {
                    const ipInfo = {
                        ip: response.ipInfo.ip,
                        location: `${response.ipInfo.city || ''}, ${response.ipInfo.region || ''} ${response.ipInfo.country || ''}`
                    };
                    this.updateContainerIP(container.cookieStoreId, ipInfo);
                    return ipInfo;
                }
            } catch (msgError) {
                console.error('[922Proxy] Error getting container info from background:', msgError);
            }
            
            // If all methods fail, show error
            const fallbackInfo = { ip: 'No active tab', location: 'Open tab in container' };
            this.updateContainerIP(container.cookieStoreId, fallbackInfo);
            return fallbackInfo;
        } catch (error) {
            console.error('[922Proxy] Error in refreshContainerIP:', error);
            const errorInfo = { ip: 'Error', location: 'Unknown' };
            this.updateContainerIP(container.cookieStoreId, errorInfo);
            return errorInfo;
        }
    }

    // Create a new container
    async createNewContainer() {
        try {
            // Check if browser API is available
            if (typeof browser === 'undefined' || !browser.contextualIdentities) {
                this.showContainerError();
                return;
            }
            
            // Create a random name and color
            const colors = ['blue', 'turquoise', 'green', 'yellow', 'orange', 'red', 'pink', 'purple'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const containerName = `Proxy ${Math.floor(Math.random() * RANDOM_NAME_RANGE)}`;
            
            // Create the container
            const container = await browser.contextualIdentities.create({
                name: containerName,
                color: randomColor,
                icon: 'fingerprint'
            });
            
            // Open ipinfo.io in the new container
            await this.openInContainer(container, DEFAULT_IP_CHECK_URL);
            
            // Refresh container list
            await this.loadContainers();
            
            this.showMessage('success', `Container "${containerName}" created!`);
        } catch (error) {
            console.error('[922Proxy] Error creating container:', error);
            this.showMessage('error', `Error: ${error.message}`);
        }
    }

    // Open a URL in a specific container
    async openInContainer(container, url = DEFAULT_IP_CHECK_URL) {
        try {
            await browser.tabs.create({
                url: url,
                cookieStoreId: container.cookieStoreId
            });
            
            window.close();
        } catch (error) {
            console.error('[922Proxy] Error opening in container:', error);
            this.showMessage('error', `Error: ${error.message}`);
        }
    }
    
    // Switch to an existing tab in a container or create a new one if none exists
    async switchToContainer(container, url = DEFAULT_IP_CHECK_URL) {
        try {
            // Check if there's an existing tab with this container
            const tabs = await browser.tabs.query({
                cookieStoreId: container.cookieStoreId
            });
            
            if (tabs.length > 0) {
                // Switch to the first tab with this container
                await browser.tabs.update(tabs[0].id, { active: true });
                await browser.windows.update(tabs[0].windowId, { focused: true });
            } else {
                // If no existing tab, create a new one
                await browser.tabs.create({
                    url: url,
                    cookieStoreId: container.cookieStoreId
                });
            }
            
            window.close();
        } catch (error) {
            console.error('[922Proxy] Error switching to container:', error);
            this.showMessage('error', `Error: ${error.message}`);
        }
    }
    
    // Delete a container
    async deleteContainer(container) {
        try {
            if (confirm(`Are you sure you want to delete the "${container.name}" container?`)) {
                // Remove the container
                await browser.contextualIdentities.remove(container.cookieStoreId);
                
                // Reload the container list
                await this.loadContainers();
                
                this.showMessage('success', `Container "${container.name}" deleted successfully`);
            }
        } catch (error) {
            console.error('[922Proxy] Error deleting container:', error);
            this.showMessage('error', `Error: ${error.message}`);
        }
    }
    
    // Delete all containers
    async deleteAllContainers() {
        try {
            if (confirm('Are you sure you want to delete ALL containers? This action cannot be undone.')) {
                // Get all containers
                const containers = await browser.contextualIdentities.query({});
                
                if (containers.length === 0) {
                    this.showMessage('info', 'No containers to delete.');
                    return;
                }
                
                // Delete each container
                let deleteCount = 0;
                for (const container of containers) {
                    try {
                        await browser.contextualIdentities.remove(container.cookieStoreId);
                        deleteCount++;
                    } catch (err) {
                        console.error(`Error deleting container ${container.name}:`, err);
                    }
                }
                
                // Reload the container list
                await this.loadContainers();
                
                this.showMessage('success', `Successfully deleted ${deleteCount} containers`);
            }
        } catch (error) {
            console.error('[922Proxy] Error deleting all containers:', error);
            this.showMessage('error', `Error: ${error.message}`);
        }
    }

    // Open FoxyProxy setup page
    openFoxyProxySetup() {
        browser.tabs.create({url: browser.runtime.getURL('foxyproxy-setup.html')});
        window.close();
    }
    
    // Save proxy credentials to local storage
    async saveProxyCredentials() {
        try {
            const username = document.getElementById('proxyUsername').value.trim();
            const password = document.getElementById('proxyPassword').value.trim();
            
            // Validate input
            if (!username || !password) {
                this.showMessage('error', 'Please enter both username and password');
                return;
            }
            
            // Create credentials object
            const credentials = {
                username: username,
                password: password,
                timestamp: new Date().toISOString()
            };
            
            // Save to storage
            await browser.storage.local.set({ proxyCredentials: credentials });
            
            // Update generator config
            if (this.proxyGenerator) {
                this.proxyGenerator.credentials = credentials;
            }
            
            // Update credential validation status
            this.credentialsValid = true;
            this.updateCredentialStatus();

            this.showMessage('success', 'Credentials saved successfully!');
        } catch (error) {
            console.error('[922Proxy] Error saving credentials:', error);
            this.showMessage('error', `Error: ${error.message}`);
        }
    }
    
    // Logout from proxy account (remove credentials)
    async logoutProxy() {
        try {
            // Clear saved credentials
            await browser.storage.local.remove('proxyCredentials');
            
            // Clear form fields
            document.getElementById('proxyUsername').value = '';
            document.getElementById('proxyPassword').value = '';
            
            // Reset temp username
            this.tempUsername = '';
            
            // Reset proxy generator credentials
            if (this.proxyGenerator) {
                this.proxyGenerator.credentials = {
                    username: '',
                    password: ''
                };
            }
            
            // Reset credential status
            this.credentialsValid = false;
            this.updateCredentialStatus();

            this.showMessage('success', 'Successfully logged out!');
        } catch (error) {
            console.error('[922Proxy] Error during logout:', error);
            this.showMessage('error', `Error: ${error.message}`);
        }
    }
    
    
    // Load proxy credentials from local storage
    async loadProxyCredentials() {
        try {
            const result = await browser.storage.local.get('proxyCredentials');
            if (result.proxyCredentials) {
                document.getElementById('proxyUsername').value = result.proxyCredentials.username || '';
                document.getElementById('proxyPassword').value = result.proxyCredentials.password || '';
                
                // Store the username in our temporary variable
                this.tempUsername = result.proxyCredentials.username || '';
                
                // Simple validation - both fields must have values
                this.credentialsValid = !!(result.proxyCredentials.username && result.proxyCredentials.password);
                
                // If credentials are valid, update the proxy generator
                if (this.credentialsValid && this.proxyGenerator) {
                    this.proxyGenerator.credentials = result.proxyCredentials;
                }
            }

            // Update the credential status UI
            this.updateCredentialStatus();
        } catch (error) {
            console.error('[922Proxy] Error loading credentials:', error);
            this.credentialsValid = false;
            this.updateCredentialStatus();
        }
    }
    
    // Validate if credentials are complete
    validateCredentials(credentials) {
        // Check if we have either username+password OR apiToken+apiPassword
        const hasBasicAuth = !!(credentials.username && credentials.password);
        const hasApiAuth = !!(credentials.apiToken && credentials.apiPassword);
        
        return hasBasicAuth || hasApiAuth;
    }
    
    // Update the UI based on credential status
    updateCredentialStatus() {
        const credentialStatus = document.getElementById('credentialStatus');
        const generateBtn = document.getElementById('generateBtn');
        const downloadBtn = document.getElementById('downloadBtn');

        if (this.credentialsValid) {
            if (credentialStatus) {
                credentialStatus.innerHTML = '<span class="success">✓ Valid credentials</span>';
                credentialStatus.style.display = 'block';
            }

            // Enable proxy generation buttons
            if (generateBtn) generateBtn.disabled = false;
            if (downloadBtn) downloadBtn.disabled = false;
        } else {
            if (credentialStatus) {
                credentialStatus.innerHTML = '<span class="error">⚠️ Please add your 922proxy credentials</span><br><small>Enter your Username/Password to generate proxies</small>';
                credentialStatus.style.display = 'block';
            }

            // Disable proxy generation buttons
            if (generateBtn) generateBtn.disabled = true;
            if (downloadBtn) downloadBtn.disabled = true;
        }
    }
    
    // Start periodic IP detection for containers
    startPeriodicIPDetection() {
        // Clear any existing interval
        if (this.ipUpdateInterval) {
            clearInterval(this.ipUpdateInterval);
        }
        
        // Initial IP detection
        if (this.containers && this.containers.length > 0) {
            this.detectContainerIPs(this.containers);
        }
        
        // Set up interval for periodic updates
        this.ipUpdateInterval = setInterval(() => {
            if (this.containers && this.containers.length > 0) {
                logInfo('Performing periodic IP update...');
                this.detectContainerIPs(this.containers);
            }
        }, IP_REFRESH_INTERVAL_MS);
        
        // Add event listener to clean up interval when popup closes
        window.addEventListener('unload', () => {
            if (this.ipUpdateInterval) {
                clearInterval(this.ipUpdateInterval);
            }
        });
    }

    // Show success or error message
    showMessage(type, message) {
        const successMsg = document.getElementById('successMsg');
        const errorMsg = document.getElementById('errorMsg');

        if (!successMsg || !errorMsg) {
            console.error('[922Proxy] Message elements not found');
            return;
        }

        if (type === 'success') {
            successMsg.textContent = message;
            successMsg.style.display = 'block';
            errorMsg.style.display = 'none';

            setTimeout(() => {
                successMsg.style.display = 'none';
            }, MESSAGE_DISPLAY_DURATION_MS);
        } else {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
            successMsg.style.display = 'none';

            setTimeout(() => {
                errorMsg.style.display = 'none';
            }, MESSAGE_DISPLAY_DURATION_MS);
        }
    }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
    const popupManager = new PopupManager();
});
