import pandas as pd
import joblib


# Load trained model
model = joblib.load(
    "service_recommendation_model.pkl"
)


# Get customer information
vehicle_type = input(
    "Enter vehicle type (Car/Bike): "
)

vehicle_age = int(
    input("Enter vehicle age: ")
)

mileage = int(
    input("Enter mileage: ")
)

complaint = input(
    "Describe the vehicle problem: "
)


# Prepare input
new_vehicle = pd.DataFrame([
    {
        "vehicle_type": vehicle_type,
        "vehicle_age": vehicle_age,
        "mileage": mileage,
        "complaint": complaint
    }
])


# Predict service
prediction = model.predict(
    new_vehicle
)


# Get probabilities
probabilities = model.predict_proba(
    new_vehicle
)

confidence = max(
    probabilities[0]
) * 100


# Display result
print("\n================================")
print("       AI RECOMMENDATION")
print("================================")

print(
    "Recommended Service:",
    prediction[0]
)

print(
    f"AI Confidence: {confidence:.2f}%"
)

print("================================")
