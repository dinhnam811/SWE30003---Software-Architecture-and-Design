"""
Order module - represents a confirmed customer order
"""

from typing import List
from datetime import datetime

class Order:
    """Represents a confirmed order"""
    
    _order_counter = 1  # Simple ID generation
    
    def __init__(self, customer_id: int, items: List):
        self.order_id = Order._order_counter
        Order._order_counter += 1
        
        self.customer_id = customer_id
        self.items = items  # Composition: order owns its items
        self.order_date = datetime.now()
        self.status = "Placed"  # Placed -> Processing -> Shipped -> Delivered
        self.total = self._calculate_total()
    
    def _calculate_total(self) -> float:
        """Calculate order total from items"""
        return sum(item.get_line_total() for item in self.items)
    
    def update_status(self, new_status: str):
        """Update order status"""
        valid_statuses = ["Placed", "Processing", "Shipped", "Delivered", "Cancelled"]
        if new_status in valid_statuses:
            self.status = new_status
    
    def get_details(self) -> dict:
        """Return order details"""
        return {
            "order_id": self.order_id,
            "customer_id": self.customer_id,
            "order_date": self.order_date.strftime("%Y-%m-%d %H:%M:%S"),
            "status": self.status,
            "total": self.total,
            "items": [item.get_details() for item in self.items]
        }
    
    def __str__(self):
        return f"Order #{self.order_id} - {self.status} - ${self.total:.2f}"
