import { db } from './firebase-config.js';
import {
    collection,
    getDocs,
    addDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    runTransaction,
    doc,
    updateDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Collection Reference
const productsCollection = collection(db, "medicines");
const ordersCollection = collection(db, "orders");

// Fetch Products
export async function fetchProducts() {
    try {
        const querySnapshot = await getDocs(productsCollection);
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        return products;
    } catch (error) {
        console.error("Error fetching products: ", error);
        throw error;
    }
}

// Seed Initial Data (if empty)
export async function seedProducts() {
    const initialData = [
        // CATS
        { name: "Feline Dewormer Tablets", price: 1200, category: "Cats", stock: 50 },
        { name: "Hairball Remedy Gel", price: 850, category: "Cats", stock: 40 },
        { name: "Flea & Tick Spot-on (Cats)", price: 2100, category: "Cats", stock: 100 },
        { name: "Cat Multivitamins", price: 1500, category: "Cats", stock: 60 },
        { name: "Antibiotic Eye Drops", price: 600, category: "Cats", stock: 30 },
        { name: "Cat Urinary Support", price: 1800, category: "Cats", stock: 25 },
        { name: "Kitten Milk Replacer", price: 2000, category: "Cats", stock: 20 },

        // DOGS
        { name: "Canine Heartworm Preventative", price: 3500, category: "Dogs", stock: 45 },
        { name: "Hip & Joint Glucosamine", price: 2800, category: "Dogs", stock: 55 },
        { name: "Anti-Itch Spray", price: 950, category: "Dogs", stock: 70 },
        { name: "Dog Ear Cleaner", price: 700, category: "Dogs", stock: 80 },
        { name: "Dental Water Additive", price: 1300, category: "Dogs", stock: 40 },
        { name: "Puppy Probiotics", price: 1600, category: "Dogs", stock: 50 },
        { name: "Dog Vitamin C", price: 1500, category: "Dogs", stock: 65 },
        { name: "Calming Chews for Dogs", price: 2200, category: "Dogs", stock: 35 },

        // OTHER ANIMALS
        { name: "Rabbit Digestive Support", price: 900, category: "Other Animals", stock: 30 },
        { name: "Hamster Multivitamin Drops", price: 500, category: "Other Animals", stock: 40 },
        { name: "Bird Mite & Lice Spray", price: 750, category: "Other Animals", stock: 25 },
        { name: "Aquarium Antibiotics", price: 1100, category: "Other Animals", stock: 15 },
        { name: "Turtle Shell Conditioner", price: 650, category: "Other Animals", stock: 20 },
        { name: "Guinea Pig Vitamin C", price: 800, category: "Other Animals", stock: 100 }
    ];

    try {
        console.log("Seeding data...");
        // Batch writes could be better but sticking to loop for simplicity with current imports
        for (const product of initialData) {
            // Optional: Check if exists to avoid duplicates?
            // For now, naive insert. User should clear DB if they want fresh start.
            await addDoc(productsCollection, product);
        }
        console.log("Seeding complete!");
    } catch (error) {
        console.error("Error seeding data: ", error);
        throw error;
    }
}

// Place Order (Transactional) - SECURED
export async function placeOrder(orderData) {
    try {
        const orderId = await runTransaction(db, async (transaction) => {
            // 1. Read all product docs
            const productReads = [];
            for (const item of orderData.items) {
                const productRef = doc(db, "medicines", item.id);
                productReads.push(transaction.get(productRef));
            }

            const productDocs = await Promise.all(productReads);

            // 2. Validate Stock AND Price (Security)
            for (let i = 0; i < productDocs.length; i++) {
                const productDoc = productDocs[i];
                if (!productDoc.exists()) {
                    throw "Product does not exist: " + orderData.items[i].name;
                }

                const data = productDoc.data();
                const currentStock = data.stock || 0;
                const dbPrice = data.price;
                const requestedQty = orderData.items[i].quantity;
                const clientPrice = orderData.items[i].price;

                // Security Check: Prevent Price Tampering
                if (dbPrice !== clientPrice) {
                    throw `Price mismatch for ${orderData.items[i].name}. Expected ${dbPrice}, got ${clientPrice}.`;
                }

                if (currentStock < requestedQty) {
                    throw `Insufficient stock for ${orderData.items[i].name}. Only ${currentStock} available.`;
                }
            }

            // 3. Write: Decrement stock
            for (let i = 0; i < productDocs.length; i++) {
                const productRef = productDocs[i].ref;
                const currentStock = productDocs[i].data().stock || 0;
                const requestedQty = orderData.items[i].quantity;
                transaction.update(productRef, { stock: currentStock - requestedQty });
            }

            // 4. Write: Create Order
            const newOrderRef = doc(ordersCollection); // generate ID
            transaction.set(newOrderRef, {
                ...orderData,
                status: "pending",
                createdAt: serverTimestamp()
            });

            return newOrderRef.id;
        });

        return orderId;

    } catch (error) {
        console.error("Transaction failed: ", error);
        throw error;
    }
}

// Fetch User Orders
export async function getUserOrders(userId) {
    try {
        const q = query(ordersCollection, where("userId", "==", userId), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        return orders;
    } catch (error) {
        console.error("Error fetching orders: ", error);
        throw error;
    }
}

// Cancel Order (Transactional)
export async function cancelOrder(orderId) {
    try {
        await runTransaction(db, async (transaction) => {
            const orderRef = doc(db, "orders", orderId);
            const orderDoc = await transaction.get(orderRef);

            if (!orderDoc.exists()) {
                throw "Order does not exist.";
            }

            const orderData = orderDoc.data();
            if (orderData.status !== 'pending') {
                throw "Only pending orders can be cancelled.";
            }

            // 1. Restore Stock
            for (const item of orderData.items) {
                const productRef = doc(db, "medicines", item.id);
                // We need to read the product doc to update it transactionally? 
                // Using increment is simpler if we don't need to read exact value first for logic, 
                // but standard firestore transaction requires read-before-write if modifying based on current state usually.
                // However, increment is an atomic operation. 
                // But inside transaction, we should follow read-modify-write pattern or use raw atomic updates if independent.
                // To be safe and consistent with transaction rules (read constraints), let's read it.
                const productDoc = await transaction.get(productRef);
                if (productDoc.exists()) {
                    const currentStock = productDoc.data().stock || 0;
                    transaction.update(productRef, { stock: currentStock + item.quantity });
                }
            }

            // 2. Update Order Status
            transaction.update(orderRef, { status: 'cancelled' });
        });

        return true;
    } catch (error) {
        console.error("Error cancelling order:", error);
        throw error;
    }
}

// Add Review (Verified Purchase Only)
export async function addReview(userId, productId, rating, comment, userName) {
    try {
        // 1. Check if user bought the product
        const q = query(ordersCollection, where("userId", "==", userId));
        const ordersSnap = await getDocs(q);

        let hasPurchased = false;
        ordersSnap.forEach(doc => {
            const items = doc.data().items || [];
            if (items.some(item => item.id === productId)) {
                hasPurchased = true;
            }
        });

        if (!hasPurchased) {
            throw "You can only review products you have purchased.";
        }

        // 2. Add Review & Update Average (Transactional)
        await runTransaction(db, async (transaction) => {
            // Get product to update stats
            const productRef = doc(db, "medicines", productId);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists()) throw "Product not found";

            const data = productDoc.data();
            const currentRatingCount = data.ratingCount || 0;
            const currentAverage = data.averageRating || 0;

            // New Average Calculation
            // (OldAvg * OldCount + NewRating) / (OldCount + 1)
            const newRatingCount = currentRatingCount + 1;
            const newAverage = ((currentAverage * currentRatingCount) + rating) / newRatingCount;

            // Create Review Doc
            const newReviewRef = doc(collection(db, "reviews"));
            transaction.set(newReviewRef, {
                userId,
                productId,
                userName,
                rating,
                comment,
                createdAt: serverTimestamp()
            });

            // Update Product Stats
            transaction.update(productRef, {
                averageRating: newAverage,
                ratingCount: newRatingCount
            });
        });

        return true;

    } catch (error) {
        console.error("Error adding review:", error);
        throw error;
    }
}

// Get Reviews
export async function getReviews(productId) {
    try {
        const q = query(collection(db, "reviews"), where("productId", "==", productId), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const reviews = [];
        snapshot.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
        return reviews;
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return []; // Return empty if fail/no index (though we used simple query)
    }
}
