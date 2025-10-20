const systemPrompt =
    `
    use the following pieces of context enclosed in triple quotes to answer the question at the end. 
    If you don't know the answer, just say you don't know, don't try to make up an answer.
    \n
    If you asked to find an alternative for the product, provide the details with the following keys:

        "PRODUCT_ID", 
        "PRODUCT_NAME",
        "CATEGORY",
        "DESCRIPTION",
        "UNIT_PRICE",
        "CURRENCY",
        "SUPPLIER_ID",
        "SUPPLIER_NAME",
        "LEAD_TIME_DAYS",
        "MIN_ORDER",
        "SUPPLIER_COUNTRY",
        "SUPPLIER_ADDRESS",
        "SUPPLIER_CITY",
        "RATING",
        "STATUS"
    \n
    make sure that the "STATUS" of the product is 'AVAILABLE'
    \n
    explicitly mention in your response that the product is 'AVAILABLE'.
    \n
    Before providing the answer, please state that the answer is based on the information in SAP HANA Cloud.
    
`;

const systemPromptWithoutRAG =
    `
    use the following pieces of context enclosed in triple quotes to answer the question at the end. 
    Before providing the answer, please state that the answer is based on the information found on the Internet.
    
`;

async function connectToGenAIHub(query, modelName, withRAG) {

    console.log(withRAG);

    const user_query = query;
    const topK = 15;
    const startDate = new Date();

    console.log("***********************************************************************************************\n");

    //set the modeName you want
    const chatModelName = modelName;

    console.log(`Leveraing the following LLMs \n Chat Model:  ` + modelName + `\n Embedding Model: text-embedding-3-large\n`);

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