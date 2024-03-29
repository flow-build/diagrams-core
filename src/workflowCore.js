const { logger } = require('./utils/logger');
const { PersistorProvider } = require('./persist/provider');
const { Workflow } = require('./entities/workflow');

class WorkflowCore {
  static get instance() {
    return Workflow._instance;
  }

  static set instance(instance) {
    Workflow._instance = instance;
  }

  static get persistor() {
    return Workflow._persistor;
  }

  static set persistor(instance) {
    Workflow._persistor = instance;
  }

  constructor(persist_args) {
    if (Workflow.instance) {
      return Workflow.instance;
    }
    PersistorProvider.getPersistor(persist_args);
    this._db = persist_args;
    Workflow.instance = this;
  }

  async saveWorkflow(workflow_obj) {
    logger.debug('saveWorkflow service called');
    const { id, name, version, blueprint_id, server_id } = workflow_obj;

    return await new Workflow(
      id,
      name,
      version,
      blueprint_id,
      server_id
    ).save();
  }

  async getWorkflowById(id) {
    logger.debug('getWorkflowById service called');

    return await Workflow.fetch(id);
  }

  async getWorkflowsByServer(server_id) {
    logger.debug('getWorkflowsByServer service called');

    return await Workflow.fetchWorkflowsByServer(server_id);
  }

  async updateWorkflow(id, workflow) {
    logger.debug('updateWorkflow service called');

    return await Workflow.update(id, workflow);
  }

  async deleteWorkflow(id) {
    logger.debug('deleteWorkflow service called');

    return await Workflow.delete(id);
  }

  async deleteWorkflowsByServer(server_id) {
    logger.debug('deleteWorkflowsByServer service called');

    return await Workflow.deleteWorkflowsByServer(server_id);
  }
}

module.exports = {
  WorkflowCore,
};
