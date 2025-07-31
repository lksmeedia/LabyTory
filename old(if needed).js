// Import necessary packages
const express = require('express');
const { VertexAI, HarmCategory, HarmBlockThreshold } = require('@google-cloud/vertexai');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors()); // Middleware to handle Cross-Origin Resource Sharing
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

// Initialize VertexAI with project and location from environment variables
const vertex_ai = new VertexAI({
    project: process.env.GOOGLE_PROJECT_ID,
    location: 'us-central1', // IMPORTANT: Ensure this is a region where Gemini 2.5 Pro is available
});

// Define the model configuration
const model = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-pro', // Using a specific, stable version name is often safer
});

// Define the API endpoint that the frontend will call
app.post('/generate-adventure', async (req, res) => {
    try {
        const { system, players, experience, genre, tone, concept } = req.body;

        // Craft a detailed prompt for the Gemini model
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
            - **minimum length: 5 a4 pages

            **Required Structure:**
            1.  **# Title:** Come up with a creative title for the adventure.
            2.  **## Adventure Synopsis:** A short summary for the Game Master.
            3.  **## Player Hooks:** Provide three distinct plot hooks to get the players involved.
            4.  **## Key Scenes & Encounters:** Detail the main sequence of events. Include balanced combat, social, and exploration challenges.
            5.  **## Key NPCs and Monsters:** List important characters and creatures with brief descriptions. If the system is D&D 5e or Pathfinder, include mechanically appropriate stat blocks.
            6.  **## Maps & Artwork Ideas:** Describe key map locations (e.g., "A two-story tavern with a secret basement") and character art concepts.
            7.  **## Conclusion:** Describe how the adventure might conclude and potential rewards for the players.
        `;

        // Create the request object with the prompt and safety settings
        const request = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
            ],
        };

        // Call the API with the complete request object
        const result = await model.generateContent(request);

        // Extract the text from the response
        const response = result.response;
        const adventureText = response.candidates[0].content.parts[0].text;

        // Send the generated text back to the frontend
        res.json({ adventureText });

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ error: 'Failed to generate adventure content.' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});