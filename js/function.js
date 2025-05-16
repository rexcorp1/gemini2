/**
 * Core Functions for Gemini Chat Application
 *
 * Handles Firebase initialization, authentication, Firestore operations,
 * Firebase Storage operations, and Gemini API interactions.
 */

const vercelFirebaseConfig = {
    apiKey: process.env.VERCEL_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.VERCEL_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VERCEL_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VERCEL_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VERCEL_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VERCEL_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.VERCEL_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let authInstance, dbInstance, storageInstance, googleProviderInstance;

if (vercelFirebaseConfig.apiKey && vercelFirebaseConfig.projectId) {
    if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(vercelFirebaseConfig);
                console.log("Firebase initialized successfully using Vercel environment variables.");
            } else {
                console.warn("Firebase app already initialized. Using existing app instance.");
            }
            authInstance = firebase.auth();
            dbInstance = firebase.firestore();
            storageInstance = firebase.storage();
            googleProviderInstance = new firebase.auth.GoogleAuthProvider();
        } catch (e) {
            console.error("Firebase initialization error:", e);
        }
    } else {
        console.error("Firebase SDK (namespaced version) not loaded before function.js. Make sure Firebase scripts are included in index.html and loaded before this script.");
    }
} else {
    console.error("Firebase configuration is missing from Vercel environment variables. Please set them in your Vercel project settings. Remember to prefix client-side variables with VERCEL_PUBLIC_");
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
export const googleProvider = googleProviderInstance;

export const GEMINI_PROXY_URL = 'https://gemini-backend.deno.dev';

// --- FUNGSI AUTENTIKASI ---
export const signInWithGoogle = async () => {
    try {
        if (!auth) {
            console.error("Firebase Auth is not initialized. Cannot sign in.");
            return null;
        }
        const result = await auth.signInWithPopup(googleProvider);
        console.log("Signed in successfully via function.js:", result.user);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google via function.js:", error);
        return null;
    }
};

export const signOut = async () => {
    try {
        if (!auth) {
            console.error("Firebase Auth is not initialized. Cannot sign out.");
            return false;
        }
        await auth.signOut();
        console.log("Signed out successfully via function.js");
        return true;
    } catch (error) {
        console.error("Error signing out via function.js:", error);
        return false;
    }
};

// --- INTERAKSI DENGAN GEMINI API (MELALUI PROXY) ---
export const callGeminiAPI = async (promptText, userId, chatHistory = [], modelId = "gemini-2.0-flash") => {
    if (!promptText || !promptText.trim()) {
        console.warn("callGeminiAPI: promptText is empty or undefined.");
        return null;
    }

    try {
        const response = await fetch(GEMINI_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                parts: [{ text: promptText }],
                history: chatHistory,
                model: modelId,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`API Error (${response.status}): ${errorData}`);
            return `Error: API request failed with status ${response.status}.`;
        }

        const streamedText = await response.text();
        return streamedText || "Sorry, I couldn't get a response from the API.";
    } catch (error) {
        console.error('Error calling Gemini API via function.js:', error);
        return `Error: Could not connect to the API. ${error.message}`;
    }
};

// --- FUNGSI FIRESTORE ---
export const saveChatToFirestore = async (userId, chatId, messages, title) => {
    console.log("[Firestore Call] saveChatToFirestore - userId:", userId, "chatId:", chatId);
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot save chat.");
        return null;
    }
    if (!userId || !messages || messages.length === 0) {
        console.warn("saveChatToFirestore: Missing userId or messages. Aborting save.");
        return null;
    }

    const messagesToSave = messages.map(msg => {
        const messageToSaveData = {
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date() // Pastikan timestamp selalu ada
        };
        if (msg.fileURL) messageToSaveData.fileURL = msg.fileURL;
        if (msg.fileName) messageToSaveData.fileName = msg.fileName;
        return messageToSaveData;
    });

    const chatData = {
        userId: userId,
        messages: messagesToSave,
        lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        title: title || (messages[0]?.content?.substring(0, 30) + (messages[0]?.content?.length > 30 ? '...' : '') || "New Chat")
    };

    try {
        if (chatId) {
            await db.collection('users').doc(userId).collection('chats').doc(chatId).set(chatData, { merge: true });
            console.log("Chat updated in Firestore:", chatId);
            return chatId;
        } else {
            chatData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('users').doc(userId).collection('chats').add(chatData);
            console.log("New chat saved to Firestore:", docRef.id);
            return docRef.id;
        }
    } catch (error) {
        console.error("Error saving/updating chat to Firestore:", error);
        return null;
    }
};

