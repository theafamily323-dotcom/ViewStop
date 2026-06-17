import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, increment, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// YOUR FIREBASE CONFIG (Copy this from your Firebase Console)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const uploadBtn = document.getElementById('uploadBtn');
const videoTitleInput = document.getElementById('videoTitle');
const videoFileInput = document.getElementById('videoFile');
const uploadStatus = document.getElementById('uploadStatus');
const videoFeed = document.getElementById('videoFeed');

// 1. UPLOAD VIDEO & SAVE METADATA
uploadBtn.addEventListener('click', () => {
    const title = videoTitleInput.value;
    const file = videoFileInput.files[0];

    if (!title || !file) {
        alert("Please provide both a title and a video file!");
        return;
    }

    // Create a unique storage reference for the video file
    const storageRef = ref(storage, `videos/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadStatus.innerText = "Uploading video file...";

    uploadTask.on('state_changed', 
        (snapshot) => {
            // Track progress if wanted
        }, 
        (error) => {
            uploadStatus.innerText = `Upload failed: ${error.message}`;
        }, 
        async () => {
            // Get the public live URL of the uploaded video
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Save the details to Firestore database
            try {
                await addDoc(collection(db, "posts"), {
                    title: title,
                    videoUrl: downloadURL,
                    likes: 0,
                    idols: 0,
                    createdAt: new Date()
                });
                uploadStatus.innerText = "Successfully published to ViewStop!";
                videoTitleInput.value = '';
                videoFileInput.value = '';
                loadFeed(); // Refresh the feed
            } catch (e) {
                uploadStatus.innerText = "Database error: " + e.message;
            }
        }
    );
});

// 2. FETCH AND DISPLAY FEED
async function loadFeed() {
    videoFeed.innerHTML = '';
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {
        const post = docSnap.data();
        const postId = docSnap.id;

        const postCard = document.createElement('div');
        postCard.className = 'video-card';
        postCard.innerHTML = `
            <h3>${post.title}</h3>
            <video src="${post.videoUrl}" controls width="100%"></video>
            <div class="actions">
                <button onclick="window.interaction('${postId}', 'likes')">❤️ Like (${post.likes})</button>
                <button onclick="window.interaction('${postId}', 'idols')" class="idol-btn">🌟 Idol (${post.idols})</button>
            </div>
        `;
        videoFeed.appendChild(postCard);
    });
}

// 3. HANDLE LIKES AND IDOLS
window.interaction = async (id, type) => {
    const postRef = doc(db, "posts", id);
    await updateDoc(postRef, {
        [type]: increment(1)
    });
    loadFeed(); // Refresh numbers on screen
};

// Load feed on startup
loadFeed();
