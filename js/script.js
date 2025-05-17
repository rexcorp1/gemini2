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
	uploadFileToStorage,
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
const aiMessageOptionsSheet = document.getElementById('ai-message-options-sheet');
const aiOptionsOverlay = document.getElementById('ai-options-overlay');
const recentItemOptionsMenu = document.getElementById('recent-item-options-menu');

// User profile elements
const profileButton = document.querySelector('.profile-button');
const userProfilePic = profileButton ? profileButton.querySelector('.profile-image') : null;
const userGreeting = document.querySelector('.greeting-text h1');
const fileUploadInput = document.getElementById('file-upload-input');

// Account Dialog Elements
const accountDialogOverlay = document.getElementById('account-dialog-overlay');
const accountDialog = document.getElementById('account-dialog');
const accountDialogUserPic = document.getElementById('account-dialog-user-pic');
const accountDialogGreeting = document.getElementById('account-dialog-greeting');
const accountDialogUserEmailTop = document.getElementById('account-dialog-user-email-top');
const accountDialogUserEmailMain = document.getElementById('account-dialog-user-email-main');
const accountDialogSignOutButton = document.getElementById('account-dialog-sign-out-button');
const accountDialogSignInButton = document.getElementById('account-dialog-sign-in-button');
const accountDialogNotSignedInText = document.getElementById('account-dialog-not-signed-in-text');
const accountDialogCloseButton = document.getElementById('account-dialog-close-button-x');
const aiMessageOptionsMenu = document.getElementById('ai-message-options-menu');
let currentAiMessageTriggerButton = null;

const MOBILE_BREAKPOINT = 768;
let isMouseOverSidebar = false;
let isSending = false;

// Default profile picture and alt text (accessible globally)
const DEFAULT_PROFILE_PIC = 'https://placehold.co/32x32/E0E0E0/BDBDBD?text=R';
const DEFAULT_PROFILE_ALT = 'Profil Pengguna';

// Application State
let currentUser = null;
let currentChatId = null;
let attachedFileInfo = null; // To store info about the file to be sent { fileName, fileObject, downloadURL, filePath, tempUrl? }
let currentChatMessages = [];

const snackbarElement = document.getElementById('snackbar');

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
		} else {
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
		chatInput?.dispatchEvent(new Event('input'));
	});
}

function toggleEmptyStateUI() {
	if (!chatContentWrapper || !greetingText || !disclaimerText) return;
	const hasMessages = chatContentWrapper.children.length > 0;
	greetingText.style.display = hasMessages ? 'none' : 'block';
	chatContentWrapper.style.display = hasMessages ? 'flex' : 'none';
	disclaimerText.style.visibility = hasMessages ? 'visible' : 'hidden';
}

let snackbarTimeout; // Variabel untuk menyimpan timeout snackbar

function showSnackbar(message, duration = 3000) {
    if (!snackbarElement) return;

    // Hapus timeout sebelumnya jika ada, untuk mencegah snackbar hilang terlalu cepat jika dipanggil berulang kali
    clearTimeout(snackbarTimeout);

    snackbarElement.textContent = message;
    snackbarElement.classList.add('show');

    snackbarTimeout = setTimeout(() => {
        snackbarElement.classList.remove('show');
    }, duration);
}


function updateSendButtonState() {
	if (!sendMicButton || !sendMicIcon || !chatInput) return;
	const inputText = chatInput.value.trim();

	sendMicIcon.style.fontVariationSettings = "";

	if (isSending) {
		sendMicIcon.textContent = 'stop';
		sendMicIcon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20";
		sendMicIcon.style.color = 'var(--gem-sys-color--primary)';
		sendMicButton.style.backgroundColor = 'var(--gem-sys-color--primary-container)';
		sendMicButton.setAttribute('aria-label', 'Stop generating');
		chatInput.disabled = true;
	} else if (inputText !== '' || attachedFileInfo) { // Enable send if text OR attachment exists
		sendMicIcon.textContent = 'send';
		sendMicIcon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20";
		sendMicIcon.style.color = 'var(--default-icon-color)';
		sendMicButton.style.backgroundColor = 'var(--gem-sys-color--surface-container)';
		sendMicButton.setAttribute('aria-label', 'Send message');
		chatInput.disabled = false;
	} else {
		sendMicIcon.textContent = 'mic';
		sendMicIcon.style.color = 'var(--default-icon-color)';
		sendMicButton.style.removeProperty('background-color');
		sendMicButton.setAttribute('aria-label', 'Use microphone');
		chatInput.disabled = false;
	}
}

// --- Popup/Menu Management Functions ---
function hideAllPopups(exceptMenu = null, exceptSubmenu = null) {
	document.querySelectorAll('.context-menu-popup.show, .submenu.show, .bottom-sheet-open').forEach(menu => {
		const isExcepted = (exceptMenu && menu === exceptMenu) || (exceptSubmenu && menu === exceptSubmenu);

		if (!isExcepted) {
			menu.classList.remove('show');
			menu.classList.remove('bottom-sheet-open');
			if (menu.style.display === 'block') {
				menu.style.display = 'none';
			}
		}
	});

	if (recentItemOptionsMenu && recentItemOptionsMenu !== exceptMenu) recentItemOptionsMenu.classList.remove('show');
	if (aiMessageOptionsMenu && aiMessageOptionsMenu !== exceptMenu) aiMessageOptionsMenu.classList.remove('show');
}

