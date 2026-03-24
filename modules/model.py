"""
modules/model.py — Навчання Random Forest, препроцесинг, прогноз
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    roc_curve, auc, confusion_matrix,
    accuracy_score, precision_score, recall_score, f1_score,
)
from sklearn.impute import SimpleImputer
import warnings
warnings.filterwarnings("ignore")


class ChurnModel:
    def __init__(self, test_size: float = 0.2, random_state: int = 42):
        self.test_size    = test_size
        self.random_state = random_state
        self.model:    RandomForestClassifier | None = None
        self.scaler:   StandardScaler | None = None
        self.encoders: dict[str, LabelEncoder] = {}
        self.features: list[str] = []
        self.metrics:  dict = {}
        self.roc_data: dict = {}

    def _preprocess(self, df: pd.DataFrame, fit: bool = True):
        df = df.copy()

        drop = [c for c in df.columns if "id" in c.lower()]
        df.drop(columns=drop, errors="ignore", inplace=True)

        y = df.pop("Відтік").values if "Відтік" in df.columns else None

        for col in df.select_dtypes(include=["object"]).columns:
            if fit:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                self.encoders[col] = le
            else:
                le = self.encoders.get(col)
                if le:
                    df[col] = df[col].astype(str).apply(
                        lambda x: x if x in set(le.classes_) else le.classes_[0]
                    )
                    df[col] = le.transform(df[col])

        X = SimpleImputer(strategy="median").fit_transform(df)

        if fit:
            self.features = df.columns.tolist()
            self.scaler = StandardScaler()
            X = self.scaler.fit_transform(X)
        else:
            X = self.scaler.transform(X)

        return X, y

    def train(self, df: pd.DataFrame) -> dict:
        self.encoders = {}
        X, y = self._preprocess(df, fit=True)

        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y,
            test_size=self.test_size,
            random_state=self.random_state,
            stratify=y,
        )

        self.model = RandomForestClassifier(random_state=self.random_state)
        self.model.fit(X_tr, y_tr)

        y_pred = self.model.predict(X_te)
        y_prob = self.model.predict_proba(X_te)[:, 1]

        fpr, tpr, _ = roc_curve(y_te, y_prob)
        roc_auc = auc(fpr, tpr)

        self.roc_data = {
            "fpr": fpr.tolist(),
            "tpr": tpr.tolist(),
            "auc": round(roc_auc, 4),
        }
        self.metrics = {
            "accuracy":         round(accuracy_score(y_te, y_pred), 4),
            "precision":        round(precision_score(y_te, y_pred, zero_division=0), 4),
            "recall":           round(recall_score(y_te, y_pred, zero_division=0), 4),
            "f1":               round(f1_score(y_te, y_pred, zero_division=0), 4),
            "roc_auc":          round(roc_auc, 4),
            "confusion_matrix": confusion_matrix(y_te, y_pred).tolist(),
            "train_size":       int(len(X_tr)),
            "test_size":        int(len(X_te)),
        }
        return self.metrics

    def predict(self, df: pd.DataFrame) -> float:
        """Повертає ймовірність відтоку для одного клієнта."""
        if self.model is None:
            raise RuntimeError("Модель не навчена")
        X, _ = self._preprocess(df, fit=False)
        return float(self.model.predict_proba(X)[0, 1])

    @property
    def is_trained(self) -> bool:
        return self.model is not None