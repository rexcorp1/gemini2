/**
 * Core Functions for Gemini Chat Application
 *
 * Handles Firebase initialization, authentication, Firestore operations,
 * Firebase Storage operations, and Gemini API interactions.
 */

import { firebaseConfig } from './firebase.config.js';

// Inisialisasi Firebase
if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) {
        if (e.code !== 'app/duplicate-app') {
            console.error("Firebase initialization error:", e);
            throw e;
        } else {
            console.warn("Firebase app already initialized.");
        }
    }
} else {
    console.error("Firebase SDK not loaded before function.js. Make sure Firebase scripts are in index.html and loaded first.");
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

export const GEMINI_PROXY_URL = 'https://gemini-backend.deno.dev';

// --- FUNGSI AUTENTIKASI ---
export const signInWithGoogle = async () => {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        console.log("Signed in successfully via function.js:", result.user);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google via function.js:", error);
        // Jangan tampilkan alert di sini, biarkan UI handler yang memutuskan
        // alert(`Login failed: ${error.message}`);
        return null;
    }
};

export const signOut = async () => {
    try {
        await auth.signOut();
        console.log("Signed out successfully via function.js");
        return true;
    } catch (error) {
        console.error("Error signing out via function.js:", error);
        return false;
    }
};

// --- INTERAKSI DENGAN GEMINI API (MELALUI PROXY) ---
export const callGeminiAPI = async (promptText, userId, chatHistory = [], modelId = "gemini-2.0-flash") => { // Default modelId disesuaikan
    if (!promptText || !promptText.trim()) {
        console.warn("callGeminiAPI: promptText is empty or undefined.");
        return null;
    }
    // Tambahkan log untuk userId di sini juga jika perlu, tapi biasanya userId untuk API call tidak langsung mempengaruhi Firestore rules
    // console.log("callGeminiAPI called with userId for API (not Firestore path):", userId);

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
    console.log("[Firestore Call] saveChatToFirestore - userId:", userId, "chatId:", chatId); // DEBUG LOG
    if (!userId || !messages || messages.length === 0) {
        console.warn("saveChatToFirestore: Missing userId or messages. Aborting save.");
        return null;
    }

    const messagesToSave = messages.map(msg => {
        const messageToSaveData = {
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date()
        };
        if (msg.fileURL) messageToSaveData.fileURL = msg.fileURL;
        if (msg.fileName) messageToSaveData.fileName = msg.fileName;
        return messageToSaveData;
    });

    const chatData = {
        userId: userId, // Simpan juga userId di dalam data chat untuk referensi jika perlu
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
    console.log("[Firestore Call] fetchRecentChatsFromFirestore - userId:", userId); // DEBUG LOG
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
    console.log("[Firestore Call] fetchChatFromFirestore - userId:", userId, "chatId:", chatId); // DEBUG LOG
    if (!userId || !chatId) {
        console.warn("fetchChatFromFirestore: Missing userId or chatId. Returning null.");
        return null;
    }
    try {
        const doc = await db.collection('users').doc(userId).collection('chats').doc(chatId).get();
        if (doc.exists) {
            const chatData = doc.data();
            if (chatData.messages && Array.isArray(chatData.messages)) {
                 chatData.messages.sort((a, b) => (a.timestamp?.toDate() || 0) - (b.timestamp?.toDate() || 0));
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
	if (!userId || !chatId || !newTitle || !newTitle.trim()) {
		console.warn("renameChatInFirestore: Missing userId, chatId, or newTitle. Aborting rename.");
		return false;
	}
	try {
		await db.collection('users').doc(userId).collection('chats').doc(chatId).update({
			title: newTitle.trim(),
			lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp()
		});
		console.log("Chat renamed in Firestore:", chatId, "to", newTitle.trim());
		return true;
	} catch (error) {
		console.error("Error renaming chat in Firestore:", error);
		return false;
	}
};

export const deleteChatFromFirestore = async (userId, chatId) => {
    console.log("[Firestore Call] deleteChatFromFirestore - userId:", userId, "chatId:", chatId); // DEBUG LOG
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
