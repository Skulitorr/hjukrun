/**
 * NurseCare AI - Medical Assistant Chatbot
 * Enhanced version with OpenAI integration
 * Handles both the main chatbot page and the floating AI widget
 */

// Configuration
const config = {
    apiEndpoint: '/api/chat', // Primary endpoint for OpenAI integration
    legacyEndpoint: '/api/generate', // Legacy endpoint for backward compatibility
    storageKey: 'nursecare_chat_history',
    maxHistory: 50,
    typingSpeed: 30 // milliseconds per character
};

// Chatbot/AI functionality module
import { showToast } from './utils.js';

class ChatbotAI {
    static instance = null;
    static MAX_HISTORY_LENGTH = 20;

    constructor() {
        if (ChatbotAI.instance) {
            return ChatbotAI.instance;
        }

        this.chatWindow = document.getElementById('ai-chat');
        this.floatingBtn = document.getElementById('floating-chat-btn');
        this.minimizeBtn = document.getElementById('minimize-chat');
        this.closeBtn = document.getElementById('close-chat');
        this.clearBtn = document.getElementById('clear-chat');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.chatMessages = document.getElementById('chat-messages');
        this.isProcessing = false;
        this.chatHistory = [];

        ChatbotAI.instance = this;
        this.initializeEventListeners();
        this.loadChatHistory();
        
        return this;
    }

    static getInstance() {
        if (!ChatbotAI.instance) {
            ChatbotAI.instance = new ChatbotAI();
        }
        return ChatbotAI.instance;
    }

