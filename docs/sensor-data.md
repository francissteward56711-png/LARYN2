# Sensor recording format

Select **Device & data → Choose a sensor CSV**, then **View recording**. Download a built-in synthetic example from the same page.

The first row must be exactly:

```csv
timestamp_ms,ax,ay,az,gx,gy,gz
0,0,0,1,0,0,0
50,0.02,0.01,1.1,0.2,0.4,0.1
100,0,0,1,0,0,0
```

| Column           | Unit           | Meaning                                                                                  |
| ---------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `timestamp_ms`   | Milliseconds   | Nonnegative time, strictly increasing between samples. May start at an arbitrary offset. |
| `ax`, `ay`, `az` | g              | Accelerometer measurements including gravity, within ±16 g.                              |
| `gx`, `gy`, `gz` | Degrees/second | Gyroscope measurements, within ±2,000 °/s.                                               |

Convert raw MPU6050 integers according to the sensor's configured measurement range before export. If a library returns m/s² or radians/s, convert those values into the units above. Column names, count, finite numbers, value ranges, and increasing timestamps are validated. Empty cells, duplicate times, and malformed rows are rejected without replacing the current recording.

Each file needs at least two samples. The maximum is 20,000 samples and 2 MB. UTF-8 BOMs and Windows line endings are supported. This numeric format does not support quoted cells, extra metadata, or event-label columns.

The displayed signal is:

```text
relative amplitude = abs(sqrt(ax² + ay² + az²) − 1)
```

This is the absolute deviation of acceleration magnitude from nominal gravity. It is a motion visualization, not an isolated throat vibration measurement or a medical feature calibrated for a particular person. Posture, placement, movement, and sensor calibration affect the trace. Gyroscope axes are retained on export but are not included in this plotted scalar.

Duration is the time between first and last samples. Average sampling rate is `(sample_count − 1) / duration_seconds`; it does not guarantee evenly spaced acquisition. The chart displays the final 30 or 60 seconds and thins large traces for display. Summary values and exports use the complete recording.

The synthetic recording has 1,201 samples at 20 Hz spanning 60 seconds and six explicitly simulated event labels. This rate is for the UI demonstration and is not a recommendation for speech acquisition. Imported recordings have no event labels. Their duration and sample count replace the demo swallow metrics; no swallow count, phrase, anomaly, or health assessment is inferred.

CSV contents remain in browser memory. Reloading the page discards the imported recording. Do not assume that viewing data on one device transfers it to another.
