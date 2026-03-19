import { auth, provider } from "./firebaseService.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { ADMIN_EMAIL } from "../config/systemConfig.js";

export const fazerLogin = () => signInWithPopup(auth, provider);

export const fazerLogout = () => signOut(auth).then(() => { 
    localStorage.removeItem('busu_active_line'); 
    location.reload(); 
});

export const watchAuthState = (callback) => {
    onAuthStateChanged(auth, u => {
        const isAdmin = u && u.email.toLowerCase() === ADMIN_EMAIL;
        callback(u, isAdmin);
    });
};
