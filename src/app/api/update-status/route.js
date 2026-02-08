import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sendEmail from '../emailSend/EmailSender';
import sendSms from '../smsSend/SmsSender';

export async function POST(request) {
  const body = await request.json();
  const { id, source, newStatus } = body;
  if (!id || !source || !newStatus) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let table = '';
  let idField = '';
  if (source === 'Configuration_Form') {
    table = 'Configuration_Form';
    idField = 'id';
  } else if (source === 'service_requests') {
    table = 'service_requests';
    idField = 'serial_id'; // Use serial_id for service_requests
  } else {
    table = 'Admin_Page_Order';
    idField = 'ID';
  }

  //Collecting information of the order to have email being send
  const {data: rowData, error: fetcherror } = await supabase
    .from(table)
    .select('*')
    .eq(idField, id)
    .single();
  if (fetcherror) {
    return NextResponse.json({ error: fetcherror.message }, { status: 500 });
  }

  const { error } = await supabase
    .from(table)
    .update({ Status: newStatus })
    .eq(idField, id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  //Fetch email notification if it ever exist
  const customerEmail = rowData.email;
  if(customerEmail) {
    let subject = '';
    let text = '';
    if (newStatus === 'Completed') {
      subject = `Your order #${id} is complete - Please leave a review!`;
      text = `Dear Customer,\n\nYour order #${id} has been completed!\n\nWe'd love to hear about your experience. Please take a moment to leave a review:\n\n/review-form\n\nThank you for your business!\n\nBest regards,\nDan's Computer Repair Team`;
      await sendEmail(customerEmail, subject, text);
    }else {
     subject = `Your order with ID ${id} has been updated to ${newStatus}`;
     text = `Dear Customer,\n\nYour order with ID ${id} has been updated to ${newStatus}.\n\nThank you for your business!`;
    await sendEmail(customerEmail, subject, text); 
    }
  }

  // SMS notification
  const customerPhone = rowData.phone_number || rowData.phone;
  const smsConsent = rowData.sms_consent;

  // Check if the customer has provided a phone number AND consented to SMS.
  if (customerPhone && smsConsent) {
    let smsText = '';
    if (newStatus === 'Completed') {
      // A shorter message for SMS
      smsText = `Your order #${id} is complete! Please consider leaving a review on our website. Thank you! -Dan's Computer Repair`;
    } else {
      smsText = `Your order #${id} has been updated to '${newStatus}'. -Dan's Computer Repair`;
    }

    // Use a try-catch block to prevent SMS errors from crashing the API.
    try {
      await sendSms(customerPhone, smsText);
      console.log(`SMS notification sent to: ${customerPhone}`);
    } catch (smsError) {
      console.error(`Failed to send SMS to ${customerPhone}:`, smsError);
    }
  }

  return NextResponse.json({ success: true }); 
}
