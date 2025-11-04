"""
OrderItem module - represents individual items in an order or cart
"""

from product import Product


class OrderItem:
    """Represents a product with quantity in cart or order"""
    
    def __init__(self, product: Product, quantity: int):
        self.product = product
        self.quantity = quantity
        self.unit_price = product.price  # Capture price at time of adding
    
    def get_line_total(self) -> float:
        """Calculate total for this line item"""
        return self.unit_price * self.quantity
    
    def update_quantity(self, quantity: int):
        """Update quantity of this item"""
        if quantity > 0:
            self.quantity = quantity
    
    def get_details(self) -> dict:
        """Return item details"""
        return {
            "product_id": self.product.product_id,
            "product_name": self.product.name,
            "sku": self.product.sku,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "line_total": self.get_line_total(),
            "image_url": self.product.image_url
        }
    
    def __str__(self):
        return f"{self.product.name} x{self.quantity} = ${self.get_line_total():.2f}"
