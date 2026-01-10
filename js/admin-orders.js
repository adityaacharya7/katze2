
import {
    listenToOrders,
    updateOrderStatus,
    updateTracking
} from './admin-service.js';

let currentOrders = [];
let statusFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {

    // Initialize Listener
    listenToOrders((orders) => {
        currentOrders = orders;
        renderOrders();
    });

    // Filter Logic
    document.getElementById('orderStatusFilter').addEventListener('change', (e) => {
        statusFilter = e.target.value;
        renderOrders();
    });

});

function renderOrders() {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '';

    const filtered = statusFilter === 'all'
        ? currentOrders
        : currentOrders.filter(o => (o.status || 'pending').toLowerCase() === statusFilter);

    filtered.forEach(order => {
        const date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'N/A';
        const total = order.totalAmount ? order.totalAmount.toFixed(2) : '0.00';
        const status = order.status || 'pending';
        const user = order.userEmail || 'Guest';
        const tracking = order.trackingNumber || '';

        // Status Colors
        let badgeClass = 'badge-secondary';
        if (status === 'packed') badgeClass = 'badge-info';
        else if (status === 'shipped') badgeClass = 'badge-primary';
        else if (status === 'delivered') badgeClass = 'badge-success';
        else if (status === 'cancelled') badgeClass = 'badge-danger';
        else if (status === 'pending') badgeClass = 'badge-warning';

        const row = `
            <tr>
                <td><small>${order.id}</small></td>
                <td>
                    <div><strong>${order.name || 'User'}</strong></div>
                    <div class="text-muted" style="font-size: 11px;">${user}</div>
                </td>
                <td><small>${date}</small></td>
                <td>
                    <ul style="padding-left: 15px; margin: 0; font-size: 11px;">
                        ${order.items.map(i => `<li>${i.name} (x${i.quantity})</li>`).join('')}
                    </ul>
                </td>
                <td>₹${total}</td>
                <td>
                    <select onchange="changeStatus('${order.id}', this.value)" class="form-control form-control-sm" style="width: 120px; font-size: 12px;">
                        <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="packed" ${status === 'packed' ? 'selected' : ''}>Packed</option>
                        <option value="shipped" ${status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <div class="input-group input-group-sm" style="width: 150px;">
                        <input type="text" class="form-control" placeholder="Tracking #" value="${tracking}" id="track-${order.id}">
                        <div class="input-group-append">
                            <button class="btn btn-outline-secondary" type="button" onclick="saveTracking('${order.id}')"><i class="fas fa-save"></i></button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

// Global Handlers
window.changeStatus = async (id, newStatus) => {
    try {
        await updateOrderStatus(id, newStatus);
        // Toast or specific UI feedback if needed, but table will update automatically via listener
    } catch (error) {
        alert("Failed to update status: " + error.message);
    }
};

window.saveTracking = async (id) => {
    const val = document.getElementById(`track-${id}`).value;
    try {
        await updateTracking(id, val);
        alert("Tracking updated!");
    } catch (error) {
        alert("Failed to update tracking: " + error.message);
    }
};
