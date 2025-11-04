"""
Product module - represents sellable items in the store
Simplified from Assignment 2: removed complex variant handling, merged with InventoryItem
"""

class Product:
    """Represents a product available for sale"""
    
    def __init__(self, product_id: int, sku: str, name: str, price: float, 
        description: str = "", stock: int = 0, image_url: str = ""):
        self.product_id = product_id
        self.sku = sku
        self.name = name
        self.price = price
        self.description = description
        self.stock = stock  # Simplified: stock directly in Product
        self.active = True
        self.image_url = image_url
    
    def is_available(self) -> bool:
        """Check if product is available for purchase"""
        return self.active and self.stock > 0
    
    def update_stock(self, quantity: int):
        """Update stock level (positive to add, negative to reduce)"""
        self.stock += quantity
        if self.stock < 0:
            self.stock = 0
    
    def get_details(self) -> dict:
        """Return product details as dictionary"""
        return {
            "product_id": self.product_id,
            "sku": self.sku,
            "name": self.name,
            "price": self.price,
            "description": self.description,
            "stock": self.stock,
            "active": self.active,
            "available": self.is_available(),
            "image_url": self.image_url
        }
    
    def __str__(self):
        return f"{self.name} (${self.price}) - Stock: {self.stock}"
