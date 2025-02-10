from datasets import load_dataset
mozartDataset = load_dataset("json",data_files="./data/training.jsonl")
print('Successfuly loaded.')