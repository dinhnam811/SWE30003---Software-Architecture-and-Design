// API Base URL
const API_BASE = '';

// Session storage
let sessionId = localStorage.getItem('session_id');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (sessionId && currentUser) {
        showMainApp();
    } else {
        showLogin();
    }
    
    // Set up login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
});

// Show/Hide sections
function showLogin() {
    hideAll();
    document.getElementById('login-section').classList.remove('hidden');
}

function showMainApp() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('user-email').textContent = currentUser.email;
    
    if (currentUser.role === 'customer') {
        document.getElementById('nav-menu').classList.remove('hidden');
        showProducts();
    } else if (currentUser.role === 'admin') {
        document.getElementById('admin-nav').classList.remove('hidden');
        showAdminPanel();
    }
}

function hideAll() {
    const sections = ['login-section', 'products-section', 'cart-section', 
                    'checkout-section', 'orders-section', 'admin-section'];
    sections.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        // Send as form data (not JSON)
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            sessionId = data.session_id;
            currentUser = data.user;
            localStorage.setItem('session_id', sessionId);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showMessage('Login successful!', 'success');
            showMainApp();
        } else {
            showMessage('Invalid credentials', 'error');
        }
    } catch (error) {
        showMessage('Login failed: ' + error.message, 'error');
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/api/logout?session_id=${sessionId}`, {method: 'POST'});
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    sessionId = null;
    currentUser = null;
    localStorage.removeItem('session_id');
    localStorage.removeItem('user');
    location.reload();
}

// Products
async function showProducts() {
    hideAll();
    document.getElementById('products-section').classList.remove('hidden');
    await loadProducts();
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/api/products`);
        const products = await response.json();
        
        const grid = document.getElementById('products-grid');
        grid.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-image-container">
                    <img src="${product.image_url || '/static/images/placeholder.jpg'}" 
                        alt="${product.name}" 
                        class="product-image"
                        onerror="this.style.display='none'; this.parentElement.classList.add('no-image')">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="description">${product.description}</p>
                    <p class="price">$${product.price.toFixed(2)}</p>
                    <p class="stock">Stock: ${product.stock}</p>
                    <div class="product-actions">
                    ${product.available ? `
                        <input type="number" 
                            id="qty-${product.product_id}" 
                            value="1" 
                            min="1" 
                            max="${product.stock}">
                        <button onclick="addToCart(${product.product_id})" class="btn btn-primary">Add to Cart</button>
                    ` : '<p style="color: red; margin: 0; font-size: 0.9em;">Out of Stock</p>'}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showMessage('Failed to load products', 'error');
    }
}

// Cart
async function showCart() {
    hideAll();
    document.getElementById('cart-section').classList.remove('hidden');
    await loadCart();
}

