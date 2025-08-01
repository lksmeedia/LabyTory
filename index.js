// Import necessary packages
const express = require('express');
const { VertexAI, HarmCategory, HarmBlockThreshold } = require('@google-cloud/vertexai');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Add a default route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Define the API endpoint that the frontend will call
app.post('/generate-adventure', async (req, res) => {
    try {
        // --- MODIFICATION: Initialize the client and model INSIDE the handler ---
        const credentials = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'base64').toString('utf-8'));

        const vertex_ai = new VertexAI({
            project: process.env.GOOGLE_PROJECT_ID,
            location: 'us-central1',
            credentials,
        });

        const model = vertex_ai.getGenerativeModel({
            model: 'gemini-1.5-pro-latest',
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
            ],
        });
        // --- End of modification ---

        const { system, players, experience, genre, tone, concept } = req.body;

        const prompt = `
            Create a complete, professionally formatted TTRPG adventure module.
            The final output should be in Markdown format.
            **Adventure Parameters:**
            - **Game System:** ${system}
            - **Number of Players:** ${players}
            - **Player Experience Level:** ${experience}
            - **Genre:** ${genre}
            - **Tone:** ${tone}
            - **Core Concept:** ${concept}
        `;

        const request = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        };

        const streamResult = await model.generateContentStream(request);

        let adventureText = '';
        for await (const chunk of streamResult.stream) {
            if (chunk.candidates && chunk.candidates.length > 0 && chunk.candidates[0].content.parts.length > 0) {
                adventureText += chunk.candidates[0].content.parts[0].text;
            }
        }

        res.json({ adventureText });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ error: 'Failed to generate adventure content.' });
    }
});

// Export the app for Vercel to handle
module.exports = app;