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
                <h3>${product.name}</h3>
                <p class="description">${product.description}</p>
                <p class="price">$${product.price.toFixed(2)}</p>
                <p class="stock">Stock: ${product.stock}</p>
                ${product.available ? `
                    <input type="number" id="qty-${product.product_id}" value="1" min="1" max="${product.stock}">
                    <button onclick="addToCart(${product.product_id})" class="btn btn-primary">Add to Cart</button>
                ` : '<p style="color: red;">Out of Stock</p>'}
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
        if (data.items.length === 0) {
            cartItems.innerHTML = '<p>Your cart is empty</p>';
            document.getElementById('cart-total').innerHTML = '';
        } else {
            cartItems.innerHTML = data.items.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.product_name}</h4>
                        <p>Price: $${item.unit_price.toFixed(2)}</p>
                        <p>Subtotal: $${item.line_total.toFixed(2)}</p>
                    </div>
                    <div class="cart-item-actions">
                        <input type="number" value="${item.quantity}" min="1" 
                               onchange="updateCartItem(${item.product_id}, this.value)">
                        <button onclick="removeFromCart(${item.product_id})" class="btn btn-danger">Remove</button>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('cart-total').innerHTML = `Total: $${data.total.toFixed(2)}`;
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
function showCheckout() {
    hideAll();
    document.getElementById('checkout-section').classList.remove('hidden');
}

async function handleCheckout(e) {
    e.preventDefault();
    const paymentMethod = document.getElementById('payment-method').value;
    const paymentDetails = document.getElementById('payment-details').value;
    
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
            showMessage('Order placed successfully!', 'success');
            document.getElementById('checkout-form').reset();
            setTimeout(() => showOrders(), 1500);
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Checkout failed', 'error');
        }
    } catch (error) {
        showMessage('Checkout failed', 'error');
    }
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
                </div>
            `).join('');
        }
    } catch (error) {
        showMessage('Failed to load orders', 'error');
    }
}

// Admin Panel
async function showAdminPanel() {
    hideAll();
    document.getElementById('admin-section').classList.remove('hidden');
    showAdminProducts();
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