"""
shopping_cart module - manages customer's shopping cart
"""

from typing import List
from order_item import OrderItem

class ShoppingCart:
    """manages items in customer's shopping cart"""
    
    def __init__(self, customer_id: int):
        self.customer_id = customer_id
        self.items: List[OrderItem] = []
    
    def add_item(self, product, quantity: int = 1) -> bool:
        """add product to cart, return True if successful"""
        if not product.is_available():
            return False
        
        if quantity > product.stock:
            return False
        
        # check if product already in cart
        for item in self.items:
            if item.product.product_id == product.product_id:
                item.update_quantity(item.quantity + quantity)
                return True
        
        # add new item
        self.items.append(OrderItem(product, quantity))
        return True
    
    def remove_item(self, product_id: int) -> bool:
        """remove item from cart"""
        for i, item in enumerate(self.items):
            if item.product.product_id == product_id:
                self.items.pop(i)
                return True
        return False
    
    def update_item_quantity(self, product_id: int, quantity: int) -> bool:
        """update quantity of item in cart"""
        if quantity <= 0:
            return self.remove_item(product_id)
        
        for item in self.items:
            if item.product.product_id == product_id:
                if quantity <= item.product.stock:
                    item.update_quantity(quantity)
                    return True
        return False
    
    def get_total(self) -> float:
        """calculate cart total"""
        return sum(item.get_line_total() for item in self.items)
    
    def get_item_count(self) -> int:
        """get total number of items in cart"""
        return sum(item.quantity for item in self.items)
    
    def clear(self):
        """empty the cart"""
        self.items = []
    
    def get_items(self) -> List[dict]:
        """return all items as dictionaries"""
        return [item.get_details() for item in self.items]
    
    def __str__(self):
        if not self.items:
            return "Empty cart"
        return f"Cart: {self.get_item_count()} items, Total: ${self.get_total():.2f}"
