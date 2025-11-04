"""
Receipt module - handles receipt generation and printing
"""

from datetime import datetime

class Receipt:
    """Represents a payment receipt"""
    
    _receipt_counter = 2000  # Start from 2000 for receipt numbers
    
    def __init__(self, payment_id: int, order_id: int, customer_name: str, 
                amount: float, payment_method: str, items: list = None):
        self.receipt_number = Receipt._receipt_counter
        Receipt._receipt_counter += 1
        
        self.payment_id = payment_id
        self.order_id = order_id
        self.customer_name = customer_name
        self.amount = amount
        self.items = items if items else []  # List of items purchased
        self.payment_method = payment_method
        self.issue_date = datetime.now()
        self.printed = False  # Track if receipt was already printed
    
    def generate_receipt(self) -> dict:
        """Generate receipt details"""
        return {
            "receipt_number": f"RCP-{self.receipt_number}",
            "payment_id": self.payment_id,
            "order_id": self.order_id,
            "customer_name": self.customer_name,
            "items": self.items,  # Include items list
            "amount_paid": self.amount,
            "payment_method": self.payment_method,
            "payment_date": self.issue_date.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "Paid"
        }
    
    def print_receipt(self) -> str:
        """Generate a formatted receipt string (placeholder)"""
        if self.printed:
            print(" Receipt already printed")
            return None
        
        print(f"Printing receipt RCP-{self.receipt_number}...")
        self.printed = True
        
        return f"""
        =====================================
                PAYMENT RECEIPT
        =====================================
        Receipt No: RCP-{self.receipt_number}
        Date: {self.issue_date.strftime("%Y-%m-%d %H:%M:%S")}
        
        Order ID: #{self.order_id}
        Customer: {self.customer_name}
        
        Amount Paid: ${self.amount:.2f}
        Payment Method: {self.payment_method}
        
        Status: PAID
        =====================================
        Thank you for your purchase!
        =====================================
        """
    
    def __str__(self):
        return f"Receipt #{self.receipt_number} - Payment #{self.payment_id} - ${self.amount:.2f}"
