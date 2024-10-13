//define the destination created in BTP cockpit
const AI_CORE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION_HUB";

//define the API Version of the LLM model
const API_VERSION = process.env["AI_CORE_API_VERSION"] || "2024-08-06";

const tableName = 'CATALOG_UPDATED_DEV_1_DBADMIN';
const embeddingColumn = 'VEC_VECTOR';
const contentColumn = 'VEC_TEXT';

// const systemPrompt =
//     `
//     use the following pieces of context enclosed in triple quotes to answer the question at the end. If you don't know the answer,
//     just say you don't know, don't try to make up an answer. Format the results in a list of JSON items with the following keys:

//         "PRODUCT_ID", 
//         "PRODUCT_NAME",
//         "CATEGORY",
//         "DESCRIPTION",
//         "UNIT_PRICE",
//         "UNIT_MEASURE",
//         "SUPPLIER_ID",
//         "SUPPLIER_NAME",
//         "LEAD_TIME_DAYS",
//         "MIN_ORDER",
//         "CURRENCY",
//         "SUPPLIER_COUNTRY",
//         "SUPPLIER_ADDRESS",
//         "SUPPLIER_CITY",
//         "CITY_LAT",
//         "CITY_LONG",
//         "RATING"

//     The 'RATING' key value is an integer datatype ranging from 0 stars to 5 stars. Where 0 stars is 'bad' and 5 stars is 'excellent'.

//     Do not include json markdown codeblock syntax in the results for example: \`\`\`json\`\`\`.

//     Example of JSON data is: [{"color":"red","value":"#f00"},{"color":"green","value":"#0f0"}]

// `;

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
        "UNIT_MEASURE",
        "SUPPLIER_ID",
        "SUPPLIER_NAME",
        "LEAD_TIME_DAYS",
        "MIN_ORDER",
        "CURRENCY",
        "SUPPLIER_COUNTRY",
        "SUPPLIER_ADDRESS",
        "SUPPLIER_CITY",
        "CITY_LAT",
        "CITY_LONG",
        "RATING",
        "STATUS": AVAILAVLE
    \n
    mention in the end that the product is 'AVAILABLE'.
    \n
    Before providing the answer, please state that the answer is based on the information in SAP HANA Cloud.
    
`;

const systemPromptWithoutRAG =
    `
    use the following pieces of context enclosed in triple quotes to answer the question at the end. 
    Before providing the answer, please state that the answer is based on the information found on the Internet.
    
`;

async function connectToGenAIviaPlugin(query, modelName, withRAG) {

    const user_query = query;
    const topK = 15;
    const startDate = new Date();

    const capllmplugin = await cds.connect.to("cap-llm-plugin");

    console.log("***********************************************************************************************\n");

    //set the modeName you want
    const chatModelName = modelName;
    const embeddingModelName = "text-embedding-ada-002";

    console.log(`Leveraing the following LLMs \n Chat Model:  ` + modelName + `\n Embedding Model: text-embedding-ada-002\n`);

    //Obtain the model configs configured in package.json
    const chatModelConfig = cds.env.requires["gen-ai-hub"][chatModelName];
    const embeddingModelConfig = cds.env.requires["gen-ai-hub"][embeddingModelName];

    //parse the response object according to the respective model for your use case. For instance, lets consider the following three models.
    let chatCompletionResponse = null;

    if (withRAG) {

        console.log(`Received the request for RAG retrieval for the user query : ${user_query}\n`);

        /*Some models require you to pass few mandatory chat params, please check the respective model documentation to pass those params in the 'charParams' parameter. 
        For example, AWS anthropic models requires few mandatory parameters such as anthropic_version and max_tokens, the you will need to pass those parameters in the 'chatParams' parameter of getRagResponseWithConfig(). 
        */

        /*Single method to perform the following :
        - Embed the input query
        - Perform similarity search based on the user query 
        - Construct the prompt based on the system instruction and similarity search
        - Call chat completion model to retrieve relevant answer to the user query
        */
        console.log("Getting the RAG retrival response from the CAP LLM Plugin!");

        const chatRagResponse = await capllmplugin.getRagResponseWithConfig(
            user_query,  //user query
            tableName,   //table name containing the embeddings
            embeddingColumn, //column in the table containing the vector embeddings
            contentColumn, //  column in the table containing the actual content
            systemPrompt, // system prompt for the task
            embeddingModelConfig, //embedding model config
            chatModelConfig, //chat model config
            undefined, //Optional.conversation memory context to be used.
            topK  //Optional. topK similarity search results to be fetched. Defaults to 5
        );

        // console.log(chatRagResponse);

        // if (chatModelName === "gpt-4") {
        chatCompletionResponse =
        {
            "role": chatRagResponse.completion.choices[0].message.role,
            "content": chatRagResponse.completion.choices[0].message.content
        }

    } else {

        console.log(`Received the request for chat completion for the user query : ${user_query}\n`);

        const payloadLLM = {
            "messages": [
                {
                    "role": "user",
                    "content": systemPromptWithoutRAG + " ```" + user_query + "```"
                }
            ]
        }

        const chatResponse = await capllmplugin.getChatCompletionWithConfig(
            chatModelConfig, // config (object): The configuration for the model.
            payloadLLM // payload (object): The payload for the specific chat completion model.
        );

        // console.log(chatResponse);

        // if (chatModelName === "gpt-4") {
        chatCompletionResponse =
        {
            "role": chatResponse.choices[0].message.role,
            "content": chatResponse.choices[0].message.content
        }

        // console.log(chatCompletionResponse);
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

module.exports = { connectToGenAIviaPlugin };