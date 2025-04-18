from langdetect import detect
from textblob import TextBlob
from spellchecker import SpellChecker
from langdetect.lang_detect_exception import LangDetectException
import re




class DataParser:
    def __init__(self):
        self.question_pattern = re.compile(r"(.*?\?)\s*(.*)", re.DOTALL)
        self.spell_en = SpellChecker(language="en")
        self.spell_nl = SpellChecker(language="nl")

    def detect_language(self, text):
        """Detects the language of a given text."""
        try:
            lang = detect(text)
            if lang == "af":  # Handle Afrikaans as Dutch
                return "nl"
            return lang
        except LangDetectException:
            return "unknown"

    def spell_correct(self, text, lang):
        """Corrects spelling based on detected language."""
        try:
            if lang == "en":
                corrected = [
                    self.spell_en.correction(word) or word for word in text.split()
                ]
                return " ".join(corrected)
            elif lang == "nl":
                corrected = [
                    self.spell_nl.correction(word) or word for word in text.split()
                ]
                return " ".join(corrected)
            return text  # For unsupported languages, return as is
        except Exception:
            return text

    def parse_text(self, extracted_text):
        """Parses the text into question and answer."""
        match = self.question_pattern.match(extracted_text)
        if match:
            question, answer = match.groups()
            return question.strip().lower(), answer.strip().lower()
        return None, extracted_text.strip().lower()

    def process_text(self, extracted_text, filename):
        """
        Processes the extracted text:
        - Parses the text into question and answer
        - Detects the language of the answer
        - Corrects the spelling of the question and answer
        """
        # Parse the text into question and answer
        question_text, answer_text = self.parse_text(extracted_text)

        if not answer_text.strip():
            print(f"Skipped: {filename} - Empty answer.")
            return None

        # Detect the language of the answer
        detected_language = self.detect_language(answer_text)

        if detected_language == "unknown":
            print(f"Skipped: {filename} - Unknown language in the answer.")
            return None

        # Correct spelling for both question and answer
        corrected_question = self.spell_correct(
            question_text, "en"
        )  # Assume questions are in English
        corrected_answer = self.spell_correct(answer_text, detected_language)

        if not corrected_answer.strip():
            print(f"Skipped: {filename} - Unrecognizable corrected answer.")
            return None

        return {
            "language": detected_language,
            "question": corrected_question,
            "answer": corrected_answer,
        }
