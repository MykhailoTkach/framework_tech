"""
modules/data.py — Генерація синтетичного датасету клієнтів
"""
import numpy as np
import pandas as pd


def generate(n: int = 300, seed: int = 42) -> pd.DataFrame:
    """Генерує синтетичний датасет клієнтів телекому з цільовою змінною 'Відтік'."""
    rng = np.random.RandomState(seed)

    tenure   = rng.randint(1, 72, n)
    monthly  = rng.uniform(20, 120, n)
    support  = rng.randint(0, 10, n)
    contract = rng.choice(["Місяць-до-місяця", "Один рік", "Два роки"], n, p=[0.5, 0.3, 0.2])
    internet = rng.choice(["DSL", "Оптоволокно", "Немає"], n, p=[0.4, 0.4, 0.2])
    security = rng.choice([0, 1], n)
    senior   = rng.choice([0, 1], n, p=[0.84, 0.16])

    score = (
        -0.03 * tenure
        + 0.008 * monthly
        + 0.05 * support
        + 0.3 * (contract == "Місяць-до-місяця").astype(int)
        - 0.2 * security
        + 0.02 * senior
        + rng.normal(0, 0.3, n)
    )
    prob  = 1 / (1 + np.exp(-score))
    churn = (rng.uniform(0, 1, n) < prob).astype(int)

    return pd.DataFrame({
        "CustomerID":          [f"CUS{i+1:04d}" for i in range(n)],
        "Термін (міс)":        tenure,
        "Місячна оплата":      monthly.round(2),
        "Загальна оплата":     (monthly * tenure).round(2),
        "Дзвінки підтримки":   support,
        "Тип договору":        contract,
        "Інтернет":            internet,
        "Онлайн-захист":       security,
        "Пенсіонер":           senior,
        "Відтік":              churn,
    })