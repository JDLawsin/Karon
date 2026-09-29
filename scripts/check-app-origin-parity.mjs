const readOrigin = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the app-origin parity check`);
  return new URL(value).origin;
};

const wwwAppOrigin = readOrigin("APP_URL");
const clinicOrigin = readOrigin("SITE_URL");

if (wwwAppOrigin !== clinicOrigin) {
  throw new Error(`App-origin mismatch: APP_URL is ${wwwAppOrigin}, clinic SITE_URL is ${clinicOrigin}`);
}

console.log(`App-origin parity passed for ${wwwAppOrigin}`);
