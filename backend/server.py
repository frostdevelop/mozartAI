import torch
import flask
import pymongo
from datasets import load_dataset
from transformers import AutoModelForCausalLM,AutoTokenizer,BitsAndBytesConfig
from flask import request, jsonify, abort
from functools import wraps

model_id = "meta-llama/Meta-Llama-3-8B-Instruct"
system = "You are MOZARTAI, an AI tutoring chatbot. Answer the following questions and ask questions to quiz the user on the topic."

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
    attn_implementation="flash_attention_2"
)
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
    aires = resGen(model,formatInp(request.data.decode('utf-8')))
    return aires[17:len(aires)-10],200
  else:
    #return old messages
    #jsonify sends back a response object
    uuid = request.args.get('uuid')
    print('History:'+uuid)
    return jsonify([{'sender':0, 'message':'Hello World!'},{'sender':1, 'message':'Hey World!'},{'sender':0, 'message':'How are you, World?'},{'sender':1, 'message':'Doing good, World!'},]);


@app.route('/acc', methods=['POST','DELETE'])
@validateIpMiddleware
def processSession():
  if(request.method == 'POST'):
    #store uuid passed here in dict
    uuid = request.data.decode('utf-8')
    print('Add:'+uuid)
    return '',201
  else:
    #delete uuid from dict
    uuid = request.data.decode('utf-8')
    print('Delete:'+uuid)
    return '',201

if __name__ == '__main__':
  app.run(host='0.0.0.0',port=5000) #, debug=True