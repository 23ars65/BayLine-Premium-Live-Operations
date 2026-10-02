import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score


# =========================================================
# 1. LOAD DATASET
# =========================================================

data = pd.read_csv("dataset.csv")

print("Dataset loaded successfully!")
print("Number of records:", len(data))


# =========================================================
# 2. INPUT FEATURES
# =========================================================

X = data[
    [
        "vehicle_type",
        "vehicle_age",
        "mileage",
        "complaint"
    ]
]


# =========================================================
# 3. OUTPUTS
# =========================================================

service_y = data["service"]
priority_y = data["priority"]


# =========================================================
# 4. SPLIT DATA
# =========================================================

X_train, X_test, service_train, service_test, priority_train, priority_test = train_test_split(
    X,
    service_y,
    priority_y,
    test_size=0.2,
    random_state=42,
    stratify=service_y
)


# =========================================================
# 5. PREPROCESSING
# =========================================================

def create_preprocessor():

    return ColumnTransformer(
        transformers=[
            (
                "complaint_text",
                TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    max_features=1000
                ),
                "complaint"
            ),

            (
                "vehicle_type",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
                ["vehicle_type"]
            ),

            (
                "numeric",
                StandardScaler(),
                ["vehicle_age", "mileage"]
            )
        ]
    )


# =========================================================
# 6. SERVICE MODEL
# =========================================================

service_model = Pipeline(
    steps=[
        (
            "preprocessor",
            create_preprocessor()
        ),

        (
            "model",
            LogisticRegression(
                max_iter=2000
            )
        )
    ]
)


# =========================================================
# 7. PRIORITY MODEL
# =========================================================

priority_model = Pipeline(
    steps=[
        (
            "preprocessor",
            create_preprocessor()
        ),

        (
            "model",
            LogisticRegression(
                max_iter=2000
            )
        )
    ]
)


# =========================================================
# 8. TRAIN SERVICE MODEL
# =========================================================

print("\nTraining service recommendation model...")

service_model.fit(
    X_train,
    service_train
)


# =========================================================
# 9. TRAIN PRIORITY MODEL
# =========================================================

print("Training priority prediction model...")

priority_model.fit(
    X_train,
    priority_train
)


# =========================================================
# 10. TEST SERVICE MODEL
# =========================================================

service_predictions = service_model.predict(
    X_test
)

service_accuracy = accuracy_score(
    service_test,
    service_predictions
)


# =========================================================
# 11. TEST PRIORITY MODEL
# =========================================================

priority_predictions = priority_model.predict(
    X_test
)

priority_accuracy = accuracy_score(
    priority_test,
    priority_predictions
)


# =========================================================
# 12. DISPLAY RESULTS
# =========================================================

print("\n========================================")
print("          AI MODEL RESULTS")
print("========================================")

print(
    f"Service Model Accuracy: "
    f"{service_accuracy * 100:.2f}%"
)

print(
    f"Priority Model Accuracy: "
    f"{priority_accuracy * 100:.2f}%"
)

print("========================================")


# =========================================================
# 13. SAVE BOTH MODELS
# =========================================================

joblib.dump(
    service_model,
    "service_recommendation_model.pkl"
)

joblib.dump(
    priority_model,
    "priority_prediction_model.pkl"
)


print("\nModels saved successfully!")

print(
    "Service model: "
    "service_recommendation_model.pkl"
)

print(
    "Priority model: "
    "priority_prediction_model.pkl"
)