    initializeEventListeners() {
        // Initialize floating button
        if (this.floatingBtn) {
            this.floatingBtn.addEventListener('click', () => {
                this.chatWindow?.classList.add('open');
                this.chatInput?.focus();
            });
        }

        // Initialize minimize button
        if (this.minimizeBtn) {
            this.minimizeBtn.addEventListener('click', () => {
                this.chatWindow?.classList.toggle('minimized');
            });
        }

        // Initialize close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.chatWindow?.classList.remove('open', 'minimized');
            });
        }

        // Initialize clear button
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearChat());
        }

        // Initialize chat form
        if (this.chatForm) {
            this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.isProcessing) return;

        const message = this.chatInput.value.trim();
        if (!message) return;

        try {
            this.isProcessing = true;
            this.chatInput.disabled = true;
            
            // Add user message
            this.addMessageToChat('user', message);
            this.chatInput.value = '';
            
            // Show typing indicator
            this.showTypingIndicator();
            
            // Process message
            const response = await this.processMessage(message);
            
            // Hide typing indicator and show response
            this.hideTypingIndicator();
            this.addMessageToChat('assistant', response);
            
        } catch (error) {
            console.error('Chat Error:', error);
            showToast('Villa', 'Villa kom upp við að vinna úr fyrirspurn', 'error');
            this.hideTypingIndicator();
        } finally {
            this.isProcessing = false;
            this.chatInput.disabled = false;
            this.chatInput.focus();
        }
    }

    async processMessage(message) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: message }]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.response;
            
        } catch (error) {
            console.error('API Error:', error);
            return 'Því miður get ég ekki svarað þessari fyrirspurn núna. Vinsamlegast reyndu aftur síðar.';
        }
    }

    addMessageToChat(sender, message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' 
            ? '<i class="fas fa-user"></i>'
            : '<i class="fas fa-user-md"></i>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = message;
        
        messageEl.appendChild(avatar);
        messageEl.appendChild(content);
        
        this.chatMessages?.appendChild(messageEl);
        this.scrollToBottom();
        
        // Save to history
        this.saveChatMessage(sender, message);
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message assistant typing-indicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-user-md"></i>';
        
        const dots = document.createElement('div');
        dots.className = 'typing-dots';
        dots.innerHTML = '<span></span><span></span><span></span>';
        
        indicator.appendChild(avatar);
        indicator.appendChild(dots);
        
        this.chatMessages?.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = this.chatMessages?.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    scrollToBottom() {
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    saveChatMessage(sender, message) {
        this.chatHistory.push({
            sender,
            message,
            timestamp: new Date()
        });

        // Trim history if it gets too long
        if (this.chatHistory.length > ChatbotAI.MAX_HISTORY_LENGTH) {
            this.chatHistory = this.chatHistory.slice(
                this.chatHistory.length - ChatbotAI.MAX_HISTORY_LENGTH
            );
        }

        // Save to localStorage
        try {
            localStorage.setItem('chatHistory', JSON.stringify(this.chatHistory));
        } catch (error) {
            console.warn('Failed to save chat history:', error);
        }
    }

    loadChatHistory() {
        try {
            const savedHistory = localStorage.getItem('chatHistory');
            if (savedHistory) {
                this.chatHistory = JSON.parse(savedHistory);
                
                // Convert string timestamps back to Date objects
                this.chatHistory.forEach(item => {
                    item.timestamp = new Date(item.timestamp);
                });
                
                // Render saved messages
                this.chatHistory.forEach(item => {
                    this.addMessageToChat(item.sender, item.message);
                });
            }
        } catch (error) {
            console.warn('Failed to load chat history:', error);
            this.chatHistory = [];
        }
    }

    clearChat() {
        if (this.chatMessages) {
            this.chatMessages.innerHTML = '';
        }
        this.chatHistory = [];
        localStorage.removeItem('chatHistory');
        showToast('Hreinsað', 'Spjallferlinum hefur verið eytt', 'info');
    }
}

// Export singleton instance
export const chatbot = ChatbotAI.getInstance();

/**
 * Initialize the mini chat widget elements
 */
function initializeMiniWidget() {
    const widgetContainer = document.getElementById('ai-widget-container');
    const messagesContainer = document.getElementById('ai-widget-messages');
    const chatInput = document.getElementById('ai-widget-input');
    const sendButton = document.getElementById('ai-widget-send');
    const toggleButton = document.getElementById('ai-widget-toggle');
    const minimizeButton = document.getElementById('ai-minimize-btn');
    const clearButton = document.getElementById('ai-clear-btn');
    
    // Store elements if they exist
    if (widgetContainer && messagesContainer && chatInput) {
        chatElements.miniWidget = {
            widget: widgetContainer,
            container: messagesContainer,
            input: chatInput,
            sendButton: sendButton,
            toggleButton: toggleButton,
            minimizeButton: minimizeButton,
            clearButton: clearButton
        };
        
        console.log('Mini widget found and initialized');
        
        // Set up event listeners
        if (sendButton) {
            sendButton.addEventListener('click', function() {
                sendMessage('miniWidget');
            });
        }
        
        // Enter key to send message
        if (chatInput) {
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage('miniWidget');
                }
            });
            
            // Update send button state
            chatInput.addEventListener('input', function() {
                if (sendButton) {
                    sendButton.disabled = this.value.trim() === '';
                }
                
                // Auto-resize textarea
                if (chatInput.tagName.toLowerCase() === 'textarea') {
                    chatInput.style.height = 'auto';
                    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
                }
            });
        }
        
        // Toggle widget visibility
        if (toggleButton) {
            toggleButton.addEventListener('click', function() {
                widgetContainer.classList.toggle('open');
                if (widgetContainer.classList.contains('open')) {
                    setTimeout(() => {
                        if (chatInput) chatInput.focus();
                    }, 100);
                }
            });
        }
        
        // Minimize widget
        if (minimizeButton) {
            minimizeButton.addEventListener('click', function() {
                widgetContainer.classList.remove('open');
            });
        }
        
        // Clear chat button
        if (clearButton) {
            clearButton.addEventListener('click', function() {
                clearChat('miniWidget');
            });
        }
        
        // Connect other dashboard buttons to the widget
        connectDashboardButtons();
        
        // Add welcome message if no messages already exist
        if (messagesContainer.children.length === 0) {
            addMessageToChat('miniWidget', 'assistant', 'Góðan daginn! Ég er NurseCare AI aðstoðarmaðurinn þinn. Hvernig get ég aðstoðað þig í dag?');
        }
    } else {
        console.log('Mini widget not found on this page');
    }
}

/**
 * Connect dashboard buttons to open the chat widget
 */
