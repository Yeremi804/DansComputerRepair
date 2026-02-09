// Import the twilio library to connect to Twilio's services.
import twilio from 'twilio';

// Read our secret credentials and phone number from the .env.local file.
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Create a new Twilio client (like a remote control) to interact with the API.
const client = twilio(accountSid, authToken);

// Create and export a function that we can use in other files to send an SMS.
// It takes the recipient's phone number (targetPhone) and the message content (messageBody) as arguments.
async function sendSms(targetPhone, messageBody) {
  try {
    // Use the client to create and send the message.
    const message = await client.messages.create({
      body: messageBody,        // The text content of the message
      from: twilioPhoneNumber,  // Our Twilio phone number (the sender)
      to: targetPhone,          // The customer's phone number (the recipient)
    });

    // Log to the console that it was successful and return a success status.
    console.log("SMS sent successfully! SID:", message.sid);
    return { success: true, sid: message.sid };

  } catch (error) {
    // If something goes wrong, log the error and return a failure status.
    console.error("Error sending SMS:", error);
    return { success: false, error: error.message };
  }
}

export default sendSms;
