const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmail(mailOptions) {
    if (!mailOptions.to) {
        console.error('❌ Email failed: No recipient specified!');
        return false;
    }
    
    try {
        console.log(`📧 Attempting to send email to ${mailOptions.to}...`);
        await transporter.sendMail({
            from: `"FitConnect Support" <${process.env.EMAIL_USER}>`,
            ...mailOptions
        });
        console.log(`✅ Email sent successfully to ${mailOptions.to}`);
        return true;
    } catch (err) {
        console.error('❌ Email failed to send:', err.message);
        
        if (err.code === 'EAUTH') {
            console.error('   -> Auth Error: Your EMAIL_USER or EMAIL_PASS in .env is incorrect.');
            console.error('   -> Tip: Ensure you are using a 16-character App Password, NOT your regular password.');
        } else if (err.code === 'ESOCKET') {
            console.error('   -> Network Error: Could not connect to Gmail. Check your internet connection.');
        } else {
            console.error('   -> Error Code:', err.code || 'N/A');
        }
        
        console.log(`\n--- DEVELOPMENT FALLBACK ---\nIf you are seeing this, check your terminal for the OTP code instead of your inbox.\n----------------------------\n`);
        return false;
    }
}

async function sendBookingStatusEmail(clientEmail, trainerName, status, bookingDate, suggestion = null) {
    const isApproved = status === 'approved' || status === 'confirmed';
    const isDone = status === 'done';
    
    let statusText = isApproved ? 'Confirmed' : 'Declined';
    if (isDone) statusText = 'Completed';
    
    let statusColor = isApproved ? '#10b981' : '#ef4444';
    if (isDone) statusColor = '#06b6d4'; // Cyan for Done
    
    const dateObj = new Date(bookingDate);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let messageBody = '';
    if (isApproved) {
        messageBody = `<p style="color: #4b5563; line-height: 1.6;">Please be ready for your session at the scheduled time. Your trainer will contact you shortly if there are any further instructions.</p>`;
    } else if (isDone) {
        messageBody = `<p style="color: #4b5563; line-height: 1.6;">Great job on completing your session! We hope you had a fantastic workout.</p>`;
    } else {
        messageBody = `<p style="color: #4b5563; line-height: 1.6;">We apologize for any inconvenience. Please feel free to check other available slots or trainers on our platform.</p>`;
        
        if (suggestion) {
            messageBody += `
                <div style="margin-top: 20px; padding: 15px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                    <p style="margin: 0; color: #991b1b; font-weight: bold;">Trainer's Suggestion:</p>
                    <p style="margin: 10px 0 0 0; color: #4b5563;">"I am busy right now, but I am available <strong>${suggestion}</strong>. Please book that slot instead!"</p>
                </div>
            `;
        }
    }

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #059669; margin: 0;">FitConnect</h1>
                <p style="color: #6b7280; font-size: 14px;">Your Fitness Journey, Simplified</p>
            </div>
            
            <h2 style="color: #111827; font-size: 20px; text-align: center;">Booking Update</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">Hello,</p>
            <p style="color: #4b5563; line-height: 1.6;">Your session with <strong>${trainerName}</strong> has been <span style="color: ${statusColor}; font-weight: bold; text-transform: uppercase;">${statusText}</span>.</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #f3f4f6;">
                <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Session Details</h3>
                <p style="margin: 10px 0; color: #111827;"><strong>Date:</strong> ${dateStr}</p>
                <p style="margin: 10px 0; color: #111827;"><strong>Time:</strong> ${timeStr}</p>
            </div>
            
            ${messageBody}
            
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
                <p style="color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} FitConnect. All rights reserved.</p>
            </div>
        </div>
    `;

    return sendEmail({
        to: clientEmail,
        subject: `FitConnect Booking ${statusText}: ${trainerName}`,
        html
    });
}

async function sendTrainerApprovalEmail(trainerEmail, trainerName, loginUrl) {
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0ea5e9; margin: 0;">FitConnect</h1>
                <p style="color: #6b7280; font-size: 14px;">Your Fitness Journey, Simplified</p>
            </div>
            
            <h2 style="color: #111827; font-size: 20px; text-align: center;">Application Approved! 🎉</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">Hello <strong>${trainerName}</strong>,</p>
            <p style="color: #4b5563; line-height: 1.6;">Congratulations! Your application to become a verified FitConnect trainer has been reviewed and <strong>APPROVED</strong> by our admin team.</p>
            
            <p style="color: #4b5563; line-height: 1.6;">You can now log in to the trainer portal to set up your profile, manage client bookings, and track your training sessions.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="background: linear-gradient(135deg, #0ea5e9, #6366f1); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);">Go to Trainer Portal</a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">Welcome to the team!</p>
            
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6;">
                <p style="color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} FitConnect. All rights reserved.</p>
            </div>
        </div>
    `;

    return sendEmail({
        to: trainerEmail,
        subject: '🎉 FitConnect Trainer Application Approved!',
        html
    });
}

module.exports = {
    sendEmail,
    sendBookingStatusEmail,
    sendTrainerApprovalEmail
};
