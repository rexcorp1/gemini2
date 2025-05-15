/**
 * Gemini Chat Application UI Script
 * Handles UI interactions, event listeners, and integrates with core functions
 * from function.js for Firebase and Gemini API interactions.
 */
import {
	auth,
	signInWithGoogle as fbSignInWithGoogle,
	signOut as fbSignOut,
	callGeminiAPI,
	saveChatToFirestore,
	fetchRecentChatsFromFirestore,
	fetchChatFromFirestore,
	uploadFileToStorage, // <-- Tambahkan koma di sini
	renameChatInFirestore,
	deleteChatFromFirestore
} from './function.js';

const menuToggleButtonDesktop = document.getElementById('menu-toggle-button-desktop');
const menuToggleButtonMobile = document.getElementById('menu-toggle-button-mobile');
const bodyElement = document.body;
const mainContent = document.getElementById('main-content');
const sidebar = document.getElementById('sidebar');
const chatInput = document.getElementById('chat-input');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const modeSwitcherButton = document.getElementById('mode-switcher-button');
const modelDropdownMenu = document.getElementById('model-dropdown-menu');
const selectedModeText = document.getElementById('selected-mode-text');
const bottomSheetOverlay = document.getElementById('bottom-sheet-overlay');
const greetingText = document.querySelector('.greeting-text');
const contentCenter = document.querySelector('.content-center');
const sendMicButton = document.getElementById('send-mic-button');
const sendMicIcon = document.getElementById('send-mic-icon');
const chatContentWrapper = document.querySelector('.chat-content-wrapper');
const disclaimerText = document.querySelector('.disclaimer');
const aiMessageOptionsSheet = document.getElementById('ai-message-options-sheet'); // Pindahkan ke scope global jika diakses global
const aiOptionsOverlay = document.getElementById('ai-options-overlay'); // Pindahkan ke scope global jika diakses global
const recentItemOptionsMenu = document.getElementById('recent-item-options-menu'); // Menu konteks untuk item recent

// User profile elements (assuming they exist or will be used from your HTML)
const profileButton = document.querySelector('.profile-button'); // Or a more specific selector
const userProfilePic = profileButton ? profileButton.querySelector('.profile-image') : null;
const userGreeting = document.querySelector('.greeting-text h1'); // Assuming h1 inside greeting-text
const fileUploadInput = document.getElementById('file-upload-input'); // Make sure this exists in HTML

// Account Dialog Elements
const accountDialogOverlay = document.getElementById('account-dialog-overlay');
const accountDialog = document.getElementById('account-dialog');
const accountDialogUserPic = document.getElementById('account-dialog-user-pic');
const accountDialogGreeting = document.getElementById('account-dialog-greeting'); // Corrected: Targets ID 'account-dialog-greeting'
const accountDialogUserEmailTop = document.getElementById('account-dialog-user-email-top'); // Added: Targets ID 'account-dialog-user-email-top'
const accountDialogUserEmailMain = document.getElementById('account-dialog-user-email-main'); // Corrected: Targets ID 'account-dialog-user-email-main'
const accountDialogSignOutButton = document.getElementById('account-dialog-sign-out-button');
const accountDialogSignInButton = document.getElementById('account-dialog-sign-in-button');
const accountDialogNotSignedInText = document.getElementById('account-dialog-not-signed-in-text');
const accountDialogCloseButton = document.getElementById('account-dialog-close-button-x'); // Corrected: Targets ID 'account-dialog-close-button-x'

// Deklarasikan variabel menu yang diakses secara global di sini
const aiMessageOptionsMenu = document.getElementById('ai-message-options-menu'); // Deklarasi di scope global
let currentAiMessageTriggerButton = null; // Juga pindahkan jika diakses global

const MOBILE_BREAKPOINT = 768;
let isMouseOverSidebar = false;
let isSending = false;

// Default profile picture and alt text (accessible globally)
const DEFAULT_PROFILE_PIC = 'https://placehold.co/32x32/E0E0E0/BDBDBD?text=R'; // Example
const DEFAULT_PROFILE_ALT = 'Profil Pengguna'; // Example

// Application State
let currentUser = null;
let currentChatId = null;
let currentChatMessages = []; // Stores { role, content, timestamp?, fileURL?, fileName? }

function updateLayout() {
	const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

	if (!isMobile) {
		const isPinned = bodyElement.classList.contains('sidebar-pinned');
		const isClosed = bodyElement.classList.contains('sidebar-closed');
		let sidebarWidth;
		if (isPinned || !isClosed) {
			sidebarWidth = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-open-width').trim();
		} else {
			sidebarWidth = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-closed-width').trim();
		}
		mainContent.style.marginLeft = sidebarWidth;
	} else {
		mainContent.style.marginLeft = '0';
	}

	if (modelDropdownMenu) {
		if (isMobile) {
			modelDropdownMenu.style.position = 'fixed';
			modelDropdownMenu.style.bottom = '0';
			modelDropdownMenu.style.left = '0';
			modelDropdownMenu.style.right = '0';
			modelDropdownMenu.style.width = '100%';
			modelDropdownMenu.style.maxWidth = '100%';
			modelDropdownMenu.style.borderTopLeftRadius = '16px';
			modelDropdownMenu.style.borderTopRightRadius = '16px';
			modelDropdownMenu.style.borderBottomLeftRadius = '0';
			if (!bodyElement.classList.contains('bottom-sheet-open')) {
				modelDropdownMenu.style.transform = 'translateY(100%)';
				modelDropdownMenu.style.opacity = '0';
				modelDropdownMenu.style.visibility = 'hidden';
			} else {
				modelDropdownMenu.style.transform = 'translateY(0)';
				modelDropdownMenu.style.opacity = '1';
				modelDropdownMenu.style.visibility = 'visible';
			}
			modelDropdownMenu.style.top = 'auto';
			modelDropdownMenu.style.transition = `opacity var(--bottom-sheet-transition-duration) ease, visibility var(--bottom-sheet-transition-duration) ease, transform var(--bottom-sheet-transition-duration) ease`;
			modelDropdownMenu.style.backgroundColor = 'var(--gem-sys-color--surface-container)';
			modelDropdownMenu.style.paddingBottom = '32px';
			modelDropdownMenu.style.zIndex = '1005';
		} else { // Desktop styles for model dropdown
			if (modeSwitcherButton && modeSwitcherButton.parentElement) {
				const buttonRect = modeSwitcherButton.getBoundingClientRect();
				const titleContainerRect = modeSwitcherButton.parentElement.getBoundingClientRect();

				modelDropdownMenu.style.position = 'absolute';
				modelDropdownMenu.style.top = (window.scrollY + buttonRect.bottom + 4) + 'px';
				modelDropdownMenu.style.left = (window.scrollX + titleContainerRect.left) + 'px';

				modelDropdownMenu.style.bottom = 'auto';
				modelDropdownMenu.style.right = 'auto';
				modelDropdownMenu.style.width = '320px';
				modelDropdownMenu.style.maxWidth = '320px';
				modelDropdownMenu.style.borderRadius = '16px';
				modelDropdownMenu.style.transition = 'opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease';
				modelDropdownMenu.style.backgroundColor = 'var(--gem-sys-color--surface-container)';
				modelDropdownMenu.style.paddingBottom = '8px';
				modelDropdownMenu.style.zIndex = '1002';

				if (modelDropdownMenu.classList.contains('show')) {
					modelDropdownMenu.style.opacity = '1';
					modelDropdownMenu.style.visibility = 'visible';
					modelDropdownMenu.style.transform = 'translateY(0)';
				} else {
					modelDropdownMenu.style.opacity = '0';
					modelDropdownMenu.style.visibility = 'hidden';
					modelDropdownMenu.style.transform = 'translateY(-10px)';
				}
			} else {
				modelDropdownMenu.style.opacity = '0';
				modelDropdownMenu.style.visibility = 'hidden';
			}
		}
	}
	requestAnimationFrame(() => {
		chatInput ?.dispatchEvent(new Event('input'));
	});
}

function toggleEmptyStateUI() {
	if (!chatContentWrapper || !greetingText || !disclaimerText) return;
	const hasMessages = chatContentWrapper.children.length > 0;
	greetingText.style.display = hasMessages ?'none' : 'block';
	chatContentWrapper.style.display = hasMessages ?'flex' : 'none';
	disclaimerText.style.visibility = hasMessages ?'visible' : 'hidden';
}

