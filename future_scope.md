# Future Scope: Replacing the Rule-Based Model

ScrollSense AI version 1 uses an explainable rule-based scoring engine in:

```text
src/lib/risk-engine.ts
```

This is intentional for a beginner-friendly student project because it runs without paid APIs, a backend database, or a trained model file.

## Why Replace It Later

A trained model can learn feature weights from real labeled data instead of manually chosen weights. This may improve accuracy if the dataset is high quality and ethically collected.

## Possible Model Options

### Logistic Regression

Good for:

- Simple binary or multi-class risk classification
- Easy explanation
- Fast inference
- Academic presentation

Example categories:

- Low
- Moderate
- High
- Critical

### Random Forest

Good for:

- Non-linear relationships
- Feature importance
- Mixed behavioral and cognitive inputs

Useful explanation:

- Which inputs most influenced the final class
- Whether sleep, urge, session duration, or cognitive scores matter most

### TensorFlow.js

Good for:

- Browser-side ML inference
- No backend server requirement
- Future neural network experiments

The trained model could be exported as a JSON model and loaded in the browser.

## Dataset Needed

A real trained model would need ethically collected data such as:

- Consent form
- Age range
- Student status
- Daily short-video usage
- Sleep hours
- Study hours
- Mood check-ins
- Cognitive test results
- Human-labeled risk category or validated survey score

Do not collect private phone data without explicit consent and institutional approval.

## Replacement Architecture

```text
Current:
RiskInput -> rule weights -> RiskScore

Future:
RiskInput -> feature normalization -> trained model -> probability/class -> explanation layer -> RiskScore
```

## Implementation Plan

1. Keep the existing `RiskInput` type.
2. Add a `model-engine.ts` file.
3. Normalize all features to numeric values.
4. Load trained model weights or a TensorFlow.js model.
5. Return the same `RiskScore` type used by the dashboard.
6. Keep the current rule engine as fallback.
7. Compare rule-based and ML predictions during testing.

## Recommended Safety Rule

Even with a trained model, keep the app wording clear:

- Not a medical diagnosis
- Educational estimate only
- No private phone tracking
- Human interpretation required

