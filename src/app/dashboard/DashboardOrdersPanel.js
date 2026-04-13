"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from '@/lib/supabase/client';
import OrdersPanel from "./OrdersPanel";
import { supabase } from "@/lib/supabase/client";

export default function DashboardOrdersPanel() {
  const RUN_TESTS = true; // Set to true to enable testing logs in the console
  const hasRunTests = useRef(false); // To prevent double test runs
  const [configFormRows, setConfigFormRows] = useState([]);
  const [serviceRequestRows, setServiceRequestRows] = useState([]);
  const [filteredConfigRows, setFilteredConfigRows] = useState([]);
  const [filteredServiceRows, setFilteredServiceRows] = useState([]);

  // Function to build export row based on source type
  // MUST be declared before buildCSVContent so it is in scope when buildCSVContent calls it
  const buildExportRow = (row) => {
    const base = {
      ID: row.ID ?? '',
      Customer: row.Customer ?? '',
      Status: row.Status ?? '',
      Date: row.Dates ?? '',
      Notes: row.Notes ?? '',
      Source: row.Source ?? '',
    };
    // If the source is Configuration_Form, include specific fields related to configuration
    if (row.Source === 'Configuration_Form') {
      return {
        ...base,
        Phone: row.phone ?? '',
        Email: row.email ?? '',
        BudgetRange: row.budget_range ?? '',
        IntendedUse: row.intended_use ?? '',
        Processor: row.cpu ?? '',
        Motherboard: row.motherboard ?? '',
        Storage: row.storage ?? '',
        Case: row.case ?? '',
        OperatingSystem: row.operating_system ?? '',
        GPU: row.gpu ?? '',
        Memory: row.memory ?? '',
        PSU: row.psu ?? '',
        Cooling: row.cooling ?? '',
        Networking: row.networking ?? '',
      };
    }
    // If the source is service_requests, include specific fields related to service requests
    if (row.Source === 'service_requests') {
      return {
        ...base,
        DeviceType: row.device_type ?? '',
        ProblemStart: row.problem_start_date ?? '',
        ProblemCause: row.problem_cause_idea ?? '',
        AdditionalQuestions: row.additional_questions ?? '',
        Phone: row.phone_number ?? '',
        Email: row.email ?? '',
      };
    }
    return base;
  };
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    syncTheme();

    const observer = new MutationObserver(() => {
      syncTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  // Function to build CSV content from rows
  const buildCSVContent = (rows) => {
    if (!rows.length) return ''; // Return empty string if no rows
    const exportRows = rows.map(buildExportRow); // Transform rows to export format
    const headers = Object.keys(exportRows[0]); // Get headers from the first row of export data
    // Build CSV string with proper escaping for commas and quotes
    return [headers, ...exportRows.map(row =>
      headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`)
    )].map(row => row.join(',')).join('\n');
  };

  // Function to trigger CSV download
  const downloadCSV = (rows, filename) => {
    const csvContent = buildCSVContent(rows); // Build CSV content from rows
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); // Create a Blob from the CSV content
    const url = URL.createObjectURL(blob); // Create a URL for the Blob
    const link = document.createElement('a'); // Create a temporary link element
    link.href = url; // Set the href to the Blob URL
    link.download = filename; // Set the download with the chosen filename
    document.body.appendChild(link); // Append the link to the body
    link.click(); // Trigger the download
    document.body.removeChild(link); // Clean up by removing the link
    URL.revokeObjectURL(url); // Revoke the Blob URL to free up memory
  };

  useEffect(() => {
    
    let interval = setInterval(async () => {
      // Fetch Configuration_Form
      const { data: configRows } = await supabase.from("Configuration_Form").select("*");
      // Fetch service_requests
      const { data: serviceRows } = await supabase.from("service_requests").select("*");
      setConfigFormRows(
        (configRows || []).map(row => ({
          // All database fields first (so explicit fields below take priority)
          ...row,
          // Display fields (override any conflicting keys from ...row)
          ID: row.id,
          Customer: row.name,
          Status: row.Status || "Pending",
          Dates: row.created_at,
          Notes: row.other_requests,
          Source: "Configuration_Form",
        }))
      );
      setServiceRequestRows(
        (serviceRows || []).map(row => ({
          // All database fields first (so explicit fields below take priority)
          ...row,
          // Display fields (override any conflicting keys from ...row)
          ID: row.serial_id,
          Customer: row.customer_name,
          Status: row.Status || "Pending",
          Dates: row.Create_at,
          Notes: row.additional_questions,
          Source: "service_requests",
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Test cases for CSV generation
  useEffect(() => {
    if (!RUN_TESTS) return; // Skip tests if RUN_TESTS is false
    if (hasRunTests.current) return; // prevent double run in Strict Mode
    hasRunTests.current = true; // Mark tests as run
    console.log("----- RUNNING CSV TESTS -----");
    const assert = (testName, condition) => {
      if (condition) {
        console.log(`✅ PASS: ${testName}`);
      } else {
        console.error(`❌ FAIL: ${testName}`);
      }
    };

    const testRows = [
      {
        ID: 1,
        Customer: 'Alice',
        Status: 'Pending',
        Dates: '2024-01-01',
        Notes: 'Test note',
        Source: 'Configuration_Form',
        budget_range: '$1000-$1500',
        intended_use: 'Gaming',
      }
    ];
    const csv = buildCSVContent(testRows);
    const headerLine = csv.split('\n')[0];
    const headerArray = headerLine.split(',');
    console.log("HEADER LINE:", headerLine);
    console.log("HEADER ARRAY:", headerArray);
    // Test that all required base headers are present
    assert(
      "Required base headers exist",
      ['ID','Customer','Status','Date','Notes','Source']
        .every(h => headerArray.includes(h))
    );
    // Test that BudgetRange and IntendedUse headers are present
    assert(
      "BudgetRange header exists in Configuration_Form CSV",
      headerArray.includes('BudgetRange')
    );
    assert(
      "IntendedUse header exists in Configuration_Form CSV",
      headerArray.includes('IntendedUse')
    );
    // Test that BudgetRange and IntendedUse values appear in CSV
    assert(
      "CSV includes BudgetRange value",
      csv.includes('"$1000-$1500"')
    );
    assert(
      "CSV includes IntendedUse value",
      csv.includes('"Gaming"')
    );
    // Test that name is included in the CSV content
    assert(
      "CSV includes customer name",
      csv.includes('"Alice"')
    );
    const quoteTest = buildCSVContent([
      {
        ID: 2,
        Customer: 'Bob "The Builder"',
        Status: 'Done',
        Dates: '2024-01-02',
        Notes: 'Has "quotes"',
        Source: 'service_requests'
      }
    ]);
    // Test that quotes in the customer name are properly escaped in the CSV content
    assert(
      "Quotes are escaped properly",
      quoteTest.includes('"Bob ""The Builder"""')
    );
    // Test that null budget_range and intended_use render as empty string (not "null")
    const nullFieldTest = buildCSVContent([
      {
        ID: 3,
        Customer: 'Carol',
        Status: 'Pending',
        Dates: '2024-01-03',
        Notes: '',
        Source: 'Configuration_Form',
        budget_range: null,
        intended_use: undefined,
      }
    ]);
    assert(
      "Null BudgetRange renders as empty string in CSV",
      nullFieldTest.includes('BudgetRange') && !nullFieldTest.includes('"null"')
    );
    const emptyTest = buildCSVContent([]);
    // Test that an empty array of rows returns an empty string for CSV content
    assert(
      "Empty rows returns empty string",
      emptyTest === ''
    );
    console.log("----- CSV TESTS COMPLETE -----");
  }, []);

  return (
    <>
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl text-main-text font-bold">
            Orders (Configuration Form)
          </h2>
          <button
            type="button"
            onClick={() => downloadCSV(filteredConfigRows, "Configuration_Form.csv")}
            disabled={filteredConfigRows.length === 0}
            className="btn-black"
          >
            Download CSV
          </button>
        </div>
        <OrdersPanel rows={configFormRows} onFilteredChange={setFilteredConfigRows} />
      </section>
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl text-main-text font-bold">
            Orders (Service Requests)
          </h2>
          <button
            type="button"
            onClick={() => downloadCSV(filteredServiceRows, "Service_Requests.csv")}
            disabled={filteredServiceRows.length === 0}
            className="btn-black"
          >
            Download CSV
          </button>
        </div>
        <OrdersPanel rows={serviceRequestRows} onFilteredChange={setFilteredServiceRows} />
      </section>
    </>
  );
}