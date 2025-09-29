class ModernChatbot {
    constructor() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.uploadButton = document.getElementById('uploadButton');
        this.fileUpload = document.getElementById('fileUpload');
        this.typingIndicator = document.getElementById('typingIndicator');

        this.messageId = 1;
        this.isTyping = false;

        this.init();
    }

    init() {
        console.log('Initializing ModernChatbot...');
        this.setupEventListeners();
        this.adjustTextareaHeight();
        this.addInitialMessage();
    }

    addInitialMessage() {
        this.addMessage("Hello! I'm your AI assistant. Ask me anything 🚀", false);
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.handleSend());
        this.messageInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
            this.toggleSendButton();
        });
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
    }

    adjustTextareaHeight() {
        this.messageInput.style.height = 'auto';
        const scrollHeight = this.messageInput.scrollHeight;
        this.messageInput.style.height = Math.min(scrollHeight, 120) + 'px';
    }

    toggleSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText || this.isTyping;
    }

    async handleSend() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        this.addMessage(message, true);
        this.messageInput.value = '';
        this.adjustTextareaHeight();
        this.toggleSendButton();
        this.showTypingIndicator();

        const response = await this.getBotResponse(message);

        this.hideTypingIndicator();
        this.addMessage(response, false);
    }

    async getBotResponse(userMessage) {
        this.isTyping = true;
        this.toggleSendButton();

        try {
           const res = await fetch("http://localhost:3000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: userMessage }]
  })
});



            const data = await res.json();
            this.isTyping = false;
            this.toggleSendButton();

            return data.choices[0].message.content.trim();
        } catch (err) {
            console.error("Error:", err);
            this.isTyping = false;
            this.toggleSendButton();
            return "⚠️ Sorry, something went wrong while fetching the response.";
        }
    }

    addMessage(text, isUser = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        messageElement.setAttribute('data-message-id', this.messageId++);

        const avatar = isUser 
            ? '<div class="message-avatar user-avatar">👤</div>'
            : '<div class="message-avatar bot-avatar">🤖</div>';

        let formattedText = text.replace(/\n/g, '<br>');

        messageElement.innerHTML = `
            ${avatar}
            <div class="message-content">
                <div class="message-bubble">${formattedText}</div>
                <div class="message-time">${this.formatTime(new Date())}</div>
            </div>
        `;

        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();

        setTimeout(() => {
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        }, 50);
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ModernChatbot();
});
lll
