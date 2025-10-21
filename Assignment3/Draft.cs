// ============================================================================
// DATA ACCESS LAYER - MongoDB Integration
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Driver;
using OnlineConvenienceStore.Models;

namespace OnlineConvenienceStore.DataAccess
{
    // ========== DATABASE SINGLETON ==========
    
    public class Database
    {
        private static Database _instance;
        private static readonly object _lock = new object();
        
        private readonly IMongoClient _client;
        private readonly IMongoDatabase _database;
        
        private Database()
        {
            // Connection string - update with your MongoDB connection
            string connectionString = "mongodb://localhost:27017";
            _client = new MongoClient(connectionString);
            _database = _client.GetDatabase("convenience_store");
        }
        
        public static Database Instance
        {
            get
            {
                if (_instance == null)
                {
                    lock (_lock)
                    {
                        if (_instance == null)
                        {
                            _instance = new Database();
                        }
                    }
                }
                return _instance;
            }
        }
        
        public IMongoCollection<T> GetCollection<T>(string collectionName = null)
        {
            if (string.IsNullOrEmpty(collectionName))
            {
                var attr = (BsonCollectionAttribute)Attribute.GetCustomAttribute(
                    typeof(T), typeof(BsonCollectionAttribute));
                collectionName = attr?.CollectionName ?? typeof(T).Name.ToLower();
            }
            
            return _database.GetCollection<T>(collectionName);
        }
    }
    
    // ========== GENERIC REPOSITORY PATTERN ==========
    
    public interface IRepository<T> where T : class
    {
        Task<List<T>> GetAllAsync();
        Task<T> GetByIdAsync(string id);
        Task<T> CreateAsync(T entity);
        Task<bool> UpdateAsync(string id, T entity);
        Task<bool> DeleteAsync(string id);
    }
    
    public class MongoRepository<T> : IRepository<T> where T : class
    {
        protected readonly IMongoCollection<T> _collection;
        
        public MongoRepository()
        {
            _collection = Database.Instance.GetCollection<T>();
        }
        
        public async Task<List<T>> GetAllAsync()
        {
            return await _collection.Find(_ => true).ToListAsync();
        }
        
        public async Task<T> GetByIdAsync(string id)
        {
            var filter = Builders<T>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id));
            return await _collection.Find(filter).FirstOrDefaultAsync();
        }
        
        public async Task<T> CreateAsync(T entity)
        {
            await _collection.InsertOneAsync(entity);
            return entity;
        }
        
        public async Task<bool> UpdateAsync(string id, T entity)
        {
            var filter = Builders<T>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id));
            var result = await _collection.ReplaceOneAsync(filter, entity);
            return result.ModifiedCount > 0;
        }
        
        public async Task<bool> DeleteAsync(string id)
        {
            var filter = Builders<T>.Filter.Eq("_id", MongoDB.Bson.ObjectId.Parse(id));
            var result = await _collection.DeleteOneAsync(filter);
            return result.DeletedCount > 0;
        }
    }
    
    // ========== SPECIFIC REPOSITORIES ==========
    
    public class CustomerRepository : MongoRepository<Customer>
    {
        public async Task<Customer> FindByEmailAsync(string email)
        {
            var filter = Builders<Customer>.Filter.Eq(c => c.Email, email);
            return await _collection.Find(filter).FirstOrDefaultAsync();
        }
        
        public async Task<Customer> AuthenticateAsync(string email, string password)
        {
            var filter = Builders<Customer>.Filter.And(
                Builders<Customer>.Filter.Eq(c => c.Email, email),
                Builders<Customer>.Filter.Eq(c => c.Password, password)
            );
            return await _collection.Find(filter).FirstOrDefaultAsync();
        }
    }
    
    public class AdminRepository : MongoRepository<Admin>
    {
        public async Task<Admin> AuthenticateAsync(string email, string password)
        {
            var filter = Builders<Admin>.Filter.And(
                Builders<Admin>.Filter.Eq(a => a.Email, email),
                Builders<Admin>.Filter.Eq(a => a.Password, password)
            );
            return await _collection.Find(filter).FirstOrDefaultAsync();
        }
    }
    
    public class ProductRepository : MongoRepository<Product>
    {
        public async Task<List<Product>> GetAvailableProductsAsync()
        {
            var filter = Builders<Product>.Filter.Eq(p => p.AvailableForSale, true);
            return await _collection.Find(filter).ToListAsync();
        }
        
        public async Task<List<Product>> SearchAsync(string query)
        {
            var filter = Builders<Product>.Filter.And(
                Builders<Product>.Filter.Eq(p => p.AvailableForSale, true),
                Builders<Product>.Filter.Or(
                    Builders<Product>.Filter.Regex(p => p.Name, 
                        new MongoDB.Bson.BsonRegularExpression(query, "i")),
                    Builders<Product>.Filter.Regex(p => p.Category, 
                        new MongoDB.Bson.BsonRegularExpression(query, "i"))
                )
            );
            return await _collection.Find(filter).ToListAsync();
        }
        
        public async Task<List<Product>> GetByCategoryAsync(string category)
        {
            var filter = Builders<Product>.Filter.And(
                Builders<Product>.Filter.Eq(p => p.AvailableForSale, true),
                Builders<Product>.Filter.Eq(p => p.Category, category)
            );
            return await _collection.Find(filter).ToListAsync();
        }
    }
    
    public class ShoppingCartRepository : MongoRepository<ShoppingCart>
    {
        public async Task<ShoppingCart> GetByCustomerIdAsync(string customerId)
        {
            var filter = Builders<ShoppingCart>.Filter.Eq(c => c.CustomerId, customerId);
            var cart = await _collection.Find(filter).FirstOrDefaultAsync();
            
            // Create new cart if doesn't exist
            if (cart == null)
            {
                cart = new ShoppingCart { CustomerId = customerId };
                await CreateAsync(cart);
            }
            
            return cart;
        }
    }
}

