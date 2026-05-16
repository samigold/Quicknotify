const { Sequelize } = require("sequelize");

console.log("DB ENV:", {
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT
});
const sequelize = new Sequelize(
  process.env.DB_NAME || "auth_db",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "postgres123",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
  }

);

module.exports = sequelize;