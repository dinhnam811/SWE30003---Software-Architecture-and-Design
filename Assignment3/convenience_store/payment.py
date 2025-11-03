"""
Payment module - handles payment processing with Strategy pattern
"""

from abc import ABC, abstractmethod
from datetime import datetime

class PaymentMethod(ABC):
    """Abstract base class for payment methods (Strategy Pattern)"""
    
    @abstractmethod
    def process_payment(self, amount: float) -> bool:
        """Process payment and return success status"""
        pass
    
    @abstractmethod
    def get_method_name(self) -> str:
        """Return payment method name"""
        pass


class DigitalWallet(PaymentMethod):
    """Digital wallet payment method"""
    
    def __init__(self, wallet_provider: str):
        self.wallet_provider = wallet_provider
    
    def process_payment(self, amount: float) -> bool:
        """Simulate digital wallet payment"""
        return True
    
    def get_method_name(self) -> str:
        return f"Digital Wallet ({self.wallet_provider})"


class BankDebit(PaymentMethod):
    """Bank debit payment method"""
    
    def __init__(self, account_number: str):
        self.account_number = account_number[-4:]  # Only store last 4 digits
    
    def process_payment(self, amount: float) -> bool:
        """Simulate bank debit payment"""
        return True
    
    def get_method_name(self) -> str:
        return f"Bank Debit (****{self.account_number})"


class PayPal(PaymentMethod):
    """PayPal payment method"""
    
    def __init__(self, email: str):
        self.email = email
    
    def process_payment(self, amount: float) -> bool:
        """Simulate PayPal payment"""
        return True
    
    def get_method_name(self) -> str:
        return f"PayPal ({self.email})"


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
    
    def __str__(self):
        return f"Invoice #{self.invoice_number} - Order #{self.order_id} - ${self.total_amount:.2f}"


class Receipt:
    """Represents a payment receipt"""
    
    _receipt_counter = 2000  # Start from 2000 for receipt numbers
    
    def __init__(self, payment_id: int, order_id: int, customer_name: str, 
                amount: float, payment_method: str):
        self.receipt_number = Receipt._receipt_counter
        Receipt._receipt_counter += 1
        
        self.payment_id = payment_id
        self.order_id = order_id
        self.customer_name = customer_name
        self.amount = amount
        self.payment_method = payment_method
        self.issue_date = datetime.now()
    
    def generate_receipt(self) -> dict:
        """Generate receipt details"""
        return {
            "receipt_number": f"RCP-{self.receipt_number}",
            "payment_id": self.payment_id,
            "order_id": self.order_id,
            "customer_name": self.customer_name,
            "amount_paid": self.amount,
            "payment_method": self.payment_method,
            "payment_date": self.issue_date.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "Paid"
        }
    
    def print_receipt(self) -> str:
        """Generate a formatted receipt string (placeholder)"""
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


class Payment:
    """Represents a payment transaction"""
    
    _payment_counter = 1
    
    def __init__(self, order_id: int, amount: float, payment_method: PaymentMethod):
        self.payment_id = Payment._payment_counter
        Payment._payment_counter += 1
        
        self.order_id = order_id
        self.amount = amount
        self.payment_method = payment_method
        self.payment_date = datetime.now()
        self.status = "Pending"
        self.receipt = None  # Will be created after successful payment
    
    def process(self) -> bool:
        """Process the payment"""
        success = self.payment_method.process_payment(self.amount)
        self.status = "Success" if success else "Failed"
        return success
    
    def generate_receipt(self, customer_name: str) -> Receipt:
        """Generate receipt after successful payment"""
        if self.status == "Success":
            self.receipt = Receipt(
                payment_id=self.payment_id,
                order_id=self.order_id,
                customer_name=customer_name,
                amount=self.amount,
                payment_method=self.payment_method.get_method_name()
            )
            return self.receipt
        return None
    
    def get_details(self) -> dict:
        """Return payment details"""
        details = {
            "payment_id": self.payment_id,
            "order_id": self.order_id,
            "amount": self.amount,
            "method": self.payment_method.get_method_name(),
            "status": self.status,
            "payment_date": self.payment_date.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        if self.receipt:
            details["receipt"] = self.receipt.generate_receipt()
        
        return details
    
    def __str__(self):
        return f"Payment #{self.payment_id} - {self.status} - ${self.amount:.2f}"