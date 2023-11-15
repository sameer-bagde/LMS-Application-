"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Page extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Page.belongsTo(models.Chapter, {
        foreignKey: "chapterId",
      });
    }

    static addPage({ title, content}) {
      return Page.create({
        title: title,
        content: content.length(1024) ,
      });
    
    }
    setPagemarkAsComplete(bool) {
      return this.update({ completed: bool });
    }
  }
  Page.init(
    {
      title: DataTypes.STRING,
      content: DataTypes.TEXT,
      chapterId: DataTypes.INTEGER,
      userId: DataTypes.INTEGER,
      isComplete: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Page",
    },
  );
  return Page;
};
