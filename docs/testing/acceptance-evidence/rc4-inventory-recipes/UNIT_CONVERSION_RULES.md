# RC4-9 Unit Conversion Rules

## Families

| Family | Units | Base |
| --- | --- | --- |
| mass | g, kg | gram |
| volume | ml, l | millilitre |
| count | piece (aliases: unit, each, pc) | piece |

## Behavior

- Conversions within a family are deterministic (`kg→g = ×1000`)
- Cross-family conversions **rejected** (`INCOMPATIBLE_UNITS`)
- Unsupported labels **rejected** (`UNSUPPORTED_UNIT`)
- Effective qty = `quantity × waste_factor / yield_factor`, then convert to inventory item unit

No silent weight↔volume or piece↔weight coercion.