function connectDashboardButtons() {
    // Open AI Chat button
    const openAiChatBtn = document.getElementById('open-ai-chat-btn');
    if (openAiChatBtn) {
        openAiChatBtn.addEventListener('click', function() {
            console.log('Opening AI chat from dashboard button');
            const widgetContainer = document.getElementById('ai-widget-container');
            const toggleButton = document.getElementById('ai-widget-toggle');
            
            if (widgetContainer) {
                widgetContainer.classList.add('open');
                
                // Focus the input field
                const chatInput = document.getElementById('ai-widget-input');
                if (chatInput) {
                    setTimeout(() => chatInput.focus(), 100);
                }
            } else if (toggleButton) {
                toggleButton.click();
            }
        });
    }
    
    // Ask AI button in quick actions
    const askAiBtn = document.getElementById('ask-ai-btn');
    if (askAiBtn) {
        askAiBtn.addEventListener('click', function() {
            console.log('Opening AI chat from ask AI button');
            const widgetContainer = document.getElementById('ai-widget-container');
            const toggleButton = document.getElementById('ai-widget-toggle');
            
            if (widgetContainer) {
                widgetContainer.classList.add('open');
                
                // Focus the input field
                const chatInput = document.getElementById('ai-widget-input');
                if (chatInput) {
                    setTimeout(() => chatInput.focus(), 100);
                }
            } else if (toggleButton) {
                toggleButton.click();
            }
        });
    }
}

/**
 * Send a message to the AI
 * @param {string} type - 'fullChat' or 'miniWidget'
 */
function sendMessage(type) {
    // Get the active chat elements
    const elements = chatElements[type];
    if (!elements || !elements.input || !elements.container) return;
    
    // Get the message from input
    const message = elements.input.value.trim();
    if (!message || isWaitingForResponse) return;
    
    // Add user message to the chat
    addMessageToChat(type, 'user', message);
    
    // Clear input
    elements.input.value = '';
    if (elements.sendButton) {
        elements.sendButton.disabled = true;
    }
    
    // Reset input height if it's a textarea
    if (elements.input.tagName.toLowerCase() === 'textarea') {
        elements.input.style.height = 'auto';
    }
    
    // Disable input while waiting for response
    isWaitingForResponse = true;
    
    // Show typing indicator
    const typingIndicator = addTypingIndicator(type);
    
    // Prepare messages for the API request
    const messagesToSend = prepareMessagesForAPI(message);
    
    // Send request to AI
    fetchAIResponse(messagesToSend)
        .then(response => {
            // Remove typing indicator
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            // Add AI response with typing animation
            addMessageWithAnimation(type, 'assistant', response);
        })
        .catch(error => {
            console.error('Error getting AI response:', error);
            
            // Remove typing indicator
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            // Show error message
            addMessageToChat(type, 'assistant', 'Því miður get ég ekki svarað spurningunni þinni núna. Vinsamlegast reyndu aftur síðar.');
            
            // Show toast notification
            showToast('Villa', 'Ekki tókst að fá svar frá gervigreind', 'error');
        })
        .finally(() => {
            // Re-enable input
            isWaitingForResponse = false;
        });
}

/**
 * Prepare messages for the API request
 * @param {string} userMessage - The latest user message
 * @returns {Array} - Array of messages in OpenAI format
 */
function prepareMessagesForAPI(userMessage) {
    // Start with system message for context
    const messages = [
        {
            "role": "system",
            "content": `# NurseCare AI System Prompt

You are NurseCare AI, an intelligent assistant for healthcare professionals working in a nursing facility with a focus on Alzheimer's care. You primarily communicate in Icelandic but can respond in other languages if asked.

## Current Facility Status
- **Patients**: 18 patients currently in the facility (Department 3 - Alzheimer's)
- **Staff**: 8 staff members on current shift (3 nurses, 2 assistants, 3 nursing aides)
- **Medication Administration**: 82% of scheduled medications have been given today
- **Tasks**: 14 out of 16 tasks have been completed so far
- **Next Shift**: Today at 15:00-23:00, 5 staff members in Department B

## Active Alerts
- **Patient Alert**: Jón Jónsson has elevated heart rate since 10:32
- **Inventory Alert**: Low stock of latex gloves (only 12 remaining)
- **Medication Alert**: Medication due for María Ólafsdóttir

## Inventory Status
- Gloves: 15% (CRITICAL)
- Masks: 45% (WARNING)
- Syringes: 80% (GOOD)
- Needles: 60% (GOOD)
- Wound dressings: 35% (WARNING)

## Communication Guidelines
- Be professional but warm and friendly
- Provide concise, factual information relevant to healthcare professionals
- Be respectful of patient dignity and privacy
- If you don't know specific patient details, acknowledge this and offer to help find the information
- Mention that staff should check official records for the most up-to-date information
- Prioritize patient safety in all recommendations

## Response Topics You Can Help With
- Staff scheduling and availability
- Patient care information (general, not specific unless mentioned in system data)
- Medication administration guidance
- Inventory status
- Task management and prioritization
- Alzheimer's care best practices
- Administrative procedures
- Health monitoring alerts
- General healthcare advice

Always respond in a helpful, accurate manner appropriate for a healthcare setting.`
        }
    ];
    
    // Add recent chat history for context (last 10 messages)
    // This helps maintain conversation flow
    const recentMessages = chatHistory.slice(-10);
    recentMessages.forEach(item => {
        messages.push({
            "role": item.sender,
            "content": item.message
        });
    });
    
    // Add the current user message
    messages.push({
        "role": "user",
        "content": userMessage
    });
    
    return messages;
}

