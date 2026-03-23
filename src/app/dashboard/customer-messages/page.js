import Sidebar from "../../components/Sidebar";
import CustomerMessagesPanel from "./CustomerMessagesPanel";



export default async function CustomerMessagesPage() {

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON) {
        return (
            <div className="p-8">
                <h1 className="text-xl font-semibold">Customer Messages</h1>
                <p className="mt-4 text-red-700">
                    Missing Supabase environment variables. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                    <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>, then restart the dev server.
                </p>
            </div>
        );
    }

  // render the dashboard layout with sidebar and customer messages panel
  return (
    <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 bg-main-bg text-main-text p-8">
            <h1 className="mb-4 text-3xl font-bold">Customer Messages</h1>
            <CustomerMessagesPanel />
        
        </main>
    </div>
  );
}