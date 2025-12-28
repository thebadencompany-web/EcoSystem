// content.js - Content Script for Wreath Weaver Importer
// This script runs on all pages and listens for messages from the extension

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SCAN_PRODUCTS') {
        scanPage().then(products => {
            sendResponse({ products });
        });
        return true;
    }

    if (request.type === 'GET_CURRENT_PRODUCT') {
        getCurrentProduct().then(product => {
            sendResponse({ product });
        });
        return true;
    }
});

// If this is the Wreath Weaver app, listen for import messages
if (window.location.href.includes('localhost:5005') ||
    window.location.href.includes('127.0.0.1:5005') ||
    window.location.href.includes('localhost:5001') ||
    window.location.href.includes('localhost:5002') ||
    window.location.href.includes('localhost:5173')) {
    // Inject message listener for imports
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'WREATH_WEAVER_IMPORT') {
            // Post message to the app window
            window.postMessage({
                type: 'WREATH_WEAVER_EXTENSION_IMPORT',
                products: request.products
            }, '*');
            sendResponse({ success: true });
            return true;
        }
    });

    console.log('🌿 Wreath Weaver Importer: Connected to app');
}

// Image to Base64 converter (via background script to bypass CORS)
async function convertImageUrlToBase64(url) {
    if (!url) return null;
    if (url.startsWith('data:')) return url;

    return new Promise((resolve) => {
        let responded = false;

        // Timeout safeguard
        const timeoutId = setTimeout(() => {
            if (!responded) {
                responded = true;
                console.warn('Image conversion timed out for:', url);
                resolve(url); // Fallback to original URL
            }
        }, 3000); // 3 seconds timeout

        chrome.runtime.sendMessage({
            type: 'FETCH_IMAGE_BASE64',
            url: url
        }, (response) => {
            if (responded) return;
            responded = true;
            clearTimeout(timeoutId);

            // Check for runtime errors
            if (chrome.runtime.lastError) {
                console.warn('Extension messaging error:', chrome.runtime.lastError);
                resolve(url);
                return;
            }

            if (response && response.base64) {
                resolve(response.base64);
            } else {
                console.warn('Background fetch failed for url:', url);
                resolve(url); // Fallback to original URL
            }
        });
    });
}

// Scan the entire page for products
async function scanPage() {
    const products = [];

    // Common product card selectors (ordered by specificity)
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
                const product = extractProductFromElement(el);
                if (product && product.name) {
                    products.push(product);
                }
            });
            if (products.length > 0) break;
        }
    }

    // Fallback: look for JSON-LD structured data
    if (products.length === 0) {
        products.push(...extractFromJsonLd());
    }

    // Fallback: Melrose-specific parsing
    if (products.length === 0 && window.location.hostname.includes('melrose')) {
        products.push(...extractMelroseProducts());
    }

    // Fallback: Faire-specific parsing
    if (products.length === 0 && window.location.hostname.includes('faire.com')) {
        products.push(...extractFaireProducts());
    }

    // Fallback: Winward Silks parsing
    if (products.length === 0 && window.location.hostname.includes('winwardsilks')) {
        products.push(...extractWinwardProducts());
    }

    // Deduplicate by name
    const uniqueProducts = deduplicateProducts(products);

    // Convert images to base64
    console.log(`🌿 Processing ${uniqueProducts.length} images...`);
    for (const p of uniqueProducts) {
        if (p.imageUrl) {
            p.imageUrl = await convertImageUrlToBase64(p.imageUrl);
        }
    }

    return uniqueProducts;
}

// ... (existing functions) ...

