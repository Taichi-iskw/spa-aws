from flask import Flask, jsonify

app = Flask(__name__)


@app.route("/")
def index():
    return jsonify(message="flask root")


@app.route("/api")
def health_check():
    return jsonify(message="api health check")


@app.route("/api/hello")
def hello():
    return jsonify(message="Hello from Flask on Fargate!")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
