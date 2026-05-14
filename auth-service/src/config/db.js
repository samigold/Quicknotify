const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize("auth_db", "postgres", "postgres123", {
  host: "localhost",
  port: 5432,
  dialect: "postgres",
  logging: false,
});

module.exports = sequelize;