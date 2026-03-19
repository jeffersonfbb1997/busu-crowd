import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { auth, ADMIN_EMAIL } from "./firebaseService.js";

const provider = new GoogleAuthProvider();

export const login = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth).then(() => {
    localStorage.removeItem('busu_active_line');
    location.reload();
});

export const subscribeToAuthChanges = (callback) => {
    onAuthStateChanged(auth, callback);
};

export { auth, ADMIN_EMAIL };
