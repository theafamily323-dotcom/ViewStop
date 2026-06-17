import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, doc, increment, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// YOUR FIREBASE CONFIG (Paste your config from Firebase Console here)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase Core services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Global State
let currentUser = null;

// DOM Elements - Auth
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const signUpBtn = document.getElementById('signUpBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authInputs = document.getElementById('authInputs');
const userGreeting = document.getElementById('userGreeting');

// DOM Elements - Views & Feed
const homeView = document.getElementById('homeView');
const videoView = document.getElementById('videoView');
const uploadFields = document.getElementById('uploadFields');
const uploadLockedMessage = document.getElementById('uploadLockedMessage');
const videoFeed = document.getElementById('videoFeed');
const singleVideoContainer = document.getElementById('singleVideoContainer');
const backHomeBtn = document.getElementById('backHomeBtn');
const logo = document.getElementById('logo');

// DOM Elements - Uploading
const uploadBtn = document.getElementById('uploadBtn');
const videoTitleInput = document.getElementById('videoTitle');
const videoFileInput = document.getElementById('videoFile');
const uploadStatus = document.getElementById('uploadStatus');

---
// 🔐 AUTHENTICATION LOGIC
---
// Sign Up
signUpBtn.addEventListener('click', async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created successfully!");
    } catch (err) { alert(err.message); }
});

// Log In
loginBtn.addEventListener('click', async () => {
    const email = authEmail.value;
    const password = authPassword.value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) { alert(err.message); }
});

// Log Out
logoutBtn.addEventListener('click', () => signOut(auth));

// Track Auth Status (Determines what users can see and do)
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        userGreeting.innerText = `Logged in as: ${user.email} `;
        authInputs.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        uploadFields.style.display = 'block';
        uploadLockedMessage.style.display = 'none';
    } else {
        userGreeting.innerText = "";
        authInputs.style.display = 'block';
        logoutBtn.style.display = 'none';
        uploadFields.style.display = 'none';
        uploadLockedMessage.style.display = 'block';
    }
    loadFeed(); // Refresh view numbers if user logs in/out
});

---
// 📹 VIDEO UPLOAD LOGIC
---
uploadBtn.addEventListener('click', () => {
    if (!currentUser) return alert("You must be logged in to post!");
    
    const title = videoTitleInput.value;
    const file = videoFileInput.files[0];

    if (!title || !file) {
        alert("Please include both a title and a video file!");
        return;
    }

    const storageRef = ref(storage, `videos/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadStatus.innerText = "Uploading your file to ViewStop live storage...";

    uploadTask.on('state_changed', null, 
        (error) => { uploadStatus.innerText = `Upload Error: ${error.message}`; }, 
        async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            try {
                await addDoc(collection(db, "posts"), {
                    title: title,
                    videoUrl: downloadURL,
                    creator: currentUser.email,
                    likes: 0,
                    idols: 0,
                    createdAt: new Date()
                });
                uploadStatus.innerText = "🚀 Published successfully!";
                videoTitleInput.value = '';
                videoFileInput.value = '';
                loadFeed();
            } catch (e) { uploadStatus.innerText = "Database error: " + e.message; }
        }
    );
});

---
// 🎬 NAVIGATION & FEED DISPLAY
---
// Fetch All Videos For Home Feed
async function loadFeed() {
    videoFeed.innerHTML = '';
    try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((docSnap) => {
            const post = docSnap.data();
            const postId = docSnap.id;

            const card = document.createElement('div');
            card.className = 'video-card-preview';
            card.innerHTML = `
                <div class="preview-thumbnail">▶️ Watch Video</div>
                <h3>${post.title}</h3>
                <p class="meta">Posted by: ${post.creator.split('@')[0]}</p>
                <div class="counts">❤️ ${post.likes} | 🌟 ${post.idols} Idols</div>
            `;
            // Click anywhere on the preview card to open dedicated view
            card.addEventListener('click', () => showVideoPage(postId));
            videoFeed.appendChild(card);
        });
    } catch (e) { console.error("Error loading feed: ", e); }
}

// Switch View to Dedicated Video Page
async function showVideoPage(postId) {
    homeView.style.display = 'none';
    videoView.style.display = 'block';
    singleVideoContainer.innerHTML = "Loading video details...";

    const docRef = doc(db, "posts", postId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const post = docSnap.data();
        singleVideoContainer.innerHTML = `
            <div class="focused-player">
                <h2>${post.title}</h2>
                <p class="meta">Creator: ${post.creator}</p>
                <video src="${post.videoUrl}" controls autoplay width="100%"></video>
                <div class="focused-actions">
                    <button id="likeBtn">❤️ Like (<span id="likeCount">${post.likes}</span>)</button>
                    <button id="idolBtn" class="idol-btn">🌟 Idol (<span id="idolCount">${post.idols}</span>)</button>
                </div>
            </div>
        `;

        // Wire up interaction events directly inside the dedicated view
        document.getElementById('likeBtn').addEventListener('click', () => handleInteraction(postId, 'likes', 'likeCount'));
        document.getElementById('idolBtn').addEventListener('click', () => handleInteraction(postId, 'idols', 'idolCount'));
    } else {
        singleVideoContainer.innerHTML = "Video not found.";
    }
}

// Handle Like/Idol Actions safely
async function handleInteraction(postId, type, fieldId) {
    if (!currentUser) {
        alert(`You must be logged in to ${type === 'likes' ? 'Like' : 'Idol'} this creator!`);
        return;
    }

    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
        [type]: increment(1)
    });

    // Dynamically update the count display on the screen
    const displayElement = document.getElementById(fieldId);
    if (displayElement) {
        displayElement.innerText = parseInt(displayElement.innerText) + 1;
    }
}

// Return To Home Routing
function goHome() {
    videoView.style.display = 'none';
    homeView.style.display = 'block';
    loadFeed(); // Refresh stats on home list
}

backHomeBtn.addEventListener('click', goHome);
logo.addEventListener('click', goHome);

// Initial Load
loadFeed();
