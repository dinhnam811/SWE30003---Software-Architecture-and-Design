"""
Invoice module - handles invoice generation and tracking
"""

from datetime import datetime

class Invoice:
    """Represents an invoice for an order"""
    
    _invoice_counter = 1000  # Start from 1000 for invoice numbers
    
    def __init__(self, order_id: int, customer_name: str, items: list, total_amount: float):
        self.invoice_number = Invoice._invoice_counter
        Invoice._invoice_counter += 1
        
        self.order_id = order_id
        self.customer_name = customer_name
        self.items = items  # List of order items
        self.total_amount = total_amount
        self.issue_date = datetime.now()
        self.due_date = datetime.now()  # In real system, this would be calculated
        self.status = "Unpaid"
    
    def mark_as_paid(self):
        """Mark invoice as paid"""
        self.status = "Paid"
        print(f" Invoice #{self.invoice_number} marked as paid")
    
    def generate_invoice(self) -> dict:
        """Generate invoice details"""
        return {
            "invoice_number": f"INV-{self.invoice_number}",
            "order_id": self.order_id,
            "customer_name": self.customer_name,
            "issue_date": self.issue_date.strftime("%Y-%m-%d"),
            "due_date": self.due_date.strftime("%Y-%m-%d"),
            "items": self.items,
            "total_amount": self.total_amount,
            "status": self.status
        }
    
    def view_invoice(self) -> str:
        """View formatted invoice (for admin)"""
        print(f" Viewing invoice INV-{self.invoice_number}...")
        
        items_text = ""
        for item in self.items:
            items_text += f"        {item['product_name']} x{item['quantity']} @ ${item['unit_price']:.2f} = ${item['line_total']:.2f}\n"
        
        return f"""
        =====================================
                    INVOICE
        =====================================
        Invoice No: INV-{self.invoice_number}
        Issue Date: {self.issue_date.strftime("%Y-%m-%d")}
        Due Date: {self.due_date.strftime("%Y-%m-%d")}
        
        Order ID: #{self.order_id}
        Customer: {self.customer_name}
        
        Items:
{items_text}
        Total Amount: ${self.total_amount:.2f}
        
        Status: {self.status}
        =====================================
        """
    
    def __str__(self):
        return f"Invoice #{self.invoice_number} - Order #{self.order_id} - ${self.total_amount:.2f}"
