import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';

const app = express();
const port = 5001;

app.use(cors());
app.use(express.json());

// Initialize the LLaMA model
const model = new LlamaModel({
    modelPath: 'C:\\Users\\varun\\Desktop\\ProjectSem02\\MyChatBot\\models\\mistral-7b-instruct-v0.2.Q8_0.gguf',
    contextSize: 2048,
    threads: 7
});
const context = new LlamaContext({ model });

// Store chat sessions
const chatSessions = new Map();

function postProcess(text) {
    return text.trim();
}

app.post('/ask', async (req, res) => {
    try {
        const { input, sessionId } = req.body;

        // Get or create a chat session
        let session = chatSessions.get(sessionId);
        if (!session) {
            session = new LlamaChatSession({ context });
            chatSessions.set(sessionId, session);
        }

        const prompt = `Human: ${input}\n\nAssistant:`;

        const response = await session.prompt(prompt, {
            maxTokens: 450,
            temperature: 0.28,
            topP: 0.95,
            stop: ['Human:', 'Assistant:', '\n\n']
        });

        const finalText = postProcess(response);
        res.json({ response: finalText });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

app.post('/clear-chat', (req, res) => {
    const { sessionId } = req.body;
    chatSessions.delete(sessionId);
    res.json({ success: true, message: 'Chat session cleared' });
});

app.post('/send_email', async (req, res) => {
    const { email, chat_history } = req.body;

    // Email configuration
    const transporter = nodemailer.createTransport({
        host: 'smtp.elasticemail.com',
        port: 2525,
        auth: {
            user: 'thisistest36@gmail.com',
            pass: '56E262B8DBE6A9146F7062A9016548F7E80C'
        }
    });

    const mailOptions = {
        from: 'thisistest36@gmail.com',
        to: email,
        subject: 'Your Chat History',
        text: `Here's your chat history:\n\n${chat_history}`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'An error occurred while sending the email.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});