//define the destination created in BTP cockpit
const AI_CORE_DESTINATION = "PROVIDER_AI_CORE_DESTINATION_HUB";

//define the API Version of the LLM model
const API_VERSION = process.env["AI_CORE_API_VERSION"] || "2024-02-01";

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

module.exports = { connectToGenAI };