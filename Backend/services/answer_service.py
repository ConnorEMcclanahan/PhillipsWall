import json
from typing import Dict, Any
import ast

from . import prompts

class AnswerService:
    def __init__(self, portkey_client, answer_dao):
        self.portkey_client = portkey_client
        self.answer_dao = answer_dao

    @staticmethod
    def get_prompt(name: str) -> str:
        prompt_map = {p["name"]: p["prompt"] for p in prompts}
        if not (prompt := prompt_map.get(name)):
            raise ValueError(f"Prompt '{name}' not found")
        return prompt

    @staticmethod
    def validate_image_data(data: Dict[str, Any]):
        if not data or "image" not in data:
            raise ValueError("No image data provided.")

    def process_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
        response = self.portkey_client.get_chat_completion(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": self.get_prompt("scan-postit")
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": data["image"]}
                        }
                    ]
                }]
        )
        if not response.choices:
            raise ValueError("No completion choices returned")
        response_msg = response.choices[0].message.content
        answer_data = json.loads(response_msg)
        self.get_axis_value(answer_data)
        return answer_data

    def insert_answer(self, answer_data, axis_value):
        try:
            answer_data["answer_id"] = self.answer_dao.insert_answer(answer_data, axis_value)
        except Exception as e:
            print(e)
            return {"error": str(e)}, 400
        finally:
            self.translate_image(answer_data)


    def translate_image(self, answer_text: Dict[str, Any]):
        response = self.portkey_client.get_chat_completion(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": self.get_prompt("translate-submitted-answer")
                        },
                        {
                            "type": "text",
                            "text": answer_text["answer_text"]
                        }
                    ]
                }]
        )
        if not response.choices:
            raise ValueError("No completion choices returned")
        translation_data = json.loads(response.choices[0].message.content)
        self.answer_dao.insert_translated_answer(answer_text["answer_id"], translation_data)

    def get_axis_value(self, answer_text: Dict[str, Any]):
        response = self.portkey_client.get_chat_completion(            
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": self.get_prompt("get-axis-value")
                        },
                        {
                            "type": "text",
                            "text": answer_text["question_text"]
                        },
                        {
                            "type": "text",
                            "text": answer_text["answer_text"]
                        }
                    ]
                }]      
        )
        if not response.choices:
            raise ValueError("No completion choices returned")
        axis_value = json.loads(response.choices[0].message.content)
        self.insert_answer(answer_text, axis_value)