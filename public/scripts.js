// Button selection functions
function selectOption(groupId, button, value) {
    const buttons = document.getElementById(groupId).getElementsByTagName('button');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('selected');
    }
    button.classList.add('selected');
}

function toggleOption(groupId, button, value) {
    button.classList.toggle('selected');
}

function getSelectedValue(groupId) {
    const buttons = document.getElementById(groupId).getElementsByTagName('button');
    const selected = [];
    for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].classList.contains('selected')) {
            const buttonData = {
                text: buttons[i].innerText,
                brand: buttons[i].getAttribute('data-brand') || null,
                performance: buttons[i].getAttribute('data-performance') || null,
                offset: buttons[i].getAttribute('data-offset') || null
            };
            selected.push(buttonData);
        }
    }
    return selected.length === 1 ? selected[0] : selected;
}

async function calculateRecommendation() {
    // Show the loading overlay
    const loadingText = document.querySelector("#loadingOverlay p");
    document.getElementById("loadingOverlay").style.display = "flex";

    // Update message: User submitted inputs
    loadingText.textContent = "Thank you! We're starting to process your inputs now.";

    const data = {
        brandName: document.getElementById('brandName').value,
        sector: getSelectedValue('sector'),
        purchaseMethod: getSelectedValue('purchaseMethod'),
        pricingStrategy: getSelectedValue('pricingStrategy'),
        innovationLevel: getSelectedValue('innovationLevel'),
        brandStage: getSelectedValue('brandStage'),
        brandSize: getSelectedValue('brandSize'),
        context: document.getElementById('additionalContext').value
    };

    // Log inputs being sent to calculator assistant
    console.log("📥 Inputs sent to Calculator Assistant:", {
        timestamp: new Date().toISOString(),
        data: JSON.stringify(data, null, 2)
    });

    try {
        loadingText.textContent = "Analyzing your inputs and running calculations to determine the best strategy...";
        const response = await axios.post('/api/generate', data, { timeout: 45000 });
        console.log("Server API Response:", response.data);
        loadingText.textContent = "Crunching the numbers... calculations are complete!";
        displayRecommendation(response.data);

    } catch (error) {
        console.error("Error during API calls:", error);
        if (error.response) {
             console.error("❌ API Error Response:", error.response.data);
           showCustomError(`Error: ${error.response.data.message || "Unknown error."}`);
        } else {
            showCustomError("Unexpected error occurred. Please try again.");
        }
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

function displayRecommendation(responseData) {
    console.log("API Response Data:", responseData);
    
    // Extract the last assistant message
    const assistantMessages = responseData.messages
        .filter(msg => msg.role === "assistant")
        .sort((a, b) => b.created_at - a.created_at);

    let content;
    if (assistantMessages.length > 0) {
        try {
            // Get the text content from the message
            content = assistantMessages[0].content[0].text.value;
            // Try to parse it as JSON if it's in JSON format
            try {
                content = JSON.parse(content);
            } catch (e) {
                // If it's not JSON, use the text as-is
                console.log("Content is not JSON, using raw text");
            }
        } catch (e) {
            console.error("Error processing message content:", e);
            content = {
                recommendation: "Error processing recommendation",
                rationale: "Unable to process the assistant's response."
            };
        }
    } else {
        content = {
            recommendation: "No recommendation available",
            rationale: "The assistant did not provide a response."
        };
    }
    
    const recommendationContent = document.getElementById('recommendationContent');
    
    const htmlContent = `
        <h1>Recommendation</h1>
        <p>${content.recommendation || "No recommendation provided."}</p>
        
        <h2>Rationale</h2>
        <p>${content.rationale || "No rationale provided."}</p>
        
        <h2>Data Methodology</h2>
         <p>${content.dataMethodology || content.data_methodology || "No data methodology provided."}</p>
        
        <h2>The Argument</h2>
        <p>${content.argument || "No argument provided."}</p>
        
        <h2>Pros</h2>
        <ul>${(content.pros || []).map(pro => `<li>${pro}</li>`).join('') || "<li>No pros provided.</li>"}</ul>
        
        <h2>Cons</h2>
        <ul>${(content.cons || []).map(con => `<li>${con}</li>`).join('') || "<li>No cons provided.</li>"}</ul>

        <h1>Alternative Approach</h1>
        <p>${content.alternative || content.alternativeApproach || "No alternative approach provided."}</p>
    `;

    recommendationContent.innerHTML = htmlContent;
    document.getElementById('resultCard').style.display = 'block';
        setTimeout(() => {
        document.getElementById('resultCard').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, 100);
}

function showCustomError(message) {
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 0, 0, 0.1);
        backdrop-filter: blur(10px);
        padding: 15px;
        border-radius: 8px;
        color: white;
        z-index: 1000;
        max-width: 500px;
    `;

    errorContainer.innerHTML = `
        <p style="margin: 0; white-space: pre-wrap;">${message}</p>
        <button onclick="this.parentElement.remove()" 
                style="background: rgba(255,255,255,0.2); border: none; 
                       color: white; padding: 5px 10px; margin-top: 10px; 
                       border-radius: 4px; cursor: pointer;">
            Close
        </button>
    `;

    document.body.appendChild(errorContainer);
}