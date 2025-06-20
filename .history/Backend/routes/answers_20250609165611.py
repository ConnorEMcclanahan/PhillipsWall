@app.route('/save-answer', methods=['POST'])
def save_answer():
    try:
        data = request.json
        
        # Generate a new answer ID
        answer_id = str(uuid.uuid4())
        
        # Create a new answer record
        new_answer = {
            'answer_id': answer_id,
            'answer': data['answer'],
            'question_id': data['question_id'],
            'created_at': data['scan_date'],
            'x_axis_value': random.random(),
            'y_axis_value': random.random(),
        }
        
        # Add to database
        db.answers.insert_one(new_answer)
        
        return jsonify({
            'success': True, 
            'message': 'Answer saved successfully',
            'answer_id': answer_id  # Return the ID to the client
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})