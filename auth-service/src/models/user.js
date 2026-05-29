const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  apiKey: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  apiKeyCreatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  apiKeyLastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  apiKeyActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("user", "admin"),
    defaultValue: "user",
  },
},
{tableName: "users"}
);

module.exports = User;