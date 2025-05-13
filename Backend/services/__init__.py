import os
import json

current_dir = os.path.dirname(os.path.abspath(__file__))

prompts_path = os.path.join(current_dir, '..', 'prompts', 'openai_prompts.json')

prompts_path = os.path.normpath(prompts_path)

with open(prompts_path, 'r') as f:
    prompts = json.load(f)
