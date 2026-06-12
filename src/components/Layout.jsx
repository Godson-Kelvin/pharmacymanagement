import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    LogOut,
    Pill,
    User,
} from "lucide-react";

const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { path: "/inventory", label: "Inventory", icon: Package },
    { path: "/sales", label: "Sales", icon: ShoppingCart },
];

export default function Layout() {
    const { logout, user, role } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="flex h-screen bg-green-50">
            {/* Sidebar */}
            <aside className="w-64 bg-green-800 text-white flex flex-col">
                <div className="p-6 border-b border-green-700">
                    <div className="flex items-center gap-3">
                        <Pill size={32} className="text-green-300" />
                        <div>
                            <h1 className="text-xl font-bold">PharmaFlow</h1>
                            <p className="text-xs text-green-300">Pharmacy Management</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? "bg-green-600 text-white"
                                    : "text-green-200 hover:bg-green-700 hover:text-white"
                                }`
                            }
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-green-700">
                    <div className="flex items-center gap-3 px-4 py-2 mb-2">
                        <User size={20} className="text-green-300" />
                        <div className="text-sm">
                            <p className="font-medium capitalize">{role}</p>
                            <p className="text-xs text-green-300 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-200 hover:bg-red-600 hover:text-white transition-colors w-full"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-8">
                <Outlet />
            </main>
        </div>
    );
}