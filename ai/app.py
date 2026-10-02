from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

import pandas as pd
import joblib
import os
import razorpay
import hmac
import hashlib


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(os.path.join(BASE_DIR, ".env"))


# =========================================================
# CREATE FLASK APP
# =========================================================

app = Flask(__name__)

CORS(app)


# =========================================================
# RAZORPAY CONFIGURATION
# =========================================================

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")


if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:

    razorpay_client = razorpay.Client(
        auth=(
            RAZORPAY_KEY_ID,
            RAZORPAY_KEY_SECRET
        )
    )

    print("Razorpay client initialized successfully.")

else:

    razorpay_client = None

    print("WARNING: Razorpay credentials are missing.")


# =========================================================
# MODEL PATHS
# =========================================================

SERVICE_MODEL_PATH = os.path.join(
    BASE_DIR,
    "service_recommendation_model.pkl"
)

PRIORITY_MODEL_PATH = os.path.join(
    BASE_DIR,
    "priority_prediction_model.pkl"
)


# =========================================================
# LOAD AI MODELS
# =========================================================

try:

    service_model = joblib.load(
        SERVICE_MODEL_PATH
    )

    priority_model = joblib.load(
        PRIORITY_MODEL_PATH
    )

    print(
        "Service recommendation model loaded successfully."
    )

    print(
        "Priority prediction model loaded successfully."
    )

except FileNotFoundError as e:

    print(
        "ERROR: Model file not found."
    )

    print(e)

    service_model = None
    priority_model = None

except Exception as e:

    print(
        "ERROR loading models:"
    )

    print(e)

    service_model = None
    priority_model = None


# =========================================================
# HOME
# =========================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "message":
        "BayLine AI Service Recommendation API is running!"
    })


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({

        "status": "running",

        "service_model_loaded":
            service_model is not None,

        "priority_model_loaded":
            priority_model is not None,

        "razorpay_configured":
            razorpay_client is not None
    })


# =========================================================
# AI PREDICTION
# =========================================================

@app.route("/predict", methods=["POST"])
def predict():

    # -----------------------------------------------------
    # CHECK MODELS
    # -----------------------------------------------------

    if (
        service_model is None
        or priority_model is None
    ):

        return jsonify({
            "error":
            "AI models are not loaded. Check the .pkl files."
        }), 500


    # -----------------------------------------------------
    # GET JSON DATA
    # -----------------------------------------------------

    data = request.get_json(
        silent=True
    )

    if not data:

        return jsonify({
            "error":
            "Request must contain JSON data."
        }), 400


    # -----------------------------------------------------
    # GET INPUTS
    # -----------------------------------------------------

    vehicle_type = data.get(
        "vehicle_type"
    )

    vehicle_age = data.get(
        "vehicle_age"
    )

    mileage = data.get(
        "mileage"
    )

    complaint = data.get(
        "complaint"
    )


    # -----------------------------------------------------
    # VALIDATE INPUT
    # -----------------------------------------------------

    if (
        not vehicle_type
        or vehicle_age is None
        or mileage is None
        or not complaint
    ):

        return jsonify({

            "error":
            "Missing required information.",

            "required": [
                "vehicle_type",
                "vehicle_age",
                "mileage",
                "complaint"
            ]

        }), 400


    # -----------------------------------------------------
    # CONVERT NUMERIC VALUES
    # -----------------------------------------------------

    try:

        vehicle_age = int(
            vehicle_age
        )

        mileage = int(
            mileage
        )

    except (
        ValueError,
        TypeError
    ):

        return jsonify({

            "error":
            "vehicle_age and mileage must be numbers."

        }), 400


    # -----------------------------------------------------
    # PREPARE DATA
    # -----------------------------------------------------

    vehicle_data = pd.DataFrame([{

        "vehicle_type":
            str(vehicle_type),

        "vehicle_age":
            vehicle_age,

        "mileage":
            mileage,

        "complaint":
            str(complaint)

    }])


    try:

        # ================================================
        # SERVICE PREDICTION
        # ================================================

        service_prediction = (
            service_model.predict(
                vehicle_data
            )
        )

        service_result = (
            service_prediction[0]
        )


        # ================================================
        # SERVICE CONFIDENCE
        # ================================================

        if hasattr(
            service_model,
            "predict_proba"
        ):

            service_probabilities = (
                service_model.predict_proba(
                    vehicle_data
                )
            )

            service_confidence = (
                max(
                    service_probabilities[0]
                ) * 100
            )

        else:

            service_confidence = None


        # ================================================
        # PRIORITY PREDICTION
        # ================================================

        priority_prediction = (
            priority_model.predict(
                vehicle_data
            )
        )

        priority_result = (
            priority_prediction[0]
        )


        # ================================================
        # PRIORITY CONFIDENCE
        # ================================================

        if hasattr(
            priority_model,
            "predict_proba"
        ):

            priority_probabilities = (
                priority_model.predict_proba(
                    vehicle_data
                )
            )

            priority_confidence = (
                max(
                    priority_probabilities[0]
                ) * 100
            )

        else:

            priority_confidence = None


        # ================================================
        # RESPONSE
        # ================================================

        response = {

            "service":
                str(service_result),

            "priority":
                str(priority_result)

        }


        if service_confidence is not None:

            response[
                "service_confidence"
            ] = round(
                service_confidence,
                2
            )


        if priority_confidence is not None:

            response[
                "priority_confidence"
            ] = round(
                priority_confidence,
                2
            )


        return jsonify(
            response
        )


    except Exception as e:

        print(
            "Prediction error:"
        )

        print(e)

        return jsonify({

            "error":
            "Prediction failed.",

            "details":
            str(e)

        }), 500


