from pathlib import Path
from portkey_ai import Portkey

import configparser

class PortkeyClient:
    def __init__(self):
        config_path = Path(__file__).resolve().parent.parent.parent / 'config' / 'portkey.ini'
        config = configparser.ConfigParser()
        config.read(config_path)
        api_key = config['portkey']['api_key']
        self.client = Portkey(
            api_key=api_key
        )

    def get_chat_completion(self, messages, model="gpt-40-mini"):
        response =  self.client.chat.completions.create(
            messages=messages,
            model=model,
            debug=False
,           temperature=0
        )

        return response
