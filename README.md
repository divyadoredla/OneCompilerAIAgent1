Aurora Compile:
Aurora Compile is a browser-first web compiler and IDE for HTML, CSS, and JavaScript. It provides a seamless development experience with a powerful code editor, live preview, project management, and an integrated AI assistant to help you code smarter and faster.

- Core Features
Web IDE (index.html)
Powerful Code Editor: Built with Monaco Editor (the engine behind VS Code) for a rich editing experience with syntax highlighting, autocompletion, and bracket pair colorization.

Live Preview: Instantly see your changes in a preview pane with hot-reloading.

Responsive Device Testing: Test your creations on desktop, tablet, and mobile viewports.

File Management: A simple file tree to create, open, and delete files within your project.

Project Templates: Start quickly with pre-built templates for a blank project, a vanilla SPA, a React CDN app, or a landing page.

Client-Side Compilation: All HTML, CSS, and JS are compiled in the browser for the live preview.

Export Project: Download your entire project as a .zip file, ready for deployment.

Persistent Projects: Your work is automatically saved to localStorage, so you can pick up right where you left off.

AI Chatbot (chatbot.html)
Modern Interface: A sleek, futuristic chat UI for interacting with the AI.

AI-Powered Assistance: Ask coding questions, get explanations, and receive suggestions.

Backend Integration: Connects to a backend server to process requests with powerful language models like GPT-4o-mini.

Click-and-Go: Accessible via a cool, draggable logo icon on the main IDE page.

- Tech Stack
Frontend:

HTML5, CSS3, Vanilla JavaScript (ES6+)

Monaco Editor: The core code editor.

JSZip: For exporting projects.

Backend (Node.js):

Node.js / Express: Serves static files and acts as a proxy for the AI chatbot.

dotenv: For managing environment variables.

Alternative Backend (Python):

Flask / CORS: A Python-based server for local AI and web automation.

LangChain / Ollama: To run Large Language Models (like Llama 3) locally.

Selenium: For browser automation tasks (Web Agent).

- Getting Started
This project is primarily a frontend application but includes a backend to power the AI chatbot. You have two backend options provided.

Prerequisites
Node.js and npm: Required for the Node.js backend. Download here.

Python and pip: (Optional) Required for the Python backend. Download here.

Ollama: (Optional) Required if you want to run the AI model locally with the Python backend. Download here.

Installation & Setup
Clone the repository:

Bash

git clone <your-repository-url>
cd <repository-directory>
Choose Your Backend:

Option 1: Node.js Backend (Recommended for Chatbot)
This server will serve your files and proxy requests to the OpenAI API. The provided chatbot.js is pre-configured to work with this server.

a. Install dependencies:

Bash

npm install
b. Create a .env file in the root directory and add your OpenAI API key:

OPENAI_API_KEY=your_openai_api_key_here
c. Start the server:

Bash

npm start
The server will be running at http://localhost:3000.

Option 2: Python Flask Backend (For Local LLM & Web Agent)
This server uses a locally running Ollama model for chat and Selenium for browser automation.

a. Install Python dependencies:

Bash

pip install Flask flask_cors requests langchain_ollama selenium webdriver-manager
b. Install and run a local LLM with Ollama:

Bash

# Pull the llama3 model
ollama pull llama3

# Keep this running in a separate terminal
ollama run llama3
c. Start the Flask server:

Bash

python app.py
The server will be running at http://localhost:5000.

Note: If you use this backend, you must update the fetch URL in chatbot.js from http://localhost:3000/api/chat to http://localhost:5000/api/generate.

Launch the Application:

If you are running the Node.js server, simply navigate to http://localhost:3000 in your browser.

If you are not running a server, you can open the index.html file directly in your browser. The IDE will work, but the chatbot will not.

- Project Structure
.
├── index.html          # Main IDE interface
├── style.css           # Styles for the IDE
├── script.js           # Core logic for the IDE
│
├── chatbot.html        # AI chatbot interface
├── chatbot.css         # Styles for the chatbot
├── chatbot.js          # Logic for the chatbot
│
├── logo-drag.js        # Script for the draggable logo
├── icon.png            # The draggable logo image
│
├── server.js           # Node.js backend for proxying OpenAI
├── package.json        # Node.js dependencies and scripts
│
├── app.py              # (Alternative) Python backend with Ollama and Selenium
│
└── README.md           # This file
License
This project is licensed under the ISC License. See the package.json file for details.
