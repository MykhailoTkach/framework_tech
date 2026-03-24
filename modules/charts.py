"""
modules/charts.py
"""
import io
import base64
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def build(metrics, roc_data):
    fig, axes = plt.subplots(1, 2, figsize=(12, 5), facecolor="#0f172a")
    _roc(axes[0], roc_data)
    _cm(axes[1], metrics["confusion_matrix"])
    plt.tight_layout(pad=2)
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=130, bbox_inches="tight", facecolor="#0f172a")
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()


def _roc(ax, roc_data):
    ax.set_facecolor("#1e293b")
    fpr, tpr = roc_data["fpr"], roc_data["tpr"]
    ax.plot(fpr, tpr, color="#6366f1", lw=2.5, label="AUC = " + str(roc_data["auc"]))
    ax.plot([0, 1], [0, 1], color="#334155", lw=1.5, linestyle="--")
    ax.fill_between(fpr, tpr, alpha=0.15, color="#6366f1")
    ax.set_xlabel("FPR", color="#e2e8f0")
    ax.set_ylabel("TPR", color="#e2e8f0")
    ax.set_title("ROC", color="#e2e8f0", fontweight="bold")
    ax.legend(fontsize=9, facecolor="#1e293b", labelcolor="#e2e8f0")
    ax.tick_params(colors="#e2e8f0")
    for s in ax.spines.values():
        s.set_color("#334155")


def _cm(ax, cm_list):
    cm = np.array(cm_list)
    ax.set_facecolor("#1e293b")
    ax.imshow(cm, cmap="Blues")
    for i in range(2):
        for j in range(2):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "#e2e8f0",
                    fontsize=22, fontweight="bold")
    labels = ["Stay", "Churn"]
    ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
    ax.set_xticklabels(labels, color="#e2e8f0")
    ax.set_yticklabels(labels, color="#e2e8f0")
    ax.set_xlabel("Predicted", color="#e2e8f0")
    ax.set_ylabel("Actual", color="#e2e8f0")
    ax.set_title("Confusion Matrix", color="#e2e8f0", fontweight="bold")
    for s in ax.spines.values():
        s.set_color("#334155")