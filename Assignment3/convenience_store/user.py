"""
User module - handles authentication and user roles
Simplified from Assignment 2: basic authentication, removed Account class
"""

class User:
    """Base class for all system users"""
    
    def __init__(self, user_id: int, email: str, password: str, role: str):
        self.user_id = user_id
        self.email = email
        self.password = password  
        self.role = role  # "customer" or "admin"
    
    def authenticate(self, password: str) -> bool:
        """Authenticate user by comparing passwords"""
        return self.password == password
    
    def get_info(self) -> dict:
        """Return user info without password"""
        return {
            "user_id": self.user_id,
            "email": self.email,
            "role": self.role
        }


class Customer(User):
    """Customer user with shopping capabilities"""
    
    def __init__(self, user_id: int, email: str, password: str, 
                name: str = "", address: str = ""):
        super().__init__(user_id, email, password, "customer")
        self.name = name
        self.address = address
    
    def get_info(self) -> dict:
        """Return customer info"""
        info = super().get_info()
        info.update({
            "name": self.name,
            "address": self.address
        })
        return info


class Admin(User):
    """Admin user with management capabilities"""
    
    def __init__(self, user_id: int, email: str, password: str):
        super().__init__(user_id, email, password, "admin")
    
    def can_manage_inventory(self) -> bool:
        """Check if user can manage inventory"""
        return True
    
    def can_view_orders(self) -> bool:
        """Check if user can view all orders"""
        return True
