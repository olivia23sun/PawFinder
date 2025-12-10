import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDD_ehJph1hLn5FuFXb5lDGJQyZYL0vYpo",
    authDomain: "lost-dog-platform.firebaseapp.com",
    projectId: "lost-dog-platform",
    storageBucket: "lost-dog-platform.firebasestorage.app",
    messagingSenderId: "808963930061",
    appId: "1:808963930061:web:83179b09c46f3a092b3684",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);  