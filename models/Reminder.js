"use strict";
const sequelize = require("sequelize");
const DB = require("../DB");
const Reminder = DB.define("Reminder", {
    id: {
        type: sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idUser: sequelize.INTEGER,
    time: sequelize.DATE,
    sequenceStep: sequelize.INTEGER
}, {
    tableName: "Reminder"
});
exports.default = Reminder;
