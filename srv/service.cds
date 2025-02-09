using {products as my} from '../db/schema.cds';


@path: '/service/genAI'
service GenAIService {
    entity ProductDetails as
        projection on my.IT_ACCESSORY_ADA_RMILLERYOUR_NUMBER
        excluding {
            VEC_VECTOR
        };

    action connectToGenAI(prompt : String,
                          chatModelName : String,
                          withRAG : Boolean) returns String;

}

annotate GenAIService with @requires: ['authenticated-user'];
