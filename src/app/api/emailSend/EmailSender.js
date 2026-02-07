//Important note: This has a limited feature of 100 email per days, not suitable for medium to large scale application, for that you can use services like SendGrid, Mailgun, etc. which have free tiers and are easy to integrate with Node.js applications. This is just a simple implementation using nodemailer for demonstration purposes.
//Another note: Make sure to remove comment deemed to be sensitive before deploying to production, and also make sure to set up the email account properly to avoid issues with sending emails.
import nodemailer from "nodemailer";
// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    //Host has to be gmail for this to work, port 465 is for secure connection
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        //include email and password in .env.local for security, and use them here
        user: process.env.EMAIL_USER,
        //this required setting up gmail password and enabling 2 step vertification, then creating an app password for this to work, use that app password here
        //make sure to remember those password or else you Will have to create another one
        pass: process.env.EMAIL_PASSWORD,
    },
});

//creating a function to send email, which will be used in the server action to send email when order status is completed, it takes target email, subject and text as parameters
async function sendEmail(targetEmail, subject, text) {
    try {
        await transporter.sendMail({
            from: "Admin <" + process.env.EMAIL_USER + ">",
            to: targetEmail,
            subject: subject,
            text: text
        });
        console.log("Email sent successfully to:", targetEmail);
    } catch (error) {
        console.error("Error sending email to", targetEmail, ":", error);
    }
}

export default sendEmail; 