// Winward Silks specific extractor
function extractWinwardProducts() {
    const products = [];

    // Winward often uses grid layouts
    const cardSelectors = [
        '.product-item',
        '.product-item-info',
        'li.product',
        '.item',
        'tr' // Sometimes wholesale sites use tables
    ];

    let cards = [];
    for (const sel of cardSelectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) {
            cards = found;
            break;
        }
    }

    cards.forEach(el => {
        // basic filtering
        if (el.innerText.length < 5) return;

        const product = { source: 'winwardsilks.com' };

        // Name
        const nameEl = el.querySelector('.product-item-link, .product-name, h2, a[class*="name"]');
        product.name = nameEl?.innerText?.trim();

        // Full text scan for fallbacks
        const text = el.innerText;

        // SKU - Aggressive Regex for "30384.GYGR" format
        // Pattern: Start of word, 4-6 digits, dot, alphanumeric
        const skuMatch = text.match(/\b([0-9]{4,6}\.[A-Z0-9]+)\b/);
        if (skuMatch) {
            product.sku = skuMatch[1];
        } else {
            // Fallback: look for "Item #XXXX"
            const itemMatch = text.match(/Item\s*#?\s*([A-Z0-9.-]+)/i);
            if (itemMatch) product.sku = itemMatch[1];
        }

        // Price - Aggressive Regex
        const priceEl = el.querySelector('[data-price-amount], .price, .special-price .price');
        if (priceEl) {
            product.price = parseFloat(priceEl.innerText.replace(/[^0-9.]/g, ''));
        } else {
            // Look for "$8.40" pattern in text
            const priceMatch = text.match(/\$\s*(\d+\.\d{2})/);
            if (priceMatch) {
                product.price = parseFloat(priceMatch[1]);
            }
        }

        // Image
        const img = el.querySelector('.product-image-photo, img');
        product.imageUrl = img?.src || img?.dataset?.src;

        // For table rows, name might be missing if we didn't find the link
        if (!product.name) {
            // use the first non-price non-sku line? Risky.
            // Let's rely on specific selectors for name still.
        }

        if (product.name && product.imageUrl) products.push(product);
    });

    // Detail Page fallback
    if (products.length === 0) {
        const detail = extractWinwardDetail();
        if (detail) products.push(detail);
    }

    return products;
}

function extractWinwardDetail() {
    const product = { source: 'winwardsilks.com', productUrl: window.location.href };
    const bodyText = document.body.innerText;

    // Name - usually page-title-wrapper > h1
    const h1 = document.querySelector('.page-title span.base, h1.page-title, h1');
    product.name = h1?.innerText?.trim();

    // SKU - Brute Force
    const skuMatch = bodyText.match(/\b([0-9]{4,6}\.[A-Z0-9]+)\b/);
    if (skuMatch) {
        product.sku = skuMatch[1];
    } else {
        const itemMatch = bodyText.match(/Item\s*#?\s*([A-Z0-9.-]+)/i);
        if (itemMatch) product.sku = itemMatch[1];
    }

    // Price - Brute Force
    // prefer specific price blocks
    const priceEl = document.querySelector('.price-final_price .price, .product-info-price .price');
    if (priceEl) {
        product.price = parseFloat(priceEl.innerText.replace(/[^0-9.]/g, ''));
    } else {
        // Find largest price on screen? Or just the first one that says "Each" or "Price"
        const priceMatch = bodyText.match(/(?:Price|Each|Unit)\s*:?\s*\$\s*(\d+\.\d{2})/i);
        if (priceMatch) {
            product.price = parseFloat(priceMatch[1]);
        } else {
            // Just first dollar sign
            const simpleMatch = bodyText.match(/\$\s*(\d+\.\d{2})/);
            if (simpleMatch) product.price = parseFloat(simpleMatch[1]);
        }
    }

    // Image
    // Winward uses Fotorama or Zoom
    const img = document.querySelector('.gallery-placeholder__image, .fotorama__img, .base-image, img[src*="/product/"]');
    product.imageUrl = img?.src;

    // Description
    const desc = document.querySelector('.description .value, #description');
    product.description = desc?.innerText?.trim();

    return product.name ? product : null;
}

// Faire-specific extractor
function extractFaireProducts() {
    const products = [];

    // Strategy 1: Look for Product Cards on Listing Pages
    const cardSelectors = [
        '[data-product-id]',
        'div[class*="ProductCard_container"]',
        'div[class*="product-card"]',
        'li[class*="product-list-item"]',
        'a[href*="/product/"]'
    ];

    let cards = [];
    for (const sel of cardSelectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) {
            cards = found;
            break;
        }
    }

    cards.forEach(el => {
        // Must be a relevant container
        if (el.tagName === 'A' && !el.querySelector('img')) return;

        // Filter out nav links or random links
        if (el.tagName === 'A' && !el.href.includes('/product/')) return;

        const product = { source: 'faire.com' };

        // Name
        const nameEl = el.querySelector('h4, h3, span[class*="name"], div[class*="name"], p[class*="title"]');
        product.name = nameEl?.textContent?.trim();

        // Image - Faire uses specific CDNs
        const img = el.querySelector('img');
        product.imageUrl = img?.src || img?.srcset?.split(' ')?.[0] || img?.dataset?.src;
        if (product.imageUrl && product.imageUrl.startsWith('data:')) {
            // Try to find a real URL in attributes
            product.imageUrl = img.dataset.src || img.dataset.lazySrc || null;
        }

        // Price
        // Look for text like "$10.00"
        const priceEl = el.querySelector('span[class*="price"], div[class*="price"], p[class*="price"]');
        if (priceEl) {
            const priceText = priceEl.textContent;
            const matches = priceText.match(/\$?(\d{1,5}(?:\.\d{2})?)/);
            if (matches) product.price = parseFloat(matches[1]);
        }

        // URL & SKU
        const link = el.tagName === 'A' ? el : el.querySelector('a');
        if (link?.href) {
            const match = link.href.match(/product\/(p_[a-zA-Z0-9]+)/);
            if (match) {
                product.sku = match[1];
                product.productUrl = link.href;
            }
        }

        if (product.name && product.imageUrl && product.sku) {
            products.push(product);
        }
    });

    // Strategy 2: Check if we are on a Product Detail Page (Primary)
    if (products.length === 0 && window.location.href.includes('/product/')) {
        const detailProduct = extractFaireDetailPage();
        if (detailProduct) products.push(detailProduct);
    }

    return products;
}