function updateSendButtonState() {
	if (!sendMicButton || !sendMicIcon || !chatInput) return;
	const inputText = chatInput.value.trim();

	// Hapus class state karena kita akan atur style langsung di JS
	// sendMicButton.classList.remove('state-sending', 'state-has-input', 'state-idle');
	sendMicIcon.style.fontVariationSettings = "";

	if (isSending) {
		sendMicIcon.textContent = 'stop';
		sendMicIcon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20";
		// Atur style langsung
		sendMicIcon.style.color = 'var(--gem-sys-color--primary)';
		sendMicButton.style.backgroundColor = 'var(--gem-sys-color--primary-container)';
		sendMicButton.setAttribute('aria-label', 'Stop generating');
		chatInput.disabled = true;
	} else if (inputText !== '') {
		sendMicIcon.textContent = 'send';
		sendMicIcon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20";
		// Atur style langsung
		sendMicIcon.style.color = 'var(--default-icon-color)';
		sendMicButton.style.backgroundColor = 'var(--gem-sys-color--surface-container)';
		sendMicButton.setAttribute('aria-label', 'Send message');
		chatInput.disabled = false;
	} else {
		sendMicIcon.textContent = 'mic';
		// Atur style langsung
		sendMicIcon.style.color = 'var(--default-icon-color)';
		sendMicButton.style.removeProperty('background-color'); // Hapus background biar transparan
		sendMicButton.setAttribute('aria-label', 'Use microphone');
		chatInput.disabled = false;
	}
}

// --- Popup/Menu Management Functions ---
// Moved outside DOMContentLoaded to be accessible globally/in module scope
function hideAllPopups(exceptMenu = null, exceptSubmenu = null) {
	// Select all elements that function as popups or submenus
	document.querySelectorAll('.context-menu-popup.show, .submenu.show, .bottom-sheet-open').forEach(menu => {
		// Check if the current menu is the one being explicitly excluded
		const isExcepted = (exceptMenu && menu === exceptMenu) || (exceptSubmenu && menu === exceptSubmenu);

		if (!isExcepted) {
			// For elements controlled by classes like 'show' or 'bottom-sheet-open'
			menu.classList.remove('show');
			menu.classList.remove('bottom-sheet-open'); // Also handle bottom sheets

			// For elements controlled by style.display (like modelDropdownMenu on mobile)
			if (menu.style.display === 'block') {
				menu.style.display = 'none';
			}
		}
	});
	// Reset specific state variables if the corresponding menu is not excepted
	if (recentItemOptionsMenu && recentItemOptionsMenu !== exceptMenu) recentItemOptionsMenu.classList.remove('show');
	if (aiMessageOptionsMenu && aiMessageOptionsMenu !== exceptMenu) aiMessageOptionsMenu.classList.remove('show');
	// Note: activeSubmenu state is handled within the settings menu logic
}
// --- Account Dialog Functions ---
function openAccountDialog() {
	// Ensure all necessary dialog elements are found before proceeding
	if (!accountDialogOverlay || !accountDialog || !accountDialogUserPic ||
		!accountDialogGreeting || !accountDialogUserEmailTop || !accountDialogUserEmailMain ||
		!accountDialogSignOutButton || !accountDialogSignInButton || !accountDialogNotSignedInText) {
		console.warn("Account dialog: One or more elements not found. Cannot fully update content.");
		// Attempt to show basic dialog structure if core elements exist
		if (accountDialogOverlay && accountDialog) {
			accountDialogOverlay.classList.remove('hidden');
			accountDialogOverlay.classList.add('flex');
			accountDialog.classList.remove('hidden');
		}
		return;
	}

	// Reset visibility for elements that change based on login state
	accountDialogUserEmailTop.classList.add('hidden');
	// accountDialogUserEmailMain is hidden by default in HTML, manage if shown for logged-in
	accountDialogSignOutButton.classList.add('hidden');
	accountDialogSignInButton.classList.add('hidden');
	accountDialogNotSignedInText.classList.add('hidden');
	accountDialogUserPic.classList.add('hidden'); // Hide pic by default, show if user

	if (currentUser) {
		if (accountDialogUserPic) accountDialogUserPic.src = currentUser.photoURL || DEFAULT_PROFILE_PIC;
		if (accountDialogUserPic) accountDialogUserPic.alt = currentUser.displayName || DEFAULT_PROFILE_ALT;
		if (accountDialogUserPic) accountDialogUserPic.classList.remove('hidden');

		if (accountDialogGreeting) accountDialogGreeting.textContent = `Hi, ${currentUser.displayName || 'User'}`;
		
		if (accountDialogUserEmailTop) accountDialogUserEmailTop.textContent = currentUser.email || '';
		if (accountDialogUserEmailTop) accountDialogUserEmailTop.classList.remove('hidden');

		if (accountDialogUserEmailMain) accountDialogUserEmailMain.textContent = currentUser.email || '';
		// if (accountDialogUserEmailMain) accountDialogUserEmailMain.classList.remove('hidden'); // Show if needed for logged-in users

		if (accountDialogSignOutButton) accountDialogSignOutButton.classList.remove('hidden');
	} else {
		if (accountDialogUserPic) accountDialogUserPic.src = DEFAULT_PROFILE_PIC; // Placeholder
		if (accountDialogUserPic) accountDialogUserPic.alt = DEFAULT_PROFILE_ALT;
		// if (accountDialogUserPic) accountDialogUserPic.classList.remove('hidden'); // Optionally show placeholder pic for guest
		if (accountDialogGreeting) accountDialogGreeting.textContent = 'Hello, Guest'; // Request: Change greeting
		if (accountDialogUserEmailMain) accountDialogUserEmailMain.textContent = ''; // Clear main email
		if (accountDialogSignInButton) accountDialogSignInButton.classList.remove('hidden');
		if (accountDialogNotSignedInText) accountDialogNotSignedInText.classList.remove('hidden');
	}

	if (accountDialogOverlay) {
		accountDialogOverlay.classList.remove('hidden');
		accountDialogOverlay.classList.add('flex'); // Untuk centering
		if (accountDialog) accountDialog.classList.remove('hidden');
	}
}

function closeAccountDialog() {
	if (accountDialogOverlay) {
		accountDialogOverlay.classList.add('hidden');
		accountDialogOverlay.classList.remove('flex');
	}
	if (accountDialog) accountDialog.classList.add('hidden'); // Sembunyikan dialognya juga
}

// --- Firebase Auth State Change Handler ---
auth.onAuthStateChanged(async user => {
	currentUser = user;
	if (user) {
		if (userGreeting) userGreeting.textContent = `Hello, ${user.displayName || 'User'}`;
		if (userProfilePic) {
			userProfilePic.src = user.photoURL || DEFAULT_PROFILE_PIC;
			userProfilePic.alt = user.displayName || DEFAULT_PROFILE_ALT;
		}
		if (profileButton) {
			profileButton.onclick = openAccountDialog; // Buka dialog, bukan langsung sign out
			profileButton.setAttribute('aria-label', 'Sign Out');
		}
		await uiLoadRecentChats(); // Ini akan memuat chat jika ada
		if (!currentChatId && chatContentWrapper.children.length === 0) { 
			// uiStartNewChat(); // Ini akan nambahin pesan AI "Hi there..."
			// Jika mau benar-benar kosong setelah login (hanya Hello, <user>):
			resetChatArea(); // Cukup reset, jangan panggil uiStartNewChat yang nambah pesan AI
			toggleEmptyStateUI(); // Pastikan greeting text yang tampil
		}
	} else {
		if (userGreeting) userGreeting.textContent = 'Hello, Guest';
		if (userProfilePic) {
			userProfilePic.src = DEFAULT_PROFILE_PIC;
			userProfilePic.alt = DEFAULT_PROFILE_ALT;
		}
		if (profileButton) {
			profileButton.onclick = openAccountDialog; // Buka dialog, bukan langsung sign in
			profileButton.setAttribute('aria-label', 'Sign In with Google');
		}
		if (chatContentWrapper) chatContentWrapper.innerHTML = ''; // Clear chat view
		toggleEmptyStateUI(); // Show greeting
		const recentChatsList = document.getElementById('recent-chats-list'); // Already declared
		if (recentChatsList) recentChatsList.innerHTML = '<p class="px-3 py-2 text-sm text-gray-500 hide-when-closed">Log in to see recent chats.</p>';
		currentChatId = null;
		currentChatMessages = [];
	}
	updateLayout(); // Panggil updateLayout untuk menyesuaikan margin, dll.
});

// Event Listeners untuk Account Dialog
if (accountDialogOverlay) {
	accountDialogOverlay.addEventListener('click', (e) => {
		if (e.target === accountDialogOverlay) { // Hanya tutup jika klik di overlay, bukan di dialognya
			closeAccountDialog();
		}
	});
}
if (accountDialogCloseButton) accountDialogCloseButton.addEventListener('click', closeAccountDialog);

if (accountDialogSignInButton) accountDialogSignInButton.addEventListener('click', async () => {
	const loggedInUser = await fbSignInWithGoogle();
	if (!loggedInUser) alert("Sign in failed. Please try again.");
	closeAccountDialog();
});
if (accountDialogSignOutButton) accountDialogSignOutButton.addEventListener('click', async () => {
	const success = await fbSignOut();
	if (!success) alert("Sign out failed. Please try again.");
	closeAccountDialog();
});

