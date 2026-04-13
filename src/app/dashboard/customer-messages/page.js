import Sidebar from "../../components/Sidebar";
import CustomerMessagesPanel from "./CustomerMessagesPanel";



export default async function CustomerMessagesPage() {

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON) {
        return (
            <div className="p-4 sm:p-6 md:p-8 bg-main-bg text-main-text min-h-screen overflow-x-hidden">
                <h1 className="text-xl font-semibold">Customer Messages</h1>
                <p className="mt-4 text-red-700 dark:text-red-400">
                    Missing Supabase environment variables. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                    <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>, then restart the dev server.
                </p>
            </div>
        );
    }

  // render the dashboard layout with sidebar and customer messages panel
  return (
    <div className="flex min-h-screen bg-main-bg overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 bg-main-bg text-main-text px-4 pb-4 pt-24 sm:px-6 sm:pb-6 sm:pt-24 lg:p-8 overflow-x-hidden">
            <h1 className="mb-4 text-3xl font-bold">Customer Messages</h1>
            <CustomerMessagesPanel />
        
        </main>
    </div>
  );
}