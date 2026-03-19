import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { auth, ADMIN_EMAIL, db } from "./firebaseService.js";

const provider = new GoogleAuthProvider();

export const login = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth).then(() => {
    localStorage.removeItem('busu_active_line');
    location.reload();
});

export const subscribeToAuthChanges = (callback) => {
    onAuthStateChanged(auth, callback);
};

/**
 * Check if the current user is an admin (either master admin or listed in Firebase admins)
 * @param {Object} user - Firebase auth user object
 * @returns {Promise<boolean>} True if user is admin
 */
export const isUserAdmin = async (user) => {
    if (!user) return false;
    
    // Check if user is the master admin
    if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return true;
    }
    
    // Check if user is listed in Firebase admins
    try {
        const adminRef = ref(db, `config/admins/${user.uid}`);
        const snapshot = await get(adminRef);
        return snapshot.exists();
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
};

/**
 * Check if the current user is the master admin
 * @param {Object} user - Firebase auth user object
 * @returns {boolean} True if user is master admin
 */
export const isUserMasterAdmin = (user) => {
    if (!user || !user.email) return false;
    return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

export { auth, ADMIN_EMAIL };
