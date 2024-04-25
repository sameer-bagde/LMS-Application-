'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MarkAsComplete extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      MarkAsComplete.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  MarkAsComplete.init({
    pageId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER,
    isComplete: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'MarkAsComplete',
  });
  return MarkAsComplete;
};