// --- UI Layer Functions for Core Logic ---

async function uiHandleSendMessage(promptText, fileInfo = null) {
	if (!currentUser) {
		alert("Please log in to send messages.");
		return;
	}
	const textToSend = promptText ? promptText.trim() : '';
	if (!textToSend && !fileInfo) return;

	isSending = true;
	updateSendButtonState();

    	// Dapatkan model yang dipilih dari data-value item dropdown yang 'selected'
	let selectedModelId = "gemini-2.0-flash"; // Default fallback sesuai mapping lo
	const selectedDropdownItem = modelDropdownMenu ? modelDropdownMenu.querySelector('.dropdown-item.selected') : null;
	const uiModelValue = selectedDropdownItem ? selectedDropdownItem.dataset.value : null;

	if (uiModelValue) {
		// Mapping dari data-value UI ke ID model API sesuai permintaan lo
		switch (uiModelValue) {
			case "2.0 Flash":
				selectedModelId = "gemini-2.0-flash";
				break;
			case "2.5 Flash (experimental)":
				selectedModelId = "gemini-2.5-flash-preview-04-17";
				break;
			case "2.5 Pro (experimental)":
				selectedModelId = "gemini-2.5-pro-preview-05-06";
				break;
			case "Deep Research":
				selectedModelId = "gemini-2.0-flash"; // Mapping sesuai permintaan
				break;
			case "Personalization (experimental)":
				selectedModelId = "gemini-2.0-flash"; // Mapping sesuai permintaan
				break;
			default:
				console.warn("Model value from UI not recognized, using default:", uiModelValue, "Default ID:", selectedModelId);
		}
	} else {
		console.warn("Could not determine selected model from UI, using default ID:", selectedModelId);
	}

	console.log("Selected UI value:", uiModelValue, "Mapped to API model ID:", selectedModelId);

	let combinedPrompt = textToSend;
	let userMessageForDisplay = textToSend;
	let userMessageForHistory = { role: 'user', content: textToSend, timestamp: new Date() };

	if (fileInfo && fileInfo.downloadURL) {
		const fileDisplayMessage = `File: ${fileInfo.fileName}`;
		userMessageForDisplay = textToSend ? `${textToSend}\n${fileDisplayMessage}` : fileDisplayMessage;
		combinedPrompt = textToSend ? `${textToSend}\n[File Ref: ${fileInfo.downloadURL}]` : `[File Ref: ${fileInfo.downloadURL}]`;
		userMessageForHistory = { role: 'user', content: textToSend || `File: ${fileInfo.fileName}`, timestamp: new Date(), fileURL: fileInfo.downloadURL, fileName: fileInfo.fileName };
	}

	if (userMessageForDisplay) addMessageToChat(userMessageForDisplay, 'user');
	currentChatMessages.push(userMessageForHistory);
	if (chatInput) chatInput.value = '';
	chatInput?.dispatchEvent(new Event('input'));

	const aiLoadingBubble = addMessageToChat(null, 'ai');
	// Setelah bubble dibuat, kita bisa langsung trigger animasi loading jika diinginkan
	if (aiLoadingBubble) startAILoadingAnimation(aiLoadingBubble);

	const historyForAPI = currentChatMessages.slice(0, -1)
		.filter(msg => msg.role && msg.content) // Ensure role and content exist
		.map(msg => ({ role: msg.role, parts: [{ text: msg.content + (msg.fileName ? ` (File: ${msg.fileName})` : '') }]	}));

	const aiResponse = await callGeminiAPI(combinedPrompt, currentUser.uid, historyForAPI, selectedModelId);

	if (aiLoadingBubble) {
		updateAIMessageBubble(aiLoadingBubble, (aiResponse && !aiResponse.startsWith("Error:")) ? aiResponse : (aiResponse || "Sorry, an error occurred."), false);
	}

	if (aiResponse && !aiResponse.startsWith("Error:")) {
		currentChatMessages.push({ role: 'model', content: aiResponse, timestamp: new Date() });
		await uiSaveChat();
	}
	isSending = false;
	updateSendButtonState();
	chatInput?.focus();
}

menuToggleButtonDesktop ?.addEventListener('click', () => {
	if (window.innerWidth > MOBILE_BREAKPOINT) {
		bodyElement.classList.toggle('sidebar-pinned');
		if (bodyElement.classList.contains('sidebar-pinned')) {
			bodyElement.classList.remove('sidebar-closed');
		} else {
			if (!isMouseOverSidebar) {
				bodyElement.classList.add('sidebar-closed');
			} else {
				bodyElement.classList.remove('sidebar-closed');
			}
		}
		updateLayout();
	}
});

menuToggleButtonMobile ?.addEventListener('click', () => {
	bodyElement.classList.toggle('sidebar-open-mobile');
	if (bodyElement.classList.contains('sidebar-open-mobile')) {
		bodyElement.classList.remove('sidebar-closed');
	}
});

sidebarOverlay ?.addEventListener('click', () => {
	bodyElement.classList.remove('sidebar-open-mobile');
});

sidebar ?.addEventListener('mouseenter', () => {
	isMouseOverSidebar = true;
	if (window.innerWidth > MOBILE_BREAKPOINT && !bodyElement.classList.contains('sidebar-pinned')) {
		bodyElement.classList.remove('sidebar-closed');
		updateLayout();
	}
});

chatInput ?.addEventListener('input', () => {
	chatInput.style.height = 'auto';
	const minHeight = 24;
	const maxHeight = 200;
	const requiredHeight = Math.max(minHeight, Math.min(chatInput.scrollHeight, maxHeight));
	chatInput.style.height = `${requiredHeight}px`;
	updateSendButtonState();
});

sidebar ?.addEventListener('mouseleave', () => {
	isMouseOverSidebar = false;
	if (window.innerWidth > MOBILE_BREAKPOINT && !bodyElement.classList.contains('sidebar-pinned')) {
		bodyElement.classList.add('sidebar-closed');
		updateLayout();
	}
});

// Model Dropdown/Bottom Sheet Toggle
function toggleDropdownDesktop(shouldShow) {
	if (!modelDropdownMenu || !modeSwitcherButton) return;
	modelDropdownMenu.classList.toggle('show', shouldShow);
	modeSwitcherButton.classList.toggle('open', shouldShow);
	modeSwitcherButton.setAttribute('aria-expanded', String(shouldShow));
	updateLayout();
}

function openBottomSheet() {
	if (!modelDropdownMenu || !bottomSheetOverlay || !modeSwitcherButton) return;
	bodyElement.classList.add('bottom-sheet-open');
	updateLayout();
	modeSwitcherButton.classList.add('open');
	modeSwitcherButton.setAttribute('aria-expanded', 'true');
	if (aiMessageOptionsSheet && aiMessageOptionsSheet.classList.contains('show')) {
		closeAiMessageOptionsSheet();
	}
}

function closeBottomSheet() {
	if (!modelDropdownMenu || !bottomSheetOverlay || !modeSwitcherButton) return;
	bodyElement.classList.remove('bottom-sheet-open');
	modeSwitcherButton.classList.remove('open');
	modeSwitcherButton.setAttribute('aria-expanded', 'false');
	updateLayout();
}

modeSwitcherButton ?.addEventListener('click', (event) => {
	event.stopPropagation();
	const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
	if (isMobile) {
		if (aiMessageOptionsSheet && aiMessageOptionsSheet.classList.contains('show')) {
			closeAiMessageOptionsSheet();
		}
		if (bodyElement.classList.contains('bottom-sheet-open')) {
			closeBottomSheet();
		} else {
			openBottomSheet();
		}
	} else {
		const isCurrentlyShown = modelDropdownMenu.classList.contains('show');
		toggleDropdownDesktop(!isCurrentlyShown);
	}
});

modelDropdownMenu ?.addEventListener('click', (event) => {
	const targetItem = event.target.closest('.dropdown-item');
	if (!targetItem) return;

	const value = targetItem.dataset.value;
	if (!value || targetItem.classList.contains('item-gemini-advanced')) {
		if (targetItem.classList.contains('item-gemini-advanced')) {
			console.log('Upgrade button clicked (placeholder)');
		}
		return;
	}

	if (selectedModeText) {
		selectedModeText.textContent = value;
	}

	modelDropdownMenu.querySelectorAll('.dropdown-item[role="menuitemradio"]').forEach(item => {
		item.classList.remove('selected');
		item.setAttribute('aria-checked', 'false');
	});
	targetItem.classList.add('selected');
	targetItem.setAttribute('aria-checked', 'true');

	if (window.innerWidth <= MOBILE_BREAKPOINT) {
		closeBottomSheet();
	} else {
		toggleDropdownDesktop(false);
	}
	console.log('Selected model:', value);
});

