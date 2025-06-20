# Add this at the end of your main app.py file
if __name__ == '__main__':
    app.listen(5000, '0.0.0.0', () => {
      console.log('Server running on port 5000');
    });