function extractFaireDetailPage() {
    const product = { source: 'faire.com', productUrl: window.location.href };

    // Name
    const h1 = document.querySelector('h1');
    product.name = h1?.textContent?.trim();

    // SKU from URL
    const skuMatch = window.location.href.match(/product\/(p_[a-zA-Z0-9]+)/);
    if (skuMatch) product.sku = skuMatch[1];

    // Image: Faire detail pages usually have a hero image or grid
    const images = Array.from(document.querySelectorAll('img'));
    // Prioritize largest image or one from CDN
    const candidate = images.find(img =>
        (img.src.includes('cdn.faire.com') || img.src.includes('images.faire.com')) &&
        img.width > 300
    );
    product.imageUrl = candidate?.src || document.querySelector('meta[property="og:image"]')?.content;

    // Price: Logic to find "WSP" (Wholesale) specifically
    // Inspect specific aria-labels or text content
    const bodyText = document.body.innerText;
    // Regex to find "WSP $10.50" or just "$10.50"
    // We prioritize WSP if present
    const wspMatch = bodyText.match(/WSP\s*:?\s*\$?(\d+(?:\.\d{2})?)/i);
    if (wspMatch) {
        product.price = parseFloat(wspMatch[1]);
    } else {
        // Fallback to any price-like structure near the title key areas
        const priceEl = document.querySelector('[data-test-id*="price"], [class*="price"]');
        if (priceEl) {
            const m = priceEl.textContent.match(/\$?(\d+(?:\.\d{2})?)/);
            if (m) product.price = parseFloat(m[1]);
        }
    }

    // Description
    const descEl = document.querySelector('[data-test-id*="description"], div[class*="Description"]');
    product.description = descEl?.textContent?.trim()?.substring(0, 600);

    return product.name ? product : null;
}

