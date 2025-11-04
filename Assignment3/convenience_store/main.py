"""
Main Application Entry Point
Simple convenience store system for Assignment 3
"""

from fastapi import FastAPI, HTTPException, Form
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
import os

# Import our classes
from product import Product
from user import User, Customer, Admin
from shopping_cart import ShoppingCart
from order import Order
from order_item import OrderItem
from payment import Payment, DigitalWallet, BankDebit, PayPal
from invoice import Invoice
from receipt import Receipt
from database import Database

# Create FastAPI app
app = FastAPI(title="Convenience Store", version="1.0.0")

# Initialize database
db = Database()

# Session storage (simplified - in-memory)
sessions = {}  # session_id -> user_id
carts = {}     # user_id -> ShoppingCart

# Create static directory if it doesn't exist
os.makedirs("static", exist_ok=True)

# Mount static files
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except:
    pass  # Directory might not exist yet


# Root endpoint - serve HTML
@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main HTML page"""
    html_path = "static/index.html"
    if os.path.exists(html_path):
        return FileResponse(html_path)
    return """
    <html>
        <head><title>Convenience Store</title></head>
        <body>
            <h1>Convenience Store API</h1>
            <p>API is running! Visit <a href="/docs">/docs</a> for API documentation.</p>
            <p>Frontend not found. Make sure static/index.html exists.</p>
        </body>
    </html>
    """


#  AUTHENTICATION ENDPOINTS 

@app.post("/api/login")
async def login(email: str = Form(...), password: str = Form(...)):
    """User login endpoint"""
    user = db.get_user_by_email(email)
    if not user or not user.authenticate(password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_id = f"session_{user.user_id}"
    sessions[session_id] = user.user_id
    
    # Initialize cart for customer
    if user.role == "customer":
        if user.user_id not in carts:
            carts[user.user_id] = ShoppingCart(user.user_id)
    
    return {
        "message": "Login successful",
        "session_id": session_id,
        "user": user.get_info()
    }


@app.post("/api/logout")
async def logout(session_id: str):
    """User logout"""
    if session_id in sessions:
        del sessions[session_id]
    return {"message": "Logout successful"}


# PRODUCT ENDPOINTS 

@app.get("/api/products")
async def get_products():
    """Get all active products"""
    products = db.get_all_products()
    return [p.get_details() for p in products if p.active]


@app.get("/api/products/{product_id}")
async def get_product(product_id: int):
    """Get specific product"""
    product = db.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product.get_details()


# CART ENDPOINTS 

@app.get("/api/cart")
async def get_cart(session_id: str):
    """Get shopping cart"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cart = carts.get(user_id)
    if not cart:
        cart = ShoppingCart(user_id)
        carts[user_id] = cart
    
    return {
        "items": cart.get_items(),
        "total": cart.get_total(),
        "item_count": cart.get_item_count(),
        # can_checkout is true only if every item has stock_ok
        "can_checkout": all((item.get("stock_ok", True) for item in cart.get_items()))
    }


@app.post("/api/cart/add")
async def add_to_cart(session_id: str, product_id: int = Form(...), quantity: int = Form(1)):
    """Add item to cart"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    product = db.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cart = carts.get(user_id)
    if not cart:
        cart = ShoppingCart(user_id)
        carts[user_id] = cart
    
    if cart.add_item(product, quantity):
        return {"message": "Item added to cart", "cart": cart.get_items()}
    else:
        raise HTTPException(status_code=400, detail="Cannot add item (out of stock or invalid quantity)")


@app.put("/api/cart/update")
async def update_cart(session_id: str, product_id: int = Form(...), quantity: int = Form(...)):
    """Update cart item quantity"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cart = carts.get(user_id)
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    if cart.update_item_quantity(product_id, quantity):
        return {"message": "Cart updated", "cart": cart.get_items()}
    else:
        raise HTTPException(status_code=400, detail="Cannot update item")


