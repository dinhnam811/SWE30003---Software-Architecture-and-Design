"""
Payment module - handles payment processing with Strategy pattern
"""

from abc import ABC, abstractmethod
from datetime import datetime
from receipt import Receipt

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
    
    def generate_receipt(self, customer_name: str, items: list = None) -> Receipt:
        """Generate receipt after successful payment"""
        if self.status == "Success":
            self.receipt = Receipt(
                payment_id=self.payment_id,
                order_id=self.order_id,
                customer_name=customer_name,
                amount=self.amount,
                payment_method=self.payment_method.get_method_name(),
                items=items if items else []
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