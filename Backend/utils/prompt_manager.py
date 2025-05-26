import json
import os

prompt_dir = os.path.dirname(os.path.abspath(__file__))

def update_image_url_prompt(prompt_name, image_data_url):
    json_data = get_json_file()
    for prompt in json_data:
        if prompt["name"] == prompt_name:
            for message in prompt["messages"]:
                for content_item in message["content"]:
                    if content_item["type"] == "image_url":
                        content_item["image_url"] = {"url": image_data_url}
            return prompt["messages"]
    raise ValueError("Prompt does not exist.")

def update_translate_prompt(prompt_name, new_text, submitted_text="{submitted_text}"):
    json_data = get_json_file()
    for prompt in json_data:
        if prompt["name"] == prompt_name:
            for message in prompt["messages"]:
                for content_item in message["content"]:
                    if content_item["type"] == "text" and content_item["text"] == submitted_text:
                        content_item["text"] = new_text
            return prompt["messages"]
    raise ValueError("Prompt does not exist.")

def update_axis_value_prompt(prompt_name, question_text, answer_text, question_text_marker="{question_text}", answer_text_marker="{answer_text}"):
    json_data = get_json_file()
    for prompt in json_data:
        if prompt["name"] == prompt_name:
            for message in prompt["messages"]:
                for content_item in message["content"]:
                    if content_item["type"] == "text" and content_item["text"] == question_text_marker:
                        content_item["text"] = question_text
                    elif content_item["type"] == "text" and content_item["text"] == answer_text_marker:
                        content_item["text"] = answer_text
            return prompt["messages"]
    raise ValueError("Prompt does not exist.")

def get_json_file():
    json_file = os.path.join(prompt_dir, "..", "prompts", "openai_prompts.json")
    if os.path.isfile(json_file):
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    else:
        raise FileNotFoundError(f"File does not exist.")