@app.delete("/api/cart/remove/{product_id}")
async def remove_from_cart(session_id: str, product_id: int):
    """Remove item from cart"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cart = carts.get(user_id)
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    if cart.remove_item(product_id):
        return {"message": "Item removed", "cart": cart.get_items()}
    else:
        raise HTTPException(status_code=404, detail="Item not found in cart")


# ORDER ENDPOINTS

@app.post("/api/checkout")
async def checkout(
    session_id: str, 
    payment_method: str = Form(...), 
    payment_details: str = Form(...)
):
    """Process checkout"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cart = carts.get(user_id)
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Create order from cart
    # Validate stock before creating order
    for item in cart.items:
        if item.product.stock <= 0:
            raise HTTPException(status_code=400, detail=f"{item.product.name} is out of stock")
        if item.quantity > item.product.stock:
            raise HTTPException(status_code=400, detail=f"{item.product.name} has exceeded limited stock (Instock: {item.product.stock})")

    order_items = [OrderItem(item.product, item.quantity) for item in cart.items]
    order = Order(user_id, order_items)
    
    # Reduce stock
    for item in order.items:
        item.product.update_stock(-item.quantity)
        db.update_product(item.product)
    
    # Save order
    db.add_order(order)
    
    # Get customer info for invoice and receipt
    user = db.get_user(user_id)
    customer_name = user.name if hasattr(user, 'name') else user.email
    
    # Create invoice for the order (before payment)
    invoice = Invoice(
        order_id=order.order_id,
        customer_name=customer_name,
        items=[item.get_details() for item in order.items],
        total_amount=order.total
    )
    db.add_invoice(invoice)
    
    # Create payment
    if payment_method == "wallet":
        pay_method = DigitalWallet(payment_details)
    elif payment_method == "bank":
        pay_method = BankDebit(payment_details)
    elif payment_method == "paypal":
        pay_method = PayPal(payment_details)
    else:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    
    payment = Payment(order.order_id, order.total, pay_method)
    
    if payment.process():
        # Mark invoice as paid
        invoice.mark_as_paid()
        
        # Generate receipt after successful payment with items list
        receipt = payment.generate_receipt(customer_name, items=[item.get_details() for item in order.items])
        
        db.add_payment(payment)
        cart.clear()  # Clear cart after successful checkout
        return {
            "message": "Order placed successfully",
            "order": order.get_details(),
            "payment": payment.get_details()
        }
    else:
        raise HTTPException(status_code=400, detail="Payment failed")


@app.get("/api/orders")
async def get_orders(session_id: str):
    """Get user's orders"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = db.get_user(user_id)
    
    if user.role == "customer":
        orders = db.get_orders_by_customer(user_id)
    elif user.role == "admin":
        orders = db.get_all_orders()
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return [order.get_details() for order in orders]


@app.get("/api/orders/{order_id}")
async def get_order(session_id: str, order_id: int):
    """Get order details"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    order = db.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    user = db.get_user(user_id)
    # Check authorization
    if user.role == "customer" and order.customer_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return order.get_details()


@app.get("/api/orders/{order_id}/receipt")
async def get_order_receipt(session_id: str, order_id: int):
    """Get receipt for an order"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    order = db.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    user = db.get_user(user_id)
    # Check authorization
    if user.role == "customer" and order.customer_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Get payment for this order
    payment = db.get_payment_by_order(order_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if not payment.receipt:
        raise HTTPException(status_code=404, detail="Receipt not generated")
    
    return payment.receipt.generate_receipt()


@app.get("/api/orders/{order_id}/invoice")
async def get_order_invoice(session_id: str, order_id: int):
    """Get invoice for an order"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = db.get_user(user_id)
    
    # Get invoice for this order
    invoice = db.get_invoice_by_order(order_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice.generate_invoice()


# ADMIN ENDPOINTS 

@app.put("/api/admin/products/{product_id}")
async def update_product(
    session_id: str,
    product_id: int,
    name: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    stock: Optional[int] = Form(None)
):
    """Admin: Update product"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = db.get_user(user_id)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    product = db.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if name:
        product.name = name
    if price is not None:
        product.price = price
    if description:
        product.description = description
    if stock is not None:
        product.stock = stock
    
    db.update_product(product)
    return {"message": "Product updated", "product": product.get_details()}


@app.put("/api/admin/orders/{order_id}/status")
async def update_order_status(session_id: str, order_id: int, status: str):
    """Admin: Update order status"""
    user_id = sessions.get(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = db.get_user(user_id)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    order = db.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.update_status(status)
    return {"message": "Order status updated", "order": order.get_details()}


# Run the application
if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print(" CONVENIENCE STORE - Assignment 3")
    print("=" * 60)
    print("Starting server...")
    print("Once started, open your browser to: http://localhost:8000")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8000)
