import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { LlamaModel, LlamaContext, LlamaChatSession } from 'node-llama-cpp';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = 5001;

app.use(cors());
app.use(express.json());

// Initialize the LLaMA model
const model = new LlamaModel({
    modelPath: 'C:\\Users\\user\\Desktop\\Projects\\MainGPT\\models\\mistral-7b-instruct-v0.2.Q2_K.gguf',
    contextSize: 2048,
    threads: 8
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

        const prompt = `Human: ${input}\n\nAssistant(Response < 200 words):`;

        const response = await session.prompt(prompt, {
            maxTokens: 450,
            temperature: 0.28,
            topP: 0.95,
            stop: ['Human:', 'Assistant:', 'Assistant(Response < 200 words):', '\n\n']
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
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your LocalGPT Chat History',
        text: `Here's your chat history:\n\n${chat_history}`
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.error('Error sending email:', error);
            res.status(500).json({ error: 'An error occurred while sending the email.' });
        } else {
            console.log('Email sent: ' + info.response);
            res.json({ success: true });
        }
    });
});

app.listen(port, () => {
    console.log(`LocalGPT server running at http://localhost:${port}`);
});
