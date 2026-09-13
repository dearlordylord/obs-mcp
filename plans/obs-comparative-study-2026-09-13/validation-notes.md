# Evaluation validation and corrections

The rubric and viability requirements remain as fixed in `methodology.md`. Fixture implementation is calibrated before final verdicts. Preliminary runs are not final candidate evidence when a fixture defect affects them.

## 2026-09-13: independent fixture checks

- The initial fixture PNG string had a valid signature/IHDR/IEND but an invalid IDAT CRC and zlib checksum. Independent decoding caught this before synthesis. Screenshot results from that version cannot establish candidate image validity. The fixture author was asked to replace it with a valid PNG, validate chunk CRCs and decompression, and rerun affected candidates.
- Exact equality with the fixture's PNG bytes is insufficient as the only image oracle: a candidate may legitimately recompress a valid image. Validation should accept a complete valid image while rejecting a truncated prefix.
- State mutation plus a non-error readback is not enough to prove truthful readback values. Reviewers must inspect returned scene/mute/record state, and the fixture should validate those values or mark the semantic result unresolved.
- A server can reject an unknown entity before issuing an OBS request. That is valid failure handling; absence of an upstream call alone cannot make the probe fail.
- A finite response watchdog does not prove an indefinite hang. Published timeout settings must be respected, and an environment/fixture/invocation failure must not be scored as an implementation failure.
- Initial MCP failure classifications are provisional: process startup prerequisites, malformed MCP behavior, bad launch mappings, and fixture protocol incompatibility require separate causes.

The final report and candidate reviews must identify any outstanding fixture limitations and link to the final rerun evidence rather than relying on the preliminary results.
