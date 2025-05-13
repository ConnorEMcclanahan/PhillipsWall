from typing import Dict, Any

from . import prompts

class AnswerService:
    def __init__(self, portkey_client):
        self.portkey_client = portkey_client

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

    def process_image(self, data: Dict[str, Any]) -> str:
        self.validate_image_data(data)

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
        return response.choices[0].message.content