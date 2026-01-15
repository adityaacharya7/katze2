import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { CartService } from './cart-service.js';

// DOM Elements
// DOM Elements
const authActions = document.getElementById('auth-actions');
const cartCount = document.getElementById('cart-count');
const geoLocation = document.getElementById('geo-location');

// Monitor Auth State
onAuthStateChanged(auth, (user) => {
    const protectedPages = ['cart.html', 'checkout.html', 'orders.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (user) {
        // User is signed in
        const username = user.displayName || user.email.split('@')[0];
        const userEmail = user.email;

        // Render Dropdown
        if (authActions) {
            authActions.innerHTML = `
                <div class="relative inline-block text-left" id="user-dropdown-container">
                    <button id="user-menu-btn" class="flex items-center gap-2 text-pet-dark font-medium hover:text-pet-orange transition-colors focus:outline-none">
                        <span>${username}</span>
                        <i data-lucide="chevron-down" width="16"></i>
                    </button>
                    <!-- Dropdown menu -->
                    <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden transform transition-all duration-200 origin-top-right">
                        <div class="py-3 px-4 border-b border-gray-100 bg-pet-cream/50">
                            <p class="text-sm font-medium text-pet-dark truncate">${username}</p>
                            <p class="text-xs text-gray-500 truncate">${userEmail}</p>
                        </div>
                        <div class="py-1">
                            <a href="orders.html" class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-pet-cream hover:text-pet-orange transition-colors">
                                <i data-lucide="package" width="16"></i> My Orders
                            </a>
                            <a href="account.html" class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-pet-cream hover:text-pet-orange transition-colors">
                                <i data-lucide="user" width="16"></i> Account
                            </a>
                        </div>
                        <div class="py-1 border-t border-gray-100">
                             <a href="#" id="logout-btn" class="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                                <i data-lucide="log-out" width="16"></i> Logout
                            </a>
                        </div>
                    </div>
                </div>
            `;

            // Re-initialize icons for the new content
            if (window.lucide) window.lucide.createIcons();

            // Dropdown Toggle Logic
            const dropdownBtn = document.getElementById('user-menu-btn');
            const dropdownContent = document.getElementById('user-dropdown');

            if (dropdownBtn && dropdownContent) {
                dropdownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownContent.classList.toggle('hidden');
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    if (!dropdownContent.classList.contains('hidden')) {
                        dropdownContent.classList.add('hidden');
                    }
                });
            }

            // Attach Logout Handler
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    signOut(auth).then(() => {
                        window.location.href = 'index.html';
                    }).catch((error) => {
                        console.error("Logout Error:", error);
                    });
                });
            }
        }

    } else {
        // User is signed out

        // Page Protection: Redirect if trying to access protected pages
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }

        if (authActions) {
            authActions.innerHTML = `
                <a href="signup.html" class="bg-pet-dark text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl">
                    Sign up
                </a>
                <a href="login.html" class="text-pet-dark font-medium hover:text-pet-orange transition-colors text-sm">
                    Login
                </a>
            `;
        }
    }
});

// Update Cart Count
async function updateCartUI() {
    if (!cartCount) return;
    try {
        const count = await CartService.getCartCount();
        cartCount.innerText = count;
        // Optional: Show/Hide badge if count > 0
    } catch (error) {
        console.error("Error updating cart UI:", error);
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