async function loadCart() {
    try {
        const response = await fetch(`${API_BASE}/api/cart?session_id=${sessionId}`);
        const data = await response.json();
        
        updateCartCount(data.item_count);
        
        const cartItems = document.getElementById('cart-items');
        const checkoutBtn = document.getElementById('checkout-button');
        if (data.items.length === 0) {
            cartItems.innerHTML = '<p>Your cart is empty</p>';
            document.getElementById('cart-total').innerHTML = '';
            if (checkoutBtn) {
                checkoutBtn.title = 'Add items to proceed to checkout';
                checkoutBtn.onclick = () => showMessage('Add items to proceed to checkout', 'error');
            }
        } else {
            cartItems.innerHTML = data.items.map(item => `
                <div class="cart-item">
                    <div class="cart-item-image-container">
                        <img src="${item.image_url || '/static/images/placeholder.jpg'}" 
                                alt="${item.product_name}" 
                                class="cart-item-image"
                                onerror="this.style.display='none'; this.parentElement.classList.add('no-image')">
                    </div>
                    <div class="cart-item-info">
                        <h4>${item.product_name}</h4>
                        <p>Price: $${item.unit_price.toFixed(2)}</p>
                        <p>Subtotal: $${item.line_total.toFixed(2)}</p>
                        ${item.stock_ok ? '' : `<p style="color: #c0392b; font-weight: bold; margin-top: 6px;">${item.stock_message}</p>`}
                    </div>
                    <div class="cart-item-actions">
                        <input type="number" value="${item.quantity}" min="1" 
                            onchange="updateCartItem(${item.product_id}, this.value)">
                        <button onclick="removeFromCart(${item.product_id})" class="btn btn-danger">Remove</button>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('cart-total').innerHTML = `Total: $${data.total.toFixed(2)}`;
            // Disable checkout if any stock issues
            if (checkoutBtn) {
                const canCheckout = data.can_checkout !== undefined ? data.can_checkout : data.items.every(i => i.stock_ok !== false);
                checkoutBtn.title = canCheckout ? '' : 'Resolve stock issues in your cart before checkout';
                checkoutBtn.onclick = canCheckout 
                    ? () => showCheckout()
                    : () => showMessage('Some products are out of stock or exceeded stock limit', 'error');
            }
        }
    } catch (error) {
        showMessage('Failed to load cart', 'error');
    }
}

async function addToCart(productId) {
    const quantity = parseInt(document.getElementById(`qty-${productId}`).value);
    
    try {
        // Send as form data
        const formData = new FormData();
        formData.append('product_id', productId);
        formData.append('quantity', quantity);
        
        const response = await fetch(`${API_BASE}/api/cart/add?session_id=${sessionId}`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showMessage('Added to cart!', 'success');
            await loadCart();
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Failed to add to cart', 'error');
        }
    } catch (error) {
        showMessage('Failed to add to cart', 'error');
    }
}

async function updateCartItem(productId, quantity) {
    try {
        // Send as form data
        const formData = new FormData();
        formData.append('product_id', productId);
        formData.append('quantity', parseInt(quantity));
        
        const response = await fetch(`${API_BASE}/api/cart/update?session_id=${sessionId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (response.ok) {
            await loadCart();
        } else {
            showMessage('Failed to update cart', 'error');
        }
    } catch (error) {
        showMessage('Failed to update cart', 'error');
    }
}

async function removeFromCart(productId) {
    try {
        const response = await fetch(`${API_BASE}/api/cart/remove/${productId}?session_id=${sessionId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('Item removed', 'success');
            await loadCart();
        } else {
            showMessage('Failed to remove item', 'error');
        }
    } catch (error) {
        showMessage('Failed to remove item', 'error');
    }
}

function updateCartCount(count) {
    document.getElementById('cart-count').textContent = count;
}

// Checkout
async function showCheckout() {
    hideAll();
    document.getElementById('checkout-section').classList.remove('hidden');
    // Populate summary from current cart
    try {
        const response = await fetch(`${API_BASE}/api/cart?session_id=${sessionId}`);
        const data = await response.json();
        const summaryDiv = document.getElementById('checkout-summary');
        if (data.items && data.items.length > 0) {
            const itemsHtml = data.items.map(i => `<div style="display:flex; justify-content: space-between;">
                    <span>${i.product_name} x${i.quantity}</span>
                    <span>$${i.line_total.toFixed(2)}</span>
                </div>`).join('');
            summaryDiv.innerHTML = `
                <div style="border: 1px solid #eee; border-radius: 6px; padding: 12px; background: #fafafa;">
                    <div style="font-weight: 600; margin-bottom: 8px;">Order Summary</div>
                    ${itemsHtml}
                    <div style="border-top: 1px solid #e5e5e5; margin-top: 8px; padding-top: 8px; display:flex; justify-content: space-between;">
                        <span>Total</span>
                        <strong>$${data.total.toFixed(2)}</strong>
                    </div>
                </div>`;
        } else {
            summaryDiv.innerHTML = '<em>Your cart is empty.</em>';
        }
    } catch (e) {
        // Best-effort, ignore errors here
    }
    setupPaymentValidation();
}

async function handleCheckout(e) {
    e.preventDefault();
    const paymentMethod = document.getElementById('payment-method').value;
    // payment_details field might not exist; synthesize from card data to satisfy backend
    const paymentDetailsEl = document.getElementById('payment-details');
    const cardNumberInput = document.getElementById('card-number');
    const expiryInput = document.getElementById('expiry-date');
    const cvcInput = document.getElementById('cvc');
    let paymentDetails = paymentDetailsEl ? paymentDetailsEl.value : '';
    if (!paymentDetails) {
        const last4 = cardNumberInput && cardNumberInput.value ? cardNumberInput.value.slice(-4) : '';
        paymentDetails = last4 ? `Card ****${last4}` : 'Card';
    }
    const cardNumValid = cardNumberInput ? (/^\d{16}$/.test(cardNumberInput.value)) : true;
    const expiryValid = expiryInput ? (/^(0[1-9]|1[0-2])\/\d{4}$/.test(expiryInput.value)) : true;
    const cvcValid = cvcInput ? (/^\d{3}$/.test(cvcInput.value)) : true;
    // Show inline messages
    const cardErr = document.getElementById('card-number-error');
    const cvcErr = document.getElementById('cvc-error');
    if (cardErr) cardErr.style.display = cardNumValid ? 'none' : 'block';
    if (cvcErr) cvcErr.style.display = cvcValid ? 'none' : 'block';
    if (!cardNumValid || !expiryValid || !cvcValid) {
        const reasons = [];
        if (!cardNumValid) reasons.push('Invalid card number (16 digits)');
        if (!expiryValid) reasons.push('Invalid expiry date (MM/YYYY)');
        if (!cvcValid) reasons.push('Invalid CVC/CVV2 (3 digits)');
        showMessage(`Some payment fields are invalid: ${reasons.join(', ')}`, 'error');
        return; // block submission until fixed
    }
    
    try {
        // Send as form data
        const formData = new FormData();
        formData.append('payment_method', paymentMethod);
        formData.append('payment_details', paymentDetails);
        
        const response = await fetch(`${API_BASE}/api/checkout?session_id=${sessionId}`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Display receipt if available
            if (data.payment && data.payment.receipt) {
                displayReceipt(data.payment.receipt, data.order);
            } else {
                showMessage('Order placed successfully!', 'success');
                document.getElementById('checkout-form').reset();
                setTimeout(() => showOrders(), 1500);
            }
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Checkout failed', 'error');
        }
    } catch (error) {
        showMessage('Checkout failed', 'error');
    }
}

function displayReceipt(receipt, order) {
    const receiptContent = document.getElementById('receipt-content');
    const modal = document.getElementById('receipt-modal');
    
    if (!modal) {
        // Fallback if modal doesn't exist
        const receiptHtml = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); 
                        display: flex; align-items: center; justify-content: center; z-index: 2000;" 
                 onclick="this.remove(); showOrders();">
                <div style="background: white; padding: 40px; border-radius: 10px; max-width: 500px; 
                            box-shadow: 0 10px 40px rgba(0,0,0,0.3);" 
                     onclick="event.stopPropagation();">
                    <div style="text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 20px; margin-bottom: 20px;">
                        <h2 style="color: #28a745; margin: 0;"> Payment Successful!</h2>
                    </div>
                    
                    <div style="font-family: 'Courier New', monospace; background: #f9f9f9; padding: 20px; border-radius: 5px;">
                        <div style="text-align: center; margin-bottom: 15px;">
                            <strong style="font-size: 18px;">PAYMENT RECEIPT</strong>
                        </div>
                        <div style="border-bottom: 1px solid #ddd; margin-bottom: 10px;"></div>
                        
                        <p style="margin: 5px 0;"><strong>Receipt No:</strong> ${receipt.receipt_number}</p>
                        <p style="margin: 5px 0;"><strong>Order ID:</strong> #${receipt.order_id}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${receipt.payment_date}</p>
                        
                        <div style="border-bottom: 1px solid #ddd; margin: 10px 0;"></div>
                        
                        <p style="margin: 5px 0;"><strong>Customer:</strong> ${receipt.customer_name}</p>
                        <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${receipt.payment_method}</p>
                        
                        <div style="border-bottom: 1px solid #ddd; margin: 10px 0;"></div>
                        
                        <p style="margin: 10px 0; font-size: 20px; text-align: center;">
                            <strong>Amount Paid: $${receipt.amount_paid.toFixed(2)}</strong>
                        </p>
                        
                        <div style="border-bottom: 1px solid #ddd; margin: 10px 0;"></div>
                        
                        <p style="margin: 5px 0; text-align: center; color: #28a745;">
                            <strong>Status: ${receipt.status}</strong>
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="this.parentElement.parentElement.parentElement.remove(); showOrders();" 
                                class="btn btn-primary" style="margin-right: 10px;">View Orders</button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove(); showProducts();" 
                                class="btn btn-secondary">Continue Shopping</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', receiptHtml);
        return;
    }
    
    // Use modal if it exists
    receiptContent.innerHTML = `
        <div class="receipt">
            <h2> PAYMENT RECEIPT</h2>
            <div class="receipt-row">
                <span>Receipt Number:</span>
                <strong>${receipt.receipt_number}</strong>
            </div>
            <div class="receipt-row">
                <span>Order ID:</span>
                <strong>#${receipt.order_id}</strong>
            </div>
            <div class="receipt-row">
                <span>Payment Date:</span>
                <span>${receipt.payment_date}</span>
            </div>
            <div class="receipt-row">
                <span>Customer:</span>
                <span>${receipt.customer_name}</span>
            </div>
            <div class="receipt-row">
                <span>Payment Method:</span>
                <span>${receipt.payment_method}</span>
            </div>
            <div class="receipt-row" style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #333;">
                <strong>Items Purchased:</strong>
            </div>
            ${receipt.items && receipt.items.length > 0 ? receipt.items.map(item => `
                <div class="receipt-row" style="padding-left: 20px;">
                    <span>${item.product_name} x${item.quantity} @ $${item.unit_price.toFixed(2)}</span>
                    <span>$${item.line_total.toFixed(2)}</span>
                </div>
            `).join('') : '<p style="padding-left: 20px;">No items</p>'}
            <div class="receipt-total">
                <div class="receipt-row">
                    <span>Amount Paid:</span>
                    <strong>$${receipt.amount_paid.toFixed(2)}</strong>
                </div>
            </div>
            <div class="receipt-row">
                <span>Status:</span>
                <strong style="color: #28a745;">${receipt.status}</strong>
            </div>
            <div class="receipt-footer">
                Thank you for your purchase! 
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <button onclick="closeReceiptModal(); showOrders();" class="btn btn-primary">View My Orders</button>
            <button onclick="closeReceiptModal(); showProducts();" class="btn btn-secondary">Continue Shopping</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
    modal.classList.add('show');
}

function displayInvoice(invoice) {
    const receiptContent = document.getElementById('receipt-content');
    const modal = document.getElementById('receipt-modal');
    
    // Use modal to display invoice (reusing receipt modal)
    receiptContent.innerHTML = `
        <div class="receipt">
            <h2> INVOICE</h2>
            <div class="receipt-row">
                <span>Invoice Number:</span>
                <strong>${invoice.invoice_number}</strong>
            </div>
            <div class="receipt-row">
                <span>Order ID:</span>
                <strong>#${invoice.order_id}</strong>
            </div>
            <div class="receipt-row">
                <span>Issue Date:</span>
                <span>${invoice.issue_date}</span>
            </div>
            <div class="receipt-row">
                <span>Due Date:</span>
                <span>${invoice.due_date}</span>
            </div>
            <div class="receipt-row">
                <span>Customer:</span>
                <span>${invoice.customer_name}</span>
            </div>
            <div class="receipt-row" style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #333;">
                <strong>Items:</strong>
            </div>
            ${invoice.items.map(item => `
                <div class="receipt-row" style="padding-left: 20px;">
                    <span>${item.product_name} x${item.quantity} @ $${item.unit_price.toFixed(2)}</span>
                    <span>$${item.line_total.toFixed(2)}</span>
                </div>
            `).join('')}
            <div class="receipt-total">
                <div class="receipt-row">
                    <span>Total Amount:</span>
                    <strong>$${invoice.total_amount.toFixed(2)}</strong>
                </div>
            </div>
            <div class="receipt-row">
                <span>Status:</span>
                <strong style="color: ${invoice.status === 'Paid' ? '#28a745' : '#ff9800'};">${invoice.status}</strong>
            </div>
            <div class="receipt-footer">
                Admin Invoice View
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <button onclick="closeReceiptModal();" class="btn btn-primary">Close</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
    modal.classList.add('show');
}

// Orders
async function showOrders() {
    hideAll();
    document.getElementById('orders-section').classList.remove('hidden');
    await loadOrders();
}

async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE}/api/orders?session_id=${sessionId}`);
        const orders = await response.json();
        
        const ordersList = document.getElementById('orders-list');
        if (orders.length === 0) {
            ordersList.innerHTML = '<p>No orders yet</p>';
        } else {
            ordersList.innerHTML = orders.map(order => `
                <div class="order-card">
                    <h3>Order #${order.order_id}</h3>
                    <div class="order-info">
                        <div class="order-info-item">
                            <label>Date:</label>
                            <span>${order.order_date}</span>
                        </div>
                        <div class="order-info-item">
                            <label>Status:</label>
                            <span>${order.status}</span>
                        </div>
                        <div class="order-info-item">
                            <label>Total:</label>
                            <span>$${order.total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="order-items">
                        <h4>Items:</h4>
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span>${item.product_name} x${item.quantity}</span>
                                <span>$${item.line_total.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 15px;">
                        <button onclick="viewReceipt(${order.order_id})" class="btn btn-primary">View Receipt</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        showMessage('Failed to load orders', 'error');
    }
}

async function viewReceipt(orderId) {
    try {
        const response = await fetch(`${API_BASE}/api/orders/${orderId}/receipt?session_id=${sessionId}`);
        
        if (response.ok) {
            const receipt = await response.json();
            displayReceipt(receipt);
        } else {
            showMessage('Receipt not available', 'error');
        }
    } catch (error) {
        showMessage('Failed to load receipt', 'error');
    }
}

async function viewInvoice(orderId) {
    try {
        const response = await fetch(`${API_BASE}/api/orders/${orderId}/invoice?session_id=${sessionId}`);
        
        if (response.ok) {
            const invoice = await response.json();
            displayInvoice(invoice);
        } else {
            showMessage('Invoice not available', 'error');
        }
    } catch (error) {
        showMessage('Failed to load invoice', 'error');
    }
}

function closeReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

// Admin Panel
async function showAdminPanel() {
    hideAll();
    document.getElementById('admin-section').classList.remove('hidden');
    showAdminProducts();
}

// Payment input helpers
function setupPaymentValidation() {
    const cardInput = document.getElementById('card-number');
    const expiryInput = document.getElementById('expiry-date');
    const cvcInput = document.getElementById('cvc');
    const cardErr = document.getElementById('card-number-error');
    const cvcErr = document.getElementById('cvc-error');

    if (cardInput) {
        cardInput.addEventListener('input', () => {
            // Keep digits only and limit to 16
            cardInput.value = cardInput.value.replace(/\D/g, '').slice(0, 16);
            const ok = /^\d{16}$/.test(cardInput.value);
            if (cardErr) cardErr.style.display = cardInput.value.length === 0 || ok ? 'none' : 'block';
        });
        cardInput.addEventListener('blur', () => {
            const ok = /^\d{16}$/.test(cardInput.value);
            if (cardErr) cardErr.style.display = ok ? 'none' : 'block';
        });
    }

    if (expiryInput) {
        expiryInput.addEventListener('input', () => {
            // Allow only digits and slash, auto-insert slash after MM
            let v = expiryInput.value.replace(/[^\d]/g, '');
            if (v.length > 6) v = v.slice(0, 6);
            if (v.length >= 3) {
                v = v.slice(0, 2) + '/' + v.slice(2);
            }
            expiryInput.value = v;
        });
    }

    if (cvcInput) {
        cvcInput.addEventListener('input', () => {
            cvcInput.value = cvcInput.value.replace(/\D/g, '').slice(0, 3);
            const ok = /^\d{3}$/.test(cvcInput.value);
            if (cvcErr) cvcErr.style.display = cvcInput.value.length === 0 || ok ? 'none' : 'block';
        });
        cvcInput.addEventListener('blur', () => {
            const ok = /^\d{3}$/.test(cvcInput.value);
            if (cvcErr) cvcErr.style.display = ok ? 'none' : 'block';
        });
    }
}

async function showAdminProducts() {
    try {
        const response = await fetch(`${API_BASE}/api/products`);
        const products = await response.json();
        
        const content = document.getElementById('admin-content');
        content.innerHTML = `
            <h3>Manage Products</h3>
            ${products.map(product => `
                <div class="admin-product-form">
                    <h4>${product.name} (ID: ${product.product_id})</h4>
                    <form onsubmit="updateProduct(event, ${product.product_id})">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <input type="text" value="${product.name}" name="name" placeholder="Name">
                            <input type="number" value="${product.price}" name="price" step="0.01" placeholder="Price">
                            <input type="number" value="${product.stock}" name="stock" placeholder="Stock">
                            <button type="submit" class="btn btn-primary">Update</button>
                        </div>
                        <textarea name="description" placeholder="Description" style="width: 100%; margin-top: 10px; padding: 10px;">${product.description}</textarea>
                    </form>
                </div>
            `).join('')}
        `;
    } catch (error) {
        showMessage('Failed to load products', 'error');
    }
}

async function updateProduct(e, productId) {
    e.preventDefault();
    const form = e.target;
    
    // Send as form data
    const formData = new FormData();
    formData.append('name', form.name.value);
    formData.append('price', parseFloat(form.price.value));
    formData.append('stock', parseInt(form.stock.value));
    formData.append('description', form.description.value);
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/products/${productId}?session_id=${sessionId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (response.ok) {
            showMessage('Product updated!', 'success');
        } else {
            showMessage('Failed to update product', 'error');
        }
    } catch (error) {
        showMessage('Failed to update product', 'error');
    }
}

async function showAdminOrders() {
    try {
        const response = await fetch(`${API_BASE}/api/orders?session_id=${sessionId}`);
        const orders = await response.json();
        
        const content = document.getElementById('admin-content');
        content.innerHTML = `
            <h3>All Orders</h3>
            ${orders.length === 0 ? '<p>No orders yet</p>' : orders.map(order => `
                <div class="order-card">
                    <h4>Order #${order.order_id} - Customer ID: ${order.customer_id}</h4>
                    <div class="order-info">
                        <div class="order-info-item">
                            <label>Date:</label>
                            <span>${order.order_date}</span>
                        </div>
                        <div class="order-info-item">
                            <label>Status:</label>
                            <select onchange="updateOrderStatus(${order.order_id}, this.value)">
                                <option value="Placed" ${order.status === 'Placed' ? 'selected' : ''}>Placed</option>
                                <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                                <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        <div class="order-info-item">
                            <label>Total:</label>
                            <span>$${order.total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span>${item.product_name} x${item.quantity}</span>
                                <span>$${item.line_total.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <button onclick="viewInvoice(${order.order_id})" class="btn btn-primary">View Invoice</button>
                </div>
            `).join('')}
        `;
    } catch (error) {
        showMessage('Failed to load orders', 'error');
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/orders/${orderId}/status?session_id=${sessionId}&status=${status}`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            showMessage('Order status updated!', 'success');
        } else {
            showMessage('Failed to update order status', 'error');
        }
    } catch (error) {
        showMessage('Failed to update order status', 'error');
    }
}

// Utility
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 3000);
}