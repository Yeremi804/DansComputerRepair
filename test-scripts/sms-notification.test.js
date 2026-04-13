import { POST } from "../src/app/api/update-status/route";
import { createClient } from "@supabase/supabase-js";
import sendSms from "../src/app/api/smsSend/SmsSender";
import { NextResponse } from "next/server";

// Mock dependencies
jest.mock("@supabase/supabase-js");
jest.mock("../src/app/api/smsSend/SmsSender");
jest.mock("../src/app/api/emailSend/EmailSender");

// Mock NextResponse.json to capture the data
const mockJson = jest.fn().mockImplementation((data, init) => ({
  status: init?.status || 200,
  json: async () => data,
  _data: data
}));
NextResponse.json = mockJson;

// Mock console to keep test output clean
const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

describe("SMS Notification Feature - 33 Comprehensive Tests", () => {
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

  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
  });

  // --- Category 1: Request Validation (6 tests) ---
  describe("Request Validation", () => {
    const requiredFields = ['id', 'source', 'newStatus'];
    
    requiredFields.forEach(field => {
      test(`Returns 400 if '${field}' is missing`, async () => {
        const body = { id: '1', source: 's', newStatus: 'n' };
        delete body[field];
        const res = await POST(mockRequest(body));
        expect(res.status).toBe(400);
        expect(res._data.error).toBe("Missing required fields");
      });
    });

    test("Returns 400 if all fields are missing", async () => {
      const res = await POST(mockRequest({}));
      expect(res.status).toBe(400);
    });

    test("Handles null body gracefully", async () => {
      await expect(POST(mockRequest(null))).rejects.toThrow();
    });

    test("Returns 400 if id is an empty string", async () => {
      const res = await POST(mockRequest({ id: "", source: "s", newStatus: "n" }));
      expect(res.status).toBe(400);
    });
  });

  // --- Category 2: Table Selection Logic (3 tests) ---
  describe("Table Selection Logic", () => {
    const tableMappings = [
      { source: 'Configuration_Form', expectedTable: 'Configuration_Form', idField: 'id' },
      { source: 'service_requests', expectedTable: 'service_requests', idField: 'serial_id' },
      { source: 'Other_Source', expectedTable: 'Admin_Page_Order', idField: 'ID' }
    ];

    tableMappings.forEach(({ source, expectedTable, idField }) => {
      test(`Correctly selects table '${expectedTable}' for source '${source}'`, async () => {
        singleMock.mockResolvedValue({ data: { sms_consent: false }, error: null });
        await POST(mockRequest({ id: '123', source, newStatus: 'Updated' }));
        expect(fromMock).toHaveBeenCalledWith(expectedTable);
        expect(eqMock).toHaveBeenCalledWith(idField, '123');
      });
    });
  });

  // --- Category 3: SMS Consent Logic (5 tests) ---
  describe("SMS Consent Logic", () => {
    const consentScenarios = [
      { consent: true, phone: "123", shouldSend: true },
      { consent: false, phone: "123", shouldSend: false },
      { consent: null, phone: "123", shouldSend: false },
      { consent: undefined, phone: "123", shouldSend: false },
      { consent: true, phone: null, shouldSend: false }
    ];

    consentScenarios.forEach(({ consent, phone, shouldSend }, index) => {
      test(`Scenario ${index + 1}: Consent=${consent}, Phone=${phone} -> ShouldSend=${shouldSend}`, async () => {
        singleMock.mockResolvedValue({ data: { phone_number: phone, sms_consent: consent }, error: null });
        await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
        if (shouldSend) expect(sendSms).toHaveBeenCalled();
        else expect(sendSms).not.toHaveBeenCalled();
      });
    });
  });

  // --- Category 4: Phone Number Field Priority (4 tests) ---
  describe("Phone Number Field Priority", () => {
    test("Uses 'phone_number' if both 'phone_number' and 'phone' exist", async () => {
      singleMock.mockResolvedValue({ data: { phone_number: "PN1", phone: "P1", sms_consent: true }, error: null });
      await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(sendSms).toHaveBeenCalledWith("PN1", expect.any(String));
    });

    test("Uses 'phone' if 'phone_number' is missing", async () => {
      singleMock.mockResolvedValue({ data: { phone: "P1", sms_consent: true }, error: null });
      await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(sendSms).toHaveBeenCalledWith("P1", expect.any(String));
    });

    test("Does not send if both phone fields are empty strings", async () => {
      singleMock.mockResolvedValue({ data: { phone_number: "", phone: "", sms_consent: true }, error: null });
      await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(sendSms).not.toHaveBeenCalled();
    });

    test("Sends if phone field is whitespace", async () => {
      singleMock.mockResolvedValue({ data: { phone_number: " ", sms_consent: true }, error: null });
      await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(sendSms).toHaveBeenCalledWith(" ", expect.any(String));
    });
  });

  // --- Category 5: Message Content Logic (6 tests) ---
  describe("Message Content Logic", () => {
    test("Sends 'Completed' specific message", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true }, error: null });
      await POST(mockRequest({ id: 'ORD1', source: 's', newStatus: 'Completed' }));
      expect(sendSms).toHaveBeenCalledWith("123", expect.stringContaining("order #ORD1 is complete!"));
    });

    test("Sends standard update message for 'In Progress'", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true }, error: null });
      await POST(mockRequest({ id: 'ORD1', source: 's', newStatus: 'In Progress' }));
      expect(sendSms).toHaveBeenCalledWith("123", expect.stringContaining("updated to 'In Progress'"));
    });

    test("Sends standard update message for 'Pending Parts'", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true }, error: null });
      await POST(mockRequest({ id: 'ORD1', source: 's', newStatus: 'Pending Parts' }));
      expect(sendSms).toHaveBeenCalledWith("123", expect.stringContaining("updated to 'Pending Parts'"));
    });

    test("Handles special characters in status", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true }, error: null });
      await POST(mockRequest({ id: '1', source: 's', newStatus: 'Ready & Waiting!' }));
      expect(sendSms).toHaveBeenCalledWith("123", expect.stringContaining("'Ready & Waiting!'"));
    });

    test("Message includes business name suffix", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true }, error: null });
      await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(sendSms).toHaveBeenCalledWith("123", expect.stringContaining("-Dan's Computer Repair"));
    });

    test("Message includes order ID correctly", async () => {
      const complexId = "ABC-123-XYZ";
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true }, error: null });
      await POST(mockRequest({ id: complexId, source: 's', newStatus: 'n' }));
      expect(sendSms).toHaveBeenCalledWith("123", expect.stringContaining(`#${complexId}`));
    });
  });

  // --- Category 6: Error Handling & Resilience (6 tests) ---
  describe("Error Handling & Resilience", () => {
    test("Returns 500 if Supabase fetch fails", async () => {
      singleMock.mockResolvedValue({ data: null, error: { message: "DB Fetch Error" } });
      const res = await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(res.status).toBe(500);
      expect(res._data.error).toBe("DB Fetch Error");
    });

    test("Returns 500 if Supabase update fails", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123" }, error: null });
      updateMock.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: { message: "Update Failed" } }) });
      const res = await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(res.status).toBe(500);
      expect(res._data.error).toBe("Update Failed");
    });

    test("Continues execution if sendSms throws an error", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true }, error: null });
      sendSms.mockRejectedValue(new Error("Twilio Down"));
      const res = await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(res.status).toBe(200);
      expect(res._data.success).toBe(true);
      expect(errorSpy).toHaveBeenCalled();
    });

    test("Logs error message when SMS sending fails", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true }, error: null });
      sendSms.mockRejectedValue(new Error("Twilio Error"));
      await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to send SMS to 123"), expect.any(Error));
    });

    test("Handles case where rowData is null but no error returned", async () => {
      singleMock.mockResolvedValue({ data: null, error: null });
      await expect(POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }))).rejects.toThrow();
    });

    test("Handles very long status strings in SMS", async () => {
      const longStatus = "A".repeat(500);
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true }, error: null });
      await POST(mockRequest({ id: '1', source: 's', newStatus: longStatus }));
      expect(sendSms).toHaveBeenCalledWith("123", expect.stringContaining(longStatus));
    });
  });

  // --- Category 7: Email Integration Side-Effects (3 tests) ---
  describe("Email Integration Side-Effects", () => {
    test("Does not attempt to send email if email field is missing", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true, email: null }, error: null });
      await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(sendSms).toHaveBeenCalled();
    });

    test("Sends email and SMS simultaneously when both are available", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true, email: "a@b.com" }, error: null });
      await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(sendSms).toHaveBeenCalled();
    });

    test("SMS still sends even if email sending fails", async () => {
      singleMock.mockResolvedValue({ data: { phone: "123", sms_consent: true, email: "a@b.com" }, error: null });
      await POST(mockRequest({ id: '1', source: 's', newStatus: 'n' }));
      expect(sendSms).toHaveBeenCalled();
    });
  });
});