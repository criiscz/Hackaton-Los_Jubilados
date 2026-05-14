const env = process.env.NODE_ENV || "development";

if (env === "development" || env === "test") {
  const config = require("./config.json");
  const envConfig = config[env];
  console.log(envConfig);

  Object.keys(envConfig).forEach((key) => {
    if (!process.env[key]) {
      process.env[key] = envConfig[key];
    }
  });
}
