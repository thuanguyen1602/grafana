import _ from 'lodash';
import { SqlPartDef, SqlPart, functionRenderer, suffixRenderer } from 'app/core/components/sql_part/sql_part';

var index = [];

function createPart(part): any {
  var def = index[part.type];
  if (!def) {
    throw { message: 'Could not find query part ' + part.type };
  }

  return new SqlPart(part, def);
}

function register(options: any) {
  index[options.type] = new SqlPartDef(options);
}

function aliasRenderer(part, innerExpr) {
  return innerExpr + ' AS ' + '"' + part.params[0] + '"';
}

function aggregateRenderer(part, innerExpr) {
  return part.params[0] + '(' + innerExpr + ')';
}

function columnRenderer(part, innerExpr) {
  return part.params[0];
}

function replaceAggregationAddStrategy(selectParts, partModel) {
  var hasAlias = false;

  // look for existing aggregation
  for (var i = 0; i < selectParts.length; i++) {
    var part = selectParts[i];
    if (part.def.type === 'aggregate') {
      selectParts[i] = partModel;
      return;
    }
    if (part.def.type === 'alias') {
      hasAlias = true;
    }
  }

  // add alias if none exists yet
  if (!hasAlias) {
    var aliasModel = createPart({ type: 'alias', params: [selectParts[0].params[0]] });
    selectParts.push(aliasModel);
  }

  selectParts.splice(1, 0, partModel);
}

function addMathStrategy(selectParts, partModel) {
  var partCount = selectParts.length;
  if (partCount > 0) {
    // if last is math, replace it
    if (selectParts[partCount - 1].def.type === 'math') {
      selectParts[partCount - 1] = partModel;
      return;
    }
    // if next to last is math, replace it
    if (partCount > 1 && selectParts[partCount - 2].def.type === 'math') {
      selectParts[partCount - 2] = partModel;
      return;
    } else if (selectParts[partCount - 1].def.type === 'alias') {
      // if last is alias add it before
      selectParts.splice(partCount - 1, 0, partModel);
      return;
    }
  }
  selectParts.push(partModel);
}

function addAliasStrategy(selectParts, partModel) {
  var partCount = selectParts.length;
  if (partCount > 0) {
    // if last is alias, replace it
    if (selectParts[partCount - 1].def.type === 'alias') {
      selectParts[partCount - 1] = partModel;
      return;
    }
  }
  selectParts.push(partModel);
}

function addColumnStrategy(selectParts, partModel, query) {
  // copy all parts
  var parts = _.map(selectParts, function(part: any) {
    return createPart({ type: part.def.type, params: _.clone(part.params) });
  });

  query.selectModels.push(parts);
}

function addExpressionStrategy(selectParts, partModel, query) {
  // copy all parts
  var parts = _.map(selectParts, function(part: any) {
    return createPart({ type: part.def.type, params: _.clone(part.params) });
  });

  query.selectModels.push(parts);
}

register({
  type: 'column',
  style: 'label',
  addStrategy: addColumnStrategy,
  params: [{ type: 'column', dynamicLookup: true }],
  defaultParams: ['value'],
  renderer: columnRenderer,
});

register({
  type: 'expression',
  style: 'expression',
  label: 'Expr:',
  addStrategy: addExpressionStrategy,
  params: [
    { name: 'left', type: 'string', dynamicLookup: true },
    { name: 'op', type: 'string', dynamicLookup: true },
    { name: 'right', type: 'string', dynamicLookup: true },
  ],
  defaultParams: ['value', '=', 'value'],
  renderer: columnRenderer,
});

register({
  type: 'macro',
  style: 'label',
  label: 'Macro:',
  addStrategy: addExpressionStrategy,
  params: [],
  defaultParams: [],
  renderer: columnRenderer,
});

register({
  type: 'aggregate',
  style: 'label',
  addStrategy: replaceAggregationAddStrategy,
  params: [{ name: 'name', type: 'string', dynamicLookup: true }],
  defaultParams: ['avg'],
  renderer: aggregateRenderer,
});

register({
  type: 'math',
  style: 'label',
  addStrategy: addMathStrategy,
  params: [{ name: 'expr', type: 'string' }],
  defaultParams: [' / 100'],
  renderer: suffixRenderer,
});

register({
  type: 'alias',
  style: 'label',
  addStrategy: addAliasStrategy,
  params: [{ name: 'name', type: 'string', quote: 'double' }],
  defaultParams: ['alias'],
  renderMode: 'suffix',
  renderer: aliasRenderer,
});

register({
  type: 'time',
  style: 'function',
  label: 'time',
  params: [
    {
      name: 'interval',
      type: 'interval',
      options: ['$__interval', '1s', '10s', '1m', '5m', '10m', '15m', '1h'],
    },
    {
      name: 'fill',
      type: 'string',
      options: ['none', 'NULL', '0'],
    },
  ],
  defaultParams: ['$__interval', 'none'],
  renderer: functionRenderer,
});

export default {
  create: createPart,
};
