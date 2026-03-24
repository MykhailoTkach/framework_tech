"""
modules/config.py — Завантаження конфігурації з config.json
"""
import json


def load_config(path="config.json"):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[WARN] {path} не знайдено, використовуються значення за замовчуванням")
        return _defaults()
    except json.JSONDecodeError as e:
        print(f"[ERROR] Помилка читання {path}: {e}")
        return _defaults()


def _defaults():
    return {
        "app": {"name": "ChurnGuard", "version": "1.0.0"},
        "paths": {
            "log_file":   "logs/churn.log",
            "reports_dir": "reports",
            "data_dir":   "data",
        },
        "model": {"test_size": 0.2, "random_state": 42},
    }