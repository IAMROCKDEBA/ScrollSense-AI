# ScrollSense AI Project Explanation

## Abstract

ScrollSense AI is a web-based digital well-being analyzer that estimates student short-form video addiction risk. It combines self-reported usage, in-app video session behavior, mood changes, and cognitive test performance. The system uses an explainable AI/ML-style scoring model that can later be replaced by a trained machine learning model.

## Introduction

Short-form videos are designed for fast consumption and frequent reward. Students may open these platforms for entertainment, stress relief, motivation, or learning, but repeated use can become automatic and interfere with study time, sleep, attention, and mood. ScrollSense AI provides a privacy-friendly way to estimate risk without tracking private phone activity.

## Problem Statement

Many students cannot easily understand when short-form video use shifts from intentional entertainment to automatic scrolling. Existing screen-time tools may be platform-specific, phone-specific, or unavailable. This project estimates risk using only data collected inside the app and data reported by the user.

## Objectives

- Estimate short-form video addiction risk.
- Track mood before and after watching.
- Measure session behavior inside the web app.
- Assess reaction time, memory recall, and Stroop performance.
- Generate explainable risk factors.
- Recommend digital well-being actions.
- Preserve privacy by avoiding private phone or account tracking.

## Literature-Inspired Motivation

The project is inspired by digital well-being research areas including attention control, reward loops, impulse regulation, sleep hygiene, mood-based media use, and cognitive performance. It does not claim clinical accuracy, but it uses these concepts to create an educational scoring model.

## Proposed System

The app asks the student for basic usage habits, provides a short-video feed using public YouTube embeds or demo fallback videos, records session behavior, captures mood check-ins, runs cognitive tests, and displays risk scores and recommendations.

## Architecture Diagram in Text Form

```text
User
  |
  v
Next.js App Router UI
  |
  +--> Onboarding form
  +--> Mood check-ins
  +--> Video feed session
  +--> Cognitive tests
  |
  v
Zustand State Store
  |
  v
localStorage Persistence
  |
  v
Risk Input Builder
  |
  v
Explainable Risk Engine
  |
  v
Dashboard / Recommendations / Report

Server side:
Browser -> /api/youtube/search -> YouTube Data API v3
                         |
                         +--> Demo fallback if key is missing or API fails
```

## Modules

1. Landing page
2. Onboarding assessment
3. Mood check-in
4. YouTube short-video feed
5. Reaction time test
6. Memory recall test
7. Stroop test
8. AI/ML-style risk prediction
9. Explainable dashboard
10. Recommendations
11. Project report
12. Methodology and privacy page
13. Settings and API status

## Algorithm Explanation

The model accepts normalized risk inputs such as daily usage, late-night watching, losing track of time, urge to continue, mood drop, sleep hours, study hours, reaction time, memory score, and Stroop score.

Risk increases when:

- Daily short-video use is high.
- Actual usage exceeds planned time.
- Session duration is high.
- Late-night use is frequent.
- Unintentional opening is frequent.
- Urge to continue is high.
- Mood worsens after watching.
- Sleep is low.
- Study hours are low.
- Reaction time is slow.
- Memory or Stroop score is low.

Outputs include addiction risk, focus score, memory score, impulse control score, mood dependency score, digital well-being score, risk category, top three risk factors, and recommendations.

## Input/Output Table

| Input | Source | Output Influence |
| --- | --- | --- |
| Daily usage minutes | Onboarding | Addiction risk |
| Sleep hours | Onboarding | Well-being and risk |
| Study hours | Onboarding | Well-being and risk |
| Late-night usage | Onboarding | Risk and sleep-related recommendation |
| Planned vs actual time | Feed session | Impulse control |
| Videos watched | Feed session | Session intensity |
| Skip rate | Feed session | Impulsivity signal |
| Urge to continue | Mood/session | Addiction risk and impulse control |
| Mood drop | Mood check-in | Mood dependency |
| Reaction time | Cognitive test | Focus score |
| Memory score | Cognitive test | Memory score |
| Stroop score | Cognitive test | Focus and impulse control |

## Result Interpretation

- 0-25: Low
- 26-50: Moderate
- 51-75: High
- 76-100: Critical

The top risk factors explain why the score increased. Recommendations are generated from these same factors, so the output is transparent and easy to present.

## Privacy and Ethical Considerations

- No phone tracking.
- No private app tracking.
- No Instagram, TikTok, Facebook, or YouTube account access.
- No YouTube login.
- No personal data selling.
- localStorage is used for browser-only persistence.
- The YouTube API key is protected in a server route.
- This is not a medical diagnosis.
- Scores are estimates, not clinical assessments.
- YouTube videos are embedded, not downloaded or redistributed.

## Limitations

ScrollSense AI does not directly access private phone usage or third-party app activity. It estimates short-form video addiction risk using self-reported data, in-app behavior, and cognitive test results. The YouTube API does not provide a perfect Shorts-only filter, so short videos are approximated using public search parameters.

## Future Scope

- Train a Logistic Regression model from labeled survey data.
- Compare Random Forest feature importance with the current explanation system.
- Use TensorFlow.js for browser-side inference.
- Add optional authentication and a database.
- Add long-term trend analysis.
- Add consent-based anonymized research export.

## Conclusion

ScrollSense AI demonstrates how a privacy-friendly web app can estimate short-form video addiction risk using transparent data collection, cognitive tests, and explainable AI/ML-style scoring. It is suitable for academic presentation because it combines full-stack engineering, API integration, local data persistence, user-centered design, and responsible AI limitations.

