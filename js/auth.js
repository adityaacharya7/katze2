import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    updatePassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Register User
export async function registerUser(email, password, username) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile with username
        await updateProfile(user, {
            displayName: username
        });

        // Create User Document in Firestore with default role
        await setDoc(doc(db, "users", user.uid), {
            username: username,
            email: email,
            role: 'user', // Default role
            createdAt: new Date()
        });

        // Send Email Verification
        await sendEmailVerification(user);

        return user;
    } catch (error) {
        throw error;
    }
}

// Login User
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
}

// Google Sign-In
export async function loginWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;

        // Check if user document exists
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            // Create user doc if first time login
            await setDoc(docRef, {
                username: user.displayName,
                email: user.email,
                role: 'user',
                createdAt: new Date()
            });
        }

        return user;
    } catch (error) {
        throw error;
    }
}

// Forgot Password
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        throw error;
    }
}

// Logout User
export async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        throw error;
    }
}

// Resend Verification Email
export async function resendVerification(user) {
    try {
        await sendEmailVerification(user);
    } catch (error) {
        throw error;
    }
}

// Update User Profile
export async function updateUserProfileWrapper(user, data) {
    try {
        await updateProfile(user, data);
    } catch (error) {
        throw error;
    }
}

// Update User Password
export async function updateUserPasswordWrapper(user, password) {
    try {
        await updatePassword(user, password);
    } catch (error) {
        throw error;
    }
}
