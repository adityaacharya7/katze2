
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection, query, where, getDocs,
    doc, getDoc, updateDoc, addDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    updateUserProfileWrapper,
    updateUserPasswordWrapper,
    logoutUser
} from './auth.js';

// DOM Elements
const sidebarUsername = document.getElementById('sidebar-username');
const sidebarEmail = document.getElementById('sidebar-email');
const userAvatarInitial = document.getElementById('user-avatar-initial');
const dashboardUsername = document.getElementById('dashboard-username');
const navItems = document.querySelectorAll('.account-nav li[data-target]');
const tabContents = document.querySelectorAll('.account-tab-content');
const logoutBtn = document.getElementById('account-logout-btn');

// Profile Form Elements
const profileForm = document.getElementById('profileForm');
const profileNameInput = document.getElementById('profile-name');
const profileEmailInput = document.getElementById('profile-email');

// Password Form Elements
const passwordForm = document.getElementById('passwordForm');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');

// Address Elements
const addressList = document.getElementById('address-list');
const addAddressBtn = document.getElementById('add-address-btn');
const addressFormContainer = document.getElementById('address-form-container');
const addressForm = document.getElementById('addressForm');
const cancelAddressBtn = document.getElementById('cancel-address-btn');

// Orders Elements
const ordersList = document.getElementById('orders-list');
const totalOrdersCard = document.getElementById('total-orders-card');

let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {

    // Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            initAccountPage(user);
        } else {
            // Not logged in, redirect
            window.location.href = 'login.html';
        }
    });

    // Navigation Logic
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            switchTab(target);
        });
    });

    // Switch Tab Links in Dashboard
    document.querySelectorAll('.switch-tab').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            switchTab(target);
        });
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await logoutUser();
            window.location.href = 'login.html';
        } catch (error) {
            console.error(error);
            alert("Logout failed");
        }
    });

    // Profile Update
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = profileNameInput.value.trim();
        if (!newName) return;

        try {
            await updateUserProfileWrapper(currentUser, { displayName: newName });
            // Update Firestore too
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, { username: newName });

            alert("Profile updated successfully!");
            updateUI(currentUser);
        } catch (error) {
            console.error(error);
            alert("Error updating profile: " + error.message);
        }
    });

    // Password Update
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPass = newPasswordInput.value;
        const confirmPass = confirmPasswordInput.value;

        if (newPass !== confirmPass) {
            alert("Passwords do not match!");
            return;
        }

        try {
            await updateUserPasswordWrapper(currentUser, newPass);
            alert("Password changed successfully!");
            passwordForm.reset();
        } catch (error) {
            console.error(error);
            alert("Error changing password: " + error.message);
        }
    });

    // Address Book Logic
    addAddressBtn.addEventListener('click', () => {
        openAddressForm();
    });

    cancelAddressBtn.addEventListener('click', () => {
        closeAddressForm();
    });

    addressForm.addEventListener('submit', handleAddressSubmit);

});

// Functions

function initAccountPage(user) {
    updateUI(user);
    loadOrders(user.uid);
    loadAddresses(user.uid);
}

function updateUI(user) {
    const name = user.displayName || "User";
    const email = user.email;

    sidebarUsername.textContent = name;
    sidebarEmail.textContent = email;
    userAvatarInitial.textContent = name.charAt(0).toUpperCase();
    dashboardUsername.textContent = name;

    profileNameInput.value = name;
    profileEmailInput.value = email;
}

