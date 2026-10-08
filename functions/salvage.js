function salvageForLosses(losses, units) {
  return Object.entries(losses).reduce(
    (total, [type, count]) => total + (units[type]?.cost?.metal || 0) * count * 0.3,
    0
  );
}

module.exports = { salvageForLosses };
