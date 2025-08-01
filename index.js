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

// MODIFICATION: Manually parse the credentials from the environment variable
const credentialsJson = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
const vertex_ai = new VertexAI({
    project: process.env.GOOGLE_PROJECT_ID,
    location: 'us-central1',
    credentials: {
        client_email: credentialsJson.client_email,
        private_key: credentialsJson.private_key,
    }
});

// Define the model configuration
const model = vertex_ai.getGenerativeModel({
    model: 'gemini-1.5-pro-latest',
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
    ],
});

// Add a default route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Define the API endpoint that the frontend will call
app.post('/generate-adventure', async (req, res) => {
    try {
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

            **Required Structure:**
            1.  **# Title:** Come up with a creative title for the adventure.
            2.  **## Adventure Synopsis:** A short summary for the Game Master.
            3.  **## Player Hooks:** Provide three distinct plot hooks to get the players involved.
            4.  **## Key Scenes & Encounters:** Detail the main sequence of events.
            5.  **## Key NPCs and Monsters:** List important characters and creatures.
            6.  **## Maps & Artwork Ideas:** Describe key map locations.
            7.  **## Conclusion:** Describe how the adventure might conclude.
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