// --- Account Dialog Functions ---
function openAccountDialog() {
	if (!accountDialogOverlay || !accountDialog || !accountDialogUserPic ||
		!accountDialogGreeting || !accountDialogUserEmailTop || !accountDialogUserEmailMain ||
		!accountDialogSignOutButton || !accountDialogSignInButton || !accountDialogNotSignedInText) {
		console.warn("Account dialog: One or more elements not found. Cannot fully update content.");
		if (accountDialogOverlay && accountDialog) {
			accountDialogOverlay.classList.remove('hidden');
			accountDialogOverlay.classList.add('flex');
			accountDialog.classList.remove('hidden');
		}
		return;
	}

	accountDialogUserEmailTop.classList.add('hidden');
	accountDialogSignOutButton.classList.add('hidden');
	accountDialogSignInButton.classList.add('hidden');
	accountDialogNotSignedInText.classList.add('hidden');
	accountDialogUserPic.classList.add('hidden');

	if (currentUser) {
		if (accountDialogUserPic) accountDialogUserPic.src = currentUser.photoURL || DEFAULT_PROFILE_PIC;
		if (accountDialogUserPic) accountDialogUserPic.alt = currentUser.displayName || DEFAULT_PROFILE_ALT;
		if (accountDialogUserPic) accountDialogUserPic.classList.remove('hidden');
		if (accountDialogGreeting) accountDialogGreeting.textContent = `Hi, ${currentUser.displayName || 'User'}`;
		if (accountDialogUserEmailTop) accountDialogUserEmailTop.textContent = currentUser.email || '';
		if (accountDialogUserEmailTop) accountDialogUserEmailTop.classList.remove('hidden');
		if (accountDialogUserEmailMain) accountDialogUserEmailMain.textContent = currentUser.email || '';
		if (accountDialogSignOutButton) accountDialogSignOutButton.classList.remove('hidden');
	} else {
		if (accountDialogUserPic) accountDialogUserPic.src = DEFAULT_PROFILE_PIC;
		if (accountDialogUserPic) accountDialogUserPic.alt = DEFAULT_PROFILE_ALT;
		if (accountDialogGreeting) accountDialogGreeting.textContent = 'Hello, Guest';
		if (accountDialogUserEmailMain) accountDialogUserEmailMain.textContent = '';
		if (accountDialogSignInButton) accountDialogSignInButton.classList.remove('hidden');
		if (accountDialogNotSignedInText) accountDialogNotSignedInText.classList.remove('hidden');
	}

	if (accountDialogOverlay) {
		accountDialogOverlay.classList.remove('hidden');
		accountDialogOverlay.classList.add('flex');
		if (accountDialog) accountDialog.classList.remove('hidden');
	}
}

function closeAccountDialog() {
	if (accountDialogOverlay) {
		accountDialogOverlay.classList.add('hidden');
		accountDialogOverlay.classList.remove('flex');
	}
	if (accountDialog) accountDialog.classList.add('hidden');
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
			profileButton.onclick = openAccountDialog;
			profileButton.setAttribute('aria-label', 'Sign Out');
		}
		await uiLoadRecentChats();
		if (!currentChatId && chatContentWrapper.children.length === 0) {
			resetChatArea();
			toggleEmptyStateUI();
		}
	} else {
		if (userGreeting) userGreeting.textContent = 'Hello, Guest';
		if (userProfilePic) {
			userProfilePic.src = DEFAULT_PROFILE_PIC;
			userProfilePic.alt = DEFAULT_PROFILE_ALT;
		}
		if (profileButton) {
			profileButton.onclick = openAccountDialog;
			profileButton.setAttribute('aria-label', 'Sign In with Google');
		}
		if (chatContentWrapper) chatContentWrapper.innerHTML = '';
		toggleEmptyStateUI();
		const recentChatsList = document.getElementById('recent-chats-list');
		if (recentChatsList) recentChatsList.innerHTML = '<p class="px-3 py-2 text-sm text-gray-500 hide-when-closed">Log in to see recent chats.</p>';
		currentChatId = null;
		currentChatMessages = [];
		if (attachedFileInfo && attachedFileInfo.tempUrl) { // Revoke temp URL if clearing
            URL.revokeObjectURL(attachedFileInfo.tempUrl);
        }
		attachedFileInfo = null; // Clear attachment on sign out
        updateAttachmentPreview(); // Update UI
	}
	updateLayout();
});