console.log('🌿 Wreath Weaver Importer: Content script loaded');
// Extract product data from a single element
function extractProductFromElement(el) {
    const product = {
        source: window.location.hostname
    };

    // Name (try multiple selectors)
    const nameSelectors = ['h1', 'h2', 'h3', 'h4', '.product-name', '.product-title', '.item-name', '[class*="title"]', '[class*="name"]'];
    for (const sel of nameSelectors) {
        const nameEl = el.querySelector(sel);
        if (nameEl?.textContent?.trim()) {
            product.name = nameEl.textContent.trim();
            break;
        }
    }

    // Fallback to image alt
    if (!product.name) {
        const img = el.querySelector('img');
        if (img?.alt) product.name = img.alt;
    }

    // Image
    const imgEl = el.querySelector('img');
    product.imageUrl = imgEl?.src || imgEl?.dataset?.src || imgEl?.dataset?.lazySrc;

    // Additional images
    const allImgs = el.querySelectorAll('img');
    product.additionalImages = Array.from(allImgs)
        .map(img => img.src || img.dataset?.src)
        .filter(Boolean)
        .slice(0, 5);

    // Price
    const priceSelectors = ['.price', '.product-price', '[class*="price"]', '[data-price]'];
    for (const sel of priceSelectors) {
        const priceEl = el.querySelector(sel);
        if (priceEl) {
            const priceText = priceEl.textContent?.replace(/[^0-9.,]/g, '');
            const price = parseFloat(priceText);
            if (!isNaN(price)) {
                product.price = price;
                break;
            }
        }
    }

    // SKU / Product ID
    product.sku = el.dataset?.sku || el.dataset?.productId || el.dataset?.itemId || el.dataset?.id;

    // Description
    const descEl = el.querySelector('.description, .product-description, [class*="description"]');
    if (descEl) {
        product.description = descEl.textContent?.trim()?.substring(0, 500);
    }

    // Link
    const linkEl = el.querySelector('a[href]');
    if (linkEl) {
        product.productUrl = new URL(linkEl.href, window.location.origin).href;
    }

    return product;
}


// Extract from JSON-LD structured data
function extractFromJsonLd() {
    const products = [];
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    scripts.forEach(script => {
        try {
            const data = JSON.parse(script.textContent);

            // Single product
            if (data['@type'] === 'Product') {
                products.push(jsonLdToProduct(data));
            }

            // Array of products
            if (Array.isArray(data)) {
                data.filter(d => d['@type'] === 'Product').forEach(p => {
                    products.push(jsonLdToProduct(p));
                });
            }

            // Nested in @graph
            if (data['@graph']) {
                data['@graph'].filter(d => d['@type'] === 'Product').forEach(p => {
                    products.push(jsonLdToProduct(p));
                });
            }
        } catch { }
    });

    return products;
}

function jsonLdToProduct(data) {
    return {
        name: data.name,
        imageUrl: Array.isArray(data.image) ? data.image[0] : data.image,
        additionalImages: Array.isArray(data.image) ? data.image : [data.image].filter(Boolean),
        price: data.offers?.price || data.offers?.[0]?.price,
        sku: data.sku || data.productID,
        description: data.description,
        source: window.location.hostname
    };
}

// Melrose-specific extractor with enhanced SKU detection
function extractMelroseProducts() {
    const products = [];

    // Try multiple selectors for Melrose product cards
    const selectors = [
        '.product-item',
        '.catalog-product',
        '.product-card',
        '[data-product-id]',
        '.product'
    ];

    let items = [];
    for (const sel of selectors) {
        items = document.querySelectorAll(sel);
        if (items.length > 0) break;
    }

    items.forEach(el => {
        const product = {
            source: 'melroseintl.com'
        };

        // Name - try multiple selectors
        const nameSelectors = ['.product-name', '.product-title', 'h2', 'h3', '.title'];
        for (const sel of nameSelectors) {
            const nameEl = el.querySelector(sel);
            if (nameEl?.textContent?.trim()) {
                product.name = nameEl.textContent.trim();
                break;
            }
        }

        // Image
        const img = el.querySelector('img');
        product.imageUrl = img?.src || img?.dataset?.src;

        // SKU - try multiple extraction methods
        // 1. Data attributes
        let sku = el.dataset?.sku || el.dataset?.productId || el.dataset?.itemId;

        // 2. Text content with SKU label
        if (!sku) {
            const skuEl = el.querySelector('[class*="sku"], [class*="item-number"], [class*="product-id"]');
            if (skuEl) {
                sku = skuEl.textContent?.trim()?.replace(/SKU:?\s*/i, '').replace(/Item:?\s*/i, '');
            }
        }

        // 3. Extract from product link URL (often contains SKU)
        if (!sku) {
            const link = el.querySelector('a[href*="product"], a[href*="item"]');
            if (link?.href) {
                // Try to extract SKU from URL patterns like /product/12345 or ?sku=12345
                const urlMatch = link.href.match(/(?:product|item|sku)[\/=]([A-Z0-9-]+)/i);
                if (urlMatch) sku = urlMatch[1];
            }
        }

        // 4. Look for alphanumeric pattern in the product name (Melrose SKUs often in format like "12345")
        if (!sku && product.name) {
            const skuMatch = product.name.match(/\b([0-9]{4,8})\b/);
            if (skuMatch) sku = skuMatch[1];
        }

        product.sku = sku;

        // Price
        const priceEl = el.querySelector('[class*="price"]');
        if (priceEl) {
            const priceText = priceEl.textContent?.replace(/[^0-9.,]/g, '');
            product.price = parseFloat(priceText) || null;
        }

        if (product.name) products.push(product);
    });

    // If still no products, try parsing the page as a product detail page
    if (products.length === 0) {
        const detailProduct = extractMelroseDetailPage();
        if (detailProduct) products.push(detailProduct);
    }

    return products;
}

