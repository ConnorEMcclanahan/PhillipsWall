from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://10.15.0.22:3000", "http://localhost:3000"])

const cors = require('cors');

app.use(cors({
  origin: ['http://10.15.0.22:3000', 'http://localhost:3000']
}));

# Replace your listen call with:
app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
  console.log('Access from other devices at http://10.15.0.22:5000');
});