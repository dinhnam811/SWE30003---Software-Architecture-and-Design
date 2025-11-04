"""
database module - simple in-memory data storage (Singleton pattern)
"""

from typing import Dict, List, Optional
from product import Product
from user import User, Customer, Admin

class Database:
    """singleton class for data storage (in-memory for simplicity)"""
    
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
        
        # initialize with sample data
        self._init_sample_data()
    
    def _init_sample_data(self):
        """add sample data for testing"""
        # add sample products
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
        
        # add sample users
        self.users[1] = Customer(1, "customer@example.com", "password123", 
                                "John Doe", "123 Main St")
        self.users[2] = Admin(2, "admin@example.com", "admin123")
    
    # product operations
    def get_product(self, product_id: int) -> Optional[Product]:
        """get product by ID"""
        return self.products.get(product_id)
    
    def get_all_products(self) -> List[Product]:
        """get all products"""
        return list(self.products.values())
    
    def add_product(self, product: Product):
        """add new product"""
        self.products[product.product_id] = product
    
    def update_product(self, product: Product):
        """update existing product"""
        if product.product_id in self.products:
            self.products[product.product_id] = product
    
    # user operations
    def get_user(self, user_id: int) -> Optional[User]:
        """get user by ID"""
        return self.users.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """get user by email"""
        for user in self.users.values():
            if user.email == email:
                return user
        return None
    
    def add_user(self, user: User):
        """add new user"""
        self.users[user.user_id] = user
    
    # order operations
    def get_order(self, order_id: int):
        """get order by ID"""
        return self.orders.get(order_id)
    
    def get_orders_by_customer(self, customer_id: int) -> List:
        """get all orders for a customer"""
        return [order for order in self.orders.values() 
                if order.customer_id == customer_id]
    
    def get_all_orders(self) -> List:
        """get all orders"""
        return list(self.orders.values())
    
    def add_order(self, order):
        """add new order"""
        self.orders[order.order_id] = order
    
    # payment operations
    def add_payment(self, payment):
        """add new payment"""
        self.payments[payment.payment_id] = payment
    
    def get_payment(self, payment_id: int):
        """get payment by ID"""
        return self.payments.get(payment_id)
    
    def get_payment_by_order(self, order_id: int):
        """get payment for a specific order"""
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
