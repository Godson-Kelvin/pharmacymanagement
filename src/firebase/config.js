import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCdWUsPk5w3UKqmOzAj18jSpC5gyUG9zws",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pharmacy-pos-e1509.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pharmacy-pos-e1509",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pharmacy-pos-e1509.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "874513577019",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:874513577019:web:35af0fe5ee4faef3d5581e",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
