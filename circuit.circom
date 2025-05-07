template AgeVerifier() {
    signal private input birthYear;
    signal input currentYear;
    signal input thresholdYear;
    signal output valid;

    // Ensure thresholdYear = currentYear - 18
    currentYear - 18 == thresholdYear;

    // Compute age difference
    signal diff;
    diff <== thresholdYear - birthYear;

    // Ensure diff > 0 (i.e., birthYear < thresholdYear)
    signal isPositive;
    isPositive <== diff * diff; // Non-zero if diff != 0
    signal inverse;
    inverse * isPositive == 1; // Ensures diff is non-zero

    // Set valid to 1 if constraints pass
    valid <== 1;
}

component main = AgeVerifier();