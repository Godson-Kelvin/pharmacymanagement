import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    Timestamp,
    query,
    orderBy,
    limit,
} from "firebase/firestore";
import { withTimeout } from "../utils/firebaseHelpers";
import { useAuth } from "../context/AuthContext";
import {
    Plus,
    Trash2,
    Search,
    ShoppingCart,
    X,
    TrendingUp,
    Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

const COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Sales() {
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false);
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState("all");
    const { role } = useAuth();
    const isAdmin = role === "admin";

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [productsSnap, salesSnap] = await Promise.all([
                withTimeout(getDocs(collection(db, "inventory"))),
                withTimeout(getDocs(
                    query(collection(db, "sales"), orderBy("createdAt", "desc"), limit(200))
                )),
            ]);

            const productsList = [];
            productsSnap.forEach((doc) => {
                productsList.push({ id: doc.id, ...doc.data() });
            });
            setProducts(productsList);

            const salesList = [];
            salesSnap.forEach((doc) => {
                salesList.push({ id: doc.id, ...doc.data() });
            });
            setSales(salesList);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                if (existing.quantity >= product.quantity) {
                    toast.error("Insufficient stock!");
                    return prev;
                }
                return prev.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            if (product.quantity <= 0) {
                toast.error("Out of stock!");
                return prev;
            }
            return [
                ...prev,
                {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    maxQuantity: product.quantity,
                },
            ];
        });
    };

    const updateCartQuantity = (productId, newQuantity) => {
        if (newQuantity <= 0) {
            setCart((prev) => prev.filter((item) => item.id !== productId));
            return;
        }
        setCart((prev) =>
            prev.map((item) =>
                item.id === productId
                    ? { ...item, quantity: Math.min(newQuantity, item.maxQuantity) }
                    : item
            )
        );
    };

    const removeFromCart = (productId) => {
        setCart((prev) => prev.filter((item) => item.id !== productId));
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error("Cart is empty!");
            return;
        }

        try {
            const saleData = {
                items: cart.map((item) => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.price * item.quantity,
                })),
                total: calculateTotal(),
                customerName: customerName || "Walk-in",
                createdAt: Timestamp.now(),
            };

            // Add sale record
            await addDoc(collection(db, "sales"), saleData);

            // Update inventory quantities
            for (const item of cart) {
                const productRef = doc(db, "inventory", item.id);
                const product = products.find((p) => p.id === item.id);
                if (product) {
                    await updateDoc(productRef, {
                        quantity: product.quantity - item.quantity,
                        updatedAt: Timestamp.now(),
                    });
                }
            }

            toast.success(
                `Sale completed! Total: $${calculateTotal().toFixed(2)}`
            );
            setCart([]);
            setCustomerName("");
            setShowCart(false);
            fetchData();
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error("Failed to complete sale");
        }
    };

    const handleDeleteSale = async (saleId) => {
        if (!confirm("Delete this sale record?")) return;
        try {
            await deleteDoc(doc(db, "sales", saleId));
            toast.success("Sale deleted");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete sale");
        }
    };

    const getFilteredSales = () => {
        let filtered = [...sales];
        const now = new Date();

        if (dateRange === "today") {
            filtered = filtered.filter((s) => {
                const date = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                return date.toDateString() === now.toDateString();
            });
        } else if (dateRange === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter((s) => {
                const date = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                return date >= weekAgo;
            });
        } else if (dateRange === "month") {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter((s) => {
                const date = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                return date >= monthAgo;
            });
        }

        return filtered;
    };

    // Chart data
    const salesChartData = getFilteredSales().reduce((acc, sale) => {
        const date = sale.createdAt?.toDate
            ? sale.createdAt.toDate().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            })
            : new Date(sale.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        acc[date] = (acc[date] || 0) + sale.total;
        return acc;
    }, {});

    const chartData = Object.entries(salesChartData).map(([date, total]) => ({
        date,
        total,
    }));

    // Category distribution for pie chart
    const categoryData = products.reduce((acc, product) => {
        const category = product.category || "Others";
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});

    const pieData = Object.entries(categoryData).map(([name, value]) => ({
        name,
        value,
    }));

    const filteredSales = getFilteredSales();
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const availableProducts = products.filter((p) => p.quantity > 0 && p.price > 0);

    const filteredProducts = availableProducts.filter(
        (p) =>
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Sales</h1>
                <button
                    onClick={() => setShowCart(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                    <ShoppingCart size={16} />
                    New Sale
                    {cart.length > 0 && (
                        <span className="bg-white text-green-600 rounded-full px-2 py-0.5 text-xs font-bold">
                            {cart.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-50 rounded-lg">
                            <TrendingUp size={24} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-800">
                                ${totalRevenue.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <ShoppingCart size={24} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Sales</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {filteredSales.length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <Calendar size={24} className="text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Filter</p>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="mt-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-green-500 outline-none"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Sales Trend
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#16a34a"
                                strokeWidth={2}
                                dot={{ fill: "#16a34a" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Product Categories
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) =>
                                    `${name} ${(percent * 100).toFixed(0)}%`
                                }
                            >
                                {pieData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">
                        Sale History
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-green-50">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                    Customer
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                    Items
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                    Total
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                    Date
                                </th>
                                {isAdmin && (
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.map((sale) => (
                                <tr key={sale.id} className="border-t border-gray-100 hover:bg-green-50/50">
                                    <td className="py-3 px-4 text-sm text-gray-800">
                                        {sale.customerName || "Walk-in"}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        <div className="flex flex-col gap-1">
                                            {sale.items?.map((item, idx) => (
                                                <span key={idx} className="text-xs">
                                                    {item.quantity}x {item.name} (${item.subtotal?.toFixed(2)})
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm font-medium text-gray-800">
                                        ${sale.total?.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-500">
                                        {sale.createdAt?.toDate
                                            ? sale.createdAt.toDate().toLocaleString()
                                            : new Date(sale.createdAt).toLocaleString()}
                                    </td>
                                    {isAdmin && (
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => handleDeleteSale(sale.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filteredSales.length === 0 && (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-gray-400">
                                        No sales recorded yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Sale Modal (Cart) */}
            {showCart && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex">
                        {/* Products List */}
                        <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-800">
                                    Select Products
                                </h2>
                                <button
                                    onClick={() => setShowCart(false)}
                                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="relative mb-4">
                                <Search
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                {filteredProducts.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        disabled={product.quantity <= 0}
                                        className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-gray-800">
                                                {product.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Stock: {product.quantity} | ${product.price?.toFixed(2)}
                                            </p>
                                        </div>
                                        <Plus size={18} className="text-green-600 shrink-0" />
                                    </button>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <p className="text-center text-gray-400 py-8 text-sm">
                                        No products available
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Cart */}
                        <div className="w-1/2 p-6 flex flex-col">
                            <h2 className="text-lg font-bold text-gray-800 mb-4">
                                Shopping Cart
                            </h2>

                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Customer name (optional)"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3">
                                {cart.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                ${item.price?.toFixed(2)} each
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() =>
                                                    updateCartQuantity(item.id, item.quantity - 1)
                                                }
                                                className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-sm"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center text-sm font-medium">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    updateCartQuantity(item.id, item.quantity + 1)
                                                }
                                                className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-sm"
                                            >
                                                +
                                            </button>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {cart.length === 0 && (
                                    <div className="text-center py-12">
                                        <ShoppingCart
                                            size={48}
                                            className="mx-auto text-gray-300 mb-3"
                                        />
                                        <p className="text-gray-400 text-sm">
                                            Cart is empty
                                        </p>
                                        <p className="text-gray-400 text-xs">
                                            Select products to add
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-lg font-bold text-gray-800">
                                        Total:
                                    </span>
                                    <span className="text-2xl font-bold text-green-600">
                                        ${calculateTotal().toFixed(2)}
                                    </span>
                                </div>
                                <button
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0}
                                    className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Complete Sale
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}