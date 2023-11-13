"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Chapter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Chapter.belongsTo(models.Course, {
        foreignKey: "courseId",
      });
      Chapter.hasMany(models.Page, {
        foreignKey: "chapterId",
      });
    }
    static addChapter({ title, description, userId }) {
      // define association here
      return Chapter.create({
        title: title,
        userId:userId,
        description: description,
      });
    }
  }
  Chapter.init(
    {
      title: DataTypes.STRING,
      description: DataTypes.TEXT,
      courseId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Chapter",
    },
  );
  return Chapter;
};
