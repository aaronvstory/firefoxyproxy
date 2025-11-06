// Background Script for 922Proxy FoxyProxy Generator
// Version 3.0

const DEBUG = false; // Set to true for verbose logging

function logInfo(message, ...args) {
    if (DEBUG) console.log(`[922Proxy] ${message}`, ...args);
}

logInfo('Background script starting...');

class ProxyManager {
    constructor() {
        this.containerInfo = new Map();
        this.config = null;
        this.init();
    }

    async init() {
        try {
            logInfo('Initializing proxy manager...');

            // Load configuration
            await this.loadConfig();

            // Set up message listener
            browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

            // Set up event listeners
            this.setupEventListeners();

            logInfo('Proxy manager initialized successfully');
        } catch (error) {
            console.error('[922Proxy] Initialization error:', error);
        }
    }

    async loadConfig() {
        try {
            const result = await browser.storage.local.get('proxyConfig');
            
            if (result.proxyConfig) {
                this.config = result.proxyConfig;
            } else {
                this.config = {
                    username: '', // user-supplied
                    password: '', // user-supplied
                    endpoint: 'na.proxys5.net',
                    port: 6200,
                    region: 'US',
                    proxyCount: 10
                };
                await this.saveConfig();
            }
            logInfo('Configuration loaded');
        } catch (error) {
            console.error('[922Proxy] Error loading config:', error);
        }
    }

    async saveConfig() {
        try {
            await browser.storage.local.set({proxyConfig: this.config});
        } catch (error) {
            console.error('[922Proxy] Error saving config:', error);
        }
    }

    setupEventListeners() {
        // Container events
        if (browser.contextualIdentities) {
            browser.contextualIdentities.onCreated.addListener(this.handleContainerCreated.bind(this));
            browser.contextualIdentities.onRemoved.addListener(this.handleContainerRemoved.bind(this));
        }

        // Tab events
        browser.tabs.onCreated.addListener(this.handleTabCreated.bind(this));
        browser.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));

        logInfo('Event listeners configured');
    }

    async handleContainerCreated(container) {
        logInfo(`Container created: ${container.name}`);
        // Store initial container info
        this.containerInfo.set(container.cookieStoreId, {
            name: container.name,
            color: container.color,
            icon: container.icon,
            cookieStoreId: container.cookieStoreId,
            created: Date.now(),
            ipInfo: null
        });
    }

    async handleContainerRemoved(container) {
        logInfo(`Container removed: ${container.name}`);
        this.containerInfo.delete(container.cookieStoreId);
    }

    async handleTabCreated(tab) {
        if (tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default') {
            // Track container tab creation
            const containerInfo = this.containerInfo.get(tab.cookieStoreId);
            if (containerInfo) {
                containerInfo.lastUsed = Date.now();
            } else {
                // Get container info if not already tracked
                try {
                    const container = await browser.contextualIdentities.get(tab.cookieStoreId);
                    if (container) {
                        this.containerInfo.set(tab.cookieStoreId, {
                            name: container.name,
                            color: container.color,
                            icon: container.icon,
                            cookieStoreId: container.cookieStoreId,
                            created: Date.now(),
                            lastUsed: Date.now(),
                            ipInfo: null
                        });
                    }
                } catch (error) {
                    console.error('[922Proxy] Error getting container info:', error);
                }
            }
        }
    }

    async handleTabUpdated(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && 
            tab.url && 
            tab.url.startsWith('http') && 
            tab.cookieStoreId && 
            tab.cookieStoreId !== 'firefox-default') {
            
            // Inject IP detection
            this.injectIPDetection(tabId, tab.cookieStoreId);
        }
    }

    async injectIPDetection(tabId, cookieStoreId) {
        if (!cookieStoreId || cookieStoreId === 'firefox-default') return;
        
        try {
            // Inject a script to detect IP address and location
            await browser.tabs.executeScript(tabId, {
                code: `
                    if (!window._ipDetectionDone) {
                        window._ipDetectionDone = true;
                        
                        // Use ipify API to get IP address
                        fetch('https://api.ipify.org?format=json')
                            .then(r => r.json())
                            .then(data => {
                                // Get location info from ipinfo.io
                                return fetch('https://ipinfo.io/' + data.ip + '/json')
                                    .then(res => res.json())
                                    .then(info => {
                                        const ipInfo = {
                                            ip: data.ip,
                                            city: info.city || 'Unknown',
                                            region: info.region || 'Unknown',
                                            country: info.country || 'Unknown',
                                            location: info.loc || '',
                                            org: info.org || '',
                                            detected: Date.now()
                                        };

                                        // Send IP info back to background script
                                        browser.runtime.sendMessage({
                                            action: 'updateIpInfo',
                                            cookieStoreId: '${cookieStoreId}',
                                            ipInfo: ipInfo
                                        });

                                        return ipInfo;
                                    });
                            })
                            .catch(error => {
                                console.error('[922Proxy] IP detection error:', error);
                            });
                    }
                `
            });
        } catch (error) {
            console.error('[922Proxy] Error injecting IP detection script:', error);
        }
    }

    handleMessage(message, sender, sendResponse) {
        logInfo('Message received:', message.action);
        
        switch (message.action) {
            case 'getConfig':
                sendResponse(this.config);
                break;
                
            case 'saveConfig':
                this.config = message.config;
                this.saveConfig();
                sendResponse({ success: true });
                break;
                
            case 'createContainer':
                this.createContainer(message.name, message.color)
                    .then(container => sendResponse({ success: true, container }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                return true; // Keep channel open for async response
                
            case 'getContainers':
                this.getContainers()
                    .then(containers => sendResponse({ success: true, containers }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                return true; // Keep channel open for async response
                
            case 'updateIpInfo':
                this.updateContainerIpInfo(message.cookieStoreId, message.ipInfo);
                sendResponse({ success: true });
                break;
                
            case 'getContainerInfo':
                const containerInfo = this.getContainerInfo(message.cookieStoreId);
                sendResponse({ success: true, containerInfo });
                break;
                
            case 'getAllContainerInfo':
                sendResponse({ 
                    success: true, 
                    containers: Array.from(this.containerInfo.values()) 
                });
                break;
                
            default:
                console.warn('[922Proxy] Unknown message action:', message.action);
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }

    updateContainerIpInfo(cookieStoreId, ipInfo) {
        if (!cookieStoreId) return;
        
        const containerInfo = this.containerInfo.get(cookieStoreId);
        if (containerInfo) {
            containerInfo.ipInfo = ipInfo;
            containerInfo.lastUpdated = Date.now();
        } else {
            // Create new container info entry
            this.containerInfo.set(cookieStoreId, {
                cookieStoreId,
                ipInfo,
                created: Date.now(),
                lastUpdated: Date.now()
            });
        }
    }

    getContainerInfo(cookieStoreId) {
        return this.containerInfo.get(cookieStoreId) || null;
    }

    async createContainer(name, color = 'blue', icon = 'fingerprint') {
        if (!browser.contextualIdentities) {
            throw new Error('Container API not available');
        }
        
        return await browser.contextualIdentities.create({
            name: name || `Proxy ${Math.floor(Math.random() * 1000)}`,
            color: color,
            icon: icon
        });
    }

    async getContainers() {
        if (!browser.contextualIdentities) {
            return [];
        }
        
        return await browser.contextualIdentities.query({});
    }
}

// Initialize the proxy manager
const proxyManager = new ProxyManager();

// Handle installation and updates
browser.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
        // Open options page on first install
        browser.tabs.create({
            url: browser.runtime.getURL('foxyproxy-setup.html')
        });
    }
});
