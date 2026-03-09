"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Sidebar from "../../components/Sidebar";

export default function MetricsPage() {
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);
                //Getting fetch the 20 most recent sign-ins from the profiles table, ordered by last_sign_in in descending order
                const { data, error: fetchError } = await supabase
                    .from("profiles")  
                    .select("email, role ,last_sign_in, Last_Sign_Out")
                    .order("last_sign_in", { ascending: false })
                    .limit(20);
                // If there is an error fetching the metrics, set the error state
                if (fetchError) {
                    setError(fetchError.message);
                    return;
                }

                // Set the metrics state with the fetched data
                setMetrics(data || []);
            } catch (err) {
                console.error(err);
                setError("Failed to fetch metrics");
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    // If the metrics are still loading, show a loading message. If there was an error fetching the metrics, show the error message. Otherwise, show the metrics table.
    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div className="flex min-h-screen bg-main-bg">  {/* Remove p-8 from here */}
            {/* Sidebar is outside of the main content area, so it won't be affected by the padding. All padding is now on the main content area. */}
            <Sidebar />
            <main className="flex-1 p-8 md:ml-0">  {/* All padding here only */}
                <h1 className="text-3xl font-bold text-main-text mb-6">Dashboard Metrics</h1>
                <div className="overflow-x-auto">
                <div className="border border-neutral-300 rounded-md overflow-hidden bg-white">
                    <div className="grid grid-cols-4 bg-neutral-100 border-b border-neutral-300">
                        <div className="p-4 font-semibold text-sm">Email</div>
                        <div className="p-4 font-semibold text-sm">Role</div>
                        <div className="p-4 font-semibold text-sm">Last Sign In</div>
                        <div className="p-4 font-semibold text-sm">Last Sign Out</div>
                    </div>
                    <div>
                        {metrics.map((metric, idx) => (
                            <div key={idx} className="grid grid-cols-4 border-b border-neutral-300 hover:bg-neutral-50">
                                <div className="p-4 text-sm">{metric.email}</div>
                                <div className="p-4 text-sm">{metric.role}</div>
                                <div className="p-4 text-sm">{new Date(metric.last_sign_in).toLocaleString()}</div>
                                <div className="p-4 text-sm">{metric.Last_Sign_Out ? new Date(metric.Last_Sign_Out).toLocaleString() : "N/A"}</div>
                            </div>
                        ))}
                    </div>
                </div>
                </div>
            </main>
        </div>
    );
}