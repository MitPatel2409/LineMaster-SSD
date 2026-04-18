from flask import Flask, request, jsonify
from flask_cors import CORS
from simulation import run_simulation

app = Flask(__name__)
CORS(app)

@app.route('/api/simulate', methods=['POST'])
def simulate():
    data = request.json
    try:
        total_b = float(data.get('totalBoxes', 500))
        total_j = float(data.get('totalJiffies', 1000))
        e = float(data.get('excellent', 2))
        g = float(data.get('good', 3))
        b = float(data.get('bad', 1))
        aisles = float(data.get('aisles', 10))
        
        result = run_simulation(total_b, total_j, e, g, b, aisles)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
