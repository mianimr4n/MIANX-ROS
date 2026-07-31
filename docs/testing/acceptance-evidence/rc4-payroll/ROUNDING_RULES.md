# Rounding Rules

- All money math in integer minor units (paisa)
- Conversion: Math.round(major * 100)
- Display major: Math.round(minor) / 100
- No floating-point accumulation in the engine