// Event Listeners untuk Account Dialog
if (accountDialogOverlay) {
	accountDialogOverlay.addEventListener('click', (e) => {
		if (e.target === accountDialogOverlay) {
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
async function uiHandleSendMessage(promptText) {
	if (!currentUser) {
		alert("Please log in to send messages.");
		return;
	}
	const textToSend = promptText ? promptText.trim() : '';
	if (!textToSend && !attachedFileInfo) return;

	isSending = true;
	updateSendButtonState();

	let selectedModelId = "gemini-2.0-flash";
	const selectedDropdownItem = modelDropdownMenu ? modelDropdownMenu.querySelector('.dropdown-item.selected') : null;
	const uiModelValue = selectedDropdownItem ? selectedDropdownItem.dataset.value : null;

	if (uiModelValue) {
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
				selectedModelId = "gemini-2.0-flash";
				break;
			case "Personalization (experimental)":
				selectedModelId = "gemini-2.0-flash";
				break;
			default:
				console.warn("Model value from UI not recognized, using default:", uiModelValue, "Default ID:", selectedModelId);
		}
	} else {
		console.warn("Could not determine selected model from UI, using default ID:", selectedModelId);
	}

	console.log("Selected UI value:", uiModelValue, "Mapped to API model ID:", selectedModelId);

	let combinedPrompt = textToSend;
	let userMessageForHistory = { role: 'user', content: textToSend, timestamp: new Date() };
    const currentAttachment = attachedFileInfo; // Use the globally attached file

	if (currentAttachment && currentAttachment.downloadURL) {
		// Make the prompt more explicit when an image is present
		const imagePromptInstruction = "Analisis gambar ini dan berikan deskripsinya.";
		if (textToSend) {
			combinedPrompt = `${textToSend}\n${imagePromptInstruction} [File Ref: ${currentAttachment.downloadURL}]`;
		} else {
			combinedPrompt = `${imagePromptInstruction} [File Ref: ${currentAttachment.downloadURL}]`;
		}
		userMessageForHistory = { role: 'user', content: textToSend || `File: ${currentAttachment.fileName}`, timestamp: new Date(), fileURL: currentAttachment.downloadURL, fileName: currentAttachment.fileName };
	}

	addMessageToChat(textToSend, 'user', currentAttachment);
	currentChatMessages.push(userMessageForHistory);
	if (chatInput) chatInput.value = '';
	chatInput?.dispatchEvent(new Event('input'));

    if (currentAttachment && currentAttachment.tempUrl) { // Revoke temp URL if it exists
        URL.revokeObjectURL(currentAttachment.tempUrl);
    }
    attachedFileInfo = null; // Clear attachment after including it in the message
    updateAttachmentPreview(); // Update UI to remove attachment preview

	const aiLoadingBubble = addMessageToChat(null, 'ai');
	if (aiLoadingBubble) startAILoadingAnimation(aiLoadingBubble);

	const historyForAPI = currentChatMessages.slice(0, -1)
		.filter(msg => msg.role)
		.map(msg => {
            let partsText = msg.content || "";
            if (msg.fileURL) {
                partsText += `\n[File Ref: ${msg.fileURL}]`;
            }
            return { role: msg.role, parts: [{ text: partsText.trim() }] };
        });

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

menuToggleButtonDesktop?.addEventListener('click', () => {
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

menuToggleButtonMobile?.addEventListener('click', () => {
	bodyElement.classList.toggle('sidebar-open-mobile');
	if (bodyElement.classList.contains('sidebar-open-mobile')) {
		bodyElement.classList.remove('sidebar-closed');
	}
});

sidebarOverlay?.addEventListener('click', () => {
	bodyElement.classList.remove('sidebar-open-mobile');
});

sidebar?.addEventListener('mouseenter', () => {
	isMouseOverSidebar = true;
	if (window.innerWidth > MOBILE_BREAKPOINT && !bodyElement.classList.contains('sidebar-pinned')) {
		bodyElement.classList.remove('sidebar-closed');
		updateLayout();
	}
});

chatInput?.addEventListener('input', () => {
	chatInput.style.height = 'auto';
	const minHeight = 24;
	const maxHeight = 200;
	const requiredHeight = Math.max(minHeight, Math.min(chatInput.scrollHeight, maxHeight));
	chatInput.style.height = `${requiredHeight}px`;
	updateSendButtonState();
});

sidebar?.addEventListener('mouseleave', () => {
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

modeSwitcherButton?.addEventListener('click', (event) => {
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

modelDropdownMenu?.addEventListener('click', (event) => {
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
		if (modelDropdownMenu?.classList.contains('show') &&
			!modeSwitcherButton.contains(event.target) &&
			!modelDropdownMenu.contains(event.target)) {
			toggleDropdownDesktop(false);
		}
	} else {
		if (bodyElement.classList.contains('bottom-sheet-open') && !modelDropdownMenu.contains(event.target) && !modeSwitcherButton.contains(event.target)) { }
	}
});

const recentItems = document.querySelectorAll('.sidebar-item.recent-item');
recentItems.forEach(item => {
	item.addEventListener('click', async (e) => {
		if (item.getAttribute('href') === '#') {
			e.preventDefault();
		}
		recentItems.forEach(el => el.classList.remove('active'));
		item.classList.add('active');
		console.log('Recent item clicked:', item.querySelector('.recent-text')?.textContent.trim());
		if (window.innerWidth <= MOBILE_BREAKPOINT) {
			bodyElement.classList.remove('sidebar-open-mobile');
			if (!bodyElement.classList.contains('sidebar-pinned')) {
				bodyElement.classList.add('sidebar-closed');
			}
		}
		const chatId = item.dataset.chatId;
		if (chatId) await uiLoadChat(chatId);
	});
});

function addMessageToChat(text, type, fileInfo = null) {
	if (!chatContentWrapper) return;
	if (type === 'user' && !text && !fileInfo) return;

    // Helper to render KaTeX and tables for AI messages
    function renderEnhancedContent(element) {
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(element, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "\\[", right: "\\]", display: true},
                    {left: "$", right: "$", display: false},
                    {left: "\\(", right: "\\)", display: false}
                ],
                throwOnError: false
            });
        }
        element.querySelectorAll('table').forEach(table => {
            const wrapper = document.createElement('div');
            wrapper.classList.add('table-scroll-wrapper');
            if (table.parentNode) {
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }

	const messageBubble = document.createElement('div');
	messageBubble.classList.add('message-bubble', type);

	if (type === 'user') {
		const messageContentUser = document.createElement('div');
		messageContentUser.classList.add('message-content-user');

        if (fileInfo && fileInfo.downloadURL) {
            const fileContainer = document.createElement('div');
            fileContainer.classList.add('message-file-container');

            if (/\.(jpeg|jpg|gif|png|webp)$/i.test(fileInfo.fileName)) {
                const imgElement = document.createElement('img');
                imgElement.src = fileInfo.downloadURL;
                imgElement.alt = fileInfo.fileName;
                imgElement.classList.add('message-image-preview');
                fileContainer.appendChild(imgElement);
            } else {
                // Document preview with specific container and layout
                const docOuterContainer = document.createElement('div'); // This is the main container you asked for
                docOuterContainer.classList.add('message-document-outer-container');

                const docPreviewContainer = document.createElement('div');
                docPreviewContainer.classList.add('message-document-preview-inner');

                const fileNameWithoutExtension = fileInfo.fileName.substring(0, fileInfo.fileName.lastIndexOf('.')) || fileInfo.fileName;
                const fileExtension = fileInfo.fileName.split('.').pop()?.toUpperCase() || 'FILE';

                const fileNameElement = document.createElement('div');
                fileNameElement.classList.add('message-document-filename');
                fileNameElement.textContent = fileNameWithoutExtension;
                docPreviewContainer.appendChild(fileNameElement);

                const fileMetaContainer = document.createElement('div');
                fileMetaContainer.classList.add('message-document-meta');

                const fileIconImg = document.createElement('img');
                fileIconImg.classList.add('message-document-icon-img');
                if (fileExtension === 'PDF') {
                    fileIconImg.src = 'assets/IMG/file-icon-pdf.png';
                    fileIconImg.alt = 'PDF Icon';
                } else {
                    fileIconImg.src = 'assets/IMG/icon-file.png';
                    fileIconImg.alt = 'Document Icon';
                }
                fileMetaContainer.appendChild(fileIconImg);

                const fileExtensionSpan = document.createElement('span');
                fileExtensionSpan.classList.add('message-document-extension');
                fileExtensionSpan.textContent = fileExtension;
                fileMetaContainer.appendChild(fileExtensionSpan);

                docPreviewContainer.appendChild(fileMetaContainer);
                docOuterContainer.appendChild(docPreviewContainer);
                fileContainer.appendChild(docOuterContainer);
            }
            messageContentUser.appendChild(fileContainer);
        }

		if (text) {
            const messageTextDiv = document.createElement('div');
            messageTextDiv.classList.add('message-text');
            messageTextDiv.textContent = text;
            messageContentUser.appendChild(messageTextDiv);
        }
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
		const desktopActions = [{ label: 'Like response', icon: 'thumb_up', id: 'like' }, { label: 'Dislike response', icon: 'thumb_down', id: 'dislike' }, { label: 'Share response', icon: 'share', id: 'share' }, { label: 'More options', icon: 'more_vert', id: 'more' }];
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
		moreButtonMobile.classList.add('icon-button', 'ai-message-more-button');
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
                renderEnhancedContent(div);
				div.style.fontStyle = "normal";
				div.style.color = "var(--gem-sys-color--on-surface)";
			} else {
				const loadingText = "Just a sec...";
				div.textContent = loadingText;
				div.style.fontStyle = "italic";
				div.style.color = "var(--gem-sys-color--on-surface-variant)";
			}
		});

		[avatarDivDesktop, avatarDivMobile].forEach(avatarContainer => {
			const template = document.getElementById('ai-avatar-static-initial-template');
			if (template) {
				const svgNode = template.content.cloneNode(true);
				avatarContainer.innerHTML = '';
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
	const avatarMobileContainer = aiMessageBubble.querySelector('.mobile-only-ai-content .ai-top-content-mobile > .message-avatar.ai-avatar');

	[avatarDesktopContainer, avatarMobileContainer].forEach(container => {
		if (!container) return;
		container.innerHTML = '';
		const template = document.getElementById('ai-avatar-animated-template');

		if (template) {
			const svgElementFromTemplate = template.content.querySelector('svg');
			if (svgElementFromTemplate) {
				const clonedSvgElement = svgElementFromTemplate.cloneNode(true);
				const animatedWrapper = document.createElement('div');
				animatedWrapper.className = 'ai-avatar-animated-container';
				const loaderDiv = document.createElement('div');
				loaderDiv.className = 'ai-avatar-loader';
				animatedWrapper.appendChild(loaderDiv);
				animatedWrapper.appendChild(clonedSvgElement);
				container.appendChild(animatedWrapper);
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
	const avatarDesktopContainer = aiMessageBubble.querySelector('.desktop-only-ai-content > .message-avatar.ai-avatar');
	const avatarMobileContainer = aiMessageBubble.querySelector('.mobile-only-ai-content .ai-top-content-mobile > .message-avatar.ai-avatar');

    function renderEnhancedContent(element) {
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(element, {
                delimiters: [
                    {left: "$$", right: "$$", display: true},
                    {left: "\\[", right: "\\]", display: true},
                    {left: "$", right: "$", display: false},
                    {left: "\\(", right: "\\)", display: false}
                ],
                throwOnError: false
            });
        }
        element.querySelectorAll('table').forEach(table => {
            const wrapper = document.createElement('div');
            wrapper.classList.add('table-scroll-wrapper');
            if (table.parentNode) {
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }

	[textDesktopDiv, textMobileDiv].forEach(div => {
		if (div) {
			div.innerHTML = marked.parse(newText);
            renderEnhancedContent(div);
			div.style.fontStyle = isStillLoadingAnimation ? "italic" : "normal";
			div.style.color = isStillLoadingAnimation ? "var(--gem-sys-color--on-surface-variant)" : "var(--gem-sys-color--on-surface)";
		}
	});

	if (!isStillLoadingAnimation) {
		[avatarDesktopContainer, avatarMobileContainer].forEach(container => {
			if (!container) return;
			container.innerHTML = '';
			const template = document.getElementById('ai-avatar-static-initial-template');
			if (template) {
				const svgNode = template.content.cloneNode(true);
				if (container === avatarMobileContainer) {
					console.log("Mobile: Applying static avatar to mobile container.", svgNode);
				}
				container.appendChild(svgNode);
			} else {
				console.error('Template "ai-avatar-static-initial-template" not found.'); // Corrected from -final-
			}
		});
	}
}

function simulateAIResponse(userMessageText) {
	const aiMessageBubble = addMessageToChat(null, 'ai');
	if (aiMessageBubble) startAILoadingAnimation(aiMessageBubble);

	setTimeout(() => {
		updateAIMessageBubble(aiMessageBubble, `This is a simulated AI response to: "${userMessageText.substring(0, 30)}..."`, false);
		isSending = false;
		updateSendButtonState();
		chatInput?.focus();
	}, 2000);
}

sendMicButton?.addEventListener('click', () => {
	if (isSending) {
		console.log('Stop generating (placeholder)');
		isSending = false;
		updateSendButtonState();
	} else if (chatInput.value.trim() !== '' || attachedFileInfo) {
		const userMessageText = chatInput.value.trim();
		uiHandleSendMessage(userMessageText);
	} else {
		console.log('Microphone button clicked (placeholder for voice input)');
	}
});

chatInput?.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
		if (event.shiftKey || event.ctrlKey) { } else {
			event.preventDefault();
			if (sendMicButton && (chatInput.value.trim() !== '' || attachedFileInfo) && !isSending) {
				sendMicButton.click();
			}
		}
	}
});

function resetChatArea() {
	if (chatContentWrapper) {
		chatContentWrapper.innerHTML = '';
	}
	if (chatInput) {
		chatInput.value = '';
		chatInput.dispatchEvent(new Event('input'));
	}
    if (attachedFileInfo && attachedFileInfo.tempUrl) {
        URL.revokeObjectURL(attachedFileInfo.tempUrl);
    }
    attachedFileInfo = null;
    updateAttachmentPreview();
	toggleEmptyStateUI();
	updateSendButtonState();
	isSending = false;
	chatInput?.focus();
}

const newChatSidebarItem = document.getElementById('new-chat-button');
newChatSidebarItem?.addEventListener('click', (event) => {
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
	chatInput?.focus();
});

// --- UI Layer Functions for Firestore/Storage ---
async function uiSaveChat() {
	if (!currentUser || currentChatMessages.length === 0) return;
	let title = null;
	if (currentChatId) {
		const loadedChat = await fetchChatFromFirestore(currentUser.uid, currentChatId);
		title = loadedChat?.title;
	}
	if (!title) {
		const firstUserMsg = currentChatMessages.find(m => m.role === 'user' && (m.content?.trim() || m.fileName));
		if (firstUserMsg) {
            if (firstUserMsg.content?.trim()) {
                title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
            } else if (firstUserMsg.fileName) {
                title = `Chat with ${firstUserMsg.fileName.substring(0, 20)}...`;
            }
        }
	}
	title = title || "New Chat";

	const messagesForDb = currentChatMessages.map(m => {
		const messageData = {
			role: m.role,
			content: m.content || "",
			timestamp: m.timestamp
		};

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
	if (!recentChatsList || !chats) {
		recentChatsList.innerHTML = '<p class="px-3 py-2 text-sm text-gray-500 hide-when-closed">Error loading chats.</p>';
		return;
	}

	recentChatsList.innerHTML = '';
	if (chats.length === 0) {
		recentChatsList.innerHTML = '<p class="px-3 py-2 text-sm text-gray-500 hide-when-closed">No recent chats.</p>';
		return;
	}

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
			e.stopPropagation();
			e.preventDefault();
			uiShowRecentItemMenu(moreButton, chat.id, chat.title || 'Untitled Chat');
		});

		item.appendChild(recentText);
		item.appendChild(moreButton);
		item.addEventListener('click', async (e) => {
			if (e.target !== moreButton && !moreButton.contains(e.target)) {
				e.preventDefault();
				await uiLoadChat(chat.id);
			}
		});
		recentChatsList.appendChild(item);
	});

	if (chats.length > displayLimit) {
		const showMoreButton = document.createElement('button');
		showMoreButton.className = 'sidebar-item flex items-center space-x-1 px-3 py-2 text-sm hover:bg-gray-200 w-full text-left mt-1 rounded-full show-more-button hide-when-closed';

		const textSpan = document.createElement('span');
		textSpan.textContent = 'Show more';
		textSpan.classList.add('font-medium');

		const iconSpan = document.createElement('span');
		iconSpan.className = 'google-symbols text-base';
		iconSpan.textContent = 'expand_more';
		showMoreButton.appendChild(textSpan);
		showMoreButton.appendChild(iconSpan);

		showMoreButton.addEventListener('click', (e) => {
			e.preventDefault();
			recentChatsList.innerHTML = '';
			chats.forEach(chat => {
				const item = document.createElement('a');
				item.href = '#';
				item.className = 'sidebar-item recent-item justify-start px-0 py-1.5 text-sm truncate hide-when-closed';
				item.dataset.chatId = chat.id;
				if (chat.id === currentChatId) item.classList.add('active');
				item.innerHTML = `<span class="recent-text">${chat.title || 'Untitled Chat'}</span><button class="recent-item-more-button ml-auto" aria-label="More options for this chat"><span class="google-symbols">more_vert</span></button>`;
				item.querySelector('.recent-item-more-button')?.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); uiShowRecentItemMenu(e.currentTarget, chat.id, chat.title || 'Untitled Chat'); });
				item.addEventListener('click', async (e) => { if (e.target !== item.querySelector('.recent-item-more-button') && !item.querySelector('.recent-item-more-button').contains(e.target)) { e.preventDefault(); await uiLoadChat(chat.id); } });
				recentChatsList.appendChild(item);
			});
		});
		recentChatsList.appendChild(showMoreButton);
	}
}

async function uiLoadChat(chatId) {
	if (!currentUser) return;
	resetChatArea();
	const chatData = await fetchChatFromFirestore(currentUser.uid, chatId);

	if (chatData && chatData.messages) {
		currentChatId = chatId;
		currentChatMessages = chatData.messages ? chatData.messages.map(m => ({ ...m, timestamp: m.timestamp?.toDate() })) : [];

		currentChatMessages.forEach(msg => {
			const messageType = msg.role === 'model' ? 'ai' : msg.role;
            let fileDataForDisplay = null;
            if (msg.fileURL && msg.fileName) {
                fileDataForDisplay = { downloadURL: msg.fileURL, fileName: msg.fileName };
            }
			addMessageToChat(msg.content, messageType, fileDataForDisplay);
		});
		document.querySelectorAll('#recent-chats-list .sidebar-item.active').forEach(i => i.classList.remove('active'));
		const activeItem = document.querySelector(`#recent-chats-list .sidebar-item[data-chat-id="${chatId}"]`);
		if (activeItem) activeItem.classList.add('active');
	} else {
		alert("Chat not found.");
		uiStartNewChat();
	}
	toggleEmptyStateUI();
}

function uiStartNewChat() {
	resetChatArea();
	currentChatId = null;
	currentChatMessages = [];
	document.querySelectorAll('#recent-chats-list .sidebar-item.active').forEach(i => i.classList.remove('active'));
	chatInput?.focus();
	toggleEmptyStateUI();
}

function updateAttachmentPreview() {
    const attachmentPreviewArea = document.getElementById('attachment-preview-area');
    if (!attachmentPreviewArea) return;

    if (attachedFileInfo) {
        let previewContentHTML = '';

        if (/\.(jpeg|jpg|gif|png|webp)$/i.test(attachedFileInfo.fileName)) {
           if (attachedFileInfo.fileObject && typeof URL.createObjectURL === 'function') {
               if (attachedFileInfo.tempUrl) URL.revokeObjectURL(attachedFileInfo.tempUrl); // Revoke previous if any
               attachedFileInfo.tempUrl = URL.createObjectURL(attachedFileInfo.fileObject);
               previewContentHTML = `<img src="${attachedFileInfo.tempUrl}" alt="Preview">`;
           } else if (attachedFileInfo.downloadURL) { // Fallback if fileObject not available but URL is
               previewContentHTML = `<img src="${attachedFileInfo.downloadURL}" alt="Preview">`;
           }
        } else {
           previewContentHTML = `<span class="google-symbols file-icon">description</span>`;
        }

        attachmentPreviewArea.innerHTML = `
            <div class="attachment-thumbnail-container">
                    ${previewContentHTML}
               <button id="remove-attachment-button" class="remove-attachment-button" aria-label="Remove attachment">
                   <span class="google-symbols">close</span>
               </button>
           </div>
        `;
        document.getElementById('remove-attachment-button')?.addEventListener('click', () => {
           if (attachedFileInfo && attachedFileInfo.tempUrl) {
               URL.revokeObjectURL(attachedFileInfo.tempUrl);
               delete attachedFileInfo.tempUrl;
           }
           attachedFileInfo = null;
           updateAttachmentPreview();
           updateSendButtonState();
        });
        attachmentPreviewArea.style.display = 'flex';
    } else {
        attachmentPreviewArea.innerHTML = '';
        attachmentPreviewArea.style.display = 'none';
    }
}

async function uiHandleFileUpload(file) {
	if (!currentUser || !file) {
		alert("Please log in to upload files.");
		return null;
	}
	showSnackbar(`Uploading ${file.name}...`, 5000);
	const uploadResult = await uploadFileToStorage(currentUser.uid, file);

	if (uploadResult) {
        showSnackbar(`${file.name} attached.`, 3000);
		attachedFileInfo = {
           fileName: file.name,
           fileObject: file, // The actual File object for local preview
           downloadURL: uploadResult.downloadURL, // URL after upload
           filePath: uploadResult.filePath
       };
        updateAttachmentPreview();
        updateSendButtonState();
		return uploadResult;
	} else {
        showSnackbar(`Failed to upload ${file.name}.`, 3000);
		return null;
	}
}

// --- Fungsi untuk Menu Konteks Item Recent ---
let currentRecentChatTarget = { id: null, title: null, buttonElement: null };

function uiShowRecentItemMenu(buttonEl, chatId, chatTitle) {
	if (!recentItemOptionsMenu) return;

	currentRecentChatTarget = { id: chatId, title: chatTitle, buttonElement: buttonEl };
	hideAllPopups(recentItemOptionsMenu);

	const rect = buttonEl.getBoundingClientRect();
	recentItemOptionsMenu.style.top = `${rect.bottom + window.scrollY + 2}px`;
	recentItemOptionsMenu.style.left = `${rect.left + window.scrollX - recentItemOptionsMenu.offsetWidth + rect.width}px`;
	recentItemOptionsMenu.classList.add('show');
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
		console.log("Recent item menu clicked. Target:", e.target, "Closest actionable element:", actionableElement);
		if (actionableElement && actionableElement.dataset.action) {
			console.log("Recent item menu action detected:", actionableElement.dataset.action);
			const action = actionableElement.dataset.action;
			const chatId = currentRecentChatTarget.id;
			const currentTitle = currentRecentChatTarget.title;
			console.log("Action details - Chat ID:", chatId, "Title:", currentTitle, "User:", currentUser?.uid);

			if (!chatId || !currentUser) {
				console.error("Chat ID or user not available for action:", action);
				recentItemOptionsMenu.classList.remove('show');
				return;
			}

			if (action === 'rename') {
				const newTitle = prompt("Enter new name for this chat:", currentTitle);
				if (newTitle && newTitle.trim() !== "" && newTitle !== currentTitle) {
					console.log("Attempting to rename chat:", chatId, "to new title:", newTitle.trim());
					const success = await renameChatInFirestore(currentUser.uid, chatId, newTitle.trim());
					if (success) {
						await uiLoadRecentChats();
					} else {
						alert("Failed to rename chat.");
					}
				}
			} else if (action === 'delete') {
				if (confirm(`Are you sure you want to delete "${currentTitle}"? This action cannot be undone.`)) {
					console.log("Attempting to delete chat:", chatId);
					const success = await deleteChatFromFirestore(currentUser.uid, chatId);
					if (success) {
						if (currentChatId === chatId) {
							uiStartNewChat();
						}
						await uiLoadRecentChats();
					} else {
						alert("Failed to delete chat.");
					}
				}
			}
			recentItemOptionsMenu.classList.remove('show');
		} else {
			console.log("Click inside recentItemOptionsMenu, but no valid action link found.");
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
	const wasMobile = bodyElement.dataset.isMobile === 'true';
	const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

	if (wasMobile && !isMobile && bodyElement.classList.contains('bottom-sheet-open')) {
		closeBottomSheet();
	} else if (!wasMobile && isMobile && modelDropdownMenu?.classList.contains('show')) {
		modelDropdownMenu.classList.remove('show');
		if (modeSwitcherButton) {
			modeSwitcherButton.classList.remove('open');
			modeSwitcherButton.setAttribute('aria-expanded', 'false');
		}
	}

	updateLayout();

	if (!isMobile) {
		if (bodyElement.classList.contains('sidebar-open-mobile')) {
			bodyElement.classList.remove('sidebar-open-mobile');
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
	let currentTargetRecentItem = null;

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

	// Theme logic
	let activeSubmenu = null;
	let hideSubmenuTimer = null;
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
			actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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

	function toggleAiMessageMenu(buttonEl) {
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

	chatContentWrapper?.addEventListener('click', function (event) {
		const moreButton = event.target.closest('.ai-message-more-button');
		if (moreButton) {
			event.preventDefault();
			event.stopPropagation();
			const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
			if (isMobile) {
				currentAiMessageTriggerButton = moreButton;
			console.log('[CHAT CONTENT WRAPPER CLICK - MOBILE] currentAiMessageTriggerButton SET TO:', currentAiMessageTriggerButton);
				openAiMessageOptionsSheet();
			} else {
				toggleAiMessageMenu(moreButton);
			}
		}
	});

	aiMessageOptionsMenu?.addEventListener('click', (event) => {
		const targetLink = event.target.closest('a');
		if (targetLink && targetLink.dataset.action) {
			event.preventDefault();
			const action = targetLink.dataset.action;
			console.log(`AI Message Action: "${action}" triggered for message.`);

			if (action === 'copy_response') {
				const messageBubble = currentAiMessageTriggerButton?.closest('.message-bubble.ai');
				if (messageBubble) {
					const messageTextElement = messageBubble.querySelector('.message-text');
					const textToCopy = messageTextElement ? messageTextElement.textContent : '';
					if (textToCopy) {
						navigator.clipboard.writeText(textToCopy.trim())
							.then(() => {
								showSnackbar('Copied to clipboard');
							})
							.catch(err => {
								console.error('Failed to copy text: ', err);
								showSnackbar('Failed to copy text. See console.');
							});
					} else {
						showSnackbar('No text found to copy.');
					}
				}
			}

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

aiOptionsOverlay?.addEventListener('click', () => {
	closeAiMessageOptionsSheet();
}
);

aiMessageOptionsSheet?.addEventListener('click', (event) => {
	const targetActionElement = event.target.closest('a, button.action-item');
	if (targetActionElement && targetActionElement.dataset.action) {
		event.preventDefault();
		const action = targetActionElement.dataset.action;
		console.log(`AI Message Options Sheet Action: "${action}" triggered.`);
		console.log('[AI OPTIONS SHEET CLICK] currentAiMessageTriggerButton IS:', currentAiMessageTriggerButton);
		if (action === 'copy_response_sheet') {
			console.log("copy_response_sheet: currentAiMessageTriggerButton:", currentAiMessageTriggerButton);
			const messageBubble = currentAiMessageTriggerButton?.closest('.message-bubble.ai');
			console.log("copy_response_sheet: messageBubble:", messageBubble);
			if (messageBubble) {
				const mobileContent = currentAiMessageTriggerButton?.closest('.mobile-only-ai-content');
				console.log("copy_response_sheet: mobileContent:", mobileContent);
				const messageTextElement = mobileContent ? mobileContent.querySelector('.message-text') : null;
				console.log("copy_response_sheet: messageTextElement:", messageTextElement);
				const textToCopy = messageTextElement ? messageTextElement.textContent.trim() : '';
				console.log("copy_response_sheet: textToCopy:", `'${textToCopy}'`);
				if (textToCopy) {
					navigator.clipboard.writeText(textToCopy.trim())
						.then(() => {
							showSnackbar('Copied to clipboard');
							console.log('Text copied successfully to clipboard.');
						})
						.catch(err => {
							console.error('Failed to copy text: ', err);
							showSnackbar('Failed to copy text. See console.');
						});
				} else {
					showSnackbar('No text found to copy.');
					console.warn('No text found to copy. messageTextElement might be null or its textContent is empty.');
				}
			} else {
				console.warn("copy_response_sheet: messageBubble not found based on currentAiMessageTriggerButton.");
			}
		}

		closeAiMessageOptionsSheet();
		currentAiMessageTriggerButton = null;
		console.log('[AI OPTIONS SHEET CLICK] currentAiMessageTriggerButton NULLED after action.');
	}
});

bottomSheetOverlay?.addEventListener('click', () => {
	closeBottomSheet();
}
);
