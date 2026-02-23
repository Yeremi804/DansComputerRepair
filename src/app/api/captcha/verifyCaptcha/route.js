import { NextResponse } from "next/server";

//This create the API route for verifying the captcha answer, it receives the user input from the client, then compares it with the answer stored in the cookie, if they match, it returns success, otherwise it returns failure. This is a simple implementation and can be improved by adding more security measures, such as rate limiting, IP blocking, etc. to prevent brute force attacks.
export async function POST(req) {
  try {
    const { userInput } = await req.json();
    
    // Grab the cookie value
    const cookieStore = req.cookies;
    const storedAnswer = cookieStore.get("captcha_answer")?.value;


    //Debugging logs
    console.log("User Input:", userInput);
    console.log("Cookie found:", storedAnswer);

    //Checking if the cookie exist and matches the User Input
    if (storedAnswer && userInput === storedAnswer) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: "Captcha verification failed." }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}