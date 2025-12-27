function analyzeRisk(part) {
  let riskScore = 0.2;
  let reason = "Normal production";

  if (part.quantity > 100) {
    riskScore = 0.85;
    reason = "Unusually high quantity";
  }

  return {
    riskScore,
    riskLevel: riskScore > 0.7 ? "HIGH" : "LOW",
    reason
  };
}

module.exports = { analyzeRisk };
