const systemPrompt = `
    Use the following pieces of context to answer the question at the end. 
    If you don't know the answer, just say you don't know. Do not make up an answer.

    Format the results as a list of JSON items with these keys:
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
        - The 'RATING' must be an integer from 0 (bad) to 5 (excellent).
        - Do not include markdown or code blocks like \`\`\`json or any other explanations.
`;


const systemPromptWithoutRAG =
    `
    You are an AI assistant using public web information via SAP Generative AI Hub. 
    Use the information found on the Internet to answer the user's question accurately.

    If the information is not available online, respond clearly with:
    "I could not find reliable information on the Internet to answer this question."

    Before providing the final answer, begin with the sentence:
    "This answer is based on information found on the Internet."
    
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

    // console.log(chatRagResponse);

    let chatCompletionResponse = {
        "role": "assistant",
        "content": chatRagResponse.result
    }
    //Optional. handle memory after the RAG LLM call
    const responseDate = new Date();

    //build the response payload for the frontend.
    const response = {
        "role": chatCompletionResponse.role,
        "content": chatCompletionResponse.content,
        "duration": (responseDate - startDate) / 1000
        // "additionalContents": chatRagResponse.additionalContents,
    };

    // console.log(chatCompletionResponse);

    console.log("***********************************************************************************************\n");

    return response;
}

module.exports = { connectToGenAIHub };