// Extract from a Melrose product detail page
function extractMelroseDetailPage() {
    const product = {
        source: 'melroseintl.com'
    };

    // Name from h1
    product.name = document.querySelector('h1')?.textContent?.trim();

    // SKU - look for it in many places
    const skuPatterns = [
        // Text elements with "SKU" or "Item" labels
        () => {
            const el = document.querySelector('[class*="sku"], [class*="item-number"], .product-sku, .item-id');
            return el?.textContent?.replace(/SKU:?\s*/i, '').replace(/Item:?\s*/i, '').trim();
        },
        // In URL
        () => {
            const match = window.location.href.match(/(?:product|item|sku)[\/=]([A-Z0-9-]+)/i);
            return match?.[1];
        },
        // In page content with specific pattern
        () => {
            const bodyText = document.body.innerText;
            const match = bodyText.match(/(?:SKU|Item\s*#|Item Number|Product ID)[:.\s]*([A-Z0-9-]{4,15})/i);
            return match?.[1]?.trim();
        }
    ];

    for (const pattern of skuPatterns) {
        const sku = pattern();
        if (sku) {
            product.sku = sku;
            break;
        }
    }

    // Image
    product.imageUrl = document.querySelector('meta[property="og:image"]')?.content
        || document.querySelector('.product-image img, .main-image img')?.src;

    // Price
    const priceEl = document.querySelector('[class*="price"]');
    if (priceEl) {
        product.price = parseFloat(priceEl.textContent?.replace(/[^0-9.,]/g, '')) || null;
    }

    return product.name ? product : null;
}

// Get the main product on a product detail page
async function getCurrentProduct() {
    const product = {
        source: window.location.hostname,
        productUrl: window.location.href
    };

    // Name from h1 or meta
    product.name = document.querySelector('h1')?.textContent?.trim()
        || document.querySelector('meta[property="og:title"]')?.content;

    // Image from meta or main product image
    const imageUrl = document.querySelector('meta[property="og:image"]')?.content
        || document.querySelector('.product-image img, .main-image img, [class*="gallery"] img')?.src;

    if (imageUrl) {
        product.imageUrl = await convertImageUrlToBase64(imageUrl);
    }

    // Price
    const priceEl = document.querySelector('[class*="price"]:not([class*="compare"]), [data-price]');
    if (priceEl) {
        const priceText = priceEl.textContent?.replace(/[^0-9.,]/g, '');
        product.price = parseFloat(priceText) || null;
    }

    // SKU
    product.sku = document.querySelector('[class*="sku"], [data-sku]')?.textContent?.trim()?.replace(/SKU:?\s*/i, '');

    // Description
    product.description = document.querySelector('meta[property="og:description"]')?.content
        || document.querySelector('.description, .product-description')?.textContent?.trim()?.substring(0, 500);

    // All images
    const galleryImgs = document.querySelectorAll('.product-gallery img, .product-images img, [class*="gallery"] img');
    product.additionalImages = Array.from(galleryImgs).map(img => img.src).filter(Boolean).slice(0, 10);

    return product.name ? product : null;
}

// Deduplicate products by name
function deduplicateProducts(products) {
    const unique = [];
    const seen = new Set();

    products.forEach(p => {
        if (p.name && !seen.has(p.name)) {
            seen.add(p.name);
            unique.push(p);
        }
    });

    return unique;
}

console.log('🌿 Wreath Weaver Importer: Content script loaded');
