import { createClient } from '@supabase/supabase-js';
import Sidebar from "../components/Sidebar";
import DashboardOrdersPanel from './DashboardOrdersPanel';
import DashboardStatsCards from './DashboardStatsCards';

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
      <div className="p-4 sm:p-6 md:p-8 bg-main-bg text-main-text min-h-screen overflow-x-hidden">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-4 text-red-700 dark:text-red-400">
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

  // Split rows by source for separate panels (kept even if unused)
  const configFormRows = combinedRows.filter(row => row.Source === 'Configuration_Form');
  const serviceRequestRows = combinedRows.filter(row => row.Source === 'service_requests');

  // Calculate total, ongoing, completed orders from both tables
  const totalOrder = combinedRows.length;
  const ongoingOrders = combinedRows.filter(r => String(r.Status).toLowerCase() === 'in progress').length;
  const completedOrders = combinedRows.filter(
    r => String(r.Status).toLowerCase() === 'completed' || String(r.Status).toLowerCase() === 'complete'
  ).length;

  return (
    <div className="flex min-h-screen bg-main-bg overflow-x-hidden">
      <Sidebar />

      <main className="flex-1 min-w-0 bg-main-bg px-3 pb-4 pt-24 sm:px-6 sm:pb-6 sm:pt-24 lg:p-8 overflow-x-hidden">
        <h1 className="mb-4 text-3xl text-main-text font-bold">Dashboard</h1>

        <DashboardStatsCards
          totalOrder={totalOrder}
          ongoingOrders={ongoingOrders}
          completedOrders={completedOrders}
        />

        <section className="mt-8">
          <DashboardOrdersPanel supabaseUrl={SUPABASE_URL} supabaseAnonKey={SUPABASE_ANON} />
        </section>
      </main>
    </div>
  )
}