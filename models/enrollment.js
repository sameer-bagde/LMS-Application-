'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Enrollment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    Enrollment.belongsTo(models.Course, { foreignKey: 'courseId' });
    }
    setenrollmentStatus(bool) {
      return this.update({ completed: bool });
    }
    static enrolledcourse(courseId) {
      return this.findAll({
        where: {
          completed: true,
          courseId: courseId,
        },
        order: [["id", "ASC"]],
      });
    }

  }
  Enrollment.init({
    userId: DataTypes.INTEGER,
    courseId: DataTypes.INTEGER,
    enrollmentStatus: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Enrollment',
  });
  return Enrollment;
};