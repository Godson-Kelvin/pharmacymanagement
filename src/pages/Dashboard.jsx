import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
} from "firebase/firestore";
import { withTimeout } from "../utils/firebaseHelpers";
import {
    Package,
    ShoppingCart,
    TrendingUp,
    AlertTriangle,
    DollarSign,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStock: 0,
        totalSales: 0,
        revenue: 0,
    });
    const [salesData, setSalesData] = useState([]);
    const [recentSales, setRecentSales] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch inventory
            const inventorySnap = await withTimeout(getDocs(collection(db, "inventory")));
            const products = [];
            let lowStockCount = 0;
            inventorySnap.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() };
                products.push(data);
                if (data.quantity <= data.minQuantity) lowStockCount++;
            });

            // Fetch sales
            const salesSnap = await withTimeout(getDocs(
                query(collection(db, "sales"), orderBy("createdAt", "desc"), limit(100))
            ));
            let totalRevenue = 0;
            const sales = [];
            const productSales = {};

            salesSnap.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() };
                sales.push(data);
                totalRevenue += data.total || 0;

                // Track product sales
                if (data.items) {
                    data.items.forEach((item) => {
                        if (productSales[item.name]) {
                            productSales[item.name] += item.quantity;
                        } else {
                            productSales[item.name] = item.quantity;
                        }
                    });
                }
            });

            // Prepare chart data (last 7 days)
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                });
                const daySales = sales.filter((s) => {
                    const saleDate = s.createdAt?.toDate
                        ? s.createdAt.toDate()
                        : new Date(s.createdAt);
                    return saleDate.toDateString() === date.toDateString();
                });
                const dayRevenue = daySales.reduce((sum, s) => sum + (s.total || 0), 0);
                last7Days.push({
                    date: dateStr,
                    revenue: dayRevenue,
                    sales: daySales.length,
                });
            }

            // Top products
            const sortedProducts = Object.entries(productSales)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([name, quantity]) => ({ name, quantity }));

            setStats({
                totalProducts: products.length,
                lowStock: lowStockCount,
                totalSales: sales.length,
                revenue: totalRevenue,
            });
            setSalesData(last7Days);
            setRecentSales(sales.slice(0, 5));
            setTopProducts(sortedProducts);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        }
    };

    const statCards = [
        {
            title: "Total Products",
            value: stats.totalProducts,
            icon: Package,
            color: "bg-blue-500",
            bg: "bg-blue-50",
            text: "text-blue-600",
        },
        {
            title: "Low Stock Items",
            value: stats.lowStock,
            icon: AlertTriangle,
            color: "bg-red-500",
            bg: "bg-red-50",
            text: "text-red-600",
        },
        {
            title: "Total Sales",
            value: stats.totalSales,
            icon: ShoppingCart,
            color: "bg-green-500",
            bg: "bg-green-50",
            text: "text-green-600",
        },
        {
            title: "Total Revenue",
            value: `$${stats.revenue.toFixed(2)}`,
            icon: DollarSign,
            color: "bg-purple-500",
            bg: "bg-purple-50",
            text: "text-purple-600",
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                <button
                    onClick={fetchDashboardData}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                    Refresh Data
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <div
                        key={card.title}
                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{card.title}</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">
                                    {card.value}
                                </p>
                            </div>
                            <div className={`p-3 rounded-lg ${card.bg}`}>
                                <card.icon size={24} className={card.text} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Revenue (Last 7 Days)
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#16a34a"
                                strokeWidth={2}
                                dot={{ fill: "#16a34a" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Top Selling Products
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip />
                            <Bar dataKey="quantity" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Sales */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Recent Sales
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                    Customer
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                    Items
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                    Total
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSales.map((sale) => (
                                <tr key={sale.id} className="border-b border-gray-100">
                                    <td className="py-3 px-4 text-sm text-gray-800">
                                        {sale.customerName || "Walk-in"}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {sale.items?.length || 0} items
                                    </td>
                                    <td className="py-3 px-4 text-sm font-medium text-gray-800">
                                        ${sale.total?.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-500">
                                        {sale.createdAt?.toDate
                                            ? sale.createdAt.toDate().toLocaleDateString()
                                            : new Date(sale.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {recentSales.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="py-8 text-center text-gray-400 text-sm"
                                    >
                                        No sales recorded yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}