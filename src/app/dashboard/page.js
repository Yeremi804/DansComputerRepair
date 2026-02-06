import Link from 'next/link';
import { LayoutDashboard, ShoppingBag, Package, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

import DashboardOrdersPanel from './DashboardOrdersPanel';


export const metadata = {
  title: 'Dashboard',
  description: 'Admin dashboard'
}

//change the default to include async
export default async function DashboardPage() {
  // Ensure env vars exist to avoid 500 during local testing
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-4 text-red-700">
          Missing Supabase environment variables. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>, then restart the dev server.
        </p>
      </div>
    );
  }

  // connect to supabase once env is present
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

  // Fetch data from Configuration_Form
  const { data: configRows, error: configError } = await supabase.from('Configuration_Form').select('*');
  if (configError) console.error('Supabase error (Configuration_Form):', configError);

  // Fetch data from service_requests
  const { data: serviceRows, error: serviceError } = await supabase.from('service_requests').select('*');
  if (serviceError) console.error('Supabase error (service_requests):', serviceError);

  // Combine and normalize data for OrdersPanel
  const combinedRows = [
    ...(configRows || []).map(row => ({
      ID: row.id,
      Customer: row.name,
      Status: row.Status || 'Pending',
      Dates: row.created_at,
      Notes: row.other_requests,
      Source: 'Configuration_Form',
      phone: row.phone,
      email: row.email,
      budget_range: row.budget_range,
      intended_use: row.intended_use,
      processor: row.cpu,
      graphics_card: row.gpu,
      motherboard: row.motherboard,
      memory: row.memory,
      storage: row.storage,
      power_supply: row.psu,
      case: row.case,
      cooling: row.cooling,
      operating_system: row.operating_syst,
      networking: row.networking,
      other_requests: row.other_requests,
    })),
    ...(serviceRows || []).map(row => ({
      ID: row.serial_id, // Use serial_id for service_requests
      Customer: row.customer_name,
      Status: row.Status || 'Pending',
      Dates: row.Create_at,
      Notes: row.additional_ques,
      Source: 'service_requests',
    })),
  ];

  // Split rows by source for separate panels
  const configFormRows = combinedRows.filter(row => row.Source === 'Configuration_Form');
  const serviceRequestRows = combinedRows.filter(row => row.Source === 'service_requests');

  // Calculate total, ongoing, completed orders from both tables
  const totalOrder = combinedRows.length;
  const ongoingOrders = combinedRows.filter(r => String(r.Status).toLowerCase() === 'in progress').length;
  const completedOrders = combinedRows.filter(r => String(r.Status).toLowerCase() === 'completed' || String(r.Status).toLowerCase() === 'complete').length;

  return (
    <div className="flex min-h-screen">
      <aside className="w-[250px] bg-[#E2E8F0] text-black">
        <div className="p-5 border-b border-[#cbd5e1]">
          <h2 className="text-2xl text-center">Dashboard</h2>
        </div>
        <nav aria-label="Sidebar" className="flex flex-col">
          <button className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1] bg-[#cbd5e1]">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]">
            <ShoppingBag size={20} />
            <span>Orders</span>
          </button>
          <Link href="/admin-parts" className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]">
            <Package size={20} />
            <span>Parts</span>
          </Link>
          <Link
            href="/dashboard/admin-reviews"
            className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]"
          >
            <MessageSquare size={20} />
            <span>Review</span>
          </Link>
          <button className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]">
            <SettingsIcon size={20} />
            <span>Setting</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8 bg-white">
        <h1 className="mb-4 text-3xl font-bold">Dashboard</h1>

        <section className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          <div className="p-4 bg-[#E2E8F0] border border-[#cbd5e1] flex flex-col items-center justify-center rounded-xl shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-gray-900">Total Orders</h3>
            <p className="text-2xl my-2 text-gray-900">{totalOrder}</p>
          </div>

          <div className="p-4 bg-[#E2E8F0] border border-[#cbd5e1] flex flex-col items-center justify-center rounded-xl shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-gray-900">Ongoing</h3>
            <p className="text-2xl my-2 text-gray-900">{ongoingOrders}</p>
            <p className="text-gray-900">Open support tickets</p>
          </div>

          <div className="p-4 bg-[#E2E8F0] border border-[#cbd5e1] flex flex-col items-center justify-center rounded-xl shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-gray-900">Completed</h3>
            <p className="text-2xl my-2 text-gray-900">{completedOrders}</p>
            <p className="text-gray-900">job(s)</p>
          </div>
        </section>

        <section className="mt-8">
          <DashboardOrdersPanel supabaseUrl={SUPABASE_URL} supabaseAnonKey={SUPABASE_ANON} />
        </section>
      </main>
    </div>
  )
}
