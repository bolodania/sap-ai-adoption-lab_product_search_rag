const systemPrompt = `
    Use the context below to answer the question. Do not make up answers; if unknown, say "I don't know."

    Output strictly as a JSON array with these keys:
        - "PRODUCT_ID"
        - "PRODUCT_NAME"
        - "CATEGORY"
        - "DESCRIPTION"
        - "UNIT_PRICE"
        - "SUPPLIER_ID"
        - "SUPPLIER_NAME"
        - "LEAD_TIME_DAYS"
        - "MIN_ORDER"
        - "CURRENCY"
        - "SUPPLIER_COUNTRY"
        - "SUPPLIER_ADDRESS"
        - "STATUS"
        - "SUPPLIER_CITY"
        - "STOCK_QUANTITY"
        - "MANUFACTURER"
        - "RATING"

    Note:
        - Be concise.
        - The 'RATING' must be an integer from 0 (bad) to 5 (excellent).
        - Do not include markdown or code blocks like \`\`\`json or any other explanations.
`;


const systemPromptWithoutRAG = `
    You are an AI assistant using public web information via SAP Generative AI Hub.

    Instructions:
    - Answer based on online information only
    - If information is missing, respond: 
        "I could not find reliable information on the Internet to answer this question."
    - Begin your answer with:
        "This answer is based on information found on the Internet."
    - Provide only the final answer; no explanations or markdown
    `;

async function connectToGenAIHub(query, modelName, withRAG) {

    console.log(withRAG);

    const user_query = query;
    const topK = 15;
    const startDate = new Date();

    console.log("***********************************************************************************************\n");

    //set the modeName you want
    const chatModelName = modelName;

    console.log(`Leveraging the following LLMs \n Chat Model:  ` + modelName + `\n Embedding Model: text-embedding-3-large\n`);

    const pythonSrvDestination = cds.env.requires["PythonSrvDestination"];

    const destService = await cds.connect.to(pythonSrvDestination);

    const payload = {
        withRAG: withRAG, // is RAG request or not
        query: user_query, //user query
        prompt: withRAG ? systemPrompt : systemPromptWithoutRAG, // system prompt for the task
        chatModelName: chatModelName, //chat model name
        topK: topK  // topK similarity search results to be fetched
    };

    console.log(payload);

    const headers = {
        "Content-Type": "application/json"
    };

    const chatRagResponse = await destService.send({
        query: `POST /retrieveData`,
        data: payload,
        headers: headers,
    });

    console.log(chatRagResponse);

    //build the response payload for the frontend.
    const response = {
        "role": "assistant",
        "content": withRAG ? JSON.stringify(chatRagResponse, null, 2): chatRagResponse,
        "duration": (new Date() - startDate) / 1000
    };

    // console.log(chatCompletionResponse);

    console.log("***********************************************************************************************\n");

    return response;
}

module.exports = { connectToGenAIHub };