export const fetchRecentChatsFromFirestore = async (userId) => {
    console.log("[Firestore Call] fetchRecentChatsFromFirestore - userId:", userId);
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot fetch recent chats.");
        return [];
    }
    if (!userId) {
        console.warn("fetchRecentChatsFromFirestore: No userId provided. Returning empty array.");
        return [];
    }
    try {
        const snapshot = await db.collection('users').doc(userId).collection('chats')
            .orderBy('lastMessageTimestamp', 'desc')
            .limit(10)
            .get();
        
        const chats = [];
        snapshot.forEach(doc => {
            chats.push({ id: doc.id, ...doc.data() });
        });
        return chats;
    } catch (error) {
        console.error("Error fetching recent chats from Firestore:", error);
        return [];
    }
};

export const fetchChatFromFirestore = async (userId, chatId) => {
    console.log("[Firestore Call] fetchChatFromFirestore - userId:", userId, "chatId:", chatId);
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot fetch chat.");
        return null;
    }
    if (!userId || !chatId) {
        console.warn("fetchChatFromFirestore: Missing userId or chatId. Returning null.");
        return null;
    }
    try {
        const doc = await db.collection('users').doc(userId).collection('chats').doc(chatId).get();
        if (doc.exists) {
            const chatData = doc.data();
            if (chatData.messages && Array.isArray(chatData.messages)) {
                 chatData.messages.forEach(msg => {
                     if (msg.timestamp && typeof msg.timestamp.toDate === 'function') {
                         msg.timestamp = msg.timestamp.toDate();
                     }
                 });
                 chatData.messages.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
            }
            return { id: doc.id, ...chatData };
        } else {
            console.warn("Chat not found in Firestore:", chatId);
            return null;
        }
    } catch (error) {
        console.error("Error fetching chat from Firestore:", error);
        return null;
    }
};

// --- FUNGSI FIRESTORE (Rename & Delete) ---
export const renameChatInFirestore = async (userId, chatId, newTitle) => {
    console.log("[Firestore Call] renameChatInFirestore - userId:", userId, "chatId:", chatId, "newTitle:", newTitle); // DEBUG LOG
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot rename chat.");
        return false;
    }
	if (!userId || !chatId || !newTitle || !newTitle.trim()) {
		console.warn("renameChatInFirestore: Missing userId, chatId, or newTitle. Aborting rename.");
		return false;
	}
	try {
		await db.collection('users').doc(userId).collection('chats').doc(chatId).update({
			title: newTitle.trim(),
			lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp() // Menggunakan FieldValue dari instance namespaced
		});
		console.log("Chat renamed in Firestore:", chatId, "to", newTitle.trim());
		return true;
	} catch (error) {
		console.error("Error renaming chat in Firestore:", error);
		return false;
	}
};

export const deleteChatFromFirestore = async (userId, chatId) => {
    console.log("[Firestore Call] deleteChatFromFirestore - userId:", userId, "chatId:", chatId);
    if (!db) {
        console.error("Firestore (db) is not initialized. Cannot delete chat.");
        return false;
    }
	if (!userId || !chatId) {
		console.warn("deleteChatFromFirestore: Missing userId or chatId. Aborting delete.");
		return false;
	}
	try {
		await db.collection('users').doc(userId).collection('chats').doc(chatId).delete();
		console.log("Chat deleted from Firestore:", chatId);
		return true;
	} catch (error) {
		console.error("Error deleting chat from Firestore:", error);
		return false;
	}
};

// --- FUNGSI FIREBASE STORAGE ---
export const uploadFileToStorage = async (userId, file) => {
    console.log("[Storage Call] uploadFileToStorage - userId:", userId, "fileName:", file?.name); // DEBUG LOG
    if (!storage) {
        console.error("Firebase Storage is not initialized. Cannot upload file.");
        return null;
    }
    if (!userId || !file) {
        console.warn("uploadFileToStorage: Missing userId or file. Aborting upload.");
        return null;
    }

    const filePath = `userUploads/${userId}/${Date.now()}_${file.name}`;
    const fileRef = storage.ref(filePath);

    try {
        const snapshot = await fileRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        console.log('File uploaded to Storage successfully:', downloadURL);
        return { downloadURL, filePath, fileName: file.name };
    } catch (error) {
        console.error('Error uploading file to Storage:', error);
        return null;
    }
};

console.log("function.js loaded");
