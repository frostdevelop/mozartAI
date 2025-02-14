import torch
import flask
import pymongo
import os
from datasets import load_dataset
from transformers import AutoModelForCausalLM,AutoTokenizer,BitsAndBytesConfig
from flask import request, jsonify, abort
from functools import wraps
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.mozart")

#model_id = "meta-llama/Meta-Llama-3-8B-Instruct"
model_id = "MOZART"
system = "You are MOZARTAI, a friendly AI tutoring chatbot. Answer the following questions and ask questions to quiz the user on the topic." 

quantConf = BitsAndBytesConfig(
   load_in_4bit=True,
   bnb_4bit_quant_type="nf4",
   bnb_4bit_use_double_quant=True,
   bnb_4bit_compute_dtype=torch.bfloat16
)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map='auto',
    quantization_config=quantConf,
    use_cache=True,
    torch_dtype=torch.bfloat16,
    attn_implementation="flash_attention_2"
)

#model = model.to_bettertransformer()
model = model.to('cuda').eval()
#model.generation_config.cache_implementation = 'static'
model = torch.compile(model,mode='reduce-overhead',fullgraph=True)
#model.forward = torch.compile(model.forward,mode='reduce-overhead',fullgraph=True)

tokenizer = AutoTokenizer.from_pretrained(model_id)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

def resGen(model,prompt):
	tkinput = tokenizer(prompt, return_tensors="pt", add_special_tokens=True).to("cuda")
	res = model.generate(**tkinput,max_new_tokens=1024,do_sample=True,pad_token_id=tokenizer.eos_token_id)
	dres = tokenizer.batch_decode(res)
	return dres[0].replace(prompt,"")

def formatInp(input):
    return "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"+system+"<|eot_id|><|start_header_id|>user<|end_header_id|>\n"+input+"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"

def formatMsg(input):
    return "<|start_header_id|>user<|end_header_id|>\n"+input+"<|eot_id|>"

def formatRes(input):
    return "<|start_header_id|>assistant<|end_header_id|>\n"+input+"<|eot_id|>"
    

mDBclient = pymongo.MongoClient(os.environ['MONGO_URI'])
messagedb = mDBclient['mozart']['messages']
app = flask.Flask(__name__)

#print(jsonify({"message": "Hello World!", "number": 4}))

def validateIpMiddleware(f):
    @wraps(f)
    def check(*args, **kwargs):
        #print(request.remote_addr)
        match(request.remote_addr):
            case "192.168.50.167" | "127.0.0.1":
                return f(*args,**kwargs)
            case _:
                abort(403)
    return check

@app.route('/msg', methods=['POST','GET'])
@validateIpMiddleware
def processMsg():
  #uuid will be passed here
  if(request.method == 'POST'):
    #send response back
    uuid = request.headers.get("uuid")
    print('Message:'+uuid)
    message = request.data.decode('utf-8')
    try:
        #print("MSG:"+message)
        convo = messagedb.find_one({'uuid':uuid})['convo']
        print(convo)
        convo[0].append({'sender':0,'message':message})
        toComplete = ""
        match len(convo[0]):
            case 0:
                toComplete = formatInp(message)
            case _:
                toComplete = "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"+system+"<|eot_id|>"
                for i in range(len(convo[0])):
                    match convo[0][i]['sender']:
                        case 0:
                            toComplete+=formatMsg(convo[0][i]['message'])
                        case 1:
                            toComplete+=formatRes(convo[0][i]['message'])
                        case _:
                            print('Why is there a weird senderID' + str(convo[0][i]['sender']))
                toComplete+="<|start_header_id|>assistant<|end_header_id|>\n"
                
        print(toComplete)
        aires = resGen(model,toComplete)
        #aires = 'testing'
        print("RES:"+aires)
        aires = aires[17:len(aires)-10]
        convo[0].append({'sender':1,'message':aires})
        messagedb.update_one({'uuid':uuid},{'$set':{'convo':convo}})
        return aires,200
    except Exception as e:
        print("Message error:"+str(e))
        return '',500
  else:
    #return old messages
    #jsonify sends back a response object
    uuid = request.args.get('uuid')
    print('History:'+uuid)
    try:
        user = messagedb.find_one({'uuid':uuid})
        return jsonify(user['convo'][0]) #[{'sender':0, 'message':'Hello World!'},{'sender':1, 'message':'Hey World!'},{'sender':0, 'message':'How are you, World?'},{'sender':1, 'message':'Doing good, World!'},]
    except Exception as e:
        print("History error:"+str(e))
        return '',500

@app.route('/acc', methods=['POST','DELETE'])
@validateIpMiddleware
def processSession():
  if(request.method == 'POST'):
    #store uuid passed here in dict
    uuid = request.data.decode('utf-8')
    print('Add:'+uuid)
    try:
        messagedb.insert_one({"uuid":uuid,"convo":[[]]})
        return '',201
    except Exception as e:
        print("AccountAdd error:"+str(e))
        return '',500
  else:
    #delete uuid from dict
    uuid = request.headers.get("uuid")
    print('Delete:'+uuid)
    try:
        messagedb.delete_one({'uuid':uuid})
        return '',201
    except Exception as e:
        print("AccountDel error:"+str(e))
        return '',500

if __name__ == '__main__':
  app.run(host='0.0.0.0',port=5000) #, debug=True