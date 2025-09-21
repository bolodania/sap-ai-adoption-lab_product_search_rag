using {products as my} from '../db/schema.cds';


@path: '/service/genAI'
service GenAIService {
    entity ProductDetails as
        projection on my.IT_ACCESSORY_OPENAI_RMILLERYOUR_NUMBER
        excluding {
            VEC_VECTOR
        };

    action connectToGenAI(query : String,
                          chatModelName : String,
                          sdkName : String,
                          withRAG : Boolean) returns String;

}

annotate GenAIService with @requires: ['authenticated-user'];