document.addEventListener('click', (event) => {
	const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
	if (!isMobile) {
		if (modelDropdownMenu ?.classList.contains('show') &&
			!modeSwitcherButton.contains(event.target) &&
			!modelDropdownMenu.contains(event.target)) {
			toggleDropdownDesktop(false);
		}
	} else {
		if (bodyElement.classList.contains('bottom-sheet-open') && !modelDropdownMenu.contains(event.target) && !modeSwitcherButton.contains(event.target)) {}
	}
});

const recentItems = document.querySelectorAll('.sidebar-item.recent-item');
recentItems.forEach(item => {
	item.addEventListener('click', async (e) => {
		if (item.getAttribute('href') === '#') {
			e.preventDefault();
		}
		// Active class handling should be part of uiLoadChat
		recentItems.forEach(el => el.classList.remove('active'));
		item.classList.add('active');
		console.log('Recent item clicked:', item.querySelector('.recent-text') ?.textContent.trim());

		if (window.innerWidth <= MOBILE_BREAKPOINT) {
			bodyElement.classList.remove('sidebar-open-mobile');
			if (!bodyElement.classList.contains('sidebar-pinned')) {
				bodyElement.classList.add('sidebar-closed');
			}
		}
		const chatId = item.dataset.chatId; // Assuming recent items will have data-chat-id
		if (chatId) await uiLoadChat(chatId);
	});
});


function addMessageToChat(text, type) {
	if (!chatContentWrapper) return;
	if (type === 'user' && !text) return;

	const messageBubble = document.createElement('div');
	messageBubble.classList.add('message-bubble', type);

	if (type === 'user') {
		const messageContentUser = document.createElement('div');
		messageContentUser.classList.add('message-content-user');

		const messageTextDiv = document.createElement('div');
		messageTextDiv.classList.add('message-text');
		messageTextDiv.textContent = text;

		// TODO: Add markdown rendering for user messages if needed
		messageContentUser.appendChild(messageTextDiv);
		messageBubble.appendChild(messageContentUser);

	} else if (type === 'ai') {
		const uniqueSuffix = `_uid${Date.now()}${Math.random().toString(16).slice(2)}`;

		const desktopAiContent = document.createElement('div');
		desktopAiContent.classList.add('desktop-only-ai-content');

		const avatarDivDesktop = document.createElement('div');
		avatarDivDesktop.classList.add('message-avatar', 'ai-avatar');

		desktopAiContent.appendChild(avatarDivDesktop);

		const contentAiWrapperDesktop = document.createElement('div');
		contentAiWrapperDesktop.classList.add('message-content-ai');

		const messageTextDivDesktop = document.createElement('div');
		messageTextDivDesktop.classList.add('message-text');

		contentAiWrapperDesktop.appendChild(messageTextDivDesktop);

		const actionsDivDesktop = document.createElement('div');
		actionsDivDesktop.classList.add('message-actions');
		const desktopActions = [{
			label: 'Like response',
			icon: 'thumb_up',
			id: 'like'
		}, {
			label: 'Dislike response',
			icon: 'thumb_down',
			id: 'dislike'
		}, {
			label: 'Share response',
			icon: 'share',
			id: 'share'
		}, {
			label: 'More options',
			icon: 'more_vert',
			id: 'more'
		}];
		desktopActions.forEach(action => {
			const button = document.createElement('button');
			button.classList.add('icon-button');
			button.setAttribute('aria-label', action.label);
			const span = document.createElement('span');
			span.classList.add('google-symbols');
			span.textContent = action.icon;
			button.appendChild(span);
			if (action.icon === 'more_vert') {
				button.classList.add('ai-message-more-button');
			}
			actionsDivDesktop.appendChild(button);
		});
		contentAiWrapperDesktop.appendChild(actionsDivDesktop);
		desktopAiContent.appendChild(contentAiWrapperDesktop);
		messageBubble.appendChild(desktopAiContent);

		const mobileAiContent = document.createElement('div');
		mobileAiContent.classList.add('mobile-only-ai-content');

		const aiTopContentMobile = document.createElement('div');
		aiTopContentMobile.classList.add('ai-top-content-mobile');

		const avatarDivMobile = document.createElement('div');
		avatarDivMobile.classList.add('message-avatar', 'ai-avatar');

		aiTopContentMobile.appendChild(avatarDivMobile);

		const actionsDivMobileMore = document.createElement('div');
		actionsDivMobileMore.classList.add('message-actions', 'ai-actions-mobile-more');
		const moreButtonMobile = document.createElement('button');
		moreButtonMobile.classList.add('icon-button', 'ai-message-more-button'); // For mobile bottom sheet
		moreButtonMobile.setAttribute('aria-label', 'More options');
		const moreIconMobile = document.createElement('span');
		moreIconMobile.classList.add('google-symbols');
		moreIconMobile.textContent = 'more_vert';
		moreButtonMobile.appendChild(moreIconMobile);
		actionsDivMobileMore.appendChild(moreButtonMobile);
		aiTopContentMobile.appendChild(actionsDivMobileMore);

		mobileAiContent.appendChild(aiTopContentMobile);

		const messageTextDivMobile = document.createElement('div');
		messageTextDivMobile.classList.add('message-text');
		mobileAiContent.appendChild(messageTextDivMobile);
		messageBubble.appendChild(mobileAiContent);

		const isHistoricalMessage = text !== null && text !== undefined;

		[messageTextDivDesktop, messageTextDivMobile].forEach(div => {
			if (isHistoricalMessage) {
				div.innerHTML = marked.parse(text);
				div.querySelectorAll('table').forEach(table => {
					const wrapper = document.createElement('div');
					wrapper.classList.add('table-scroll-wrapper');
					table.parentNode.insertBefore(wrapper, table);
					wrapper.appendChild(table);
				});
				div.style.fontStyle = "normal";
				div.style.color = "var(--gem-sys-color--on-surface)";
			} else { // Ini untuk bubble "Just a sec..." yang baru
				const loadingText = "Just a sec...";
				div.textContent = loadingText;
				div.style.fontStyle = "italic";
				div.style.color = "var(--gem-sys-color--on-surface-variant)";
			}
		});

		[avatarDivDesktop, avatarDivMobile].forEach(avatarContainer => {
			// Avatar untuk AI message yang dibuat oleh addMessageToChat selalu statis.
			// Animasi ditangani oleh startAILoadingAnimation dan updateAIMessageBubble.
			const template = document.getElementById('ai-avatar-static-initial-template');
			if (template) {
				const svgNode = template.content.cloneNode(true);
				avatarContainer.innerHTML = ''; // Pastikan bersih dulu
				avatarContainer.appendChild(svgNode);
			} else {
				console.error('Template "ai-avatar-static-initial-template" not found.');
			}
		});
	}
	chatContentWrapper.appendChild(messageBubble);
	toggleEmptyStateUI();
	if (contentCenter) {
		contentCenter.scrollTop = contentCenter.scrollHeight;
	}
	return messageBubble;
}

function startAILoadingAnimation(aiMessageBubble) {
	if (!aiMessageBubble) return;
	const avatarDesktopContainer = aiMessageBubble.querySelector('.desktop-only-ai-content > .message-avatar.ai-avatar');
	const avatarMobileContainer = aiMessageBubble.querySelector('.mobile-only-ai-content .ai-top-content-mobile > .message-avatar.ai-avatar'); // Corrected selector

	[avatarDesktopContainer, avatarMobileContainer].forEach(container => {
		if (!container) return;
		container.innerHTML = ''; // Bersihkan avatar statis awal dari addMessageToChat
		const template = document.getElementById('ai-avatar-animated-template');

		if (template) {
			// Ambil elemen <svg> dari dalam template
			const svgElementFromTemplate = template.content.querySelector('svg');
			if (svgElementFromTemplate) {
				const clonedSvgElement = svgElementFromTemplate.cloneNode(true);

				// Buat lagi struktur wrapper seperti yang mungkin ada di kode lama lo
				// Sesuaikan class-nya jika beda
				const animatedWrapper = document.createElement('div');
				animatedWrapper.className = 'ai-avatar-animated-container'; // Ganti jika class wrapper beda

				const loaderDiv = document.createElement('div');
				loaderDiv.className = 'ai-avatar-loader'; // Ganti jika class loader beda, atau hapus jika tidak ada

				animatedWrapper.appendChild(loaderDiv); // Tambahkan loader ke wrapper
				animatedWrapper.appendChild(clonedSvgElement); // Tambahkan SVG animasi ke wrapper
				container.appendChild(animatedWrapper); // Masukkan wrapper ke kontainer avatar
			} else {
				console.error('Elemen <svg> tidak ditemukan di dalam template "ai-avatar-animated-template".');
			}
		} else {
			console.error('Template "ai-avatar-animated-template" not found.');
		}
	});
}

