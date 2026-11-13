# Glossary

Product vocabulary for the Kinmetrix clinic tablet prototype. Use these terms in screens, PRDs, and copy.

## Session building blocks

| Term | Definition |
| --- | --- |
| **Program** | Ordered set of training Groups for a member. |
| **Group** | One training session (workout) with multiple Steps. |
| **Step** | One exercise at a single rotator angle (one direction) inside a Group. |
| **Template** | Reusable Program / Group / Step definition used to create member or team content. |
| **Protocol session** | Assessment configuration (target weight, angles, reps, direction flags). |
| **Assessment batch** | One completed round of assessments across rotator angles. |
| **Protocol assessment** | Config for one assessment at one rotator angle inside a batch. |

## Exercise types

| Term | Definition |
| --- | --- |
| **Isometric** | Hold at a fixed arc position. |
| **Isokinetic** | Move through an arc (start and final arc angles). |
| **Rotator angle** | Device direction for a step (0°, 45°, 90°, … 315°). |
| **Arc angle** | Position along the movement arc (range of motion). |
| **Target weight** | Target force (kg) for a step or assessment. |

## Analysis (what the UI shows)

| Term | Definition |
| --- | --- |
| **User analysis** | Aggregated results for a completed Group or Assessment batch (symmetry, stability, average force, ROM). Primary object on history, compare, and detail screens. |
| **Frame analysis** | Per-rep building block behind user analysis. Not shown as its own screen. |
| **Stable weight (sw)** | Mean force (kg) while force is held steadily. |
| **Stable duration (sd)** | How long the stable region lasted (frames). |
| **Ramp duration (rd)** | Frames from start of contraction to the stable region. |
| **Std dev** | Force consistency in the stable region. |
| **Symmetry score** | Aggregate left/right and related direction pairs; closer to 0 is better. |
| **Range of motion (ROM)** | Average motion across assessed directions. |
| **Stability** | Consistency metric per direction or overall. |

## Clinic context

| Term | Definition |
| --- | --- |
| **Team** | Clinic / org roster the shared iPad is signed into. |
| **Member / user** | Athlete or patient on the team. |
| **Team settings** | Admin area for roster, columns, and templates. |
| **Waiver** | Consent step before some member flows. |
| **Device** | Hardware station (calibration, control, live run). Prototype screens are placeholders. |
