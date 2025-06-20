import json
from typing import Dict, Any
from ..utils.prompt_manager import update_image_url_prompt, update_translate_prompt,  update_axis_value_prompt
from ..utils.prompts import Prompts

class AnswerService:
    def __init__(self, portkey_client, answer_dao):
        self.portkey_client = portkey_client
        self.answer_dao = answer_dao

    def get_answers(self) -> Dict[str, Any]:
        answers = self.answer_dao.get_answers()
        if not answers:
            return {"error": "Answers not found."}, 500
        return answers

    def get_latest_answer_id(self):
        return self.answer_dao.get_latest_answer_id()

    @staticmethod
    def validate_image_data(data: Dict[str, Any]):
        if not data or "image" not in data:
            raise ValueError("No image data provided.")

    def process_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data = update_image_url_prompt(Prompts.SCAN_POSTIT.value, data["image"])
        response = self.portkey_client.get_chat_completion(data)

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
        data = update_translate_prompt(Prompts.TRANSLATE_POSTIT.value, answer_text["answer_text"])
        response = self.portkey_client.get_chat_completion(data)
        if not response.choices:
            raise ValueError("No completion choices returned")
        translation_data = json.loads(response.choices[0].message.content)
        self.answer_dao.insert_translated_answer(answer_text["answer_id"], translation_data)

    def get_axis_value(self, answer_text: Dict[str, Any]):
        data = update_axis_value_prompt(Prompts.GET_AXIS_VALUE.value, answer_text["question_text"], answer_text["answer_text"])
        response = self.portkey_client.get_chat_completion(data)
        if not response.choices:
            raise ValueError("No completion choices returned")
        axis_value = json.loads(response.choices[0].message.content)
        self.insert_answer(answer_text, axis_value)