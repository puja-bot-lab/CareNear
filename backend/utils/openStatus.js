function isOpenNow(hospital) {
  if (hospital.open24Hours) return true;

  const now = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());

  const current = Number(now.replace(":", ""));
  const opening = Number(hospital.openTime.replace(":", ""));
  const closing = Number(hospital.closeTime.replace(":", ""));

  if (opening <= closing) {
    return current >= opening && current < closing;
  }

  return current >= opening || current < closing;
}

module.exports = { isOpenNow };
