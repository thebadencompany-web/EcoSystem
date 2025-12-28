// popup.js - Chrome Extension Popup Logic

// State
let detectedProducts = [];
let appConnected = false;

// DOM Elements
const appStatus = document.getElementById('appStatus');
const currentSite = document.getElementById('currentSite');
const productCount = document.getElementById('productCount');
const loading = document.getElementById('loading');
const actions = document.getElementById('actions');
const importAll = document.getElementById('importAll');
const importSelected = document.getElementById('importSelected');
const scanPage = document.getElementById('scanPage');
const message = document.getElementById('message');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.url) {
        try {
            const url = new URL(tab.url);
            currentSite.textContent = url.hostname.replace('www.', '');
        } catch {
            currentSite.textContent = 'Unknown';
        }
    }

    // Check app connection
    checkAppConnection();

    // Initial scan
    scanForProducts();
});

// Check if Wreath Weaver app is open
async function checkAppConnection() {
    try {
        // Look for the app in open tabs
        const tabs = await chrome.tabs.query({});
        const appTab = tabs.find(t => t.url && (
            t.url.includes('localhost:5005') ||
            t.url.includes('127.0.0.1:5005') ||
            t.url.includes('localhost:5001') ||
            t.url.includes('localhost:5002') ||
            t.url.includes('localhost:5173')
        ));

        if (appTab) {
            appStatus.textContent = 'Connected';
            appStatus.className = 'status-value connected';
            appConnected = true;
        } else {
            appStatus.textContent = 'App not open';
            appStatus.className = 'status-value disconnected';
            appConnected = false;
        }
    } catch (e) {
        appStatus.textContent = 'Unknown';
        appStatus.className = 'status-value';
    }
}

// Scan page for products
async function scanForProducts() {
    showLoading(true);
    message.className = 'message';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab?.id) {
            throw new Error('No active tab');
        }

        // Send message to content script (which has the robust scraping + base64 logic)
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PRODUCTS' });

            if (response && response.products) {
                detectedProducts = response.products;
                productCount.textContent = detectedProducts.length;

                if (detectedProducts.length > 0) {
                    importAll.disabled = false;
                    importSelected.disabled = detectedProducts.length === 0;
                }
            } else {
                productCount.textContent = '0';
            }
        } catch (msgError) {
            console.error('Messaging failed:', msgError);
            // Fallback or error
            throw new Error('Content script not ready. Please REFRESH the page.');
        }

    } catch (e) {
        console.error('Scan error:', e);
        productCount.textContent = '?';
        showMessage(e.message || 'Could not scan this page', 'error');
    } finally {
        showLoading(false);
    }
}

// This function runs in the context of the web page
function scanPageForProducts() {
    const products = [];

    // Common product card selectors
    const selectors = [
        '[data-product-id]',
        '[data-item-id]',
        '[data-sku]',
        '.product-card',
        '.product-item',
        '.product-tile',
        '.catalog-item',
        'article[itemtype*="Product"]',
        '[itemtype*="Product"]',
        '.grid-item[data-id]',
        '.product-grid-item',
        '.product',
        '.item-card'
    ];

    // Try each selector
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            elements.forEach(el => {
                const product = extractProductData(el);
                if (product && product.name) {
                    products.push(product);
                }
            });
            if (products.length > 0) break;
        }
    }

    // Fallback: look for structured data
    if (products.length === 0) {
        const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
        ldJsonScripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                if (data['@type'] === 'Product' || data['@type']?.includes('Product')) {
                    products.push({
                        name: data.name,
                        imageUrl: data.image?.[0] || data.image,
                        price: data.offers?.price,
                        sku: data.sku,
                        description: data.description
                    });
                }
                // Handle arrays of products
                if (Array.isArray(data)) {
                    data.filter(d => d['@type'] === 'Product').forEach(p => {
                        products.push({
                            name: p.name,
                            imageUrl: p.image?.[0] || p.image,
                            price: p.offers?.price,
                            sku: p.sku,
                            description: p.description
                        });
                    });
                }
            } catch { }
        });
    }

    // Deduplicate by name
    const unique = [];
    const seen = new Set();
    products.forEach(p => {
        if (p.name && !seen.has(p.name)) {
            seen.add(p.name);
            unique.push(p);
        }
    });

    return unique;

    // Helper to extract product data from an element
    function extractProductData(el) {
        const product = {};

        // Name
        const nameEl = el.querySelector('h1, h2, h3, h4, .product-name, .product-title, .item-name, [class*="title"], [class*="name"]');
        product.name = nameEl?.textContent?.trim() || el.querySelector('img')?.alt;

        // Image
        const imgEl = el.querySelector('img');
        product.imageUrl = imgEl?.src || imgEl?.dataset?.src;

        // Price
        const priceEl = el.querySelector('.price, .product-price, [class*="price"], [data-price]');
        if (priceEl) {
            const priceText = priceEl.textContent?.replace(/[^0-9.,]/g, '');
            product.price = parseFloat(priceText) || null;
        }

        // SKU
        product.sku = el.dataset?.sku || el.dataset?.productId || el.dataset?.itemId || el.dataset?.id;

        // Description
        const descEl = el.querySelector('.description, .product-description, [class*="description"]');
        product.description = descEl?.textContent?.trim()?.substring(0, 500);

        // Additional images
        const allImgs = el.querySelectorAll('img');
        product.additionalImages = Array.from(allImgs).slice(0, 5).map(img => img.src).filter(Boolean);

        return product;
    }
}