function updateAIMessageBubble(aiMessageBubble, newText, isStillLoadingAnimation = false) {
	if (!aiMessageBubble) return;
	const textDesktopDiv = aiMessageBubble.querySelector('.desktop-only-ai-content .message-text');
	const textMobileDiv = aiMessageBubble.querySelector('.mobile-only-ai-content .message-text');
	const avatarDesktopContainer = aiMessageBubble.querySelector('.desktop-only-ai-content > .message-avatar.ai-avatar'); // Corrected selector
	const avatarMobileContainer = aiMessageBubble.querySelector('.mobile-only-ai-content .ai-top-content-mobile > .message-avatar.ai-avatar');

	[textDesktopDiv, textMobileDiv].forEach(div => {
		if (div) {
			div.innerHTML = marked.parse(newText); // Use marked.js to render markdown
			div.querySelectorAll('table').forEach(table => {
				const wrapper = document.createElement('div');
				wrapper.classList.add('table-scroll-wrapper');
				table.parentNode.insertBefore(wrapper, table);
				wrapper.appendChild(table);
			});
			div.style.fontStyle = isStillLoadingAnimation ? "italic" : "normal";
			div.style.color = isStillLoadingAnimation ? "var(--gem-sys-color--on-surface-variant)" : "var(--gem-sys-color--on-surface)";
		}
	});

	if (!isStillLoadingAnimation) {
		[avatarDesktopContainer, avatarMobileContainer].forEach(container => {
			if (!container) return;
			container.innerHTML = ''; // Bersihkan avatar animasi
			// Gunakan template avatar statis awal untuk konsistensi
			const template = document.getElementById('ai-avatar-static-initial-template');
			if (template) {
				const svgNode = template.content.cloneNode(true);
				if (container === avatarMobileContainer) {
					console.log("Mobile: Applying static avatar to mobile container.", svgNode);
				}
				container.appendChild(svgNode);
			} else {
				console.error('Template "ai-avatar-static-final-template" not found.');
			}
		});
	}
}

function simulateAIResponse(userMessageText) {
	// Fungsi ini sekarang hanya untuk simulasi, logika utama ada di uiHandleSendMessage
	const aiMessageBubble = addMessageToChat(null, 'ai');
	if (aiMessageBubble) startAILoadingAnimation(aiMessageBubble);

	setTimeout(() => {
		updateAIMessageBubble(aiMessageBubble, `This is a simulated AI response to: "${userMessageText.substring(0, 30)}..."`, false);
		isSending = false;
		updateSendButtonState();
		chatInput?.focus();
	}, 2000); // Jaga timeout ini untuk simulasi saja
}

sendMicButton ?.addEventListener('click', () => {
	if (isSending) {
		console.log('Stop generating (placeholder)');
		isSending = false;
		updateSendButtonState();
	} else if (chatInput.value.trim() !== '') {
		const userMessageText = chatInput.value.trim();
		uiHandleSendMessage(userMessageText);
	} else {
		console.log('Microphone button clicked (placeholder for voice input)');
	}
});

chatInput ?.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
		if (event.shiftKey || event.ctrlKey) {} else {
			event.preventDefault();
			if (sendMicButton && chatInput.value.trim() !== '' && !isSending) {
				sendMicButton.click();
			}
		}
	}
});

function resetChatArea() {
	if (chatContentWrapper) {
		chatContentWrapper.innerHTML = ''; // Clear all messages
	}
	if (chatInput) {
		chatInput.value = '';
		chatInput.dispatchEvent(new Event('input')); // Resize and update button
	}
	toggleEmptyStateUI();
	updateSendButtonState();
	isSending = false;
	chatInput ?.focus();
}

const newChatSidebarItem = document.getElementById('new-chat-button');
newChatSidebarItem ?.addEventListener('click', (event) => {
	event.preventDefault();
	uiStartNewChat();

	if (window.innerWidth <= MOBILE_BREAKPOINT && bodyElement.classList.contains('sidebar-open-mobile')) {
		bodyElement.classList.remove('sidebar-open-mobile');
		if (!bodyElement.classList.contains('sidebar-pinned')) {
			bodyElement.classList.add('sidebar-closed');
		}
	}
	document.querySelectorAll('.sidebar-item.recent-item.active').forEach(activeRecentItem => {
		activeRecentItem.classList.remove('active');
	});
	chatInput ?.focus();
});

// --- UI Layer Functions for Firestore/Storage (called by other UI functions or event handlers) ---
async function uiSaveChat() {
	if (!currentUser || currentChatMessages.length === 0) return;
	let title = null;
	if (currentChatId) {
		const loadedChat = await fetchChatFromFirestore(currentUser.uid, currentChatId);
		title = loadedChat?.title;
	}
	if (!title) {
		const firstUserMsg = currentChatMessages.find(m => m.role === 'user' && m.content?.trim());
		if (firstUserMsg) title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
		else {
			const firstFileMsg = currentChatMessages.find(m => m.role === 'user' && m.fileName);
			if (firstFileMsg) title = `Chat with ${firstFileMsg.fileName.substring(0,20)}...`;
		}
	}
	title = title || "New Chat";

	const messagesForDb = currentChatMessages.map(m => {
		const messageData = {
			role: m.role,
			content: m.content,
			timestamp: m.timestamp // Timestamp (objek Date) harus selalu ada
		};
		// Hanya tambahkan fileURL dan fileName jika ada nilainya (bukan undefined atau null)
		if (m.fileURL) messageData.fileURL = m.fileURL;
		if (m.fileName) messageData.fileName = m.fileName;
		return messageData;
	});

	const newChatId = await saveChatToFirestore(currentUser.uid, currentChatId, messagesForDb, title);
	if (newChatId) {
		currentChatId = newChatId;
		await uiLoadRecentChats();
	} else {
		alert("Failed to save chat.");
	}
}

async function uiLoadRecentChats() {
	const recentChatsList = document.getElementById('recent-chats-list');
	if (!currentUser || !recentChatsList) return;
	recentChatsList.innerHTML = '<p class="px-3 py-2 text-sm text-gray-500 hide-when-closed">Loading...</p>';
	const chats = await fetchRecentChatsFromFirestore(currentUser.uid);
	if (!recentChatsList || !chats) { // Handle case where chats might be null/undefined
		recentChatsList.innerHTML = '<p class="px-3 py-2 text-sm text-gray-500 hide-when-closed">Error loading chats.</p>';
		return;
	}

	recentChatsList.innerHTML = '';
	if (chats.length === 0) {
		recentChatsList.innerHTML = '<p class="px-3 py-2 text-sm text-gray-500 hide-when-closed">No recent chats.</p>';
		return;
	}
	// Tampilkan hanya 5 chat pertama secara default
	const displayLimit = 5;
	const chatsToDisplay = chats.slice(0, displayLimit);

	chatsToDisplay.forEach(chat => {
		const item = document.createElement('a');
		item.href = '#';
		item.className = 'sidebar-item recent-item justify-start px-0 py-1.5 text-sm truncate hide-when-closed';
		item.dataset.chatId = chat.id;
		if (chat.id === currentChatId) item.classList.add('active');

		const recentText = document.createElement('span');
		recentText.className = 'recent-text';
		recentText.textContent = chat.title || 'Untitled Chat';

		const moreButton = document.createElement('button');
		moreButton.className = 'recent-item-more-button ml-auto';
		moreButton.setAttribute('aria-label', 'More options for this chat');
		moreButton.innerHTML = '<span class="google-symbols">more_vert</span>';
		moreButton.addEventListener('click', (e) => {
			e.stopPropagation(); // Mencegah item chat utama ter-klik
			e.preventDefault();
			uiShowRecentItemMenu(moreButton, chat.id, chat.title || 'Untitled Chat');
		});

		item.appendChild(recentText);
		item.appendChild(moreButton);
		item.addEventListener('click', async (e) => {
			// Pastikan klik bukan pada tombol 'more'
			if (e.target !== moreButton && !moreButton.contains(e.target)) {
				e.preventDefault();
				await uiLoadChat(chat.id);
			}
		});
		recentChatsList.appendChild(item);
	});

	// Jika ada lebih dari 5 chat, tambahkan tombol "Show More"
	if (chats.length > displayLimit) {
		// Buat tombol Show More dengan struktur HTML yang sesuai dengan desain awal
		// <button class="..."><span>Show more</span><span class="material-symbols-outlined">expand_more</span></button>
		const showMoreButton = document.createElement('button');
		showMoreButton.className = 'sidebar-item flex items-center space-x-1 px-3 py-2 text-sm hover:bg-gray-200 w-full text-left mt-1 rounded-full show-more-button hide-when-closed'; // Gunakan class dari HTML awal

		const textSpan = document.createElement('span');
		textSpan.textContent = 'Show more'; // Teks
		textSpan.classList.add('font-medium'); // Tambahkan class untuk font agak tebal (sesuaikan jika class lo beda)

		const iconSpan = document.createElement('span');
		iconSpan.className = 'google-symbols text-base'; // Gunakan class google-symbols
		iconSpan.textContent = 'expand_more';

		// Masukkan span teks dan span ikon ke dalam tombol
		showMoreButton.appendChild(textSpan);
		showMoreButton.appendChild(iconSpan);

		showMoreButton.addEventListener('click', (e) => {
			e.preventDefault();
			// Saat tombol diklik, tampilkan semua chat
			recentChatsList.innerHTML = ''; // Bersihkan daftar yang ada
			chats.forEach(chat => { // Tampilkan semua chat
				const item = document.createElement('a');
				item.href = '#';
				item.className = 'sidebar-item recent-item justify-start px-0 py-1.5 text-sm truncate hide-when-closed';
				item.dataset.chatId = chat.id;
				if (chat.id === currentChatId) item.classList.add('active');
				item.innerHTML = `<span class="recent-text">${chat.title || 'Untitled Chat'}</span><button class="recent-item-more-button ml-auto" aria-label="More options for this chat"><span class="google-symbols">more_vert</span></button>`; // Re-create more button
				// Re-attach event listener for more button and item click
				item.querySelector('.recent-item-more-button')?.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); uiShowRecentItemMenu(e.currentTarget, chat.id, chat.title || 'Untitled Chat'); });
				item.addEventListener('click', async (e) => { if (e.target !== item.querySelector('.recent-item-more-button') && !item.querySelector('.recent-item-more-button').contains(e.target)) { e.preventDefault(); await uiLoadChat(chat.id); } });
				recentChatsList.appendChild(item);
			});
			// Setelah menampilkan semua chat, tombol Show More tidak perlu ditambahkan lagi
			// showMoreButton.remove(); // Hapus tombol Show More setelah diklik

		});
		recentChatsList.appendChild(showMoreButton);
	} // Penutup untuk if (chats.length > displayLimit)
}

