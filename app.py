"""
app.py — Точка входу Flask-додатку ChurnGuard
"""
from flask import Flask, render_template

from modules.config import load_config
from modules.logger import setup_logger
from modules.model  import ChurnModel
from modules.routes import bp as api_bp

CONFIG = load_config()
LOG    = setup_logger(CONFIG["paths"]["log_file"])

app = Flask(__name__)

app.config["CFG"]   = CONFIG
app.config["LOG"]   = LOG
app.config["STATE"] = {
    "model": ChurnModel(
        test_size=CONFIG["model"]["test_size"],
        random_state=CONFIG["model"]["random_state"],
    ),
    "df": None,
}

app.register_blueprint(api_bp)


@app.route("/")
def index():
    return render_template(
        "index.html",
        name=CONFIG["app"]["name"],
        version=CONFIG["app"]["version"],
    )


if __name__ == "__main__":
    LOG.info(f"Запуск {CONFIG['app']['name']} v{CONFIG['app']['version']} "
             f"→ http://127.0.0.1:5000")
    app.run(debug=True, port=5000)