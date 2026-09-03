"""Single source of truth for weighted performance scoring."""

WEIGHTS = (0.30, 0.20, 0.20, 0.15, 0.15)

def calculate_score(*components: float) -> float:
    if len(components) != 5 or any(value < 0 or value > 100 for value in components):
        raise ValueError("Every score component must be between 0 and 100.")
    return round(sum(value * weight for value, weight in zip(components, WEIGHTS)), 1)