async function uiLoadChat(chatId) {
	if (!currentUser) return;
	resetChatArea(); // Clear view first
	const loadingBubble = addMessageToChat(null, 'ai'); // Show "Just a sec..." bubble

	const chatData = await fetchChatFromFirestore(currentUser.uid, chatId);

	// Hapus bubble "Just a sec..." setelah data chat berhasil diambil (atau gagal)
	if (loadingBubble) {
		loadingBubble.remove();
	}

	if (chatData && chatData.messages) { // Pastikan chatData dan chatData.messages ada
		currentChatId = chatId;
		currentChatMessages = chatData.messages ? chatData.messages.map(m => ({...m, timestamp: m.timestamp?.toDate() })) : [];


		currentChatMessages.forEach(msg => {
			// Untuk file, kita perlu pastikan addMessageToChat bisa menampilkannya dengan benar dari history
			addMessageToChat(msg.content, msg.role /*, msg.fileURL, msg.fileName */);
		});
		document.querySelectorAll('#recent-chats-list .sidebar-item.active').forEach(i => i.classList.remove('active'));
		const activeItem = document.querySelector(`#recent-chats-list .sidebar-item[data-chat-id="${chatId}"]`);
		if (activeItem) activeItem.classList.add('active');
	} else {
		alert("Chat not found.");
		uiStartNewChat();
	}
	toggleEmptyStateUI(); // Panggil di akhir untuk update UI berdasarkan ada/tidaknya pesan
}

function uiStartNewChat() {
	resetChatArea();
	currentChatId = null;
	currentChatMessages = [];
	if (currentUser) {
		// Jangan langsung tambahkan pesan AI di sini jika ingin tampilan awal kosong
		// addMessageToChat("Hi there! How can I help you today?", 'ai');
	} else {
		// Ini sudah ditangani di onAuthStateChanged
	}
	document.querySelectorAll('#recent-chats-list .sidebar-item.active').forEach(i => i.classList.remove('active'));
	chatInput?.focus();
	toggleEmptyStateUI();
}

async function uiHandleFileUpload(file) {
	if (!currentUser || !file) {
		alert("Please log in to upload files.");
		return null;
	}
	addMessageToChat(`Uploading ${file.name}... (this is a user message)`, 'user'); // Placeholder for upload status

	const uploadResult = await uploadFileToStorage(currentUser.uid, file);

	if (uploadResult) {
		await uiHandleSendMessage(null, uploadResult); // Send message with file info
		return uploadResult;
	} else {
		addMessageToChat(`Failed to upload ${file.name}.`, 'user');
		alert(`Failed to upload ${file.name}.`);
		return null;
	}
}

// --- Fungsi untuk Menu Konteks Item Recent ---
let currentRecentChatTarget = { id: null, title: null, buttonElement: null };

function uiShowRecentItemMenu(buttonEl, chatId, chatTitle) {
	if (!recentItemOptionsMenu) return;

	currentRecentChatTarget = { id: chatId, title: chatTitle, buttonElement: buttonEl };
	
	// Sembunyikan semua popup lain dulu
	hideAllPopups(recentItemOptionsMenu); // Pastikan hideAllPopups bisa menerima elemen yang dikecualikan

	const rect = buttonEl.getBoundingClientRect();
	recentItemOptionsMenu.style.top = `${rect.bottom + window.scrollY + 2}px`; // Posisikan di bawah tombol
	recentItemOptionsMenu.style.left = `${rect.left + window.scrollX - recentItemOptionsMenu.offsetWidth + rect.width}px`; // Rata kanan dengan tombol
	recentItemOptionsMenu.classList.add('show');

	// Tambahkan event listener sekali jalan untuk menutup menu jika diklik di luar
	// Listener ini akan dihapus otomatis setelah sekali jalan
	document.addEventListener('click', handleClickOutsideRecentItemMenu, { once: true });
}

function handleClickOutsideRecentItemMenu(event) {
    if (recentItemOptionsMenu && !recentItemOptionsMenu.contains(event.target) && currentRecentChatTarget.buttonElement && !currentRecentChatTarget.buttonElement.contains(event.target)) {
        recentItemOptionsMenu.classList.remove('show');
    }
}

if (recentItemOptionsMenu) {
	recentItemOptionsMenu.addEventListener('click', async (e) => {
		e.preventDefault();
		const actionableElement = e.target.closest('[data-action]');
		console.log("Recent item menu clicked. Target:", e.target, "Closest actionable element:", actionableElement); // DEBUG
		if (actionableElement && actionableElement.dataset.action) {
			console.log("Recent item menu action detected:", actionableElement.dataset.action); // DEBUG
			const action = actionableElement.dataset.action;
			const chatId = currentRecentChatTarget.id;
			const currentTitle = currentRecentChatTarget.title;
			console.log("Action details - Chat ID:", chatId, "Title:", currentTitle, "User:", currentUser ?.uid); // DEBUG
			
			if (!chatId || !currentUser) {
				console.error("Chat ID or user not available for action:", action);
				recentItemOptionsMenu.classList.remove('show');
				return;
			}

			if (action === 'rename') {
				const newTitle = prompt("Enter new name for this chat:", currentTitle);
				if (newTitle && newTitle.trim() !== "" && newTitle !== currentTitle) {
					console.log("Attempting to rename chat:", chatId, "to new title:", newTitle.trim()); // DEBUG
					const success = await renameChatInFirestore(currentUser.uid, chatId, newTitle.trim());
					if (success) {
						await uiLoadRecentChats(); // Refresh list
						// Jika chat yang di-rename adalah chat aktif, update judul di UI utama jika ada elemennya
						if (currentChatId === chatId && userGreeting /*atau elemen judul chat utama*/) {
							// Misal, jika ada elemen khusus untuk judul chat aktif
							// document.getElementById('active-chat-title').textContent = newTitle.trim();
						}
					} else {
						alert("Failed to rename chat.");
					}
				}
			} else if (action === 'delete') {
				if (confirm(`Are you sure you want to delete "${currentTitle}"? This action cannot be undone.`)) {
					console.log("Attempting to delete chat:", chatId); // DEBUG
					const success = await deleteChatFromFirestore(currentUser.uid, chatId);
					if (success) {
						if (currentChatId === chatId) { // Jika chat aktif yang dihapus
							uiStartNewChat(); // Mulai chat baru
						}
						await uiLoadRecentChats(); // Refresh list
					} else {
						alert("Failed to delete chat.");
					}
				}
			}
			recentItemOptionsMenu.classList.remove('show'); // Sembunyikan menu setelah aksi
		} else {
			console.log("Click inside recentItemOptionsMenu, but no valid action link found."); // DEBUG
		}
	});
}

window.addEventListener('load', () => {
	bodyElement.dataset.isMobile = (window.innerWidth <= MOBILE_BREAKPOINT).toString();
	updateLayout();
	toggleEmptyStateUI();
	updateSendButtonState();
});

