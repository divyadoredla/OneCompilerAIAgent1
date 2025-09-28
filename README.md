AI Automation Agent

An AI-powered automation agent that takes natural language instructions, uses Gemini for understanding, and executes tasks via browser automation (Playwright).

This project was built for a hackathon with the aim to make coding smarter, faster, and autonomous.

🚀 Features

Natural Language to Actions → Type queries like “Search laptops under 50k and list top 5.”

Browser Automation → Automatically searches Google and extracts results.

Code Debugging → Detects errors and suggests fixes.

Code Conversion → Converts code between programming languages.

Interactive Chat UI → Clean interface to chat with the AI Agent.

🏗️ Architecture flowchart TD A[User Query - Frontend] --> B[Flask Backend] B --> C[Gemini AI - Task Understanding] C --> D{Router} D -->|Search| E[Playwright Automation] D -->|Debug| F[Gemini Debugging] D -->|Convert| G[Gemini Conversion] E & F & G --> H[Structured Output] H --> I[Frontend Display]

🛠️ Tech Stack

Frontend: HTML, CSS, JavaScript

Backend: Flask (Python)

AI Model: Gemini 1.5 Flash (Google AI Studio)

Automation: Playwright

Deployment: Localhost / GitHub

Example Use Cases

Search laptops under 50k and list top 5 → Returns a structured list.

Why is my Python code failing? → Returns explanation + corrected code.

Convert factorial code from Python to Java → Returns translated code.

Future Scope

Auto test-case generation for user code.

Code optimization suggestions.

Integration directly into OneCompiler or IDE.

Team Name : AI Coders Team Leader : D.Divya Sri Team Mates : M.Chandu Naga Sowmya : S.Teja : Kavitha : poornima
