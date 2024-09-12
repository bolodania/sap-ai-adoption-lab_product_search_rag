using {catalog as my} from '../db/schema.cds';


@path: '/service/genAI'
service GenAIService {
    entity ProductDetails as
        projection on my.UPDATED_DEV_1_DBADMIN
        excluding {
            VEC_VECTOR
        };

    action connectToGenAI(prompt : String,
                          limit : String,
                          withRAG : Boolean) returns String;

}

annotate GenAIService with @requires: ['authenticated-user'];