window.addEventListener('resize', () => {
	const wasMobile = bodyElement.dataset.isMobile === 'true'; // Check previous state
	const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

	if (wasMobile && !isMobile && bodyElement.classList.contains('bottom-sheet-open')) {
		closeBottomSheet();
	} else if (!wasMobile && isMobile && modelDropdownMenu ?.classList.contains('show')) {
		modelDropdownMenu.classList.remove('show');
		if (modeSwitcherButton) {
			modeSwitcherButton.classList.remove('open');
			modeSwitcherButton.setAttribute('aria-expanded', 'false');
		}
	}

	updateLayout();

	if (!isMobile) { // Desktop
		if (bodyElement.classList.contains('sidebar-open-mobile')) {
			bodyElement.classList.remove('sidebar-open-mobile');
			// If not pinned, default to closed on desktop transition
			// The hover/pin logic will then take over.
			if (!bodyElement.classList.contains('sidebar-pinned')) {
				bodyElement.classList.add('sidebar-closed');
			}
		}
	}

	bodyElement.dataset.isMobile = isMobile.toString();
	toggleEmptyStateUI();
	updateSendButtonState();
});

document.addEventListener('DOMContentLoaded', () => {
	const recentChatsList = document.getElementById('recent-chats-list');
	// const contextMenuRecent = document.getElementById('recent-item-options-menu'); // Already declared as recentItemOptionsMenu
	let currentTargetRecentItem = null;
	const aiMessageOptionsMenu = document.getElementById('ai-message-options-menu');
	let currentAiMessageTriggerButton = null; // Already declared globally
/*
	if (recentChatsList && recentItemOptionsMenu) { // Menggunakan variabel yang sudah dideklarasikan
		const showContextMenuRecent = (event, buttonEl) => {
			event.preventDefault();
			event.stopPropagation();
			hideAllPopups(recentItemOptionsMenu); // Gunakan recentItemOptionsMenu
			currentTargetRecentItem = buttonEl.closest('.recent-item');
			const rect = buttonEl.getBoundingClientRect();
			recentItemOptionsMenu.style.top = `${rect.top + window.scrollY}px`;
			recentItemOptionsMenu.style.left = `${rect.right + window.scrollX + 5}px`;
			recentItemOptionsMenu.classList.add('show');
			// document.addEventListener('click', handleClickOutsideRecentMenu, { once: true }); // Sudah dihandle oleh uiShowRecentItemMenu
		};
		const hideContextMenuRecent = () => {
			if (recentItemOptionsMenu) recentItemOptionsMenu.classList.remove('show'); // Sudah benar
		}
		const handleClickOutsideRecentMenu = (event) => {
			// Cek juga apakah klik terjadi pada tombol more yang memicu menu ini
			const isClickOnCurrentMoreButton = currentRecentChatTarget.buttonElement && currentRecentChatTarget.buttonElement.contains(event.target);
			if (recentItemOptionsMenu && !recentItemOptionsMenu.contains(event.target) && !isClickOnCurrentMoreButton) {
				hideContextMenuRecent();
			}
		};
		// Event listener untuk tombol more sudah ditambahkan di uiLoadRecentChats
		// recentChatsList.addEventListener('click', (event) => {
		// 	const moreButton = event.target.closest('.recent-item-more-button');
		// 	if (moreButton) {
		// 		// Logika ini sekarang ada di uiShowRecentItemMenu dan event listener tombol more di uiLoadRecentChats
		// 	}
		// });

		// Event listener untuk aksi di menu sudah ditambahkan di atas (if (recentItemOptionsMenu))
		 recentItemOptionsMenu.addEventListener('click', (event) => { // Pastikan ini juga menggunakan recentItemOptionsMenu
			event.preventDefault();
			const targetLink = event.target.closest('a');
			if (targetLink && targetLink.dataset.action) {
				console.log(`Recent Action: ${targetLink.dataset.action}, Chat ID: ${currentTargetRecentItem?.dataset.chatId || 'N/A'}`);
				hideContextMenuRecent();
			}
		}); */ // Komentar ini mungkin perlu dibuka jika logika di atasnya (baris 817-850) belum mencakup semua
	// } else {
	// 	console.warn('Recent chats list or its context menu element not found.');
	// }
    // Logika untuk recent item menu sudah dipindahkan ke uiShowRecentItemMenu dan event listener di atasnya

	const inputAddButton = document.getElementById('input-add-button');
	const contextMenuInput = document.getElementById('input-add-options-menu');

	if (inputAddButton && contextMenuInput) {
		const showContextMenuInput = (event) => {
			event.preventDefault();
			event.stopPropagation();
			hideAllPopups(contextMenuInput);
			const rect = inputAddButton.getBoundingClientRect();
			contextMenuInput.style.left = `${rect.left + window.scrollX}px`;
			contextMenuInput.style.bottom = `${window.innerHeight - rect.top - window.scrollY + 8}px`;
			contextMenuInput.style.top = 'auto';
			contextMenuInput.classList.add('show');
			document.addEventListener('click', handleClickOutsideInputMenu, {
				once: true
			});
		};
		const hideContextMenuInput = () => {
			if (contextMenuInput) contextMenuInput.classList.remove('show');
		}
		const handleClickOutsideInputMenu = (event) => {
			if (contextMenuInput && !contextMenuInput.contains(event.target) && event.target !== inputAddButton && !inputAddButton.contains(event.target)) {
				hideContextMenuInput();
			}
		};
		inputAddButton.addEventListener('click', (event) => {
			if (contextMenuInput.classList.contains('show')) {
				hideContextMenuInput();
			} else {
				showContextMenuInput(event);
			}
		});
		contextMenuInput.addEventListener('click', (event) => {
			event.preventDefault();
			const targetLink = event.target.closest('a');
			if (targetLink && targetLink.dataset.action) {
				hideContextMenuInput();
				if (targetLink.dataset.action === 'upload_files') {
					if (fileUploadInput) fileUploadInput.click();
				} else {
					console.log(`Input Add Action: ${targetLink.dataset.action}`);
				}
			}
		});
		fileUploadInput?.addEventListener('change', (event) => {
			const file = event.target.files[0];
			if (file) uiHandleFileUpload(file);
			if (event.target) event.target.value = null; // Reset input
		});
	} else {
		console.warn('Input add button or its context menu element not found.');
	}

	const settingsHelpButton = document.getElementById('settings-help-button');
	const contextMenuSettings = document.getElementById('settings-help-menu');

	const showSubmenu = (parentLi, submenuEl) => {
		clearTimeout(hideSubmenuTimer);
		if (activeSubmenu && activeSubmenu !== submenuEl) {
			activeSubmenu.classList.remove('show');
		}
		const parentRect = parentLi.getBoundingClientRect();
		submenuEl.style.top = `${parentRect.top + window.scrollY - 8}px`;
		submenuEl.style.left = `${parentRect.right + window.scrollX + 4}px`;
		submenuEl.classList.add('show');
		activeSubmenu = submenuEl;
	};

	const scheduleHideSubmenu = () => {
		clearTimeout(hideSubmenuTimer);
		hideSubmenuTimer = setTimeout(() => {
			if (activeSubmenu && !activeSubmenu.matches(':hover')) {
				const parentLiOfActiveSubmenu = contextMenuSettings.querySelector('li[data-submenu-id="' + activeSubmenu.id + '"]');
				if (parentLiOfActiveSubmenu && !parentLiOfActiveSubmenu.matches(':hover')) {
					activeSubmenu.classList.remove('show');
					activeSubmenu = null;
				}
			}
		}, 200);
	};

	if (settingsHelpButton && contextMenuSettings) {
		const showContextMenuSettings = (event) => {
			event.preventDefault();
			event.stopPropagation();
			hideAllPopups(contextMenuSettings);
			const rect = settingsHelpButton.getBoundingClientRect();
			contextMenuSettings.style.left = `${rect.left + window.scrollX}px`;
			contextMenuSettings.style.bottom = `${window.innerHeight - rect.top - window.scrollY + 8}px`;
			contextMenuSettings.style.top = 'auto';
			contextMenuSettings.classList.add('show');
			document.addEventListener('click', handleClickOutsideSettingsMenu, {
				once: true
			});
		};

		const hideContextMenuSettings = () => {
			if (contextMenuSettings) contextMenuSettings.classList.remove('show');
			if (activeSubmenu) {
				activeSubmenu.classList.remove('show');
				activeSubmenu = null;
			}
		};

		const handleClickOutsideSettingsMenu = (event) => {
			let targetIsInsideAnyMenu = contextMenuSettings.contains(event.target) ||
				(activeSubmenu && activeSubmenu.contains(event.target));
			let targetIsButton = settingsHelpButton.contains(event.target) || settingsHelpButton === event.target;

			if (!targetIsInsideAnyMenu && !targetIsButton) {
				hideContextMenuSettings();
			} else {
				document.removeEventListener('click', handleClickOutsideSettingsMenu);
				if (contextMenuSettings.classList.contains('show') || (activeSubmenu && activeSubmenu.classList.contains('show'))) {
					document.addEventListener('click', handleClickOutsideSettingsMenu, {
						once: true
					});
				}
			}
		};

		settingsHelpButton.addEventListener('click', (event) => {
			if (contextMenuSettings.classList.contains('show')) {
				hideContextMenuSettings();
			} else {
				showContextMenuSettings(event);
			}
		});

		contextMenuSettings.querySelectorAll('li[data-has-submenu]').forEach(parentLi => {
			const submenuId = parentLi.dataset.submenuId;
			const submenuEl = document.getElementById(submenuId);
			if (submenuEl) {
				parentLi.addEventListener('mouseenter', () => {
					showSubmenu(parentLi, submenuEl);
				});
				parentLi.addEventListener('mouseleave', () => {
					scheduleHideSubmenu();
				});
				submenuEl.addEventListener('mouseenter', () => {
					clearTimeout(hideSubmenuTimer);
				});
				submenuEl.addEventListener('mouseleave', () => {
					scheduleHideSubmenu();
				});
			}
		});

		contextMenuSettings.addEventListener('click', (event) => {
			const targetLink = event.target.closest('a');
			const parentLi = event.target.closest('li');

			if (parentLi && parentLi.dataset.hasSubmenu) {
				event.preventDefault();
				return;
			}

			if (targetLink && targetLink.dataset.action) {
				event.preventDefault();
				const action = targetLink.dataset.action;
				console.log(`Settings Action: ${action}`);
				if (action === 'update_location') {
					alert('Update location clicked!');
					hideAllPopups();
				} else if (action !== 'theme' && action !== 'help') {
					hideAllPopups();
				}
			}
		});

		const themeSubmenu = document.getElementById('theme-submenu');
		if (themeSubmenu) {
			themeSubmenu.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				const targetLink = event.target.closest('a.submenu-item');
				if (targetLink && targetLink.dataset.theme) {
					const selectedTheme = targetLink.dataset.theme;
					console.log(`Theme selected: ${selectedTheme}`);
					applyTheme(selectedTheme);
					hideAllPopups();
				}
			});
		} else {
			console.warn('Theme submenu element not found.');
		}

		const helpSubmenu = document.getElementById('help-submenu');
		if (helpSubmenu) {
			helpSubmenu.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				const targetLink = event.target.closest('a.submenu-item');
				if (targetLink && targetLink.dataset.action) {
					const action = targetLink.dataset.action;
					console.log(`Help Submenu Action: ${action}`);
					alert(`Navigasi ke: ${action.replace('_', ' ')}`);
					hideAllPopups();
				}
			});
		} else {
			console.warn('Help submenu element not found.');
		}
	} else {
		console.warn('Settings help button or its context menu element not found.');
	}

	// Theme logic (moved from inside DOMContentLoaded)
	let activeSubmenu = null; // Need to keep track of active submenu for settings
	let hideSubmenuTimer = null; // Timer for hiding submenu
	const htmlEl = document.documentElement;

	function updateThemeSubmenuSelection(themeName) {
		const themeSubmenuItems = document.querySelectorAll('#theme-submenu .submenu-item');
		themeSubmenuItems.forEach(item => {
			item.classList.remove('selected');
			if (item.dataset.theme === themeName) {
				item.classList.add('selected');
			}
		});
	}

	function applyTheme(themeName) {
		let actualTheme = themeName;
		if (themeName === 'system') {
			actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ?'dark' : 'light';
		}
		htmlEl.classList.toggle('dark-theme', actualTheme === 'dark');
		localStorage.setItem('theme', themeName);
		updateThemeSubmenuSelection(themeName);
	}
	const savedTheme = localStorage.getItem('theme') || 'system';
	applyTheme(savedTheme);

	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (localStorage.getItem('theme') === 'system') {
			applyTheme('system');
		}
	});

	function toggleAiMessageMenu(buttonEl) { // Logic for AI message options menu (desktop)
		if (!aiMessageOptionsMenu) return;

		const isMenuOpenForThisButton = aiMessageOptionsMenu.classList.contains('show') && currentAiMessageTriggerButton === buttonEl;

		hideAllPopups();

		if (isMenuOpenForThisButton) {
			currentAiMessageTriggerButton = null;
		} else {
			currentAiMessageTriggerButton = buttonEl;
			const rect = buttonEl.getBoundingClientRect();
			const menuWidth = aiMessageOptionsMenu.offsetWidth;
			const menuHeight = aiMessageOptionsMenu.offsetHeight;
			let top = rect.top + window.scrollY - menuHeight - 5;
			let left = rect.left + window.scrollX + (rect.width / 2) - menuWidth + (menuWidth * 0.15);
			if (top < window.scrollY) {
				top = rect.bottom + window.scrollY + 5;
			}
			if (left < window.scrollX) {
				left = window.scrollX + 5;
			}
			if (left + menuWidth > window.innerWidth + window.scrollX) {
				left = window.innerWidth + window.scrollX - menuWidth - 5;
			}

			aiMessageOptionsMenu.style.top = `${top}px`;
			aiMessageOptionsMenu.style.left = `${left}px`;
			aiMessageOptionsMenu.style.bottom = 'auto';
			aiMessageOptionsMenu.style.right = 'auto';
			aiMessageOptionsMenu.classList.add('show');

			document.addEventListener('click', handleClickOutsideAiMessageMenu, {
				once: true
			});
		}
	}

	function handleClickOutsideAiMessageMenu(event) {
		if (aiMessageOptionsMenu.classList.contains('show') &&
			currentAiMessageTriggerButton &&
			!aiMessageOptionsMenu.contains(event.target) &&
			!currentAiMessageTriggerButton.contains(event.target)) {
			aiMessageOptionsMenu.classList.remove('show');
			currentAiMessageTriggerButton = null;
		}
	}

	chatContentWrapper ?.addEventListener('click', function(event) {
		const moreButton = event.target.closest('.ai-message-more-button');
		if (moreButton) {
			event.preventDefault();
			event.stopPropagation();
			const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
			if (isMobile) {
				currentAiMessageTriggerButton = moreButton;
				openAiMessageOptionsSheet();
			} else {
				toggleAiMessageMenu(moreButton);
			}
		}
	});

	aiMessageOptionsMenu ?.addEventListener('click', (event) => { // Logic for AI message options menu actions
		const targetLink = event.target.closest('a'); // Declare targetLink here
		if (targetLink && targetLink.dataset.action) {
			event.preventDefault();
			const action = targetLink.dataset.action;
			const messageBubble = currentAiMessageTriggerButton ?.closest('.message-bubble.ai');
			console.log(`AI Message Action: "${action}" triggered for message.`);
			aiMessageOptionsMenu.classList.remove('show');
			currentAiMessageTriggerButton = null;
		}
	});
});
// --- Logic for AI Message Options Bottom Sheet (Mobile) ---
function openAiMessageOptionsSheet() {
	if (!aiMessageOptionsSheet || !aiOptionsOverlay) return;
	const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
	if (!isMobile) return;
	if (bodyElement.classList.contains('bottom-sheet-open')) {
		closeBottomSheet();
	}
	bodyElement.classList.add('ai-menu-bottom-sheet-open');
	aiOptionsOverlay.classList.add('show');
	aiMessageOptionsSheet.classList.add('show');
}