/**
 * Fetch response from the AI API
 * @param {string} messages - Array of messages in OpenAI format
 * @returns {Promise<string>} - AI response
 */
async function fetchAIResponse(messages) {
    try {
        const response = await fetch(config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages }),
            timeout: 30000 // 30 second timeout
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response || 'Því miður fékk ég ekkert svar. Prófaðu aftur.';
        
    } catch (error) {
        console.error('API error:', error);
        
        // Show user-friendly error message
        const errorMessage = error.message.includes('Failed to fetch') || 
                           error.message.includes('NetworkError') ?
            'Tenging við gervigreind mistókst. Vinsamlegast athugaðu nettengingu þína.' :
            'Villa kom upp. Vinsamlegast reyndu aftur.';
            
        throw new Error(errorMessage);
    }
}

/**
 * Add a message to the chat
 * @param {string} type - 'fullChat' or 'miniWidget'
 * @param {string} sender - 'user' or 'assistant'
 * @param {string} message - Message text
 */
function addMessageToChat(type, sender, message) {
    const elements = chatElements[type];
    if (!elements || !elements.container) {
        console.error('Chat container not found for type:', type);
        return;
    }
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message ${sender}-message`;
    
    // Get current time
    const now = new Date();
    const timeString = now.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' });
    
    // Create message content based on sender
    if (sender === 'user') {
        messageEl.innerHTML = `
            <div class="message-content">
                <div class="message-text">${formatMessage(message)}</div>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
        `;
    } else {
        messageEl.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${formatMessage(message)}</div>
                <span class="message-time">${timeString}</span>
            </div>
        `;
    }
    
    // Add to container
    elements.container.appendChild(messageEl);
    
    // Scroll to bottom
    scrollToBottom(elements.container);
    
    // Save to history
    saveMessageToHistory(sender, message);
}

/**
 * Add a message with typing animation
 * @param {string} type - 'fullChat' or 'miniWidget'
 * @param {string} sender - 'user' or 'assistant'
 * @param {string} message - Message text
 */
function addMessageWithAnimation(type, sender, message) {
    const container = chatElements[type].container;
    if (!container) return;
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message ${sender}-message`;
    
    // Get current time
    const now = new Date();
    const timeString = now.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' });
    
    // Create basic structure
    if (sender === 'assistant') {
        messageEl.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-text"></div>
                <span class="message-time">${timeString}</span>
            </div>
        `;
    } else {
        messageEl.innerHTML = `
            <div class="message-content">
                <div class="message-text"></div>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
        `;
    }
    
    // Add to container
    container.appendChild(messageEl);
    
    // Get the message text element
    const messageTextEl = messageEl.querySelector('.message-text');
    
    // Animate typing
    let index = 0;
    const typingSpeed = config.typingSpeed;
    
    function typeNextChar() {
        if (index < message.length) {
            // Add the next character
            messageTextEl.innerHTML = formatMessage(message.substring(0, index + 1));
            index++;
            
            // Scroll to bottom
            scrollToBottom(container);
            
            // Schedule the next character
            setTimeout(typeNextChar, typingSpeed);
        } else {
            // Typing complete, save to history
            saveMessageToHistory(sender, message);
        }
    }
    
    // Start typing animation
    typeNextChar();
}

