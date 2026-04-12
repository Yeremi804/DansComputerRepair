import { POST } from "../src/app/api/update-status/route";
import { createClient } from "@supabase/supabase-js";
import sendSms from "../src/app/api/smsSend/SmsSender";
import { NextResponse } from "next/server";

// Mock dependencies
jest.mock("@supabase/supabase-js");
jest.mock("../src/app/api/smsSend/SmsSender");
jest.mock("../src/app/api/emailSend/EmailSender"); // Mock email sender to avoid errors

// Mock console to keep test output clean
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

describe("SMS Notification Feature", () => {
  let supabaseMock;
  let fromMock;
  let selectMock;
  let eqMock;
  let singleMock;
  let updateMock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase mock chain
    singleMock = jest.fn();
    eqMock = jest.fn().mockReturnValue({ single: singleMock });
    selectMock = jest.fn().mockReturnValue({ eq: eqMock });
    updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
    
    fromMock = jest.fn().mockReturnValue({
      select: selectMock,
      update: updateMock,
    });

    createClient.mockReturnValue({
      from: fromMock,
    });
  });

  const mockRequest = (body) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    };
  };

  test("SMS is triggered when opt-in is true and status is updated", async () => {
    const customerPhone = "1234567890";
    const orderId = "123";
    
    // Mock database response with opt-in true
    singleMock.mockResolvedValue({
      data: {
        phone_number: customerPhone,
        sms_consent: true,
        email: "test@example.com"
      },
      error: null
    });

    const req = mockRequest({
      id: orderId,
      source: "service_requests",
      newStatus: "Completed"
    });

    await POST(req);

    // Verify SMS was sent
    expect(sendSms).toHaveBeenCalledWith(
      customerPhone,
      expect.stringContaining(`order #${orderId} is complete`)
    );
  });

  test("SMS is not triggered when opt-in is false", async () => {
    const customerPhone = "1234567890";
    
    // Mock database response with opt-in false
    singleMock.mockResolvedValue({
      data: {
        phone_number: customerPhone,
        sms_consent: false,
        email: "test@example.com"
      },
      error: null
    });

    const req = mockRequest({
      id: "123",
      source: "service_requests",
      newStatus: "Completed"
    });

    await POST(req);

    // Verify SMS was NOT sent
    expect(sendSms).not.toHaveBeenCalled();
  });

  test("Correct phone number and message content are passed to Twilio", async () => {
    const customerPhone = "9876543210";
    const orderId = "456";
    const newStatus = "In Progress";
    
    singleMock.mockResolvedValue({
      data: {
        phone: customerPhone, // Testing rowData.phone fallback
        sms_consent: true,
        email: "test@example.com"
      },
      error: null
    });

    const req = mockRequest({
      id: orderId,
      source: "Admin_Page_Order",
      newStatus: newStatus
    });

    await POST(req);

    // Verify correct phone number and message content
    expect(sendSms).toHaveBeenCalledWith(
      customerPhone,
      `Your order #${orderId} has been updated to '${newStatus}'. -Dan's Computer Repair`
    );
  });
});
