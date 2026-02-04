import { useEffect, useState } from 'react';
import dashboardService from '../services/dashboardService';
import {
    ClipboardList,
    Clock,
    CheckCircle2,
    DollarSign
} from 'lucide-react';

export default function DashboardStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const data = await dashboardService.getStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="animate-pulse h-32 bg-gray-800 rounded-xl mb-8"></div>;
    if (!stats) return null;

    const total = stats.totalSolicitudes || 0;
    const calculatePct = (val) => total > 0 ? Math.round((val / total) * 100) : 0;

    const cards = [
        {
            title: "Total Solicitudes",
            value: total,
            subValue: "100%",
            icon: ClipboardList,
            color: "text-blue-400",
            bg: "bg-blue-900/20",
            border: "border-blue-800"
        },
        {
            title: "Pendientes",
            value: stats.pendingSolicitudes,
            subValue: `${calculatePct(stats.pendingSolicitudes)}%`,
            icon: Clock,
            color: "text-yellow-400",
            bg: "bg-yellow-900/20",
            border: "border-yellow-800"
        },
        {
            title: "Completados",
            value: stats.completedSolicitudes,
            subValue: `${calculatePct(stats.completedSolicitudes)}%`,
            icon: CheckCircle2,
            color: "text-green-400",
            bg: "bg-green-900/20",
            border: "border-green-800"
        },
        {
            title: "Subsidios Entregados",
            value: <span>${stats.totalSubsidiesDelivered?.toLocaleString()}</span>,
            subValue: "Total Monto",
            icon: DollarSign,
            color: "text-indigo-400",
            bg: "bg-indigo-900/20",
            border: "border-indigo-800"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card, index) => (
                <div key={index} className={`bg-gray-800 rounded-xl border ${card.border} p-6 shadow-lg`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-lg ${card.bg}`}>
                            <card.icon className={`h-6 w-6 ${card.color}`} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-white mb-1">{card.value}</h3>
                        <span className="text-xs text-gray-500 font-medium">{card.subValue}</span>
                    </div>
                    <p className="text-gray-400 text-sm font-medium">{card.title}</p>
                </div>
            ))}
        </div>
    );
}
