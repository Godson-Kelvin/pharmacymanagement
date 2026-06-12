import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import SetupUsers from "./pages/SetupUsers";
import Layout from "./components/Layout";

function ProtectedRoute({ children, allowedRoles }) {
    const { user, role } = useAuth();
    if (!user) return <Navigate to="/login" />;
    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/" />;
    }
    return children;
}

function PublicRoute({ children }) {
    const { user } = useAuth();
    if (user) return <Navigate to="/" />;
    return children;
}

export default function App() {
    return (
        <Routes>
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="sales" element={<Sales />} />
            </Route>
            <Route path="/setup" element={<SetupUsers />} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}