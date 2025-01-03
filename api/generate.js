const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/generate', async (req, res) => {
    try {
        const data = req.body;
        console.log("Received input data:", data);

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
             console.error("OPENAI_API_KEY not set.");
            return res.status(500).send({ error: 'Server configuration error: OPENAI_API_KEY not set.' });
        }

        // Step 1: Create a thread for the Calculator Assistant
        console.log("Step 1: Creating thread for Calculator Assistant.");
        const threadResponse = await axios.post(
            `https://api.openai.com/v1/threads`,
            { messages: [{ role: "user", content: JSON.stringify(data) }] },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                    "OpenAI-Beta": "assistants=v2"
                },
                 timeout: 45000,
            }
        );
        const threadId = threadResponse.data.id;
          console.log(`Step 1 completed. Thread ID: ${threadId}`);


        // Step 2: Run the Calculator Assistant within the thread and wait for completion
          console.log(`Step 2: Running Calculator Assistant in thread: ${threadId}`);
       const calculatorRun = await runAndWaitForCompletion(threadId, "asst_y2AJhkbigYS1E7CXNL3RJ9rD", OPENAI_API_KEY);
         // Log calculator assistant output
        console.log("📊 Calculator Assistant Output:", {
            timestamp: new Date().toISOString(),
            threadId: threadId,
            calculatorRun: JSON.stringify(calculatorRun, null, 2)
        });


        // Step 3: Create a thread for the Copywriter Assistant using calculator output
        console.log("Step 3: Creating thread for Copywriter Assistant.");
       const copywriterThreadResponse = await axios.post(
            `https://api.openai.com/v1/threads`,
            { messages: [{ role: "user", content: JSON.stringify(calculatorRun) }] },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                    "OpenAI-Beta": "assistants=v2"
                },
                 timeout: 45000,
            }
        );
        const copywriterThreadId = copywriterThreadResponse.data.id;
         console.log(`Step 3 completed. Copywriter thread ID: ${copywriterThreadId}`);

        // Step 4: Run the Copywriter Assistant within the thread and wait for completion
          console.log(`Step 4: Running Copywriter Assistant in thread: ${copywriterThreadId}`);
        const copywriterRun = await runAndWaitForCompletion(copywriterThreadId, "asst_H0bhe5t5cYQClvAkyl7qMQmJ", OPENAI_API_KEY);
         // Log copywriter assistant output
        console.log("✍️ Copywriter Assistant Output:", {
            timestamp: new Date().toISOString(),
            threadId: copywriterThreadId,
            copywriterRun: JSON.stringify(copywriterRun, null, 2)
        });


        res.json(copywriterRun);
       console.log("Response sent successfully");
    } catch (error) {
        console.error("Error in /api/generate:", error);
        if (error.response) {
           console.error("API error details:", error.response.data);
             return res.status(500).json({ error: error.response.data });
         } else {
            console.error("Detailed Error Message:", error.message);
             return res.status(500).json({ error: `Internal server error: ${error.message}` });
        }
    }
});

async function runAndWaitForCompletion(threadId, assistantId, OPENAI_API_KEY) {
    let status = "unknown";
    let runId = "unknown";
    try {
        // Create the run
         console.log(`Creating run with assistant ${assistantId} for thread: ${threadId}`);
         const runResponse = await axios.post(
            `https://api.openai.com/v1/threads/${threadId}/runs`,
            { assistant_id: assistantId },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                    "OpenAI-Beta": "assistants=v2"
                },
                 timeout: 45000,
            }
        );
       runId = runResponse.data.id;
          status = runResponse.data.status;
         console.log(`Run created with id: ${runId}, status: ${status}`);

        const maxRetries = 120;
        const delay = 2000;
        let attempts = 0;

        while ((status === "queued" || status === "in_progress") && attempts < maxRetries) {
            console.log(`Polling run status... Attempt ${attempts + 1}, Current status: ${status}, runID: ${runId}`);
           await new Promise(resolve => setTimeout(resolve, delay));


           const pollResponse = await axios.get(
                `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
                {
                   headers: {
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                        "Content-Type": "application/json",
                        "OpenAI-Beta": "assistants=v2"
                    },
                     timeout: 45000,
                 }
           );

            status = pollResponse.data.status;
            console.log(`Updated status: ${status}, runID: ${runId}`);

           if (status === "completed") {
                 console.log("Run completed successfully.", `runID: ${runId}`);
                // Get the messages after completion
                const messagesResponse = await axios.get(
                    `https://api.openai.com/v1/threads/${threadId}/messages`,
                    {
                       headers: {
                            Authorization: `Bearer ${OPENAI_API_KEY}`,
                            "Content-Type": "application/json",
                             "OpenAI-Beta": "assistants=v2"
                        },
                         timeout: 45000,
                    }
                );
                // Return both the run data and the messages
                return {
                    run: pollResponse.data,
                    messages: messagesResponse.data.data
                };

           } else if (status === "failed") {
                console.error("Run failed:", pollResponse.data.last_error);
                 throw new Error(`Run failed: ${pollResponse.data.last_error?.message || "Unknown error."}, runID: ${runId}`);
             } else if (status === "requires_action") {
                console.error("Run requires action - not implemented, runID: ${runId}");
                 throw new Error(`Run requires action - tool calls not implemented, runID: ${runId}`);
            }
            attempts++;
        }
         if (status !== "completed") {
            throw new Error(`Run timed out. Final status: ${status}, runID: ${runId}`);
        }
    } catch (error) {
         console.error("Error in runAndWaitForCompletion:", error.message, "runID", runId, "status:", status)
        throw error
    }
}
// Start server locally
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});