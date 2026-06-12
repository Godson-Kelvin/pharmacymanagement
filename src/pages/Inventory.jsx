import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp,
} from "firebase/firestore";
import { withTimeout } from "../utils/firebaseHelpers";
import { useAuth } from "../context/AuthContext";
import {
    Plus,
    Edit2,
    Trash2,
    Upload,
    Download,
    Search,
    AlertTriangle,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function Inventory() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const fileInputRef = useRef(null);
    const { role } = useAuth();
    const isAdmin = role === "admin";

    const [form, setForm] = useState({
        name: "",
        category: "",
        quantity: "",
        minQuantity: "",
        price: "",
        supplier: "",
        batchNumber: "",
        expiryDate: "",
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const querySnapshot = await withTimeout(getDocs(collection(db, "inventory")));
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            setProducts(items);
        } catch (error) {
            console.error("Error fetching products:", error);
            toast.error("Failed to load inventory");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setForm({
            name: product.name || "",
            category: product.category || "",
            quantity: product.quantity?.toString() || "",
            minQuantity: product.minQuantity?.toString() || "",
            price: product.price?.toString() || "",
            supplier: product.supplier || "",
            batchNumber: product.batchNumber || "",
            expiryDate: product.expiryDate || "",
        });
        setShowModal(true);
    };

    const handleAdd = () => {
        setEditingProduct(null);
        setForm({
            name: "",
            category: "",
            quantity: "",
            minQuantity: "",
            price: "",
            supplier: "",
            batchNumber: "",
            expiryDate: "",
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            await withTimeout(deleteDoc(doc(db, "inventory", id)));
            toast.success("Product deleted successfully");
            fetchProducts();
        } catch (error) {
            toast.error("Failed to delete product");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...form,
                quantity: Number(form.quantity),
                minQuantity: Number(form.minQuantity),
                price: Number(form.price),
                updatedAt: Timestamp.now(),
            };

            if (editingProduct) {
                await updateDoc(doc(db, "inventory", editingProduct.id), data);
                toast.success("Product updated successfully");
            } else {
                data.createdAt = Timestamp.now();
                await addDoc(collection(db, "inventory"), data);
                toast.success("Product added successfully");
            }
            setShowModal(false);
            fetchProducts();
        } catch (error) {
            toast.error("Failed to save product");
        }
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const workbook = XLSX.read(event.target.result, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);

                let imported = 0;
                for (const row of data) {
                    const product = {
                        name: row.Name || row.name || "",
                        category: row.Category || row.category || "",
                        quantity: Number(row.Quantity || row.quantity || 0),
                        minQuantity: Number(row.MinQuantity || row.minQuantity || 5),
                        price: Number(row.Price || row.price || 0),
                        supplier: row.Supplier || row.supplier || "",
                        batchNumber: row.BatchNumber || row.batchNumber || "",
                        expiryDate: row.ExpiryDate || row.expiryDate || "",
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    };
                    if (product.name) {
                        await addDoc(collection(db, "inventory"), product);
                        imported++;
                    }
                }
                toast.success(`Imported ${imported} products successfully`);
                fetchProducts();
            };
            reader.readAsBinaryString(file);
        } catch (error) {
            toast.error("Failed to import Excel file");
        }
        e.target.value = "";
    };

    const handleExportExcel = () => {
        const exportData = products.map((p) => ({
            Name: p.name,
            Category: p.category,
            Quantity: p.quantity,
            MinQuantity: p.minQuantity,
            Price: p.price,
            Supplier: p.supplier,
            BatchNumber: p.batchNumber,
            ExpiryDate: p.expiryDate,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, "pharmacy_inventory.xlsx");
        toast.success("Inventory exported successfully");
    };

    const filteredProducts = products.filter(
        (p) =>
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.category?.toLowerCase().includes(search.toLowerCase()) ||
            p.supplier?.toLowerCase().includes(search.toLowerCase())
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
                <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportExcel}
                        accept=".xlsx,.xls"
                        className="hidden"
                    />
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                <Upload size={16} />
                                Import Excel
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                            >
                                <Download size={16} />
                                Export
                            </button>
                            <button
                                onClick={handleAdd}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                                <Plus size={16} />
                                Add Product
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                    type="text"
                    placeholder="Search by name, category, or supplier..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-green-50">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                    Name
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                    Category
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                    Quantity
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                    Price
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                    Supplier
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                    Expiry
                                </th>
                                {isAdmin && (
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="border-t border-gray-100 hover:bg-green-50/50">
                                    <td className="py-3 px-4 text-sm text-gray-800">
                                        <div className="flex items-center gap-2">
                                            {product.name}
                                            {product.quantity <= product.minQuantity && (
                                                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                            {product.category}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                        <span
                                            className={`font-medium ${product.quantity <= product.minQuantity
                                                ? "text-red-600"
                                                : "text-gray-800"
                                                }`}
                                        >
                                            {product.quantity}
                                        </span>
                                        {product.quantity <= product.minQuantity && (
                                            <span className="text-xs text-red-500 ml-1">(Low)</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-800 font-medium">
                                        ₵{product.price?.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {product.supplier || "-"}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {product.expiryDate || "-"}
                                    </td>
                                    {isAdmin && (
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-gray-400">
                                        {search ? "No products found matching your search" : "No products in inventory"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingProduct ? "Edit Product" : "Add Product"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category *
                                    </label>
                                    <select
                                        required
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="Tablets">Tablets</option>
                                        <option value="Capsules">Capsules</option>
                                        <option value="Syrups">Syrups</option>
                                        <option value="Injections">Injections</option>
                                        <option value="Ointments">Ointments</option>
                                        <option value="Drops">Drops</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price (₵) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        min="0"
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Min Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={form.minQuantity}
                                        onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Supplier
                                    </label>
                                    <input
                                        type="text"
                                        value={form.supplier}
                                        onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Batch Number
                                    </label>
                                    <input
                                        type="text"
                                        value={form.batchNumber}
                                        onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expiry Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.expiryDate}
                                        onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    {editingProduct ? "Update" : "Add"} Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}