// Import all detected products
importAll.addEventListener('click', async () => {
    if (detectedProducts.length === 0) return;

    showLoading(true);

    try {
        await sendProductsToApp(detectedProducts);
        showMessage(`Sent ${detectedProducts.length} products to Wreath Weaver!`, 'success');
    } catch (e) {
        showMessage('Failed to send products: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
});

// Import current/selected product
importSelected.addEventListener('click', async () => {
    showLoading(true);

    try {
        // Try to detect the focused product via message to content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Send message to content script
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_PRODUCT' });

            if (response && response.product) {
                await sendProductsToApp([response.product]);
                showMessage('Product sent to Wreath Weaver!', 'success');
            } else {
                showMessage('Could not detect product on this page', 'error');
            }
        } catch (msgError) {
            console.error('Messaging failed:', msgError);
            throw new Error('Content script not ready. Please REFRESH the page.');
        }
    } catch (e) {
        showMessage('Failed: ' + e.message, 'error');
    } finally {
        showLoading(false);
    }
});

// Re-scan button
scanPage.addEventListener('click', () => {
    scanForProducts();
});

// Send products to the Wreath Weaver app
async function sendProductsToApp(products) {
    // Find the app tab
    const tabs = await chrome.tabs.query({});
    const appTab = tabs.find(t => t.url && (
        t.url.includes('localhost:5005') ||
        t.url.includes('127.0.0.1:5005') ||
        t.url.includes('localhost:5001') ||
        t.url.includes('localhost:5002') ||
        t.url.includes('localhost:5173')
    ));

    if (!appTab) {
        throw new Error('Wreath Weaver app is not open. Please open the app first.');
    }

    // Inject script directly to send postMessage
    try {
        await chrome.scripting.executeScript({
            target: { tabId: appTab.id },
            func: (prods) => {
                window.postMessage({
                    type: 'WREATH_WEAVER_EXTENSION_IMPORT',
                    products: prods
                }, '*');
                console.log('🌿 Sent products to Wreath Weaver:', prods.length);
            },
            args: [products]
        });
    } catch (e) {
        console.error('Script injection failed:', e);
        throw new Error('Could not send to app. Try refreshing the Wreath Weaver page.');
    }

    // Also store in extension storage as backup
    await chrome.storage.local.set({
        pendingImport: {
            timestamp: Date.now(),
            products: products
        }
    });
}

// UI Helpers
function showLoading(show) {
    loading.className = show ? 'loading active' : 'loading';
    actions.style.display = show ? 'none' : 'flex';
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;

    if (type === 'success') {
        setTimeout(() => {
            message.className = 'message';
        }, 3000);
    }
}