// ============================================================================
// SERVICE LAYER - Business Logic
// ============================================================================

namespace OnlineConvenienceStore.Services
{
    using OnlineConvenienceStore.DataAccess;
    using OnlineConvenienceStore.Models;
    
    // ========== AUTHENTICATION SERVICE ==========
    
    public class AuthenticationService
    {
        private readonly CustomerRepository _customerRepo;
        private readonly AdminRepository _adminRepo;
        
        public AuthenticationService()
        {
            _customerRepo = new CustomerRepository();
            _adminRepo = new AdminRepository();
        }
        
        public async Task<User> LoginAsync(string email, string password, UserRole role)
        {
            if (role == UserRole.Customer)
            {
                return await _customerRepo.AuthenticateAsync(email, password);
            }
            else
            {
                return await _adminRepo.AuthenticateAsync(email, password);
            }
        }
        
        public async Task<Customer> RegisterCustomerAsync(
            string email, string password, string name, string phone, string address)
        {
            var existingCustomer = await _customerRepo.FindByEmailAsync(email);
            if (existingCustomer != null)
            {
                throw new Exception("Email already registered");
            }
            
            var customer = new Customer
            {
                Email = email,
                Password = password, // In production: Hash this!
                Name = name,
                Phone = phone,
                Address = address,
                Account = new Account
                {
                    PreferredShippingAddress = address
                }
            };
            
            return await _customerRepo.CreateAsync(customer);
        }
    }
    
    // ========== CATALOGUE SERVICE ==========
    
    public class CatalogueService
    {
        private readonly ProductRepository _productRepo;
        
        public CatalogueService()
        {
            _productRepo = new ProductRepository();
        }
        
        public async Task<List<Product>> GetAllProductsAsync()
        {
            return await _productRepo.GetAvailableProductsAsync();
        }
        
