// Import necessary packages
const express = require('express');
const { VertexAI, HarmCategory, HarmBlockThreshold } = require('@google-cloud/vertexai');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for job statuses.
const jobStorage = {};

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Define the API endpoint that the frontend will call
app.post('/generate-adventure', async (req, res) => {
    const jobId = uuidv4();
    jobStorage[jobId] = { status: 'processing', data: null };

    // Respond to the client immediately
    res.status(202).json({ jobId });

    // --- Perform the long-running task in the background ---
    try {
        // MODIFICATION: Initialize the client and model INSIDE the handler
        const vertex_ai = new VertexAI({
            project: process.env.GOOGLE_PROJECT_ID,
            location: 'us-central1',
        });

        const model = vertex_ai.getGenerativeModel({
            model: 'gemini-1.5-pro-001',
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
            **Adventure Parameters:**
            - **Game System:** ${system}
            - **Number of Players:** ${players}
            - **Player Experience Level:** ${experience}
            - **Genre:** ${genre}
            - **Tone:** ${tone}
            - **Core Concept:** ${concept}
        `;
        const request = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
        const streamResult = await model.generateContentStream(request);

        let adventureText = '';
        for await (const chunk of streamResult.stream) {
            if (chunk.candidates && chunk.candidates.length > 0 && chunk.candidates[0].content.parts.length > 0) {
                adventureText += chunk.candidates[0].content.parts[0].text;
            }
        }

        jobStorage[jobId] = { status: 'complete', data: adventureText };

    } catch (error) {
        console.error('Error in background generation:', error);
        jobStorage[jobId] = { status: 'failed', data: 'Failed to generate adventure content.' };
    }
});

// NEW ENDPOINT: This endpoint checks the status of a job
app.get('/status/:jobId', (req, res) => {
    const jobId = req.params.jobId;
    const job = jobStorage[jobId];
    if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
    }
    res.json(job);
});

// The app.listen() block is crucial for Cloud Run
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});