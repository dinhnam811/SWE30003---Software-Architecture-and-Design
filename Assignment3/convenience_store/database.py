"""
Database module - simple in-memory data storage (Singleton pattern)
"""

from typing import Dict, List, Optional
from product import Product
from user import User, Customer, Admin

class Database:
    """Singleton class for data storage (in-memory for simplicity)"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self.products: Dict[int, Product] = {}
        self.users: Dict[int, User] = {}
        self.orders: Dict = {}
        self.payments: Dict = {}
        self.invoices: Dict = {} 
        
        # Initialize with sample data
        self._init_sample_data()
    
    def _init_sample_data(self):
        """Add sample data for testing"""
        # Add sample products
        products = [
            Product(1, "SNACK001", "Spicy ahh Chips", 2.99, "Crispy hot potato chips", 50, "/static/images/chips.jpg"),
            Product(2, "DRINK001", "Nitro Fuel", 1.99, "Refreshing Nitro Fuel", 100, "/static/images/fuel.jpg"),
            Product(3, "CANDY001", "Chocolate Bar", 1.49, "Delicious chocolate", 75, "/static/images/bar.jpg"),
            Product(4, "SNACK002", "Red Bean Buns", 3.49, "Sweet n Tasty Red Bean Buns", 30, "/static/images/buns.jpg"),
            Product(5, "DRINK002", "Goddess Water", 0.99, "Bottled water", 200, "/static/images/water.jpg"),
            Product(6, "DRINK003", "Sam Dua", 5.19, "Vietnamese tea", 150, "/static/images/samdua.jpg"),
        ]
        for product in products:
            self.products[product.product_id] = product
        
        # Add sample users
        self.users[1] = Customer(1, "customer@example.com", "password123", 
                                "John Doe", "123 Main St")
        self.users[2] = Admin(2, "admin@example.com", "admin123")
    
    # Product operations
    def get_product(self, product_id: int) -> Optional[Product]:
        """Get product by ID"""
        return self.products.get(product_id)
    
    def get_all_products(self) -> List[Product]:
        """Get all products"""
        return list(self.products.values())
    
    def add_product(self, product: Product):
        """Add new product"""
        self.products[product.product_id] = product
    
    def update_product(self, product: Product):
        """Update existing product"""
        if product.product_id in self.products:
            self.products[product.product_id] = product
    
    # User operations
    def get_user(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.users.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        for user in self.users.values():
            if user.email == email:
                return user
        return None
    
    def add_user(self, user: User):
        """Add new user"""
        self.users[user.user_id] = user
    
    # Order operations
    def get_order(self, order_id: int):
        """Get order by ID"""
        return self.orders.get(order_id)
    
    def get_orders_by_customer(self, customer_id: int) -> List:
        """Get all orders for a customer"""
        return [order for order in self.orders.values() 
                if order.customer_id == customer_id]
    
    def get_all_orders(self) -> List:
        """Get all orders"""
        return list(self.orders.values())
    
    def add_order(self, order):
        """Add new order"""
        self.orders[order.order_id] = order
    
    # Payment operations
    def add_payment(self, payment):
        """Add new payment"""
        self.payments[payment.payment_id] = payment
    
    def get_payment(self, payment_id: int):
        """Get payment by ID"""
        return self.payments.get(payment_id)
    
    def get_payment_by_order(self, order_id: int):
        """Get payment for a specific order"""
        for payment in self.payments.values():
            if payment.order_id == order_id:
                return payment
        return None
    
    # Invoice operations
    def add_invoice(self, invoice):
        """Add new invoice"""
        self.invoices[invoice.order_id] = invoice
    
    def get_invoice_by_order(self, order_id: int):
        """Get invoice for a specific order"""
        return self.invoices.get(order_id)
    
    def get_all_invoices(self) -> List:
        """Get all invoices"""
        return list(self.invoices.values())
