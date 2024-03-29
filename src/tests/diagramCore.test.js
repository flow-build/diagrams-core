const { Diagram } = require('../entities/diagram');
const { DiagramCore } = require('../../index');
const { validate } = require('uuid');
const { PersistorProvider } = require('../persist/provider');
const diagramExample = require('fs').readFileSync(
  './examples/diagram.xml',
  'utf8'
);
const { db } = require('../utils/db');
const { blueprint_spec } = require('../../examples/blueprint');
const _ = require('lodash');

const diagramPayload = {
  name: 'Test',
  user_id: '96293285-33b7-4a69-9b64-822059569734',
  diagram_xml: diagramExample,
};

const workflowPayload = {
  id: '681b5bc2-7fea-42f0-892c-f78525a6ccc7',
  name: 'Workflow Example',
  version: 1,
  server_id: '1c8f314b-5421-40cb-9a5b-73fca821c88f',
  blueprint_spec,
};

beforeAll(async () => {
  PersistorProvider.getPersistor(db);
  return db.raw('START TRANSACTION');
});

afterAll(async () => {
  await db.raw('ROLLBACK');
  const persist = Diagram.getPersist();
  await persist._db.destroy();
});

describe('DiagramCore tests (without workflow_id)', () => {
  test('constructor works', () => {
    const diagramCore = new DiagramCore(db);
    expect(diagramCore).toBeInstanceOf(DiagramCore);
  });

  test('create diagram', async () => {
    const diagramCore = new DiagramCore(db);
    const diagram = await diagramCore.saveDiagram(diagramPayload);
    expect(validate(diagram.id)).toBeTruthy();
    expect(diagram.name).toEqual('Test');
    expect(diagram.type).toEqual('standard');
  });

  test('create diagram with type nobags', async () => {
    const diagramCore = new DiagramCore(db);
    diagramPayload.type = 'nobags';
    const diagram = await diagramCore.saveDiagram(diagramPayload);
    expect(validate(diagram.id)).toBeTruthy();
    expect(diagram.name).toEqual('Test');
    expect(diagram.type).toEqual('nobags');
    delete diagramPayload.type;
  });

  test('get all diagrams', async () => {
    const diagramCore = new DiagramCore(db);
    await diagramCore.saveDiagram(diagramPayload);
    const diagrams = await diagramCore.getAllDiagrams(diagramPayload);
    expect(diagrams.length).toBeTruthy();
  });

  test('get diagrams by user_id', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep(diagramPayload);
    const diagramCreated = await diagramCore.saveDiagram(payload);
    const diagrams = await diagramCore.getDiagramsByUserId(
      '96293285-33b7-4a69-9b64-822059569734'
    );
    expect(diagrams.length).toBeTruthy();
    expect(diagrams[0].user_id).toEqual(diagramCreated.user_id);
    expect(diagrams[0].user_id).toEqual('96293285-33b7-4a69-9b64-822059569734');
  });

  test('get diagram by id', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep(diagramPayload);
    const diagramCreated = await diagramCore.saveDiagram(payload);
    const diagram = await diagramCore.getDiagramById(diagramCreated.id);
    expect(diagram).toBeDefined();
  });

  test('get diagrams by blueprints batch', async () => {
    const diagramCore = new DiagramCore(db);
    const blueprintIds = ['42a9a60e-e2e5-4d21-8e2f-67318b100e38'];
    const fetchedDiagrams = await diagramCore.getDiagramsByBlueprintsBatch(
      blueprintIds
    );
    expect(fetchedDiagrams).toHaveLength(1);
    expect(fetchedDiagrams[0].blueprint_id).toEqual(
      '42a9a60e-e2e5-4d21-8e2f-67318b100e38'
    );
  });

  test('get default diagram by user_id', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep({
      ...diagramPayload,
      user_default: true,
      workflow_data: workflowPayload,
    });
    await diagramCore.saveDiagram(payload);
    const diagram = await diagramCore.getDefaultDiagram(
      diagramPayload.user_id,
      { workflow_id: workflowPayload.id }
    );
    expect(diagram.user_id).toEqual('96293285-33b7-4a69-9b64-822059569734');
    expect(diagram.user_default).toBe(true);
    await diagramCore.deleteDiagram(diagram.id);
  });

  test('get default diagram by user_id (no default)', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep({
      ...diagramPayload,
      user_default: false,
      workflow_data: workflowPayload,
    });
    await diagramCore.saveDiagram(payload);
    const diagram = await diagramCore.getDefaultDiagram(
      diagramPayload.user_id,
      { workflow_id: workflowPayload.id }
    );
    expect(diagram.user_id).toEqual('96293285-33b7-4a69-9b64-822059569734');
    expect(diagram.user_default).toBe(false);
    await diagramCore.deleteDiagram(diagram.id);
  });

  test('get default diagram (latest public)', async () => {
    const diagramCore = new DiagramCore(db);
    const other_user_id = '956edb9a-9208-46b0-aa88-355d1ea4df40';
    const payload = _.cloneDeep({
      ...diagramPayload,
      user_id: other_user_id,
      isPublic: true,
      workflow_data: workflowPayload,
    });
    await diagramCore.saveDiagram(payload);
    const diagram = await diagramCore.getDefaultDiagram(
      diagramPayload.user_id,
      { workflow_id: workflowPayload.id }
    );
    expect(diagram.id).toBeDefined();
    await diagramCore.deleteDiagram(diagram.id);
  });

  test('update diagram', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep(diagramPayload);
    const diagramCreated = await diagramCore.saveDiagram(payload);
    const diagramUpdated = await diagramCore.updateDiagram(diagramCreated.id, {
      name: 'Test Update',
      blueprint_id: '42a9a60e-e2e5-4d21-8e2f-67318b100e38',
      is_aligned: true,
    });
    expect(diagramUpdated.blueprint_id).toEqual(
      '42a9a60e-e2e5-4d21-8e2f-67318b100e38'
    );
    expect(diagramUpdated.name).toEqual('Test Update');
    expect(diagramUpdated.is_aligned).toBeTruthy();
  });

  test('set as default', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep({
      ...diagramPayload,
      workflow_data: workflowPayload,
    });
    const diagramCreated_1 = await diagramCore.saveDiagram(payload);
    const diagramCreated_2 = await diagramCore.saveDiagram({
      ...payload,
      user_default: true,
    });
    expect(diagramCreated_1.user_default).toBe(false);
    expect(diagramCreated_2.user_default).toBe(true);
    const diagramUpdated_1 = await diagramCore.setAsDefault(
      diagramCreated_1.id
    );
    const diagramUpdated_2 = await diagramCore.getDiagramById(
      diagramCreated_2.id
    );
    expect(diagramUpdated_1.user_default).toBe(true);
    expect(diagramUpdated_2.user_default).toBe(false);
  });

  test('delete diagram', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep(diagramPayload);
    const diagramCreated = await diagramCore.saveDiagram(payload);
    await diagramCore.deleteDiagram(diagramCreated.id);
    const diagram = await diagramCore.getDiagramById(diagramCreated.id);
    expect(diagram).not.toBeTruthy();
  });

  test('delete diagrams batch', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep(diagramPayload);
    const firstDiagramCreated = await diagramCore.saveDiagram(payload);
    payload.name = 'Second Test';
    const secondDiagramCreated = await diagramCore.saveDiagram(payload);
    const ids = [firstDiagramCreated.id, secondDiagramCreated.id];
    await diagramCore.deleteDiagramsBatch(ids);
    const diagrams = await diagramCore.getDiagramsBatch(ids);
    expect(diagrams).toHaveLength(0);
  });
});

