"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Course.hasMany(models.Chapter, {
        foreignKey: "courseId",
      });
      Course.belongsTo(models.User, {
        foreignKey: "userId",
      });
      Course.hasMany(models.Enrollment, { foreignKey: 'courseId' });

    }
    static addcourse({ title, userId, educatorName }) {
      return Course.create({
        title: title,
        userId: userId,
        educatorName: educatorName,
      });
    }
  }
  Course.init(
    {
      title: DataTypes.STRING,
      userId: DataTypes.INTEGER,
      educatorName: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Course",
    },
  );
  return Course;
};
