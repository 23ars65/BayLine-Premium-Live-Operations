import io
import base64
from datetime import datetime
import resend

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
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
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv(
    "RESEND_FROM_EMAIL",
    "BayLine Auto <billing@baylineauto.shop>"
)

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    print("Resend email client initialized successfully.")
else:
    print("WARNING: Resend API key is missing.")

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
# GENERATE AND SEND BAYLINE INVOICE
# =========================================================

@app.route("/send-invoice", methods=["POST"])
def send_invoice():

    if not RESEND_API_KEY:
        return jsonify({
            "success": False,
            "error": "Resend is not configured."
        }), 500

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "error": "Request must contain JSON data."
        }), 400

    required_fields = [
        "customer_name",
        "customer_email",
        "booking_id",
        "invoice_number",
        "vehicle",
        "service",
        "branch",
        "appointment_date",
        "appointment_time",
        "amount",
        "razorpay_payment_id",
    ]

    missing = [
        field for field in required_fields
        if not data.get(field)
    ]

    if missing:
        return jsonify({
            "success": False,
            "error": "Missing invoice information.",
            "missing": missing
        }), 400

    try:

        customer_name = str(data["customer_name"])
        customer_email = str(data["customer_email"])
        booking_id = str(data["booking_id"])
        invoice_number = str(data["invoice_number"])
        vehicle = str(data["vehicle"])
        service = str(data["service"])
        branch = str(data["branch"])
        appointment_date = str(data["appointment_date"])
        appointment_time = str(data["appointment_time"])
        amount = float(data["amount"])
        payment_id = str(data["razorpay_payment_id"])

        # -------------------------------------------------
        # CREATE PDF IN MEMORY
        # -------------------------------------------------

        pdf_buffer = io.BytesIO()

        document = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            rightMargin=42,
            leftMargin=42,
            topMargin=42,
            bottomMargin=42,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "InvoiceTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#211F1D"),
            alignment=TA_CENTER,
            spaceAfter=8,
        )

        heading_style = ParagraphStyle(
            "InvoiceHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=colors.HexColor("#C97D14"),
            spaceAfter=6,
        )

        normal_style = ParagraphStyle(
            "InvoiceNormal",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=14,
            textColor=colors.HexColor("#3A3733"),
        )

        right_style = ParagraphStyle(
            "InvoiceRight",
            parent=normal_style,
            alignment=TA_RIGHT,
        )

        story = []

        # -------------------------------------------------
        # HEADER
        # -------------------------------------------------

        story.append(
            Paragraph("BAYLINE AUTO", title_style)
        )

        story.append(
            Paragraph(
                "Premium Vehicle Service & Operations",
                ParagraphStyle(
                    "Subtitle",
                    parent=normal_style,
                    alignment=TA_CENTER,
                    textColor=colors.HexColor("#6B665F"),
                )
            )
        )

        story.append(Spacer(1, 22))

        # -------------------------------------------------
        # INVOICE INFO
        # -------------------------------------------------

        invoice_info = [
            [
                Paragraph("<b>INVOICE</b>", heading_style),
                Paragraph("<b>PAYMENT STATUS</b>", heading_style),
            ],
            [
                Paragraph(invoice_number, normal_style),
                Paragraph(
                    '<font color="#306363"><b>PAID</b></font>',
                    normal_style
                ),
            ],
            [
                Paragraph(
                    f"<b>Booking ID:</b><br/>{booking_id}",
                    normal_style
                ),
                Paragraph(
                    f"<b>Payment ID:</b><br/>{payment_id}",
                    normal_style
                ),
            ],
        ]

        info_table = Table(
            invoice_info,
            colWidths=[250, 250],
        )

        info_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0),
                 colors.HexColor("#F2EFE9")),
                ("BOX", (0, 0), (-1, -1), 0.7,
                 colors.HexColor("#D6D0C7")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4,
                 colors.HexColor("#E2DDD5")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ])
        )

        story.append(info_table)

        story.append(Spacer(1, 22))

        # -------------------------------------------------
        # CUSTOMER
        # -------------------------------------------------

        story.append(
            Paragraph("CUSTOMER", heading_style)
        )

        customer_table = Table(
            [
                [
                    Paragraph(
                        f"<b>{customer_name}</b><br/>{customer_email}",
                        normal_style
                    ),
                    Paragraph(
                        f"<b>Invoice Date</b><br/>"
                        f"{datetime.now().strftime('%d %b %Y')}",
                        right_style
                    ),
                ]
            ],
            colWidths=[350, 150],
        )

        customer_table.setStyle(
            TableStyle([
                ("BOX", (0, 0), (-1, -1), 0.7,
                 colors.HexColor("#D6D0C7")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ])
        )

        story.append(customer_table)

        story.append(Spacer(1, 22))

        # -------------------------------------------------
        # SERVICE DETAILS
        # -------------------------------------------------

        story.append(
            Paragraph("SERVICE DETAILS", heading_style)
        )

        service_table = Table(
            [
                ["Vehicle", "Service", "Service Center"],
                [vehicle, service, branch],
            ],
            colWidths=[150, 175, 175],
        )

        service_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0),
                 colors.HexColor("#211F1D")),
                ("TEXTCOLOR", (0, 0), (-1, 0),
                 colors.white),
                ("FONTNAME", (0, 0), (-1, 0),
                 "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5,
                 colors.HexColor("#D6D0C7")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ])
        )

        story.append(service_table)

        story.append(Spacer(1, 10))

        appointment_table = Table(
            [
                ["Appointment Date", "Appointment Time"],
                [appointment_date, appointment_time],
            ],
            colWidths=[250, 250],
        )

        appointment_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0),
                 colors.HexColor("#F2EFE9")),
                ("FONTNAME", (0, 0), (-1, 0),
                 "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5,
                 colors.HexColor("#D6D0C7")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ])
        )

        story.append(appointment_table)

        story.append(Spacer(1, 25))

        # -------------------------------------------------
        # TOTAL
        # -------------------------------------------------

        total_table = Table(
            [
                [
                    Paragraph(
                        "<b>TOTAL PAID</b>",
                        heading_style
                    ),
                    Paragraph(
                        f"<b>₹{amount:,.2f}</b>",
                        ParagraphStyle(
                            "Total",
                            parent=right_style,
                            fontSize=18,
                            textColor=colors.HexColor("#C97D14"),
                        )
                    ),
                ]
            ],
            colWidths=[350, 150],
        )

        total_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1),
                 colors.HexColor("#F2EFE9")),
                ("BOX", (0, 0), (-1, -1), 1,
                 colors.HexColor("#C97D14")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ])
        )

        story.append(total_table)

        story.append(Spacer(1, 30))

        story.append(
            Paragraph(
                "Thank you for choosing BayLine Auto. "
                "Please retain this invoice for your records.",
                ParagraphStyle(
                    "Footer",
                    parent=normal_style,
                    alignment=TA_CENTER,
                    textColor=colors.HexColor("#6B665F"),
                )
            )
        )

        document.build(story)

        pdf_bytes = pdf_buffer.getvalue()
        pdf_buffer.close()

        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

        # -------------------------------------------------
        # SEND EMAIL THROUGH RESEND
        # -------------------------------------------------

        email_params = {
            "from": RESEND_FROM_EMAIL,
            "to": [customer_email],
            "subject": f"BayLine Invoice {invoice_number}",
            "html": f"""
                <div style="font-family:Arial,sans-serif;
                            max-width:620px;margin:auto;
                            color:#211F1D">

                    <h2 style="margin-bottom:4px;">
                        BAY<span style="color:#E8961F;">LINE</span> AUTO
                    </h2>

                    <p style="color:#666;">
                        Your service payment has been successfully received.
                    </p>

                    <div style="
                        margin:24px 0;
                        padding:20px;
                        border:1px solid #ddd;
                        border-radius:12px;
                    ">

                        <p>
                            <strong>Invoice:</strong>
                            {invoice_number}
                        </p>

                        <p>
                            <strong>Service:</strong>
                            {service}
                        </p>

                        <p>
                            <strong>Vehicle:</strong>
                            {vehicle}
                        </p>

                        <p>
                            <strong>Service Center:</strong>
                            {branch}
                        </p>

                        <p>
                            <strong>Appointment:</strong>
                            {appointment_date} · {appointment_time}
                        </p>

                        <p style="font-size:22px;">
                            <strong>Paid: ₹{amount:,.2f}</strong>
                        </p>

                    </div>

                    <p>
                        Your official BayLine invoice is attached to this email.
                    </p>

                    <p style="color:#888;font-size:12px;">
                        This is an automated transactional email from BayLine Auto.
                    </p>

                </div>
            """,
            "attachments": [
                {
                    "filename": f"{invoice_number}.pdf",
                    "content": pdf_base64,
                }
            ],
        }

        email_response = resend.Emails.send(email_params)

        return jsonify({
            "success": True,
            "invoice_number": invoice_number,
            "email": customer_email,
            "email_id": getattr(email_response, "id", None),
        })

    except Exception as e:

        print("Invoice/email error:")
        print(e)

        return jsonify({
            "success": False,
            "error": "Unable to generate or send invoice.",
            "details": str(e),
        }), 500

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