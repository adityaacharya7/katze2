const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure Nodemailer (Placeholder)
// In production, use environment variables: functions.config().gmail.email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // REPLACE WITH REAL EMAIL
        pass: 'your-email-password'    // REPLACE WITH APP PASSWORD
    }
});

exports.onUserCreated = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snap, context) => {
        const user = snap.data();
        const email = user.email;

        const mailOptions = {
            from: 'Katze Support <noreply@katze.com>',
            to: email,
            subject: 'Welcome to Katze!',
            text: `Hi ${user.displayName || 'Friend'},\n\nWelcome to Katze! We are happy to have you.`
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Welcome email sent to:', email);
        } catch (error) {
            console.error('Error sending welcome email:', error);
        }
    });

exports.onOrderCreated = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data();
        const email = order.userEmail; // Ensure we save this in order doc

        const mailOptions = {
            from: 'Katze Orders <orders@katze.com>',
            to: email,
            subject: `Order Confirmation #${context.params.orderId}`,
            text: `Thank you for your order! Total: ₹${order.totalAmount}. We will notify you when it ships.`
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Order confirmation sent to:', email);
        } catch (error) {
            console.error('Error sending order email:', error);
        }
    });

exports.onOrderUpdated = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();

        if (newData.status !== oldData.status) {
            const email = newData.userEmail;
            const mailOptions = {
                from: 'Katze Updates <updates@katze.com>',
                to: email,
                subject: `Order Update #${context.params.orderId}`,
                text: `Your order status has changed to: ${newData.status.toUpperCase()}.`
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log('Status update email sent to:', email);
            } catch (error) {
                console.error('Error sending status email:', error);
            }
        }
    });
