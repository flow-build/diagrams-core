const { v4: uuid } = require('uuid');
const { PersistorSingleton } = require('../persist/persist');

class BaseEntity {
  constructor() {
    this.id = uuid();
    this.created_at = new Date();
  }

  serialize() {
    return this.constructor.serialize(this);
  }
}

class PersistedEntity extends BaseEntity {
  static getPersist() {
    return new PersistorSingleton().getPersistInstance(
      this.getEntityClass().name
    );
  }

  static async fetch(...args) {
    const serialized = await this.getPersist().get(...args);
    return this.deserialize(serialized);
  }

  static async fetchBatch(...args) {
    const serialized = await this.getPersist().getBatch(...args);
    return this.deserialize(serialized);
  }

  static async fetchAll() {
    const serialized = await this.getPersist().getAll();
    return this.deserialize(serialized);
  }

  static async fetchByUserId(...args) {
    const serialized = await this.getPersist().getByUserId(...args);
    return this.deserialize(serialized);
  }

  static async fetchByWorkflowId(...args) {
    const serialized = await this.getPersist().getByWorkflowId(...args);
    return this.deserialize(serialized);
  }

  static async fetchLatestByWorkflowId(...args) {
    const serialized = await this.getPersist().getLatestByWorkflowId(...args);
    return this.deserialize(serialized);
  }

  static async fetchByUserAndWF(...args) {
    const serialized = await this.getPersist().getByUserAndWF(...args);
    return this.deserialize(serialized);
  }

  static async fetchWorkflowsByServer(...args) {
    const serialized = await this.getPersist().getWorkflowsByServer(...args);
    return this.deserialize(serialized);
  }

  static async update(...args) {
    const [serialized] = await this.getPersist().update(...args);
    return this.deserialize(serialized);
  }

  static async delete(...args) {
    return await this.getPersist().delete(...args);
  }

  static async deleteBatch(...args) {
    return await this.getPersist().deleteBatch(...args);
  }

  static async deleteWorkflowsByServer(...args) {
    return await this.getPersist().deleteWorkflowsByServer(...args);
  }

  static async deleteByDiagramId(...args) {
    return await this.getPersist().deleteByDiagramId(...args);
  }

  static async deleteByWorkflowId(...args) {
    return await this.getPersist().deleteByWorkflowId(...args);
  }

  static async fetchDiagramIdsByWorkflowId(...args) {
    const serialized = await this.getPersist().getDiagramIdsByWorkflowId(
      ...args
    );
    return this.deserialize(serialized);
  }

  static async fetchWorkflowIdsByDiagramId(...args) {
    const serialized = await this.getPersist().getWorkflowIdsByDiagramId(
      ...args
    );
    return this.deserialize(serialized);
  }

  constructor() {
    super();
  }

  getPersist() {
    return this.constructor.getPersist();
  }

  async save(...args) {
    await this.getPersist().save(this.serialize(), ...args);
    return this;
  }

  async delete(...args) {
    await this.getPersist().delete(this.id, ...args);
    return this;
  }
}

module.exports = {
  BaseEntity,
  PersistedEntity,
};
