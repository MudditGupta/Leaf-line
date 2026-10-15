// Who the user is and which language they read; appended to every AI prompt.
const PROFILES = {
  home: "",
  farmer: "The user is a farmer in India growing field crops, vegetables or orchard trees. Give field-scale advice: irrigation interval in days, soil and fertiliser in farm terms, and for pests or disease give both organic and chemical options in general terms, telling them to confirm product and dose with their local Krishi Vigyan Kendra (KVK) or agriculture officer.",
  nursery: "The user runs a plant nursery in India. Include propagation tips and phrase care advice so it can be passed on to customers buying the plant.",
};
export function withContext(prompt, { profile = "home", lang = "en" } = {}) {
  let extra = PROFILES[profile] || "";
  if (lang === "hi") extra += " Write every text value in simple Hindi (Devanagari script). Keep the JSON keys and the status/urgency/difficulty enum values in English exactly as specified. Keep the scientific name in Latin.";
  return extra ? `${prompt}\n\n${extra.trim()}` : prompt;
}
