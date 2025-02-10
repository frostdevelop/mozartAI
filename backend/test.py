from transformers import pipeline

#chatbot = pipeline(model='openai-community/gpt2')
#prompt = "[INST]"+input("Enter prompt:")+"[/INST]\n[ANSWER]"

quantConf = BitsAndBytesConfig(
   load_in_4bit=True,
   bnb_4bit_quant_type="nf4",
   bnb_4bit_use_double_quant=True,
   bnb_4bit_compute_dtype=torch.bfloat16
)

# chatbot = pipeline(model='HuggingFaceH4/zephyr-7b-beta')
chatbot = pipeline(model='meta-llama/Meta-Llama-3-8B-Instruct')
prompt = input("Enter prompt:")

#print(chatbot(prompt,do_sample=False))

print(chatbot([{"role":"user","content":prompt}],do_sample=True,max_new_tokens=10))