function switchTab(targetId) {
    // Nav Active State
    navItems.forEach(nav => {
        if (nav.getAttribute('data-target') === targetId) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });

    // Tab Content Display
    tabContents.forEach(tab => {
        if (tab.id === targetId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

// --- Orders ---
async function loadOrders(userId) {
    try {
        const q = query(collection(db, "orders"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        ordersList.innerHTML = '';
        let count = 0;

        if (querySnapshot.empty) {
            ordersList.innerHTML = '<tr><td colspan="5" class="text-center">No orders found.</td></tr>';
        } else {
            querySnapshot.forEach((doc) => {
                count++;
                const order = doc.data();
                const date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
                // Status Badge
                let badgeClass = 'badge-secondary';
                if (order.status === 'Completed' || order.status === 'Delivered') badgeClass = 'badge-success';
                else if (order.status === 'Pending') badgeClass = 'badge-warning';

                const row = `
                    <tr>
                        <td>#${doc.id.slice(0, 8)}...</td>
                        <td>${date}</td>
                        <td><span class="badge ${badgeClass}">${order.status || 'Pending'}</span></td>
                        <td>Rs. ${order.totalAmount || 0}</td>
                        <td><a href="#" class="boxed-btn" style="padding: 5px 10px; font-size: 12px;">View</a></td>
                    </tr>
                `;
                ordersList.insertAdjacentHTML('beforeend', row);
            });
        }

        if (totalOrdersCard) {
            totalOrdersCard.querySelector('.count').textContent = count;
        }

    } catch (error) {
        console.error("Error loading orders:", error);
        ordersList.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading orders.</td></tr>';
    }
}

// --- Addresses ---
async function loadAddresses(userId) {
    try {
        const addressColl = collection(db, "users", userId, "addresses");
        const snapshot = await getDocs(addressColl);

        addressList.innerHTML = '';

        if (snapshot.empty) {
            addressList.innerHTML = '<div class="col-12"><p>No addresses saved yet.</p></div>';
        } else {
            snapshot.forEach((doc) => {
                const addr = doc.data();
                const card = `
                    <div class="col-md-6">
                        <div class="address-box">
                            <h5>${addr.name}</h5>
                            <p>${addr.line1}</p>
                            ${addr.line2 ? `<p>${addr.line2}</p>` : ''}
                            <p>${addr.city}, ${addr.state} ${addr.zip}</p>
                            <p>Phone: ${addr.phone}</p>
                            <div class="address-actions">
                                <span class="edit-btn" onclick="editAddress('${doc.id}')">Edit</span>
                                <span class="delete-btn" onclick="deleteAddress('${doc.id}')">Delete</span>
                            </div>
                        </div>
                    </div>
                `;
                addressList.insertAdjacentHTML('beforeend', card);
            });
        }

        // Attach global handlers for inline onclicks (hacky but works for simple vanilla js)
        window.editAddress = (id) => prepareEditAddress(id, userId);
        window.deleteAddress = (id) => performDeleteAddress(id, userId);

    } catch (error) {
        console.error("Error loading addresses:", error);
        addressList.innerHTML = '<div class="col-12 text-danger">Error loading addresses.</div>';
    }
}

function openAddressForm(reset = true) {
    if (reset) {
        addressForm.reset();
        document.getElementById('address-id').value = '';
        document.getElementById('address-form-title').textContent = 'Add New Address';
    }
    addressFormContainer.style.display = 'block';
    addressFormContainer.scrollIntoView({ behavior: 'smooth' });
}

function closeAddressForm() {
    addressFormContainer.style.display = 'none';
}

async function handleAddressSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('address-id').value;

    const addressData = {
        name: document.getElementById('addr-name').value,
        phone: document.getElementById('addr-phone').value,
        line1: document.getElementById('addr-line1').value,
        line2: document.getElementById('addr-line2').value,
        city: document.getElementById('addr-city').value,
        state: document.getElementById('addr-state').value,
        zip: document.getElementById('addr-zip').value
    };

    try {
        const addressColl = collection(db, "users", currentUser.uid, "addresses");

        if (id) {
            // Update
            await updateDoc(doc(addressColl, id), addressData);
            alert("Address updated!");
        } else {
            // Add
            await addDoc(addressColl, addressData);
            alert("Address added!");
        }

        closeAddressForm();
        loadAddresses(currentUser.uid);

    } catch (error) {
        console.error("Error saving address:", error);
        alert("Error saving address: " + error.message);
    }
}

async function prepareEditAddress(id, userId) {
    try {
        const docRef = doc(db, "users", userId, "addresses", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('address-id').value = id;
            document.getElementById('addr-name').value = data.name;
            document.getElementById('addr-phone').value = data.phone;
            document.getElementById('addr-line1').value = data.line1;
            document.getElementById('addr-line2').value = data.line2 || '';
            document.getElementById('addr-city').value = data.city;
            document.getElementById('addr-state').value = data.state;
            document.getElementById('addr-zip').value = data.zip;

            document.getElementById('address-form-title').textContent = 'Edit Address';
            openAddressForm(false);
        }
    } catch (error) {
        console.error(error);
    }
}

async function performDeleteAddress(id, userId) {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
        await deleteDoc(doc(db, "users", userId, "addresses", id));
        loadAddresses(userId);
    } catch (error) {
        console.error(error);
        alert("Error deleting address");
    }
}
