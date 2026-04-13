"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Sidebar from "../../components/Sidebar";

export default function MetricsPage() {
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
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
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);
                //Getting fetch the 20 most recent sign-ins from the profiles table, ordered by last_sign_in in descending order
                const { data, error: fetchError } = await supabase
                    .from("profiles")  
                    .select("email, role ,last_sign_in, Last_Sign_Out")
                    .order("Last_Sign_Out", { ascending: false })
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
    if (loading) return <div className="bg-main-bg text-main-text p-4">Loading...</div>;
    if (error) return <div className="bg-main-bg p-4" style={{ color: isDark ? "#f87171" : "#dc2626" }}>{error}</div>;

    return (
        <div className="flex min-h-screen bg-main-bg">  {/* Remove p-8 from here */}
            {/* Sidebar is outside of the main content area, so it won't be affected by the padding. All padding is now on the main content area. */}
            <Sidebar />
            <main className="flex-1 p-8 md:ml-0">  {/* All padding here only */}
                <h1 className="text-3xl font-bold text-main-text mb-6">Dashboard Metrics</h1>
                <div className="overflow-x-auto">
                <div
                    className="border rounded-md overflow-hidden"
                    style={{
                        borderColor: isDark ? "#374151" : "#d4d4d8",
                        backgroundColor: isDark ? "#111827" : "#ffffff",
                    }}
                >
                    <div
                        className="grid grid-cols-4 border-b"
                        style={{
                            backgroundColor: isDark ? "#1f2937" : "#f5f5f5",
                            borderColor: isDark ? "#374151" : "#d4d4d8",
                        }}
                    >
                        <div
                            className="p-4 font-semibold text-sm"
                            style={{ color: isDark ? "#ffffff" : "#111827" }}
                        >
                            Email
                        </div>
                        <div
                            className="p-4 font-semibold text-sm"
                            style={{ color: isDark ? "#ffffff" : "#111827" }}
                        >
                            Role
                        </div>
                        <div
                            className="p-4 font-semibold text-sm"
                            style={{ color: isDark ? "#ffffff" : "#111827" }}
                        >
                            Last Sign In
                        </div>
                        <div
                            className="p-4 font-semibold text-sm"
                            style={{ color: isDark ? "#ffffff" : "#111827" }}
                        >
                            Last Sign Out
                        </div>
                    </div>
                    <div>
                        {metrics.map((metric, idx) => (
                            <div
                                key={idx}
                                className="grid grid-cols-4 border-b"
                                style={{
                                    borderColor: isDark ? "#374151" : "#d4d4d8",
                                    backgroundColor: isDark ? "#111827" : "#ffffff",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = isDark ? "#1f2937" : "#fafafa";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isDark ? "#111827" : "#ffffff";
                                }}
                            >
                                <div
                                    className="p-4 text-sm"
                                    style={{ color: isDark ? "#f3f4f6" : "#111827" }}
                                >
                                    {metric.email}
                                </div>
                                <div
                                    className="p-4 text-sm"
                                    style={{ color: isDark ? "#f3f4f6" : "#111827" }}
                                >
                                    {metric.role}
                                </div>
                                <div
                                    className="p-4 text-sm"
                                    style={{ color: isDark ? "#f3f4f6" : "#111827" }}
                                >
                                    {new Date(metric.last_sign_in).toLocaleString()}
                                </div>
                                <div
                                    className="p-4 text-sm"
                                    style={{ color: isDark ? "#f3f4f6" : "#111827" }}
                                >
                                    {metric.Last_Sign_Out ? new Date(metric.Last_Sign_Out).toLocaleString() : "N/A"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                </div>
            </main>
        </div>
    );
}