// background.js - Service Worker for Wreath Weaver Importer

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('🌿 Wreath Weaver Importer installed');
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'IMPORT_PRODUCTS') {
        handleProductImport(request.products)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Keep channel open for async response
    }

    if (request.type === 'CHECK_APP_STATUS') {
        checkAppStatus()
            .then(status => sendResponse(status))
            .catch(() => sendResponse({ connected: false }));
        return true;
    }

    if (request.type === 'FETCH_IMAGE_BASE64') {
        fetchImageBase64(request.url)
            .then(base64 => sendResponse({ base64 }))
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
});

// Fetch image and convert to base64 (bypasses CORS due to host_permissions)
async function fetchImageBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Background fetch failed:', e);
        throw e;
    }
}

// Check if Wreath Weaver app is open
async function checkAppStatus() {
    try {
        const tabs = await chrome.tabs.query({});
        const appTab = tabs.find(t => t.url && (
            t.url.includes('localhost:5005') ||
            t.url.includes('127.0.0.1:5005') ||
            t.url.includes('localhost:5001') ||
            t.url.includes('localhost:5002') ||
            t.url.includes('localhost:5173') ||
            t.url.includes('wreath-weaver')
        ));

        return {
            connected: !!appTab,
            tabId: appTab?.id
        };
    } catch {
        return { connected: false };
    }
}

// Handle product import
async function handleProductImport(products) {
    if (!products || products.length === 0) {
        return { success: false, error: 'No products to import' };
    }

    // Store products for the app to retrieve
    await chrome.storage.local.set({
        pendingImport: {
            timestamp: Date.now(),
            products: products
        }
    });

    // Try to send directly to app if open
    const status = await checkAppStatus();
    if (status.connected && status.tabId) {
        try {
            await chrome.tabs.sendMessage(status.tabId, {
                type: 'WREATH_WEAVER_IMPORT',
                products: products
            });
            return { success: true, count: products.length };
        } catch (e) {
            // App might not have content script loaded, that's ok
            console.log('Direct send failed, products stored for polling');
        }
    }

    return { success: true, count: products.length, pending: true };
}

// Context menu for right-click import
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'import-image',
        title: 'Import to Wreath Weaver',
        contexts: ['image']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'import-image') {
        // Quick import of just an image
        const product = {
            name: 'Imported Image',
            imageUrl: info.srcUrl,
            source: new URL(tab.url).hostname,
            productUrl: tab.url
        };

        handleProductImport([product]);

        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Wreath Weaver',
            message: 'Image sent to inventory!'
        });
    }
});
