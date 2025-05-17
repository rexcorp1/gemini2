# gemini2 - Just Simple Gemini Clone

[Switch to: [Bahasa Indonesia](README_id.md)]

<br>

## English

A simple web-based chat application that interacts with Google's Gemini API, aiming to replicate some core functionalities of a Gemini-like interface. This project uses Firebase for backend services (authentication, Firestore, Storage) and a Deno-based proxy to securely communicate with the Gemini API.

### Features

*   **Google Authentication**: Secure sign-in using Google accounts.
*   **Real-time Chat**: Engage in conversations with the Gemini AI.
*   **Chat History**: Previous conversations are saved and can be revisited.
*   **File Uploads**:
    *   **Image Analysis**: Upload images (JPG, PNG, etc.) for the AI to analyze and describe.
    *   **Document Processing**: Upload PDF and various text-based documents (TXT, MD, HTML, CSV, JSON, XML) for the AI to process their content.
*   **Model Selection**: Choose between different Gemini models (e.g., Flash, Pro experimental versions).
*   **Responsive UI**: Adapts to different screen sizes for a good experience on desktop and mobile.
*   **Theme Customization**: Switch between Light, Dark, and System themes.
*   **Message Management**: Options to copy AI responses.
*   **Recent Chats Management**: Rename or delete past conversations.

### Tech Stack

*   **Frontend**: Vanilla JavaScript, HTML, CSS
*   **Backend Services**:
    *   Firebase Authentication
    *   Firebase Firestore (for chat storage)
    *   Firebase Storage (for file uploads)
*   **AI Proxy**: Deno (TypeScript) - A backend proxy (`gemini-backend.deno.dev`) to handle requests to the Google Gemini API securely.
*   **AI Model**: Google Gemini API

### Project Structure (Simplified)

*   `index.html`: Main HTML file.
*   `css/style.css`: Styles for the application.
*   `js/script.js`: Handles UI logic, event listeners, and interaction with `function.js`.
*   `js/function.js`: Core Firebase and API interaction logic.
*   `js/firebase.config.js`: Firebase project configuration.
*   `assets/`: Contains images and other static assets.
*   **(Proxy Backend - Separate Deno Project)**:
    *   `main.ts` (or similar): Deno server that proxies requests to the Gemini API and processes file uploads.

### Setup

1.  **Firebase Setup**:
    *   Create a Firebase project at https://console.firebase.google.com/.
    *   Enable Google Authentication.
    *   Set up Firestore and Firebase Storage.
    *   Update `js/firebase.config.js` with your Firebase project's configuration.
    *   Configure Firebase Storage rules to allow user uploads and reads by the proxy (see example in previous discussions).

2.  **Gemini API Key**:
    *   Obtain a Google Gemini API key from Google AI Studio.

3.  **Deno Proxy Backend**:
    *   The proxy backend (e.g., `https://gemini-backend.deno.dev`) needs to be running.
    *   Set the `GEMINI_API_KEY` environment variable for the Deno Deploy project or your local Deno server.
    *   Ensure the `GEMINI_PROXY_URL` in `js/function.js` points to your deployed Deno proxy.

4.  **Frontend**:
    *   Serve the frontend files (HTML, CSS, JS) using a simple HTTP server (e.g., Live Server in VS Code, Python's `http.server`, etc.).

### Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

### License

This project is licensed under the MIT License.
