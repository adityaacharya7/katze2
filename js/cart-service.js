import { auth, db } from './firebase-config.js';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const LOCAL_STORAGE_KEY = 'katze_cart';

export const CartService = {
    async addToCart(product) {
        const user = auth.currentUser;
        if (user) {
            // Firestore: users/{uid}/cart/{productId}
            const cartRef = doc(db, 'users', user.uid, 'cart', product.id);
            try {
                const docSnap = await getDoc(cartRef);
                let quantity = product.quantity || 1;

                if (docSnap.exists()) {
                    quantity += docSnap.data().quantity;
                }

                await setDoc(cartRef, { ...product, quantity });
                console.log("Product added to Firestore cart");
            } catch (e) {
                console.error("Error adding to cart (Firestore):", e);
                // Fallback or alert? For now just log.
                alert("Error syncing cart. Please try again.");
            }
        } else {
            // Local Storage
            let cart = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
            const existingIndex = cart.findIndex(item => item.id === product.id);

            if (existingIndex > -1) {
                cart[existingIndex].quantity += (product.quantity || 1);
            } else {
                cart.push({ ...product, quantity: product.quantity || 1 });
            }
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
            console.log("Product added to Local cart");
        }
    },

    async getCart() {
        const user = auth.currentUser;
        if (user) {
            try {
                const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'cart'));
                const items = [];
                querySnapshot.forEach((doc) => {
                    items.push(doc.data());
                });
                return items;
            } catch (e) {
                console.error("Error fetching cart:", e);
                return [];
            }
        } else {
            return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
        }
    },

    async removeFromCart(productId, index) {
        const user = auth.currentUser;
        if (user) {
            try {
                await deleteDoc(doc(db, 'users', user.uid, 'cart', productId));
            } catch (e) {
                console.error("Error removing from cart:", e);
            }
        } else {
            let cart = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
            // If index is provided use it, otherwise filter by ID (fallback)
            if (typeof index !== 'undefined') {
                cart.splice(index, 1);
            } else {
                cart = cart.filter(item => item.id !== productId);
            }
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
        }
    },

    async clearCart() {
        const user = auth.currentUser;
        if (user) {
            const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'cart'));
            const deletePromises = [];
            querySnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref));
            });
            await Promise.all(deletePromises);
        } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    },

    // Helper to get total count for the badge
    async getCartCount() {
        const cart = await this.getCart();
        return cart.reduce((acc, item) => acc + item.quantity, 0);
    }
};
