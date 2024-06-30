document.addEventListener('DOMContentLoaded', function () {
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const clearBtn = document.getElementById('clear-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const newChatBtn = document.getElementById('new-chat-btn');
    const sidebarChats = document.getElementById('sidebar-chats');
    const showEmailBtn = document.getElementById('show-email-btn');
    const emailForm = document.getElementById('email-form');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const userEmailInput = document.getElementById('user-email');

    let chatHistory = [];
    let currentChatIndex = -1;
    let isProcessing = false;

    function createNewChat() {
        if (isProcessing) {
            alert("Please wait for the current response to finish processing.");
            return;
        }

        if (chatHistory.length >= 3) {
            alert("You've reached the maximum number of chats. Please clear a chat to create a new one.");
            return;
        }

        currentChatIndex = chatHistory.length;
        chatHistory.push({ messages: [], element: null });
        updateChatList();
        resetChatContainer();
        showWelcomeScreen();
        attachSuggestionListeners();
    }

    function updateChatList() {
        sidebarChats.innerHTML = '';
        chatHistory.forEach((chat, index) => {
            const chatEntry = document.createElement('div');
            chatEntry.className = 'chat-history-entry';
            chatEntry.textContent = `Chat ${index + 1}`;
            if (index === currentChatIndex) {
                chatEntry.classList.add('active');
            }
            chatEntry.addEventListener('click', () => switchToChat(index));
            sidebarChats.appendChild(chatEntry);
        });
    }

    function switchToChat(index) {
        if (index === currentChatIndex || isProcessing) return;

        if (currentChatIndex !== -1) {
            chatHistory[currentChatIndex].element = chatContainer.cloneNode(true);
        }

        currentChatIndex = index;
        resetChatContainer();

        if (chatHistory[index].element) {
            chatContainer.innerHTML = chatHistory[index].element.innerHTML;
        } else {
            if (chatHistory[index].messages.length === 0) {
                showWelcomeScreen();
            } else {
                hideWelcomeScreen();
                chatHistory[index].messages.forEach(msg => appendMessage(msg.sender, msg.content));
            }
        }

        updateChatList();
        attachSuggestionListeners();
    }

    function resetChatContainer() {
        chatContainer.innerHTML = '';
        showWelcomeScreen();
    }

    function showWelcomeScreen() {
        welcomeScreen.style.display = 'block';
        chatContainer.appendChild(welcomeScreen);
    }

    function hideWelcomeScreen() {
        welcomeScreen.style.display = 'none';
        if (welcomeScreen.parentNode === chatContainer) {
            chatContainer.removeChild(welcomeScreen);
        }
    }

    function sendMessage() {
        if (isProcessing) return;

        const message = userInput.value.trim();
        if (message) {
            if (currentChatIndex === -1) {
                createNewChat();
            }
            hideWelcomeScreen();
            appendMessage('user', message);
            chatHistory[currentChatIndex].messages.push({ sender: 'user', content: message });
            fetchResponse(message);
            userInput.value = '';
        }
    }

    function appendMessage(sender, message) {
        hideWelcomeScreen();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.style.backgroundImage = `url('${sender === 'user' ? 'user.png' : 'bot.png'}')`;

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        if (sender === 'bot') {
            const formattedMessage = formatBotMessage(message);
            messageContent.innerHTML = formattedMessage;
        } else {
            messageContent.textContent = message;
        }

        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        const now = new Date();
        timestamp.textContent = now.toLocaleTimeString();

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timestamp);

        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function formatBotMessage(message) {
        const lines = message.split('\n');
        let formattedMessage = '';
        let inList = false;
        let listType = '';

        lines.forEach((line, index) => {
            line = line.trim();
            if (line.startsWith('**') && line.endsWith('**')) {
                formattedMessage += `<h3>${line.replace(/\*\*/g, '')}</h3>`;
            } else if (line.match(/^\d+\./)) {
                if (!inList || listType !== 'ol') {
                    if (inList) formattedMessage += `</${listType}>`;
                    formattedMessage += '<ol>';
                    inList = true;
                    listType = 'ol';
                }
                formattedMessage += `<li>${line.replace(/^\d+\./, '').trim()}</li>`;
            } else if (line.startsWith('- ')) {
                if (!inList || listType !== 'ul') {
                    if (inList) formattedMessage += `</${listType}>`;
                    formattedMessage += '<ul>';
                    inList = true;
                    listType = 'ul';
                }
                formattedMessage += `<li>${line.substring(2)}</li>`;
            } else if (line.includes(':')) {
                const [subtitle, content] = line.split(':');
                formattedMessage += `<h4>${subtitle.trim()}:</h4><p>${content.trim()}</p>`;
            } else if (line !== '') {
                if (inList) {
                    formattedMessage += `</${listType}>`;
                    inList = false;
                }
                formattedMessage += `<p>${line}</p>`;
            }
        });

        if (inList) {
            formattedMessage += `</${listType}>`;
        }

        return formattedMessage;
    }

    function showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message loading';
        loadingDiv.innerHTML = '<div class="avatar" style="background-image: url(\'bot.png\');"></div><div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return loadingDiv;
    }

    function setProcessingState(processing) {
        isProcessing = processing;
        userInput.disabled = processing;
        sendBtn.disabled = processing;
        newChatBtn.disabled = processing;
        clearBtn.disabled = processing;
        document.querySelectorAll('.suggestion-btn').forEach(btn => btn.disabled = processing);
    }

    function fetchResponse(message) {
        const loadingIndicator = showLoadingIndicator();
        setProcessingState(true);

        fetch('http://localhost:5001/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: message }),
        })
            .then(response => response.json())
            .then(data => {
                chatContainer.removeChild(loadingIndicator);
                if (data.response) {
                    appendMessage('bot', data.response);
                    chatHistory[currentChatIndex].messages.push({ sender: 'bot', content: data.response });
                } else {
                    appendMessage('bot', 'Sorry, I encountered an error.');
                    chatHistory[currentChatIndex].messages.push({ sender: 'bot', content: 'Sorry, I encountered an error.' });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                chatContainer.removeChild(loadingIndicator);
                appendMessage('bot', 'Sorry, I encountered an error.');
                chatHistory[currentChatIndex].messages.push({ sender: 'bot', content: 'Sorry, I encountered an error.' });
            })
            .finally(() => {
                setProcessingState(false);
            });
    }

    function attachSuggestionListeners() {
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                if (isProcessing) return;
                const suggestionText = this.textContent;
                userInput.value = suggestionText;
                sendMessage();
            });
        });
    }

    function formatChatHistory() {
        let formattedChat = "";
        chatHistory[currentChatIndex].messages.forEach(msg => {
            formattedChat += `${msg.sender === 'user' ? 'User' : 'Bot'}: ${msg.content}\n\n`;
        });
        return formattedChat;
    }

    function sendChatEmail() {
        const userEmail = userEmailInput.value;
        if (!userEmail) {
            alert("Please enter your email address.");
            return;
        }

        const formattedChat = formatChatHistory();

        fetch('http://localhost:5001/send_email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: userEmail, chat_history: formattedChat }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Chat history sent to your email!");
                    emailForm.classList.add('hidden');
                    userEmailInput.value = '';
                } else {
                    alert("Failed to send email. Please try again.");
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert("An error occurred while sending the email.");
            });
    }

    sendBtn.addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    clearBtn.addEventListener('click', function () {
        if (isProcessing) return;

        if (currentChatIndex !== -1) {
            chatHistory.splice(currentChatIndex, 1);
            if (chatHistory.length > 0) {
                currentChatIndex = 0;
                switchToChat(0);
            } else {
                currentChatIndex = -1;
                resetChatContainer();
                showWelcomeScreen();
            }
            updateChatList();
        }
    });

    themeToggle.addEventListener('click', function () {
        document.body.classList.toggle('dark-mode');
        const icon = this.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.replace('fa-moon', 'fa-sun');
            this.innerHTML = '<i class="fas fa-sun"></i> Light mode';
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            this.innerHTML = '<i class="fas fa-moon"></i> Dark mode';
        }


    });
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
        icon.classList.replace('fa-moon', 'fa-sun');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light mode';
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark mode';
    }

    newChatBtn.addEventListener('click', createNewChat);

    showEmailBtn.addEventListener('click', function () {
        emailForm.classList.toggle('hidden');
    });

    sendChatBtn.addEventListener('click', sendChatEmail);

    // Initialize with a new chat
    createNewChat();
});