describe('DiagramCore tests (with workflow_id)', () => {
  test('create diagram', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep(diagramPayload);
    payload.workflow_data = workflowPayload;
    const diagram = await diagramCore.saveDiagram(payload);
    expect(validate(diagram.id)).toBeTruthy();
    expect(diagram.name).toEqual('Test');
    expect(diagram.user_id).toBeDefined();
  });

  test('get diagrams by workflow_id', async () => {
    const diagramCore = new DiagramCore(db);
    const workflowId = 'ae7e95f6-787a-4c0b-8e1a-4cc122e7d68f';
    const diagrams = await diagramCore.getDiagramsByWorkflowId(
      workflowId,
      '96293285-33b7-4a69-9b64-822059569734'
    );
    expect(diagrams.length).toBeGreaterThan(0);
  });

  test('get latest diagram by workflow_id', async () => {
    const diagramCore = new DiagramCore(db);
    const workflowId = 'ae7e95f6-787a-4c0b-8e1a-4cc122e7d68f';
    const result = await diagramCore.getLatestDiagramByWorkflowId(
      workflowId,
      '96293285-33b7-4a69-9b64-822059569734'
    );
    expect(result.id).toBeDefined();
  });

  test('get diagrams by user_id and workflow_id', async () => {
    const diagramCore = new DiagramCore(db);
    const diagrams = await diagramCore.getDiagramsByUserAndWF(
      '96293285-33b7-4a69-9b64-822059569734',
      'ae7e95f6-787a-4c0b-8e1a-4cc122e7d68f'
    );
    expect(diagrams.length).toBeTruthy();
    expect(diagrams[0].user_id).toEqual('96293285-33b7-4a69-9b64-822059569734');
    expect(diagrams[0].workflow_id).toEqual(
      'ae7e95f6-787a-4c0b-8e1a-4cc122e7d68f'
    );
  });

  test('get default diagram by user_id and workflow_id', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep({ ...diagramPayload, user_default: true });
    const workflow_id = 'ae7e95f6-787a-4c0b-8e1a-4cc122e7d68f';
    payload.workflow_data = workflowPayload;
    await diagramCore.saveDiagram(payload);
    const diagram = await diagramCore.getDefaultDiagram(
      '96293285-33b7-4a69-9b64-822059569734',
      { workflow_id }
    );
    expect(diagram.user_id).toEqual('96293285-33b7-4a69-9b64-822059569734');
    expect(diagram.workflow_id).toEqual('ae7e95f6-787a-4c0b-8e1a-4cc122e7d68f');
  });
});

describe('DiagramCore tests (public diagrams)', () => {
  test('create diagram', async () => {
    const diagramCore = new DiagramCore(db);
    const payload = _.cloneDeep(diagramPayload);
    payload.workflow_data = workflowPayload;
    payload.isPublic = true;
    const diagram = await diagramCore.saveDiagram(payload);
    expect(validate(diagram.id)).toBeTruthy();
    expect(diagram.name).toEqual('Test');
    expect(diagram.workflow_id).toBeDefined();
    expect(diagram.user_id).toBeNull();
  });

  test('get diagrams by workflow_id', async () => {
    const diagramCore = new DiagramCore(db);
    const workflowId = 'ae7e95f6-787a-4c0b-8e1a-4cc122e7d68f';
    const diagrams = await diagramCore.getDiagramsByWorkflowId(
      workflowId,
      '96293285-33b7-4a69-9b64-822059569734'
    );
    expect(diagrams.length).toBeGreaterThan(0);
  });
});