function closeAiMessageOptionsSheet() {
	if (!aiMessageOptionsSheet || !aiOptionsOverlay) return;
	bodyElement.classList.remove('ai-menu-bottom-sheet-open');
	aiOptionsOverlay.classList.remove('show');
	aiMessageOptionsSheet.classList.remove('show');
}

aiOptionsOverlay ?.addEventListener('click', () => { // Close bottom sheet on overlay click
		closeAiMessageOptionsSheet();
	}
); // <-- Tambahkan tanda kurung tutup ini

aiMessageOptionsSheet ?.addEventListener('click', (event) => { // Logic for AI message options menu actions
	// Listener ini menangani klik pada item aksi (a atau button) di dalam sheet
	const targetActionElement = event.target.closest('a, button.action-item');
	if (targetActionElement && targetActionElement.dataset.action) {
		// Gunakan targetActionElement karena ini elemen yang punya data-action
		event.preventDefault();
		const action = targetActionElement.dataset.action;
		console.log(`AI Message Options Sheet Action: "${action}" triggered.`);
		closeAiMessageOptionsSheet();
	}
});

bottomSheetOverlay ?.addEventListener('click', () => { // Close model dropdown bottom sheet on overlay click
		closeBottomSheet();
	}
); // <-- Tambahkan tanda kurung tutup ini