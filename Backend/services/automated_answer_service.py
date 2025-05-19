from typing import Dict, Any
import os
import base64
import csv
import json
from mimetypes import guess_type

from . import prompts

class AutomatedAnswerService:
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
                            "text": self.get_prompt("scan-postit-automated")
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
        print(response.choices[0].message.content)
        return response.choices[0].message.content
    
    def encode_image_to_base64(self, file_path: str) -> str:
        mime_type, _ = guess_type(file_path)
        if mime_type is None:
            raise ValueError("No se pudo determinar el tipo MIME de la imagen.")
        with open(file_path, "rb") as image_file:
            encoded = base64.b64encode(image_file.read()).decode("utf-8")
        return f"data:{mime_type};base64,{encoded}"
    


    
    def process_folder(self) -> str:
        results = {}
        folder_path = "C:/Users/ditur/OneDrive/Documentos/PHILIPHSWALL/REPO/PhillipsWall/Backend/IMAGE_TEST"
        output_csv_path = os.path.join(folder_path, "results.csv")

        for filename in os.listdir(folder_path):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                file_path = os.path.join(folder_path, filename)
                try:
                    image_data_url = self.encode_image_to_base64(file_path)
                    result_str = self.process_image({"image": image_data_url})

                    try:
                        result = json.loads(result_str)
                    except json.JSONDecodeError:
                        result = {"question": "", "answer_en": result_str, "x": "", "y": ""}
                    results[filename] = result
                except Exception as e:
                    results[filename] = {"question": "", "answer_en": f"Error: {e}", "x": "", "y": ""}

        with open(output_csv_path, mode='w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["File", "Question", "Answer", "x", "y"])
            for filename, data in results.items():
                writer.writerow([
                    filename,
                    data.get("question", ""),
                    data.get("answer_en", ""),
                    data.get("x", ""),
                    data.get("y", "")
                ])

        return output_csv_path
