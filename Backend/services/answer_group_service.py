
class AnswerGroupService:
    def __init__(self, portkey_client, answer_group_dao):
        self.portkey_client = portkey_client
        self.answer_group_dao = answer_group_dao

    def get_answer_groups(self):
        try:
            answer_groups = self.answer_group_dao.get_answer_groups()
            if not answer_groups:
                return {"error": "Answer groups not found."}, 500
            return answer_groups
        except Exception as e:
            print(e)
            return {"error": str(e)}, 500
        
    
    def insert_answer_in_answer_group(self, answer_data, axis_values):
        try:
            match = self.answer_group_dao.get_answer_group_match(answer_data, axis_values)
            if match:
                # If a match is found, create a new anwerInAnswerGroup object
                self.answer_group_dao.create_answer_in_answer_group(answer_data, match)
                return
            else:
                answer_group_id = self.answer_group_dao.create_answer_group(answer_data, axis_values)
                if answer_group_id is not None:
                    self.answer_group_dao.create_answer_in_answer_group(answer_data, {"answer_group_id": answer_group_id})
                    return
                else:
                    print("Failed to create answer in group.")
                    return
        except Exception as e:
            print(f"Error inserting answer in answer group: {e}")
            return {"error": str(e)}, 400