# =========================================================
# CREATE RAZORPAY PAYMENT ORDER
# =========================================================

@app.route(
    "/create-payment-order",
    methods=["POST"]
)
def create_payment_order():

    # -----------------------------------------------------
    # CHECK RAZORPAY CONFIGURATION
    # -----------------------------------------------------

    if razorpay_client is None:

        return jsonify({

            "error":
            "Razorpay is not configured."

        }), 500


    # -----------------------------------------------------
    # GET REQUEST DATA
    # -----------------------------------------------------

    data = request.get_json(
        silent=True
    )

    if not data:

        return jsonify({

            "error":
            "Request must contain JSON data."

        }), 400


    # -----------------------------------------------------
    # GET AMOUNT
    # -----------------------------------------------------

    amount = data.get(
        "amount"
    )


    # -----------------------------------------------------
    # VALIDATE AMOUNT
    # -----------------------------------------------------

    try:

        amount = float(amount)

    except (
        ValueError,
        TypeError
    ):

        return jsonify({

            "error":
            "Invalid payment amount."

        }), 400


    if amount <= 0:

        return jsonify({

            "error":
            "Payment amount must be greater than zero."

        }), 400


    # -----------------------------------------------------
    # CONVERT RUPEES → PAISE
    # -----------------------------------------------------

    amount_paise = int(
        round(
            amount * 100
        )
    )


    # -----------------------------------------------------
    # CREATE ORDER
    # -----------------------------------------------------

    try:

        order_data = {

            "amount":
                amount_paise,

            "currency":
                "INR",

            "receipt":
                f"bayline_{os.urandom(6).hex()}",

            "notes": {

                "project":
                    "BayLine",

                "environment":
                    "test"

            }

        }


        order = (
            razorpay_client.order.create(
                data=order_data
            )
        )


        return jsonify({

            "success":
                True,

            "order_id":
                order["id"],

            "amount":
                order["amount"],

            "currency":
                order["currency"],

            "key_id":
                RAZORPAY_KEY_ID

        })


    except Exception as e:

        print(
            "Razorpay order creation error:"
        )

        print(e)

        return jsonify({

            "success":
                False,

            "error":
                "Unable to create Razorpay order.",

            "details":
                str(e)

        }), 500


# =========================================================
# VERIFY RAZORPAY PAYMENT
# =========================================================

@app.route(
    "/verify-payment",
    methods=["POST"]
)
def verify_payment():

    data = request.get_json(
        silent=True
    )

    if not data:

        return jsonify({

            "success":
                False,

            "error":
                "Request must contain JSON data."

        }), 400


    # -----------------------------------------------------
    # GET PAYMENT DETAILS
    # -----------------------------------------------------

    payment_id = data.get(
        "razorpay_payment_id"
    )

    order_id = data.get(
        "razorpay_order_id"
    )

    signature = data.get(
        "razorpay_signature"
    )


    if (
        not payment_id
        or not order_id
        or not signature
    ):

        return jsonify({

            "success":
                False,

            "error":
                "Missing payment verification information."

        }), 400


    # -----------------------------------------------------
    # GENERATE SIGNATURE
    # -----------------------------------------------------

    message = (
        f"{order_id}|{payment_id}"
    )

    generated_signature = (
        hmac.new(

            RAZORPAY_KEY_SECRET.encode(
                "utf-8"
            ),

            message.encode(
                "utf-8"
            ),

            hashlib.sha256

        ).hexdigest()
    )


    # -----------------------------------------------------
    # COMPARE SIGNATURE
    # -----------------------------------------------------

    if not hmac.compare_digest(
        generated_signature,
        signature
    ):

        return jsonify({

            "success":
                False,

            "verified":
                False,

            "error":
                "Payment signature verification failed."

        }), 400


    # -----------------------------------------------------
    # SUCCESS
    # -----------------------------------------------------

    return jsonify({

        "success":
            True,

        "verified":
            True,

        "payment_id":
            payment_id,

        "order_id":
            order_id

    })


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":
    import os
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )