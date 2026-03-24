"""
modules/routes.py — Flask маршрути (API ендпоінти)
"""
import json
import traceback
import pandas as pd
from datetime import datetime
from pathlib import Path

from flask import Blueprint, request, jsonify, current_app

from modules import data as data_module
from modules import charts as charts_module

bp = Blueprint("api", __name__, url_prefix="/api")


def _state():
    return current_app.config["STATE"]


def _cfg():
    return current_app.config["CFG"]


def _log():
    return current_app.config["LOG"]


@bp.route("/generate", methods=["POST"])
def generate():
    try:
        body = request.get_json(silent=True) or {}
        n = max(50, min(int(body.get("n", 300)), 3000))

        df = data_module.generate(n=n)
        _state()["df"] = df

        data_dir = Path(_cfg()["paths"]["data_dir"])
        data_dir.mkdir(exist_ok=True)
        df.to_csv(data_dir / "customers.csv", index=False, encoding="utf-8-sig")

        _log().info(f"Дані згенеровано: {n} клієнтів, відтік={int(df['Відтік'].sum())}")
        return jsonify({
            "ok":    True,
            "rows":  n,
            "churn": int(df["Відтік"].sum()),
            "rate":  round(df["Відтік"].mean() * 100, 1),
        })
    except Exception as e:
        _log().error(f"generate: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@bp.route("/train", methods=["POST"])
def train():
    try:
        state = _state()
        if state["df"] is None:
            return jsonify({"ok": False, "error": "Спочатку згенеруйте дані"}), 400

        _log().info("Навчання моделі: Random Forest")
        model = state["model"]
        metrics = model.train(state["df"])
        chart   = charts_module.build(model.metrics, model.roc_data)

        rep_dir = Path(_cfg()["paths"]["reports_dir"])
        rep_dir.mkdir(exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = rep_dir / f"report_{ts}.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump({"metrics": metrics, "roc": model.roc_data}, f,
                      ensure_ascii=False, indent=2)

        _log().info(f"Навчання завершено: AUC={metrics['roc_auc']}, "
                    f"Accuracy={metrics['accuracy']} | Звіт: {report_path}")
        return jsonify({
            "ok":      True,
            "metrics": metrics,
            "roc":     model.roc_data,
            "chart":   chart,
        })
    except Exception as e:
        _log().error(f"train: {e}\n{traceback.format_exc()}")
        return jsonify({"ok": False, "error": str(e)}), 500


@bp.route("/predict", methods=["POST"])
def predict():
    try:
        state = _state()
        if not state["model"].is_trained:
            return jsonify({"ok": False, "error": "Спочатку навчіть модель"}), 400

        body = request.get_json()
        if not body:
            return jsonify({"ok": False, "error": "Дані не передано"}), 400

        errors = {}
        for field, mn, mx in [("tenure", 1, 120), ("monthly", 0, 500), ("support", 0, 50)]:
            v = body.get(field)
            try:
                if v is None or not (mn <= float(v) <= mx):
                    errors[field] = f"Від {mn} до {mx}"
            except (TypeError, ValueError):
                errors[field] = "Невірний формат числа"

        if errors:
            _log().warning(f"Помилка валідації: {errors}")
            return jsonify({"ok": False, "errors": errors}), 422

        tenure  = float(body["tenure"])
        monthly = float(body["monthly"])

        row = pd.DataFrame([{
            "Термін (міс)":       tenure,
            "Місячна оплата":     monthly,
            "Загальна оплата":    monthly * tenure,
            "Дзвінки підтримки":  float(body["support"]),
            "Тип договору":       body.get("contract", "Місяць-до-місяця"),
            "Інтернет":           body.get("internet", "DSL"),
            "Онлайн-захист":      int(body.get("security", 0)),
            "Пенсіонер":          int(body.get("senior", 0)),
        }])

        prob = state["model"].predict(row)
        risk = "Високий" if prob >= 0.7 else "Середній" if prob >= 0.4 else "Низький"

        _log().info(f"Прогноз: P={prob:.4f}, Ризик={risk}")
        return jsonify({
            "ok":          True,
            "probability": round(prob, 4),
            "prediction":  "Відтік" if prob >= 0.5 else "Залишиться",
            "risk":        risk,
        })
    except Exception as e:
        _log().error(f"predict: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@bp.route("/clients", methods=["GET"])
def clients():
    """
    Повертає всіх клієнтів з датасету разом із прогнозом відтоку.
    Якщо модель не навчена — повертає дані без прогнозу (probability=null).
    """
    try:
        state = _state()
        df = state["df"]

        if df is None:
            return jsonify({"ok": False, "error": "Спочатку згенеруйте дані"}), 400

        model = state["model"]
        records = []

        for _, row in df.iterrows():
            rec = {
                "CustomerID":          row.get("CustomerID", "—"),
                "Термін (міс)":        int(row["Термін (міс)"]),
                "Місячна оплата":      float(row["Місячна оплата"]),
                "Загальна оплата":     float(row["Загальна оплата"]),
                "Дзвінки підтримки":   int(row["Дзвінки підтримки"]),
                "Тип договору":        str(row["Тип договору"]),
                "Інтернет":            str(row["Інтернет"]),
                "Онлайн-захист":       int(row["Онлайн-захист"]),
                "Пенсіонер":           int(row["Пенсіонер"]),
            }

            if model.is_trained:
                pred_row = pd.DataFrame([{
                    "Термін (міс)":       rec["Термін (міс)"],
                    "Місячна оплата":     rec["Місячна оплата"],
                    "Загальна оплата":    rec["Загальна оплата"],
                    "Дзвінки підтримки":  rec["Дзвінки підтримки"],
                    "Тип договору":       rec["Тип договору"],
                    "Інтернет":           rec["Інтернет"],
                    "Онлайн-захист":      rec["Онлайн-захист"],
                    "Пенсіонер":          rec["Пенсіонер"],
                }])
                prob = model.predict(pred_row)
                rec["probability"] = round(prob, 4)
                rec["prediction"]  = "Відтік" if prob >= 0.5 else "Залишиться"
                rec["risk"]        = "Високий" if prob >= 0.7 else "Середній" if prob >= 0.4 else "Низький"
            else:
                rec["probability"] = None
                rec["prediction"]  = "—"
                rec["risk"]        = "—"

            records.append(rec)

        _log().info(f"Клієнти: повернуто {len(records)} записів")
        return jsonify({"ok": True, "clients": records, "total": len(records)})

    except Exception as e:
        _log().error(f"clients: {e}\n{traceback.format_exc()}")
        return jsonify({"ok": False, "error": str(e)}), 500


@bp.route("/log")
def log():
    try:
        path = Path(_cfg()["paths"]["log_file"])
        lines = path.read_text(encoding="utf-8").splitlines()[-80:] if path.exists() else []
        return jsonify({"ok": True, "lines": lines})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500