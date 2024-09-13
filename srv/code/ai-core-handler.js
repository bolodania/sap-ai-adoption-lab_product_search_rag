//define the destination created in BTP cockpit
const AI_CORE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION_HUB";

//define the API Version of the LLM model
const API_VERSION = process.env["AI_CORE_API_VERSION"] || "2024-02-01";

const tableName = 'CATALOG_UPDATED_DEV_1_DBADMIN';
const embeddingColumn = 'VEC_VECTOR';
const contentColumn = 'VEC_TEXT';

const systemPrompt =
    `
    use the following pieces of context enclosed in triple quotes to answer the question at the end. If you don't know the answer,
    just say you don't know, don't try to make up an answer. Format the results in a list of JSON items with the following keys:

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
        "RATING"
      
    The 'RATING' key value is an integer datatype ranging from 0 stars to 5 stars. Where 0 stars is 'bad' and 5 stars is 'excellent'.

    Do not include json markdown codeblock syntax in the results for example: \`\`\`json\`\`\`.

    Example of JSON data is: [{"color":"red","value":"#f00"},{"color":"green","value":"#0f0"}]
    
`;


async function connectToGenAI(prompt, limit, withRAG) {


    const resourceGroupId = "default";
    const headers = { "Content-Type": "application/json", "AI-Resource-Group": resourceGroupId };

    //connect to the Gen AI hub destination service  
    const aiCoreService = await cds.connect.to(AI_CORE_DESTINATION);

    //Get embeddings fom Gen AI hub based on the prompt
    const texts = prompt;

    //Enter the deployment id associated to the embedding model
    const embedDeploymentIdGenAI = "d258eabbf7964f3d";

    //Enter the deployment id associated to the chat/instruct model
    const llmDeploymentIdGenAI = "da47d6aa2e542dcf";

    //prepare the input data to be sent to Gen AI hub model       
    const payloadembed = {
        input: texts
    };

    //call Gen AI rest API via the desyination              
    const responseEmbed = await aiCoreService.send({
        // @ts-ignore
        query: `POST /inference/deployments/${embedDeploymentIdGenAI}/embeddings?api-version=${API_VERSION}`,
        data: payloadembed,
        headers: headers
    });


    //The embediing is retieved from the rest API
    const input = responseEmbed["data"][0]?.embedding;

    // console.log(input);


    //Get the embedding information from the vector table.
    const query = "SELECT TOP " + limit + " VEC_META,TO_VARCHAR(VEC_TEXT) as VEC_TEXT,COSINE_SIMILARITY(VEC_VECTOR, TO_REAL_VECTOR('[" + input + "]')) as SCORING FROM  CATALOG_UPDATED_DEV_1_DBADMIN ORDER BY COSINE_SIMILARITY(VEC_VECTOR, TO_REAL_VECTOR('[" + input + "]')) DESC";
    const result = await cds.run(query);

    console.log(result);

    //Pass the embedding to LLM to receive the explanation.


    var llmPrompt = null;
    var payload = {};
    var llmResponse = {};
    var finalResponse = { Response: [] };
    var regExpLinkURL = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm;
    var regExpLinkText = "(?<=>)(.*?)(?=</a>)";
    // //Loop through the 10 records and retrive the llm associated for them
    for (let i = 0; i < result.length; i++) {

        if (withRAG) {
            //Preparing the prompt for the LLM
            llmPrompt = "Provide one sentence explanation why the scalable asset with the following description: '" + result[i].VEC_TEXT + "' is suggested for the following user prompt: '" + texts + "'";

            payload = {
                model: "tiiuae--falcon-40b-instruct",
                max_tokens: 1024,
                prompt: llmPrompt
            };

            llmResponse = await aiCoreService.send({
                // @ts-ignore
                query: `POST /inference/deployments/${llmDeploymentIdGenAI}/completions?api-version=${API_VERSION}`,
                data: payload,
                headers: headers
            });

            // console.log(llmResponse);

        }
        // console.log(finalResponse);
        // finalResponse.Response.push({
        //     "asset_type": JSON.parse(result[i].VEC_META.toString()).asset_type,
        //     "focus_program": JSON.parse(result[i].VEC_META.toString()).focus_program,
        //     "focus_program_topic": JSON.parse(result[i].VEC_META.toString()).focus_program_topic,
        //     "title": JSON.parse(result[i].VEC_META.toString()).title,
        //     "link_full": JSON.parse(result[i].VEC_META.toString()).link,
        //     "link_url": JSON.parse(result[i].VEC_META.toString()).link.match(regExpLinkURL) !== null ? JSON.parse(result[i].VEC_META.toString()).link.match(regExpLinkURL)[0] : "#",
        //     "link_text": JSON.parse(result[i].VEC_META.toString()).link.match(regExpLinkText) !== null ? JSON.parse(result[i].VEC_META.toString()).link.match(regExpLinkText)[0] : "",
        //     "responsible": JSON.parse(result[i].VEC_META.toString()).responsible,
        //     "ieca_kpi": JSON.parse(result[i].VEC_META.toString()).ieca_kpi,
        //     "rollout_date": JSON.parse(result[i].VEC_META.toString()).rollout_date,
        //     "desc": result[i].VEC_TEXT,
        //     "scoring": parseFloat(result[i].SCORING).toFixed(5),
        //     "explanation": withRAG ? llmResponse["choices"][0].text : ""
        // })

    }
    return finalResponse;
}

async function connectToGenAIviaPlugin(query, limit) {

    const user_query = query;
    const topK = limit;

    const capllmplugin = await cds.connect.to("cap-llm-plugin");

    console.log("***********************************************************************************************\n");
    console.log(`Received the request for RAG retrieval for the user query : ${user_query}\n`);

    //set the modeName you want
    const chatModelName = "gpt-4";
    const embeddingModelName = "text-embedding-ada-002";

    console.log(`Leveraing the following LLMs \n Chat Model:  gpt-4 \n Embedding Model: text-embedding-ada-002\n`);

    //Obtain the model configs configured in package.json
    const chatModelConfig = cds.env.requires["gen-ai-hub"][chatModelName];
    const embeddingModelConfig = cds.env.requires["gen-ai-hub"][embeddingModelName];


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
        15  //Optional. topK similarity search results to be fetched. Defaults to 5
    );

    //parse the response object according to the respective model for your use case. For instance, lets consider the following three models.
    let chatCompletionResponse = null;
    if (chatModelName === "gpt-4") {
        chatCompletionResponse =
        {
            "role": chatRagResponse.completion.choices[0].message.role,
            "content": chatRagResponse.completion.choices[0].message.content
        }
    }
    //Optional. parse other model outputs if you choose to use a different model.
    else {
        throw new Error("The model supported in this application is 'gpt-4'. Please customize this application to use any model supported by CAP LLM Plugin. Please make the customization by referring to the comments.")
    }
    //Optional. handle memory after the RAG LLM call
    const responseTimestamp = new Date().toISOString();

    //build the response payload for the frontend.
    const response = {
        "role": chatCompletionResponse.role,
        "content": chatCompletionResponse.content,
        "messageTime": responseTimestamp,
        // "additionalContents": chatRagResponse.additionalContents,
    };

    console.log(response);

    console.log("***********************************************************************************************\n");
    responseJSONParsed = JSON.parse(response.content.replace(/\n/g, ''));

    console.log(responseJSONParsed);

    var finalResponse = { Response: [] };

    for (let i = 0; i < responseJSONParsed.length; i++) {
        finalResponse.Response.push(responseJSONParsed[i]);
    }

    return finalResponse;
}

module.exports = { connectToGenAI, connectToGenAIviaPlugin };