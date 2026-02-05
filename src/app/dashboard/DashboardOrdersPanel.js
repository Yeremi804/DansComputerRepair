"use client";
import { useEffect, useState } from "react";
import OrdersPanel from "./OrdersPanel";

export default function DashboardOrdersPanel({ supabaseUrl, supabaseAnonKey }) {
  const [configFormRows, setConfigFormRows] = useState([]);
  const [serviceRequestRows, setServiceRequestRows] = useState([]);

  useEffect(() => {
    const supabase = require("@supabase/supabase-js").createClient(supabaseUrl, supabaseAnonKey);
    let interval = setInterval(async () => {
      // Fetch Configuration_Form
      const { data: configRows } = await supabase.from("Configuration_Form").select("*");
      // Fetch service_requests
      const { data: serviceRows } = await supabase.from("service_requests").select("*");
      setConfigFormRows(
        (configRows || []).map(row => ({
          // Display fields
          ID: row.id,
          Customer: row.name,
          Status: row.Status || "Pending",
          Dates: row.created_at,
          Notes: row.other_requests,
          Source: "Configuration_Form",
          // All database fields
          ...row,
        }))
      );
      setServiceRequestRows(
        (serviceRows || []).map(row => ({
          // Display fields
          ID: row.serial_id,
          Customer: row.customer_name,
          Status: row.Status || "Pending",
          Dates: row.Create_at,
          Notes: row.additional_ques,
          Source: "service_requests",
          // All database fields
          ...row,
        }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [supabaseUrl, supabaseAnonKey]);

  return (
    <>
      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Orders (Configuration Form)</h2>
        <OrdersPanel rows={configFormRows} />
      </section>
      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Orders (Service Requests)</h2>
        <OrdersPanel rows={serviceRequestRows} />
      </section>
    </>
  );
}
