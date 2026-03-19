import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7qohXZb_DYFplLOtt5YiqbahwhNYGPck",
    authDomain: "busu-crowd.firebaseapp.com",
    projectId: "busu-crowd",
    storageBucket: "busu-crowd.firebasestorage.app",
    messagingSenderId: "48985646106",
    appId: "1:48985646106:web:1c7b80091855ad01609da3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { app, db, auth, provider };
