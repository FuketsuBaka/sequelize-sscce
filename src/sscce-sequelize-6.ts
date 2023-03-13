import { DataTypes, Model } from 'sequelize';
import { createSequelize6Instance } from '../setup/create-sequelize-instance';
import { expect } from 'chai';
import sinon from 'sinon';

// if your issue is dialect specific, remove the dialects you don't need to test on.
export const testingOnDialects = new Set(['mssql', 'sqlite', 'mysql', 'mariadb', 'postgres', 'postgres-native']);

// You can delete this file if you don't want your SSCCE to be tested against Sequelize 6

// Your SSCCE goes inside this function.
export async function run() {
  // This function should be used instead of `new Sequelize()`.
  // It applies the config for your SSCCE to work on CI.
  const sequelize = createSequelize6Instance({
    username: 'test',
    password: 'test',
    database: 'tests',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logQueryParameters: true,
    benchmark: true,
    define: {
      // For less clutter in the SSCCE
      timestamps: false,
    },
  });

  class User extends Model {}

  User.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false },
  }, {
    sequelize,
    tableName: 'users',
    schema: 'tests',
    modelName: 'User',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
    indexes: [
      {
        name: 'i_username_paranoid',
        unique: true,
        fields: ['username', 'deleted_at']
      }
    ]
  });

  // You can use sinon and chai assertions directly in your SSCCE.
  const spy = sinon.spy();
  sequelize.afterBulkSync(() => spy());
  await sequelize.sync({ force: true });
  expect(spy).to.have.been.called;

  const user1 = await User.create({ name: 'User 1', username: 'some_username' })
  const user2 = await User.create({ name: 'User 2', username: 'some_other_username' })
  const user3 = await User.create({ name: 'User 3', username: 'some_other_username' })

  console.log('User 1 (normal)', user1)
  console.log('User 2 (normal)', user2)
  console.log('User 3 (duplicate username of User 2)', user3)

  console.log('Summary on create\n',
    // @ts-ignore
    `User 1: ${user1.username} [${user1.id}] deleted_at: ${user1.deleted_at}\n`,
    // @ts-ignore
    `User 2: ${user2.username} [${user2.id}] deleted_at: ${user2.deleted_at} \n`,
    // @ts-ignore
    `User 3: ${user3.username} [${user3.id}] deleted_at: ${user3.deleted_at} \n`,
    )

  expect(await User.count()).to.equal(3);

  console.log(`Attempting to delete all users with username 'some_other_username'`)
  let res_delete
  try {
    res_delete = await User.destroy({where: { username: 'some_other_username' }})
  } catch (e) {
    // @ts-ignore
    console.log('Delete failed with error: ' + e.message)
    res_delete = e
  }

  expect(res_delete).to.be.an('Error')
}
