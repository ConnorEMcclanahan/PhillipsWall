import json
import statistics
from collections import Counter
from typing import List, Dict


class UtilityService:
    def __init__(self, question_dao, answer_for_questions_dao):
        self.qd = question_dao
        self.aqd = answer_for_questions_dao

    def get_statistics(self):
        questions = self.qd.get_questions() or []
        all_answers = []
        for question in questions:
            answers = self.aqd.get_answers_for_question(question.get("question_id")) or []
            all_answers.extend(answers)

        return self.generate_statistics(questions, all_answers)

    def generate_statistics(self, questions: List, answers: List) -> Dict:
        stats = {
            "general_metrics": self.calculate_general_metrics(questions, answers),
            "language_distribution": self.calculate_language_distribution(answers),
            "response_distribution": self.calculate_response_distribution(questions),
            "engagement_metrics": self.calculate_engagement_metrics(questions, answers),
            "completion_rate": self.calculate_completion_rate(questions, answers),
            "popularity": self.calculate_popularity(questions, answers),
            "color_usage": self.analyze_color_usage(questions),
        }

        return stats

    def calculate_general_metrics(self, questions: List, answers: List) -> Dict:
        return {
            "total_questions": len(questions),
            "total_answers": len(answers),
            "average_answers_per_question": (
                round(len(answers) / len(questions), 2) if questions else 0
            ),
            "questions_with_answers": len(
                set(answer["question_id"] for answer in answers)
            ),
            "questions_without_answers": len(questions)
            - len(set(answer["question_id"] for answer in answers)),
        }

    def calculate_language_distribution(self, answers: List) -> Dict:
        language_counts = Counter(
            answer.get("language", "unknown")
            for answer in answers
            if answer.get("language")
        )
        return {
            "language_counts": dict(language_counts),
            "percentage_per_language": (
                {
                    lang: round((count / len(answers) * 100), 2)
                    for lang, count in language_counts.items()
                }
                if answers
                else {}
            ),
        }

    def calculate_completion_rate(self, questions: List, answers: List) -> Dict:
        question_answer_counts = {
            q["question_id"]: len(
                [a for a in answers if a["question_id"] == q["question_id"]]
            )
            for q in questions
        }
        return {
            "question_completion_rate": {
                q_id: round((count / len(answers)) * 100, 2) if len(answers) > 0 else 0
                for q_id, count in question_answer_counts.items()
            }
        }

    def calculate_response_distribution(self, questions: List) -> Dict:
        question_answer_counts = {
            question["question_id"]: len(self.aqd.get_answers_for_question(question["question_id"]) or [])
            for question in questions
        }


        answer_lengths = list(question_answer_counts.values())

        return {
            "max_answers_for_question": max(answer_lengths) if answer_lengths else 0,
            "min_answers_for_question": min(answer_lengths) if answer_lengths else 0,
            "median_answers_per_question": (
                statistics.median(answer_lengths) if answer_lengths else 0
            ),
            "questions_by_answer_count": question_answer_counts,  # Map question_id to the number of answers
        }

    def calculate_popularity(self, questions: List, answers: List) -> Dict:
        question_answer_counts = {
            q["question_id"]: len(
                [a for a in answers if a["question_id"] == q["question_id"]]
            )
            for q in questions
        }
        most_popular = sorted(
            question_answer_counts.items(), key=lambda x: x[1], reverse=True
        )[0]
        least_popular = (
            sorted(question_answer_counts.items(), key=lambda x: x[1])[0]
            if question_answer_counts
            else None
        )
        return {
            "most_popular_question": most_popular,
            "least_popular_question": least_popular,
        }

    def calculate_engagement_metrics(self, questions: List, answers: List) -> Dict:
        # Calculate engagement over time (you might want to add timestamp field to your DB)
        question_engagement = {}
        for question in questions:
            question_answers = [
                a for a in answers if a["question_id"] == question["question_id"]
            ]
            question_engagement[question["question_id"]] = len(question_answers)

            most_engaging = sorted(
                question_engagement.items(), key=lambda x: x[1], reverse=True
            )[:5]

            return {
                "most_engaging_questions": [
                    {
                        "question_id": q_id,
                        "answer_count": count,
                        "question_text_en": next(
                            q["en"] for q in questions if q["question_id"] == q_id
                        ),
                    }
                    for q_id, count in most_engaging
                ]
            }

    @staticmethod
    def analyze_color_usage(questions):
        return {
            "questions": [
                {
                    "question_id": q["question_id"],
                    "nl": q["nl"],
                    "en": q["en"]
                }
                for q in questions
            ],
            "colors": [q["color"] for q in questions]
        }
