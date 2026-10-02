import pandas as pd
import random

random.seed(42)

data = []

services = {
    "Oil Change": {
        "complaints": [
            "engine oil needs changing",
            "oil is old",
            "oil change required",
            "engine oil needs replacement",
            "oil warning light is on",
            "vehicle needs an oil service",
            "oil level is low",
            "engine oil looks dirty",
            "oil service is due",
            "car needs an oil change"
        ],
        "priority": "Medium"
    },

    "Brake Inspection": {
        "complaints": [
            "brakes making noise",
            "brakes squeaking",
            "grinding noise when braking",
            "brake pads making noise",
            "brakes feel weak",
            "braking feels abnormal",
            "car takes longer to stop",
            "brake pedal feels soft",
            "strange sound while braking",
            "brake performance is poor"
        ],
        "priority": "High"
    },

    "General Service": {
        "complaints": [
            "vehicle needs complete service",
            "general maintenance required",
            "car needs routine maintenance",
            "vehicle has not been serviced for a long time",
            "full vehicle inspection required",
            "car needs regular servicing",
            "vehicle maintenance is due",
            "car needs a general checkup",
            "routine service is required",
            "vehicle needs overall inspection"
        ],
        "priority": "Low"
    },

    "Wheel Alignment": {
        "complaints": [
            "car pulling to one side",
            "steering wheel is not straight",
            "vehicle feels unstable while driving",
            "uneven tyre wear",
            "steering vibrates while driving",
            "car drifts to the left",
            "car drifts to the right",
            "steering feels misaligned",
            "vehicle does not drive straight",
            "tyres are wearing unevenly"
        ],
        "priority": "Medium"
    },

    "AC Service": {
        "complaints": [
            "air conditioner not cooling",
            "AC blowing warm air",
            "air conditioning is weak",
            "AC gas seems low",
            "car AC stopped cooling",
            "AC cooling is poor",
            "air conditioner is not working",
            "AC takes too long to cool",
            "air from AC is warm",
            "car air conditioning needs service"
        ],
        "priority": "Medium"
    },

    "Battery Replacement": {
        "complaints": [
            "battery keeps dying",
            "car does not start due to battery",
            "battery is weak",
            "battery warning light is on",
            "electric start is not working",
            "battery needs replacement",
            "vehicle battery is dead",
            "car has starting problems",
            "battery loses charge quickly",
            "vehicle does not start"
        ],
        "priority": "High"
    }
}


vehicle_types = ["Car", "Bike"]


# Generate 300 records
for _ in range(300):

    service = random.choice(
        list(services.keys())
    )

    vehicle_type = random.choice(
        vehicle_types
    )

    vehicle_age = random.randint(1, 10)

    mileage = random.randint(
        10000,
        120000
    )

    complaint = random.choice(
        services[service]["complaints"]
    )

    priority = services[service]["priority"]

    data.append([
        vehicle_type,
        vehicle_age,
        mileage,
        complaint,
        service,
        priority
    ])


# Create DataFrame
df = pd.DataFrame(
    data,
    columns=[
        "vehicle_type",
        "vehicle_age",
        "mileage",
        "complaint",
        "service",
        "priority"
    ]
)


# Save dataset
df.to_csv(
    "dataset.csv",
    index=False
)


print("Dataset generated successfully!")
print("Total records:", len(df))

print("\nService distribution:")
print(df["service"].value_counts())

print("\nPriority distribution:")
print(df["priority"].value_counts())
