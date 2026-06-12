import { useState } from "react";
import { auth, db } from "../firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, doc, setDoc, Timestamp } from "firebase/firestore";
import { Pill, CheckCircle, XCircle, Loader, Database, UserPlus } from "lucide-react";

const usersToCreate = [
    { email: "admin@pharmaflow.com", password: "admin123", role: "admin" },
    { email: "cashier@pharmaflow.com", password: "cashier123", role: "cashier" },
];

export default function SetupUsers() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dbResults, setDbResults] = useState([]);
    const [dbLoading, setDbLoading] = useState(false);

    const createUsers = async () => {
        setLoading(true);
        setResults([]);
        const output = [];

        for (const user of usersToCreate) {
            try {
                await createUserWithEmailAndPassword(auth, user.email, user.password);
                output.push({ email: user.email, success: true, message: "Created successfully" });
            } catch (error) {
                if (error.code === "auth/email-already-in-use") {
                    output.push({ email: user.email, success: true, message: "Already exists" });
                } else if (error.code === "auth/configuration-not-found") {
                    output.push({ email: user.email, success: false, message: "Enable Email/Password in Firebase Console → Authentication → Sign-in method" });
                } else {
                    output.push({ email: user.email, success: false, message: error.message });
                }
            }
        }

        setResults(output);
        setLoading(false);
    };

    const initDatabase = async () => {
        setDbLoading(true);
        setDbResults([]);
        const output = [];

        // Create a sample product in the inventory collection (creates the collection)
        try {
            await setDoc(doc(db, "inventory", "_setup"), {
                _setup: true,
                createdAt: Timestamp.now()
            });
            await setDoc(doc(db, "sales", "_setup"), {
                _setup: true,
                createdAt: Timestamp.now()
            });
            output.push({ name: "inventory", success: true, message: "Collection created" });
            output.push({ name: "sales", success: true, message: "Collection created" });

            // Clean up the setup documents
            // (leave them as they effectively create the collection)
        } catch (error) {
            if (error.code === "permission-denied" || error.message?.includes("Failed to get document")) {
                output.push({ name: "Database", success: false, message: "Go to Firebase Console → Firestore Database → Create database (choose test mode)" });
            } else {
                output.push({ name: "Database", success: false, message: error.message });
            }
        }

        setDbResults(output);
        setDbLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-emerald-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <Pill size={32} className="text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Firebase Setup</h1>
                    <p className="text-gray-500 mt-1">Initialize your project</p>
                </div>

                {/* Step 1: Users */}
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                        <UserPlus size={20} className="text-blue-600" />
                        <h2 className="font-semibold text-blue-800">Step 1: Create User Accounts</h2>
                    </div>
                    <div className="space-y-2 mb-3">
                        {usersToCreate.map((user) => (
                            <div key={user.email} className="text-sm text-blue-700">
                                {user.email} / {user.password}
                            </div>
                        ))}
                    </div>
                    {results.length > 0 && (
                        <div className="space-y-1 mb-3">
                            {results.map((r) => (
                                <div key={r.email} className={`flex items-center gap-2 p-1.5 rounded ${r.success ? "text-green-700" : "text-red-700"}`}>
                                    {r.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                    <span className="text-xs">{r.email}: {r.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={createUsers} disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <><Loader size={16} className="animate-spin" /> Creating...</> : "Create Users"}
                    </button>
                </div>

                {/* Step 2: Database */}
                <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                        <Database size={20} className="text-purple-600" />
                        <h2 className="font-semibold text-purple-800">Step 2: Initialize Database</h2>
                    </div>
                    <p className="text-xs text-purple-600 mb-3">
                        Creates the required "inventory" and "sales" collections in Firestore
                    </p>
                    {dbResults.length > 0 && (
                        <div className="space-y-1 mb-3">
                            {dbResults.map((r) => (
                                <div key={r.name} className={`flex items-center gap-2 p-1.5 rounded ${r.success ? "text-green-700" : "text-red-700"}`}>
                                    {r.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                    <span className="text-xs">{r.name}: {r.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={initDatabase} disabled={dbLoading}
                        className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {dbLoading ? <><Loader size={16} className="animate-spin" /> Initializing...</> : "Initialize Database"}
                    </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h3 className="font-semibold text-yellow-800 text-sm mb-2">⚠️ Production Mode - Fix Security Rules</h3>
                    <p className="text-xs text-yellow-700 mb-2">
                        Since you chose Production mode, you must update the Firestore security rules to allow your app to read/write data.
                    </p>
                    <p className="text-xs text-yellow-700 mb-2">
                        Go to <span className="text-blue-600 underline cursor-pointer font-medium" onClick={() => window.open("https://console.firebase.google.com/project/pharmacy-pos-e1509/firestore/rules", "_blank")}>Firestore Database → Rules</span>
                    </p>
                    <p className="text-xs text-yellow-700 mb-2">Replace the rules with this:</p>
                    <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto mb-2">
                        {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</pre>
                    <p className="text-xs text-yellow-700">Click <strong>Publish</strong> after pasting. Then come back and click <strong>Initialize Database</strong>.</p>
                </div>
            </div>
        </div>
    );
}