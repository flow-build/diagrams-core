const { Diagram } = require('../entities/diagram');
const { Blueprint } = require('../entities/blueprint');
const { Workflow } = require('../entities/workflow');
const { Server } = require('../entities/server');

class KnexPersist {
  constructor(db, class_, table) {
    this._db = db;
    this._class = class_;
    this._table = table;
  }

  async save(obj, ...args) {
    const is_update = obj.id && (await this.get(obj.id));
    if (is_update) {
      await this.update(obj.id, obj, ...args);
      return 'update';
    }
    await this.create(obj, ...args);
    return 'create';
  }

  async delete(obj_id) {
    return await this._db(this._table).where('id', obj_id).del();
  }

  async deleteBatch(obj_ids) {
    return await this._db(this._table).whereIn('id', obj_ids).del();
  }

  async get(obj_id) {
    return await this._db
      .select('*')
      .from(this._table)
      .where('id', obj_id)
      .first();
  }

  async getBatch(obj_ids) {
    return await this._db.select('*').from(this._table).whereIn('id', obj_ids);
  }

  async getAll() {
    return await this._db
      .select('*')
      .from(this._table)
      .orderBy('updated_at', 'desc');
  }
}

class DiagramKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Diagram, 'diagram');
  }

  async getAll() {
    const workflow = new WorkflowKnexPersist(this._db);
    return await this._db(this._table)
      .leftJoin(
        workflow._table,
        `${workflow._table}.blueprint_id`,
        `${this._table}.blueprint_id`
      )
      .select(
        'diagram.id',
        'diagram.name',
        'diagram_xml',
        'diagram.blueprint_id',
        'diagram.user_id',
        'diagram.type',
        'diagram.user_default',
        'diagram.is_public',
        'diagram.created_at',
        'diagram.updated_at',
        'is_aligned',
        'workflow.id as workflow_id'
      )
      .orderBy('updated_at', 'desc');
  }

  async create(diagram) {
    await this._db(this._table).insert(diagram);
    return 'create';
  }

  async update(diagram_id, diagram) {
    return await this._db(this._table)
      .where('id', diagram_id)
      .update({ ...diagram, updated_at: 'now' })
      .returning('*');
  }

  async unsetDefault({ user_id, exception, blueprint_id }) {
    return await this._db(this._table)
      .where('user_id', user_id)
      .andWhere('blueprint_id', blueprint_id)
      .update({ user_default: false })
      .modify((builder) => {
        if (exception) {
          builder.where('id', '!=', exception);
        }
      });
  }

  async setDefault({ user_id, id, blueprint_id }) {
    return await this._db.raw(`
      update diagram set user_default = case
      when id='${id}' then true
      when id!='${id}' then false
      end,
      updated_at = now()
      where user_id='${user_id}'
      and blueprint_id='${blueprint_id}'
      returning *;
    `);
  }

  async delete(id) {
    await this._db(this._table).where('id', id).del();
  }

  async getByUserId(user_id) {
    const workflow = new WorkflowKnexPersist(this._db);
    return await this._db(this._table)
      .leftJoin(
        workflow._table,
        `${workflow._table}.blueprint_id`,
        `${this._table}.blueprint_id`
      )
      .select(
        'diagram.id',
        'diagram.name',
        'diagram_xml',
        'diagram.blueprint_id',
        'diagram.user_id',
        'diagram.type',
        'diagram.user_default',
        'diagram.is_public',
        'diagram.created_at',
        'diagram.updated_at',
        'is_aligned',
        'workflow.id as workflow_id'
      )
      .where('user_id', user_id)
      .orderBy('diagram.updated_at', 'desc');
  }

  async getByWorkflowId(workflow_id) {
    const workflow = new WorkflowKnexPersist(this._db);
    return await this._db(this._table)
      .leftJoin(
        workflow._table,
        `${workflow._table}.blueprint_id`,
        `${this._table}.blueprint_id`
      )
      .select(
        'diagram.id',
        'diagram.name',
        'diagram_xml',
        'diagram.blueprint_id',
        'diagram.user_id',
        'diagram.type',
        'diagram.user_default',
        'diagram.is_public',
        'diagram.created_at',
        'diagram.updated_at',
        'is_aligned',
        'workflow.id as workflow_id'
      )
      .where('workflow.id', workflow_id)
      .orderBy('diagram.updated_at', 'desc');
  }

  async getLatestByWorkflowId(workflow_id) {
    const workflows = await this.getByWorkflowId(workflow_id);
    return workflows[0];
  }

  async getByUserAndWF(user_id, workflow_id) {
    const workflow = new WorkflowKnexPersist(this._db);
    return await this._db(this._table)
      .leftJoin(
        workflow._table,
        `${workflow._table}.blueprint_id`,
        `${this._table}.blueprint_id`
      )
      .select(
        'diagram.id',
        'diagram.name',
        'diagram_xml',
        'diagram.blueprint_id',
        'diagram.user_id',
        'diagram.type',
        'diagram.user_default',
        'diagram.is_public',
        'diagram.created_at',
        'diagram.updated_at',
        'is_aligned',
        'workflow.id as workflow_id'
      )
      .where({ user_id: user_id, 'workflow.id': workflow_id })
      .orWhere({ is_public: true, 'workflow.id': workflow_id })
      .orderBy([
        { column: 'diagram.user_id', order: 'asc' },
        { column: 'diagram.is_public', order: 'desc' },
        { column: 'diagram.updated_at', order: 'desc' },
      ]);
  }

  async getLatestPublic() {
    const workflow = new WorkflowKnexPersist(this._db);
    return await this._db(this._table)
      .leftJoin(
        workflow._table,
        `${workflow._table}.blueprint_id`,
        `${this._table}.blueprint_id`
      )
      .select(
        'diagram.id',
        'diagram.name',
        'diagram_xml',
        'diagram.blueprint_id',
        'diagram.user_id',
        'diagram.type',
        'diagram.user_default',
        'diagram.is_public',
        'diagram.created_at',
        'diagram.updated_at',
        'is_aligned',
        'workflow.id as workflow_id'
      )
      .where('diagram.is_public', true)
      .orderBy('updated_at', 'desc')
      .first();
  }

  async getDefaultDiagram(user_id, filters = {}) {
    const workflow = new WorkflowKnexPersist(this._db);
    return await this._db(this._table)
      .leftJoin(
        workflow._table,
        `${workflow._table}.blueprint_id`,
        `${this._table}.blueprint_id`
      )
      .select(
        'diagram.id',
        'diagram.name',
        'diagram_xml',
        'diagram.blueprint_id',
        'diagram.user_id',
        'diagram.type',
        'diagram.user_default',
        'diagram.is_public',
        'diagram.created_at',
        'diagram.updated_at',
        'is_aligned',
        'workflow.id as workflow_id'
      )
      .where('diagram.user_id', user_id)
      .andWhere('diagram.user_default', true)
      .first()
      .modify((builder) => {
        if (filters) {
          if (filters.workflow_id) {
            builder.where('workflow.id', '=', filters.workflow_id);
          }
        }
      });
  }

  async getDiagramsByBlueprintsBatch(blueprint_ids) {
    return await this._db
      .select('*')
      .from(this._table)
      .whereIn('blueprint_id', blueprint_ids);
  }
}

class BlueprintKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Blueprint, 'blueprint');
  }

  async save(blueprint) {
    let result;
    result = await this._db(this._table).where(
      'blueprint_spec',
      blueprint.blueprint_spec
    );
    if (result.length === 0) {
      const insertResult = await this._db(this._table)
        .insert(blueprint)
        .returning('*');
      return insertResult[0];
    } else {
      return result[0];
    }
  }

  async update(id, blueprint_spec) {
    return await this._db(this._table)
      .where('id', id)
      .update({ blueprint_spec })
      .returning('*');
  }
}

class WorkflowKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Workflow, 'workflow');
  }

  async create(workflow) {
    await this._db(this._table).insert(workflow);
    return 'create';
  }

  async update(id, workflow) {
    return await this._db(this._table)
      .where('id', id)
      .update({ ...workflow })
      .returning('*');
  }

  async getWorkflowsByServer(server_id) {
    return await this._db
      .select('*')
      .from(this._table)
      .where('server_id', server_id)
      .orderBy('updated_at', 'desc');
  }

  async deleteWorkflowsByServer(server_id) {
    return await this._db(this._table).where('server_id', server_id).del();
  }
}

class ServerKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Server, 'server');
  }

  async create(server) {
    await this._db(this._table).insert(server);
    return 'create';
  }

  async update(server_id, server) {
    return await this._db(this._table)
      .where('id', server_id)
      .update({ ...server, updated_at: 'now' })
      .returning('*');
  }

  async getByUrl(url) {
    return await this._db
      .select('*')
      .from(this._table)
      .where('url', url)
      .first();
  }
}

module.exports = {
  DiagramKnexPersist,
  BlueprintKnexPersist,
  WorkflowKnexPersist,
  ServerKnexPersist,
};
