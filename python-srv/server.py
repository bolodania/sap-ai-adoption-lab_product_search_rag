import os
import json
import atexit
from flask import Flask, request, jsonify
from hdbcli import dbapi
from dotenv import load_dotenv
from cfenv import AppEnv
from sap import xssec
import functools
from gen_ai_hub.proxy.langchain.openai import OpenAIEmbeddings, ChatOpenAI
from gen_ai_hub.proxy.gen_ai_hub_proxy import GenAIHubProxyClient
from ai_core_sdk.ai_core_v2_client import AICoreV2Client
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from langchain_community.vectorstores.hanavector import HanaDB

load_dotenv()

local_testing = True

with open(os.path.join(os.getcwd(), 'env_cloud.json')) as f:
    hana_env_c = json.load(f)

with open(os.path.join(os.getcwd(), 'env_config.json')) as f:
    aicore_config = json.load(f)

# Init the OpenAI embedding model
ai_core_client = AICoreV2Client(base_url=aicore_config['AICORE_BASE_URL'],
                            auth_url=aicore_config['AICORE_AUTH_URL'],
                            client_id=aicore_config['AICORE_CLIENT_ID'],
                            client_secret=aicore_config['AICORE_CLIENT_SECRET'],
                            resource_group=aicore_config['AICORE_RESOURCE_GROUP'])
    
        
proxy_client = GenAIHubProxyClient(ai_core_client = ai_core_client)
llm = ChatOpenAI(proxy_model_name='gpt-4o', proxy_client=proxy_client)
embedding_model = OpenAIEmbeddings(proxy_model_name='text-embedding-ada-002', proxy_client=proxy_client)

conn_db_api = dbapi.connect( 
    address=hana_env_c['url'],
    port=hana_env_c['port'], 
    user=hana_env_c['user'], 
    password=hana_env_c['pwd']   
)

db_ada_table = HanaDB(
    embedding=embedding_model, 
    connection=conn_db_api, 
    table_name="PRODUCTS_IT_ACCESSORY_ADA_"+ hana_env_c['user'],
    content_column="VEC_TEXT", # the original text description of the product details
    metadata_column="VEC_META", # metadata associated with the product details
    vector_column="VEC_VECTOR" # the vector representation of each product 
)

app = Flask(__name__)
env = AppEnv()

def process_data(data):
    try:
        inc_prompt = data["prompt"]

        prompt_template = f"{inc_prompt}" + """

            {context}

            question: {question}

            """

        PROMPT = PromptTemplate(template = prompt_template, 
                        input_variables=["context", "question"]
                       )
            
        chain_type_kwargs = {"prompt": PROMPT}

        question = "Suggest a keyboard with a rating 4 or more"
        retriever = db_ada_table.as_retriever(search_kwargs={'k':25})

        qa = RetrievalQA.from_chain_type(llm=llm,
                        retriever=retriever, 
                        chain_type="stuff",
                        chain_type_kwargs= chain_type_kwargs)

        answer = qa.invoke(question)

        return json.dumps(answer)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


def close_db_connection():
    if conn_db_api:
        conn_db_api.close()
        print("DB connection closed")

atexit.register(close_db_connection)

port = int(os.environ.get('PORT', 3000))
if not local_testing:
    uaa_service = env.get_service(name='product_search_rag_YOUR_NUMBER-uaa').credentials

# Authorization Decorator
def require_auth(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if not local_testing:
            if 'authorization' not in request.headers:
                return jsonify({"error": "You are not authorized to access this resource"}), 403
            
            access_token = request.headers.get('authorization')[7:]
            security_context = xssec.create_security_context(access_token, uaa_service)
            is_authorized = security_context.check_scope('uaa.resource')

            if not is_authorized:
                return jsonify({"error": "You are not authorized to access this resource"}), 403

        return f(*args, **kwargs)  # Call the original function if authorized

    return decorated_function

@app.route("/retrieveData", methods=["POST"])
@require_auth
def process_request():
    try:
        data = request.get_json()
        required_fields = ["prompt"]
        if not data or any(field not in data for field in required_fields):
            return jsonify({"error": "Invalid JSON input"}), 400
        
        result = process_data(data)
        if len(result) < 1:
            return jsonify({"error": "no suggestions could be retrieved"}), 400
        else:
            response = app.response_class(
                response=result,
                status=200,
                mimetype='application/json'
            )
            return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port)

