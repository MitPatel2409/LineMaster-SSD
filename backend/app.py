import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from simulation import run_simulation


app = Flask(__name__)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
        }
    },
)


class ValidationError(ValueError):
    """Raised when simulation input is invalid."""


NUMERIC_RULES = {
    "totalBoxes": (0.0, 100000.0),
    "totalJiffies": (0.0, 100000.0),
    "excellent": (0.0, 100.0),
    "good": (0.0, 100.0),
    "bad": (0.0, 100.0),
    "aisles": (1.0, 200.0),
    "ratioBoxOV": (0.0, 1000.0),
    "ratioBoxBig": (0.0, 1000.0),
    "ratioBoxMed": (0.0, 1000.0),
    "ratioJiffySB": (0.0, 1000.0),
    "ratioJiffyJif": (0.0, 1000.0),
}

ASSUMPTION_RULES = {
    "shiftMinutes": (15.0, 240.0),
    "maxSimulationMinutes": (30.0, 480.0),
    "beltTravelMinutes": (1.0, 15.0),
    "boxLineRatePerHour": (60.0, 3600.0),
    "jiffyLineRatePerHour": (60.0, 4800.0),
    "aisleCapacityItems": (50.0, 500.0),
    "excellentRatePerHour": (60.0, 1200.0),
    "goodRatePerHour": (60.0, 1200.0),
    "lowRatePerHour": (30.0, 1200.0),
    "safeWipPerStower": (1.0, 40.0),
    "safeWipFloor": (1.0, 300.0),
    "basePenaltyThreshold": (0.1, 0.95),
    "minPenaltyThreshold": (0.05, 0.9),
    "oversizeBaselineRatio": (0.0, 0.5),
    "thresholdDropScale": (0.001, 1.0),
    "thresholdDropAmount": (0.01, 1.0),
    "boxPenaltyMultiplier": (1.0, 5.0),
    "objectiveTimeWeight": (1.0, 100000.0),
    "objectiveUnstowedWeight": (1.0, 100000.0),
    "objectiveUnfinishedPenalty": (0.0, 2000000.0),
    "searchWindowBuffer": (0.0, 200.0),
    "searchCap": (10.0, 600.0),
    "searchStepThreshold": (1.0, 500.0),
    "searchStepLarge": (1.0, 20.0),
}


def _format_number(value):
    return str(int(value)) if float(value).is_integer() else str(value)


def _parse_numeric_field(payload, field_name):
    if field_name not in payload:
        raise ValidationError(f"{field_name} is required.")

    raw_value = payload.get(field_name)
    try:
        value = float(raw_value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(f"{field_name} must be a valid number.") from exc

    min_value, max_value = NUMERIC_RULES[field_name]
    if value < min_value or value > max_value:
        raise ValidationError(
            f"{field_name} must be between {_format_number(min_value)} and {_format_number(max_value)}."
        )

    return value


def _parse_optional_assumptions(payload):
    assumptions_payload = payload.get("assumptions", {})
    if assumptions_payload is None:
        return {}

    if not isinstance(assumptions_payload, dict):
        raise ValidationError("assumptions must be a JSON object when provided.")

    unknown_assumption_keys = sorted(set(assumptions_payload.keys()) - set(ASSUMPTION_RULES.keys()))
    if unknown_assumption_keys:
        raise ValidationError(f"Unsupported assumptions: {', '.join(unknown_assumption_keys)}")

    parsed_assumptions = {}
    for field_name, raw_value in assumptions_payload.items():
        try:
            value = float(raw_value)
        except (TypeError, ValueError) as exc:
            raise ValidationError(f"assumptions.{field_name} must be a valid number.") from exc

        min_value, max_value = ASSUMPTION_RULES[field_name]
        if value < min_value or value > max_value:
            raise ValidationError(
                f"assumptions.{field_name} must be between {_format_number(min_value)} and {_format_number(max_value)}."
            )

        parsed_assumptions[field_name] = value

    min_threshold = parsed_assumptions.get("minPenaltyThreshold")
    base_threshold = parsed_assumptions.get("basePenaltyThreshold")
    if min_threshold is not None and base_threshold is not None and min_threshold > base_threshold:
        raise ValidationError("assumptions.minPenaltyThreshold cannot exceed assumptions.basePenaltyThreshold.")

    shift_minutes = parsed_assumptions.get("shiftMinutes")
    max_sim_minutes = parsed_assumptions.get("maxSimulationMinutes")
    if shift_minutes is not None and max_sim_minutes is not None and max_sim_minutes < shift_minutes:
        raise ValidationError("assumptions.maxSimulationMinutes must be greater than or equal to assumptions.shiftMinutes.")

    return parsed_assumptions


def _validate_payload(payload):
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object.")

    values = {field_name: _parse_numeric_field(payload, field_name) for field_name in NUMERIC_RULES}

    if values["totalBoxes"] + values["totalJiffies"] <= 0:
        raise ValidationError("At least one of totalBoxes or totalJiffies must be greater than zero.")

    if values["excellent"] + values["good"] + values["bad"] <= 0:
        raise ValidationError("At least one stower is required across excellent, good, and bad.")

    if values["ratioBoxOV"] + values["ratioBoxBig"] + values["ratioBoxMed"] <= 0:
        raise ValidationError("Box cart mix ratios must sum to more than zero.")

    if values["ratioJiffySB"] + values["ratioJiffyJif"] <= 0:
        raise ValidationError("Jiffy cart mix ratios must sum to more than zero.")

    parsed_assumptions = _parse_optional_assumptions(payload)

    return (
        values["totalBoxes"],
        values["totalJiffies"],
        values["excellent"],
        values["good"],
        values["bad"],
        values["aisles"],
        values["ratioBoxOV"],
        values["ratioBoxBig"],
        values["ratioBoxMed"],
        values["ratioJiffySB"],
        values["ratioJiffyJif"],
        parsed_assumptions,
    )


@app.route("/api/simulate", methods=["POST"])
def simulate():
    try:
        payload = request.get_json(silent=False)
    except Exception:
        return (
            jsonify(
                {
                    "error": "validation_error",
                    "message": "Invalid JSON request body.",
                }
            ),
            400,
        )

    try:
        params = _validate_payload(payload)
        result = run_simulation(*params)
        return jsonify(result), 200
    except ValidationError as exc:
        return jsonify({"error": "validation_error", "message": str(exc)}), 400
    except Exception:
        app.logger.exception("Unexpected error while running simulation")
        return (
            jsonify(
                {
                    "error": "internal_error",
                    "message": "Unable to complete simulation right now. Please retry.",
                }
            ),
            500,
        )


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "0") == "1"
    app.run(debug=debug_mode, port=5000)
