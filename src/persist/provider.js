const { DiagramKnexPersist } = require('./knex');
const { PersistorSingleton } = require('./persist');

class PersistorProvider {
  static getPersistor(...args) {
    if (PersistorSingleton.instace) {
      return PersistorSingleton.instace;
    }
    const db = args[0];
    const class_map = {
      Diagram: [DiagramKnexPersist, db]
    }

    return new PersistorSingleton(class_map);
  }
}

module.exports = {
  PersistorProvider
}