from datasets import load_dataset
from transformers import AutoModelForCausalLM,AutoTokenizer,BitsAndBytesConfig,TrainingArguments
import torch
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, LoftQConfig
from trl import SFTTrainer
#from huggingface_hub import notebook_login
#notebook_login()

#model_id = "meta-llama/Meta-Llama-3-8B-Instruct" #mistralai/Mixtral-8x7B-Instruct-v0.1
model_id = "MOZART"
system = "You are MOZART, an AI tutoring chatbot. Answer the following questions and ask questions to quiz the user on the topic."

mozartDataset = load_dataset("json",data_files="./data/training.jsonl")
instructDataset = load_dataset("mosaicml/instruct-v3")

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
    torch_dtype=torch.bfloat16,
    #use_cache=True,
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

"""
def reFormatInstruct(data):
    return "<s>### Instruction:\nBelow is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Input:\n"+(data["prompt"].split("### Instruction")[1].split("### Response")[0])[1:]+"\n\n### Response\n"+data["response"]+"</s>"

def formatData(data):
    return "<s>### Instruction:\nBelow is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Input:\n"+data["input"]+"\n\n### Response:\n"+data["output"]+"</s>"
"""

def formatDataInp(data):
    return "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"+system+"<|eot_id|><|start_header_id|>user<|end_header_id|>\n"+data["input"]+"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"

def reFormatInstructInp(data):
    return "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"+system+"<|eot_id|><|start_header_id|>user<|end_header_id|>\n"+(data["prompt"].split("### Instruction")[1].split("### Response")[0])[1:]+"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"

def formatData(data):
    outarr = []
    for i in range(len(data['input'])):
        outarr.append("<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"+system+"<|eot_id|><|start_header_id|>user<|end_header_id|>\n"+data["input"][i]+"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"+data["output"][i]+"<|eot_id|>")
    return outarr

def reFormatInstruct(data):
    return "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"+system+"<|eot_id|><|start_header_id|>user<|end_header_id|>\n"+(data["prompt"].split("### Instruction")[1].split("### Response")[0])[1:]+"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n"+data["response"]+"<|eot_id|>"

#First try L BOZO print(reFormatInstruct({"prompt":"Below is an instruction that describes a task. Write a response that appropriately completes the request. ### Instruction What are different types of grass? ### Response","response":"There are more than 12,000 species of grass. The most common is Kentucky Bluegrass, because it grows quickly, easily, and is soft to the touch. Rygrass is shiny and bright green colored. Fescues are dark green and shiny. Bermuda grass is harder but can grow in drier soil."}))
#print("Instruct:"+reFormatInstruct(instructDataset["train"][0]))
#print("Formatted:\n"+formatData(mozartDataset['train'][0]))
#respon = resGen(model,formatDataInp(mozartDataset['train'][0]))
#print("Response:\n"+respon)

#Low rank adaptation lol
lorConf = LoraConfig(
    lora_alpha=16,
    lora_dropout=0.1,
    r=64,
    bias="lora_only",
        target_modules=[
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
        "lm_head",
    ],
    task_type="CAUSAL_LM",
    use_rslora=True
)

model = get_peft_model(prepare_model_for_kbit_training(model), lorConf)

if torch.cuda.device_count() > 1: # If more than 1 GPU
    print(torch.cuda.device_count())
    model.is_parallelizable = True
    model.model_parallel = True

trainArgs = TrainingArguments(
  output_dir = "MOZART",
  #num_train_epochs=5,
  max_steps = 10, # comment out this line if you want to train in epochs #500
  per_device_train_batch_size = 5,
  per_device_eval_batch_size = 2,
  warmup_steps = 3,
  logging_steps=4,
  save_strategy="epoch",
  #eval_strategy="steps",
  eval_strategy="no",
  eval_steps=4, # comment out this line if you want to evaluate at the end of each epoch
  learning_rate=2.5e-4,
  bf16=True,
  # lr_scheduler_type='constant',
  # logging_strategy="epoch",
)
"""
trainer = SFTTrainer(
  model=model,
  peft_config=lorConf,
  max_seq_length=1024,
  tokenizer=tokenizer,
  packing=True,
  formatting_func=reFormatInstruct, # this will aplly the create_prompt mapping to all training and test dataset
  args=trainArgs,
  train_dataset=instructDataset["train"],
  eval_dataset=instructDataset["test"]
)
"""
trainer = SFTTrainer(
  model=model,
  peft_config=lorConf,
  tokenizer=tokenizer,
  formatting_func=formatData, # this will aplly the create_prompt mapping to all training and test dataset
  args=trainArgs,
  train_dataset=mozartDataset["train"],
  eval_dataset=mozartDataset["train"]
)

iter = 0

while True:
    print('Iteration: '+str(iter))
    trainer.train()
    trainer.save_model("MOZART")
    #fmodel = model.merge_and_unload();