import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. REPLACE THESE WITH YOUR EXACT KEYS FROM FIREBASE CONSOLE!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 2. Initialize Firebase & Google Login Tool
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 3. Grab Elements from the HTML screen
const loginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const statusText = document.getElementById('status');
const videoSection = document.getElementById('videoPlayerSection');

// 4. What happens when you click "Sign In with Google"
loginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        alert("Login Failed: " + error.message);
    }
});

// What happens when you click "Log Out"
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// 5. This constantly checks if a user is logged in or logged out
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is logged in! Show the video player.
        statusText.innerText = `Welcome, ${user.displayName}! You can now watch and interact.`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        videoSection.style.display = 'block';
    } else {
        // User is logged out! Hide the video player.
        statusText.innerText = "Please sign in to watch and interact with videos!";
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        videoSection.style.display = 'none';
    }
});

// Simple click alerts for the Like/Idol buttons for testing
document.getElementById('likeBtn').addEventListener('click', () => alert('Liked video!'));
document.getElementById('idolBtn').addEventListener('click', () => alert('Idoled creator!'));
