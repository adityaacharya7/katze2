import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM Elements
const authSection = document.getElementById('auth-section');
const cartCount = document.getElementById('cart-count');
const geoLocation = document.getElementById('geo-location');

// Monitor Auth State
// Monitor Auth State
onAuthStateChanged(auth, (user) => {
    const protectedPages = ['cart.html', 'checkout.html', 'orders.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (user) {
        // User is signed in
        const username = user.displayName || user.email.split('@')[0];
        const userEmail = user.email;

        // Render Dropdown
        // Note: Using inline styles for simplicity as requested, but ideally class-based
        authSection.innerHTML = `
            <div style="position: relative; display: inline-block;" id="user-dropdown-container">
                <button id="user-menu-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; display: flex; align-items: center; gap: 5px;">
                    Welcome, ${username} <span style="font-size: 12px;">▼</span>
                </button>
                <div id="user-dropdown" style="display: none; position: absolute; right: 0; background-color: #333; min-width: 200px; box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2); z-index: 1000; border-radius: 4px; padding: 10px; margin-top: 5px;">
                    <div style="padding: 8px 12px; color: #aaa; font-size: 12px; border-bottom: 1px solid #444; margin-bottom: 5px;">
                        ${userEmail}
                    </div>
                    <a href="orders.html" style="color: white; padding: 8px 12px; text-decoration: none; display: block;">My Orders</a>
                    <a href="#" id="logout-btn" style="color: #ffcc00; padding: 8px 12px; text-decoration: none; display: block;">Logout</a>
                </div>
            </div>
        `;

        // Dropdown Toggle Logic
        const dropdownBtn = document.getElementById('user-menu-btn');
        const dropdownContent = document.getElementById('user-dropdown');

        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (dropdownContent) dropdownContent.style.display = 'none';
        });

        // Attach Logout Handler
        document.getElementById('logout-btn').addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error("Logout Error:", error);
            });
        });

        // Email Verification Check (Optional: Alert user if not verified)
        if (!user.emailVerified) {
            // You could show a banner here if desired
            // console.log("User email not verified");
        }

    } else {
        // User is signed out

        // Page Protection: Redirect if trying to access protected pages
        if (protectedPages.includes(currentPage)) {
            // Save return URL logic could go here if needed
            window.location.href = 'login.html';
        }

        authSection.innerHTML = `<a href="login.html" id="login-link">Login</a>`;
    }
});

// Update Cart Count (Local Storage)
function updateCartUI() {
    const cart = JSON.parse(localStorage.getItem('katze_cart')) || [];
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);

    if (cartCount) {
        if (count > 0) {
            cartCount.textContent = count;
            cartCount.style.display = 'inline-block';
        } else {
            cartCount.style.display = 'none';
        }
    }
}

// Geolocation
function initGeolocation() {
    if (geoLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const apiKey = "4c3bb5b8070f4edcbff5925655f12d0e";
            const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${apiKey}`;

            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.results.length > 0) {
                        const loc = data.results[0].components;
                        const city = loc.city || loc.town || loc.village;
                        const country = loc.country;
                        geoLocation.innerHTML = `📍 ${city}, ${country}`;
                    }
                })
                .catch(err => console.error(err));
        }, (error) => {
            geoLocation.innerHTML = "Location access denied.";
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    initGeolocation();
});

export { updateCartUI };
