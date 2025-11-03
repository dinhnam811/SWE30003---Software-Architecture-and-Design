# Convenience Store - Assignment 3

A simple web-based convenience store application built with FastAPI and vanilla JavaScript, demonstrating object-oriented programming principles and design patterns.

## Project Overview

This is a full-stack e-commerce application for a convenience store that supports customer shopping and admin management functionalities. The project showcases:

- **Backend**: FastAPI (Python) with RESTful API endpoints
- **Frontend**: Vanilla JavaScript with HTML/CSS
- **Design Patterns**: Singleton, Strategy Pattern, Composition
- **OOP Principles**: Inheritance, Encapsulation, Abstraction

## Architecture

### Backend Structure

The application follows a modular architecture with the following components:

- **`product.py`** - Product entity with inventory management
- **`user.py`** - User authentication and roles (Customer/Admin)
- **`shopping_cart.py`** - Shopping cart management
- **`order.py`** - Order processing and tracking
- **`order_item.py`** - Individual order line items
- **`payment.py`** - Payment processing with Strategy pattern
- **`database.py`** - In-memory data storage (Singleton pattern)
- **`main.py`** - FastAPI application entry point

### Frontend Structure

- **`static/index.html`** - Main HTML page
- **`static/app.js`** - JavaScript client application
- **`static/style.css`** - Styling and responsive design

## Getting Started

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone or download the project**
   ```bash
   git clone https://github.com/dinhnam811/SWE30003---Software-Architecture-and-Design
   ```

2. **Navigate to the project directory**
   ```bash
   cd Assignment3
   ```

3. **Create a virtual environment (recommended)**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Mac/Linux
   # OR
   venv\Scripts\activate  # On Windows
   ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

1. **Navigate to the convenience_store directory**
   ```bash
   cd convenience_store
   ```

2. **Start the server**
   ```bash
   python main.py
   ```

3. **Open your browser and visit**
   ```
   http://localhost:8000
   ```

## Demo Accounts

### Customer Account
- **Email**: `customer@example.com`
- **Password**: `password123`
- **Access**: Browse products, manage cart, place orders

### Admin Account
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Access**: Manage products, view all orders, update order status

## Features

### Customer Features
- User authentication (login/logout)
- Browse available products
- Add products to shopping cart
- Update cart quantities
- Remove items from cart
- Checkout with multiple payment methods
- View order history
- Real-time cart counter

### Admin Features
- Update product details (name, price, description, stock)
- View all customer orders
- Update order status (Placed → Processing → Shipped → Delivered)
- Inventory management

### Payment Methods
- Digital Wallet
- Bank Debit
- PayPal

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout

### Products
- `GET /api/products` - Get all products
- `GET /api/products/{product_id}` - Get specific product

### Shopping Cart
- `GET /api/cart` - Get cart contents
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item quantity
- `DELETE /api/cart/remove/{product_id}` - Remove item from cart

### Orders
- `POST /api/checkout` - Process checkout
- `GET /api/orders` - Get user's orders (or all orders for admin)
- `GET /api/orders/{order_id}` - Get specific order

### Admin
- `PUT /api/admin/products/{product_id}` - Update product
- `PUT /api/admin/orders/{order_id}/status` - Update order status

## Design Patterns

### Singleton Pattern
- **`Database`** class ensures single instance for data storage

### Strategy Pattern
- **`PaymentMethod`** abstract class with concrete implementations:
  - `DigitalWallet`
  - `BankDebit`
  - `PayPal`

### Composition
- `Order` composes `OrderItem` objects
- `ShoppingCart` composes `OrderItem` objects

### Inheritance
- `User` → `Customer`, `Admin`

## Dependencies

See `requirements.txt`:
- `fastapi==0.104.1` - Web framework
- `uvicorn==0.24.0` - ASGI server
- `python-multipart==0.0.6` - Form data handling

## Project Structure

```
Assignment3/
├── convenience_store/
│   ├── main.py              # FastAPI application
│   ├── product.py           # Product entity
│   ├── user.py              # User authentication
│   ├── shopping_cart.py     # Cart management
│   ├── order.py             # Order processing
│   ├── order_item.py        # Order line items
│   ├── payment.py           # Payment processing
│   ├── database.py          # Data storage
│   └── static/
│       ├── index.html       # Main HTML page
│       ├── app.js           # JavaScript client
│       └── style.css        # Styles
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Sample Products

The database is pre-populated with sample products:
1. Potato Chips - $2.99 (50 in stock)
2. Cola - $1.99 (100 in stock)
3. Chocolate Bar - $1.49 (75 in stock)
4. Cookies - $3.49 (30 in stock)
5. Bottled Water - $0.99 (200 in stock)

## Important Notes

- This is a **demonstration project** with in-memory storage
- Data is **not persisted** - restarting the server resets all data
- Passwords are stored in **plain text** (not suitable for production)
- Session management is **simplified** (use proper authentication in production)

## License

This project is for educational purposes as part of SWE30003 Assignment 3.

---

**Author**: Dinh Nam Nguyen  
**Institution**: Swinburne University of Technology  
**Date**: November 2025
