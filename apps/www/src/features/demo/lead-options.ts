const countries = [
  ["PH", "Philippines"],
  ["SG", "Singapore"],
  ["BN", "Brunei"],
  ["KH", "Cambodia"],
  ["ID", "Indonesia"],
  ["LA", "Laos"],
  ["MY", "Malaysia"],
  ["MM", "Myanmar"],
  ["TH", "Thailand"],
  ["TL", "Timor-Leste"],
  ["VN", "Vietnam"],
  ["AU", "Australia"],
  ["CA", "Canada"],
  ["JP", "Japan"],
  ["NZ", "New Zealand"],
  ["KR", "South Korea"],
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["US", "United States"]
] as const;

const philippineProvinces = [
  "Abra", "Agusan del Norte", "Agusan del Sur", "Aklan", "Albay", "Antique",
  "Apayao", "Aurora", "Basilan", "Bataan", "Batanes", "Batangas", "Benguet",
  "Biliran", "Bohol", "Bukidnon", "Bulacan", "Cagayan", "Camarines Norte",
  "Camarines Sur", "Camiguin", "Capiz", "Catanduanes", "Cavite", "Cebu",
  "Cotabato", "Davao de Oro", "Davao del Norte", "Davao del Sur",
  "Davao Occidental", "Davao Oriental", "Dinagat Islands", "Eastern Samar",
  "Guimaras", "Ifugao", "Ilocos Norte", "Ilocos Sur", "Iloilo", "Isabela",
  "Kalinga", "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur", "Leyte",
  "Maguindanao del Norte", "Maguindanao del Sur", "Marinduque", "Masbate",
  "Misamis Occidental", "Misamis Oriental", "Mountain Province", "Negros Occidental",
  "Negros Oriental", "Northern Samar", "Nueva Ecija", "Nueva Vizcaya",
  "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Pampanga", "Pangasinan",
  "Quezon", "Quirino", "Rizal", "Romblon", "Samar", "Sarangani", "Siquijor",
  "Sorsogon", "South Cotabato", "Southern Leyte", "Sultan Kudarat", "Sulu",
  "Surigao del Norte", "Surigao del Sur", "Tarlac", "Tawi-Tawi", "Zambales",
  "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay", "Metro Manila"
] as const;

export { countries, philippineProvinces };
