import { db, storage } from './firebase-config.js';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    getDocs,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const productsCollection = collection(db, "medicines");

// Upload Image to Firebase Storage
export async function uploadProductImage(file) {
    try {
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}

// Add New Product
export async function addProduct(productData) {
    try {
        const docRef = await addDoc(productsCollection, {
            ...productData,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding product:", error);
        throw error;
    }
}

// Update Product
export async function updateProduct(productId, updateData) {
    try {
        const productRef = doc(db, "medicines", productId);
        await updateDoc(productRef, updateData);
    } catch (error) {
        console.error("Error updating product:", error);
        throw error;
    }
}

// Delete Product
export async function deleteProduct(productId) {
    try {
        const productRef = doc(db, "medicines", productId);
        await deleteDoc(productRef);
    } catch (error) {
        console.error("Error deleting product:", error);
        throw error;
    }
}

// Toggle Stock Status
export async function toggleStock(productId, currentStatus) {
    try {
        const productRef = doc(db, "medicines", productId);
        // If currentStatus is boolean true (in stock), make it false. Or string based?
        // Let's assume schema has a field `inStock` (boolean).
        await updateDoc(productRef, {
            inStock: !currentStatus
        });
    } catch (error) {
        console.error("Error toggling stock:", error);
        throw error;
    }
}

// Listen to Orders (Real-time)
export function listenToOrders(callback) {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const orders = [];
        snapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        callback(orders);
    }, (error) => {
        console.error("Error listening to orders:", error);
    });
}

// Update Order Status
export async function updateOrderStatus(orderId, status) {
    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { status: status });
    } catch (error) {
        console.error("Error updating order status:", error);
        throw error;
    }
}

// Update Tracking Number
export async function updateTracking(orderId, trackingNumber) {
    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { trackingNumber: trackingNumber });
    } catch (error) {
        console.error("Error updating tracking:", error);
        throw error;
    }
}