/**
 * Add typing indicator to the chat
 * @param {string} type - 'fullChat' or 'miniWidget'
 * @returns {HTMLElement} - The typing indicator element
 */
function addTypingIndicator(type) {
    const container = chatElements[type].container;
    if (!container) return null;
    
    // Create typing indicator
    const indicatorEl = document.createElement('div');
    indicatorEl.className = 'typing-indicator';
    indicatorEl.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    
    // Add to container
    container.appendChild(indicatorEl);
    
    // Scroll to bottom
    scrollToBottom(container);
    
    return indicatorEl;
}

/**
 * Format message text with basic styling
 * @param {string} text - Message text
 * @returns {string} - Formatted HTML
 */
function formatMessage(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

/**
 * Clear the chat history
 * @param {string} type - 'fullChat' or 'miniWidget'
 */
function clearChat(type) {
    const container = chatElements[type].container;
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Add welcome message
    addMessageToChat(type, 'assistant', 'Góðan daginn! Ég er NurseCare AI aðstoðarmaðurinn þinn. Hvernig get ég aðstoðað þig í dag?');
    
    // Clear local storage if fullChat was cleared
    if (type === 'fullChat') {
        localStorage.removeItem(config.storageKey);
        chatHistory = [];
    }
    
    // Show toast notification
    showToast('Spjallferill', 'Spjallferill hreinsaður', 'info');
}

/**
 * Save message to history
 * @param {string} sender - 'user' or 'assistant'
 * @param {string} message - Message text
 */
function saveMessageToHistory(sender, message) {
    // Create message object
    const messageObj = {
        sender,
        message,
        timestamp: new Date().toISOString()
    };
    
    // Add to history
    chatHistory.push(messageObj);
    
    // Limit history length
    if (chatHistory.length > config.maxHistory) {
        chatHistory = chatHistory.slice(-config.maxHistory);
    }
    
    // Save to localStorage
    try {
        localStorage.setItem(config.storageKey, JSON.stringify(chatHistory));
    } catch (error) {
        console.warn('Failed to save chat history:', error);
    }
}

/**
 * Load chat history from localStorage
 */
function loadChatHistory() {
    try {
        // Get history from localStorage
        const savedHistory = localStorage.getItem(config.storageKey);
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            
            // Display recent messages in both interfaces
            displayChatHistory();
        } else {
            // Initialize empty chat history
            chatHistory = [];
        }
    } catch (error) {
        console.warn('Failed to load chat history:', error);
        chatHistory = [];
    }
}

/**
 * Display chat history in both interfaces
 */
function displayChatHistory() {
    // Display only if there's history to show
    if (chatHistory.length === 0) return;
    
    // For full chat, show all messages or last 20
    if (chatElements.fullChat.container) {
        // Clear existing messages
        chatElements.fullChat.container.innerHTML = '';
        
        // Display messages (limit to last 20 to prevent performance issues)
        const messagesToShow = chatHistory.slice(-20);
        messagesToShow.forEach(item => {
            addMessageToChat('fullChat', item.sender, item.message);
        });
    }
    
    // For mini widget, show only last 5 messages
    if (chatElements.miniWidget.container) {
        // Clear existing messages
        chatElements.miniWidget.container.innerHTML = '';
        
        // Display only recent messages
        const recentMessages = chatHistory.slice(-5);
        recentMessages.forEach(item => {
            addMessageToChat('miniWidget', item.sender, item.message);
        });
    }
}

/**
 * Scroll container to bottom
 * @param {HTMLElement} container - Container element
 */
function scrollToBottom(container) {
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * Show toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning, info)
 */
function showToast(title, message, type = 'info') {
    // Check if toast container exists
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        // Create toast container
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Get icon based on type
    let iconClass;
    switch (type) {
        case 'success':
            iconClass = 'fa-check-circle';
            break;
        case 'error':
            iconClass = 'fa-times-circle';
            break;
        case 'warning':
            iconClass = 'fa-exclamation-triangle';
            break;
        default:
            iconClass = 'fa-info-circle';
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add close button handler
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
    }
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 5000);
}

// Export functions for global access if needed
window.NurseCareAI = {
    sendMessage,
    clearChat,
    showToast
};