        public async Task<List<Product>> SearchProductsAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return await GetAllProductsAsync();
            }
            return await _productRepo.SearchAsync(query);
        }
        
        public async Task<List<Product>> GetProductsByCategoryAsync(string category)
        {
            return await _productRepo.GetByCategoryAsync(category);
        }
        
        public async Task<Product> GetProductByIdAsync(string productId)
        {
            return await _productRepo.GetByIdAsync(productId);
        }
    }
    
    // ========== SHOPPING CART SERVICE ==========
    
    public class ShoppingCartService
    {
        private readonly ShoppingCartRepository _cartRepo;
        private readonly ProductRepository _productRepo;
        
        public ShoppingCartService()
        {
            _cartRepo = new ShoppingCartRepository();
            _productRepo = new ProductRepository();
        }
        
        public async Task<ShoppingCart> GetCartAsync(string customerId)
        {
            return await _cartRepo.GetByCustomerIdAsync(customerId);
        }
        
        public async Task<(bool Success, string Message)> AddToCartAsync(
            string customerId, string productId, int quantity)
        {
            var cart = await _cartRepo.GetByCustomerIdAsync(customerId);
            var product = await _productRepo.GetByIdAsync(productId);
            
            if (product == null)
            {
                return (false, "Product not found");
            }
            
            if (!product.AvailableForSale)
            {
                return (false, "Item not available for sale");
            }
            
            if (!product.ValidateStock(quantity))
            {
                return (false, "Not enough quantity in inventory");
            }
            
            cart.AddItem(product, quantity);
            await _cartRepo.UpdateAsync(cart.Id, cart);
            
            return (true, "Item added to cart");
        }
        
        public async Task<bool> RemoveFromCartAsync(string customerId, string orderItemId)
        {
            var cart = await _cartRepo.GetByCustomerIdAsync(customerId);
            cart.RemoveItem(orderItemId);
            return await _cartRepo.UpdateAsync(cart.Id, cart);
        }
        
        public async Task<bool> UpdateQuantityAsync(
            string customerId, string orderItemId, int newQuantity)
        {
            var cart = await _cartRepo.GetByCustomerIdAsync(customerId);
            cart.UpdateQuantity(orderItemId, newQuantity);
            return await _cartRepo.UpdateAsync(cart.Id, cart);
        }
        
        public async Task<bool> ClearCartAsync(string customerId)
        {
            var cart = await _cartRepo.GetByCustomerIdAsync(customerId);
            cart.Clear();
            return await _cartRepo.UpdateAsync(cart.Id, cart);
        }
    }
    
    // ========== ORDER SERVICE (Facade Pattern) ==========
    
    public class OrderService
    {
        private readonly MongoRepository<Order> _orderRepo;
        private readonly ShoppingCartRepository _cartRepo;
        private readonly InvoiceService _invoiceService;
        
        public OrderService()
        {
            _orderRepo = new MongoRepository<Order>();
            _cartRepo = new ShoppingCartRepository();
            _invoiceService = new InvoiceService();
        }
        
        public async Task<Order> CreateOrderAsync(string customerId, string paymentMethodType)
        {
            // Get customer's cart
            var cart = await _cartRepo.GetByCustomerIdAsync(customerId);
            
            if (cart.OrderItems.Count == 0)
            {
                throw new Exception("Cart is empty");
            }
            
            // Create order from cart snapshot
            var order = new Order
            {
                CustomerId = customerId,
                OrderItems = new List<OrderItem>(cart.OrderItems)
            };
            
            order.CalculateTotals();
            
            // Save order
            await _orderRepo.CreateAsync(order);
            
            // Generate invoice
            var invoice = order.GenerateInvoice();
            invoice = await _invoiceService.CreateInvoiceAsync(invoice);
            
            order.InvoiceId = invoice.Id;
            await _orderRepo.UpdateAsync(order.Id, order);
            
            // Clear cart
            cart.Clear();
            await _cartRepo.UpdateAsync(cart.Id, cart);
            
            return order;
        }
        
        public async Task<List<Order>> GetCustomerOrdersAsync(string customerId)
        {
            var allOrders = await _orderRepo.GetAllAsync();
            return allOrders.Where(o => o.CustomerId == customerId).ToList();
        }
        
        public async Task<Order> GetOrderByIdAsync(string orderId)
        {
            return await _orderRepo.GetByIdAsync(orderId);
        }
        
        public async Task<bool> UpdateOrderStatusAsync(string orderId, OrderStatus status)
        {
            var order = await _orderRepo.GetByIdAsync(orderId);
            if (order == null) return false;
            
            order.Status = status;
            return await _orderRepo.UpdateAsync(orderId, order);
        }
    }
    
    // ========== INVOICE SERVICE ==========
    
    public class InvoiceService
    {
        private readonly MongoRepository<Invoice> _invoiceRepo;
        
        public InvoiceService()
        {
            _invoiceRepo = new MongoRepository<Invoice>();
        }
        
        public async Task<Invoice> CreateInvoiceAsync(Invoice invoice)
        {
            return await _invoiceRepo.CreateAsync(invoice);
        }
        
        public async Task<Invoice> GetInvoiceByIdAsync(string invoiceId)
        {
            return await _invoiceRepo.GetByIdAsync(invoiceId);
        }
        
        public async Task<List<Invoice>> GetCustomerInvoicesAsync(string customerId)
        {
            var allInvoices = await _invoiceRepo.GetAllAsync();
            return allInvoices.Where(i => i.CustomerId == customerId).ToList();
        }
        
        public async Task<bool> ApplyPaymentAsync(string invoiceId, string paymentId, decimal amount)
        {
            var invoice = await _invoiceRepo.GetByIdAsync(invoiceId);
            if (invoice == null) return false;
            
            invoice.ApplyPayment(amount);
            invoice.PaymentIds.Add(paymentId);
            
            return await _invoiceRepo.UpdateAsync(invoiceId, invoice);
        }
    }
    
    // ========== PAYMENT SERVICE (Factory Pattern) ==========
    
    public class PaymentService
    {
        private readonly MongoRepository<Payment> _paymentRepo;
        private readonly MongoRepository<Receipt> _receiptRepo;
        private readonly InvoiceService _invoiceService;
        
        public PaymentService()
        {
            _paymentRepo = new MongoRepository<Payment>();
            _receiptRepo = new MongoRepository<Receipt>();
            _invoiceService = new InvoiceService();
        }
        
        // Factory Method for Payment Methods
        public PaymentMethod CreatePaymentMethod(string type)
        {
            switch (type.ToLower())
            {
                case "digitalwallet":
                    return new DigitalWallet { WalletProvider = "Generic Wallet" };
                case "bankdebit":
                    return new BankDebit { BankName = "Generic Bank" };
                case "paypal":
                    return new PayPalPayment { PayPalEmail = "user@paypal.com" };
                default:
                    throw new ArgumentException($"Unknown payment method: {type}");
            }
        }
        
        public async Task<(Payment Payment, Receipt Receipt)> ProcessPaymentAsync(
            string invoiceId, string customerId, decimal amount, string paymentMethodType)
        {
            // Get invoice
            var invoice = await _invoiceService.GetInvoiceByIdAsync(invoiceId);
            if (invoice == null)
            {
                throw new Exception("Invoice not found");
            }
            
            // Create payment method using factory
            var paymentMethod = CreatePaymentMethod(paymentMethodType);
            
            // Process payment
            var result = paymentMethod.ProcessPayment(amount);
            
            // Create payment record
            var payment = new Payment
            {
                InvoiceId = invoiceId,
                CustomerId = customerId,
                Amount = amount,
                PaymentMethodType = paymentMethodType,
                Status = result.Success ? PaymentStatus.Completed : PaymentStatus.Failed
            };
            
            await _paymentRepo.CreateAsync(payment);
            
            Receipt receipt = null;
            
            if (result.Success)
            {
                // Apply payment to invoice
                await _invoiceService.ApplyPaymentAsync(invoiceId, payment.Id, amount);
                
                // Generate receipt
                receipt = new Receipt
                {
                    PaymentId = payment.Id,
                    CustomerId = customerId,
                    Amount = amount
                };
                
                await _receiptRepo.CreateAsync(receipt);
                payment.ReceiptId = receipt.Id;
                await _paymentRepo.UpdateAsync(payment.Id, payment);
            }
            
            return (payment, receipt);
        }
        
        public async Task<List<Payment>> GetCustomerPaymentsAsync(string customerId)
        {
            var allPayments = await _paymentRepo.GetAllAsync();
            return allPayments.Where(p => p.CustomerId == customerId).ToList();
        }
    }
    
    // ========== INVENTORY SERVICE ==========
    
    public class InventoryService
    {
        private readonly ProductRepository _productRepo;
        private readonly Dictionary<string, InventoryItem> _inventoryCache;
        
        public InventoryService()
        {
            _productRepo = new ProductRepository();
            _inventoryCache = new Dictionary<string, InventoryItem>();
        }
        
        public async Task<InventoryItem> GetInventoryAsync(string productId)
        {
            if (!_inventoryCache.ContainsKey(productId))
            {
                var product = await _productRepo.GetByIdAsync(productId);
                if (product != null)
                {
                    _inventoryCache[productId] = new InventoryItem
                    {
                        ProductId = productId,
                        OnHand = product.Quantity,
                        Reserved = 0
                    };
                }
            }
            
            return _inventoryCache.ContainsKey(productId) ? _inventoryCache[productId] : null;
        }
        
        public async Task<bool> ReserveStockAsync(string productId, int quantity)
        {
            var inventory = await GetInventoryAsync(productId);
            return inventory?.Reserve(quantity) ?? false;
        }
        
        public async Task<bool> CommitReservationAsync(string productId, int quantity)
        {
            var inventory = await GetInventoryAsync(productId);
            if (inventory == null) return false;
            
            inventory.CommitReservation(quantity);
            
            // Update product quantity in database
            var product = await _productRepo.GetByIdAsync(productId);
            product.Quantity = inventory.OnHand;
            await _productRepo.UpdateAsync(productId, product);
            
            return true;
        }
        
        public async Task ReleaseReservationAsync(string productId, int quantity)
        {
            var inventory = await GetInventoryAsync(productId);
            inventory?.ReleaseReservation(quantity);
        }
    }
    
    // ========== ADMIN SERVICE ==========
    
    public class AdminService
    {
        private readonly ProductRepository _productRepo;
        private readonly MongoRepository<Order> _orderRepo;
        private readonly InvoiceService _invoiceService;
        
        public AdminService()
        {
            _productRepo = new ProductRepository();
            _orderRepo = new MongoRepository<Order>();
            _invoiceService = new InvoiceService();
        }
        
        // Product Management
        public async Task<Product> AddProductAsync(Product product)
        {
            return await _productRepo.CreateAsync(product);
        }
        
        public async Task<bool> UpdateProductAsync(string productId, Product product)
        {
            return await _productRepo.UpdateAsync(productId, product);
        }
        
        public async Task<bool> DeleteProductAsync(string productId)
        {
            return await _productRepo.DeleteAsync(productId);
        }
        
        public async Task<bool> UpdateStockAsync(string productId, int newQuantity)
        {
            var product = await _productRepo.GetByIdAsync(productId);
            if (product == null) return false;
            
            product.Quantity = newQuantity;
            return await _productRepo.UpdateAsync(productId, product);
        }
        
        // Order Management
        public async Task<List<Order>> GetAllOrdersAsync()
        {
            return await _orderRepo.GetAllAsync();
        }
        
        public async Task<bool> UpdateOrderStatusAsync(string orderId, OrderStatus status)
        {
            var order = await _orderRepo.GetByIdAsync(orderId);
            if (order == null) return false;
            
            order.Status = status;
            return await _orderRepo.UpdateAsync(orderId, order);
        }
        
        // Invoice Management
        public async Task<List<Invoice>> GetAllInvoicesAsync()
        {
            var allInvoices = await _invoiceService.GetAllInvoicesAsync();
            return allInvoices;
        }
    }
}

// ============================================================================
// HELPER EXTENSION FOR INVOICE SERVICE
// ============================================================================

namespace OnlineConvenienceStore.Services
{
    public partial class InvoiceService
    {
        public async Task<List<Invoice>> GetAllInvoicesAsync()
        {
            return await _invoiceRepo.GetAllAsync();
        }
    }
}