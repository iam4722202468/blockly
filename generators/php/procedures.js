/**
 * @license
 * Copyright 2015 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating PHP for procedure blocks.
 */

import * as goog from '../../closure/goog/goog.js';
goog.declareModuleId('Blockly.PHP.procedures');

import * as Variables from '../../core/variables.js';
import {NameType} from '../../core/names.js';
import {phpGenerator, Order} from '../php.js';


phpGenerator.forBlock['procedures_defreturn'] = function(block, generator) {
  // Define a procedure with a return value.
  // First, add a 'global' statement for every variable that is not shadowed by
  // a local parameter.
  const globals = [];
  const workspace = block.workspace;
  const usedVariables = Variables.allUsedVarModels(workspace) || [];
  for (let i = 0, variable; variable = usedVariables[i]; i++) {
    const varName = variable.name;
    if (block.getVars().indexOf(varName) === -1) {
      globals.push(generator.nameDB_.getName(varName, NameType.VARIABLE));
    }
  }
  // Add developer variables.
  const devVarList = Variables.allDeveloperVariables(workspace);
  for (let i = 0; i < devVarList.length; i++) {
    globals.push(
        generator.nameDB_.getName(
          devVarList[i], NameType.DEVELOPER_VARIABLE));
  }
  const globalStr =
      globals.length ?
      generator.INDENT + 'global ' + globals.join(', ') + ';\n' : '';

  const funcName =
      generator.nameDB_.getName(
        block.getFieldValue('NAME'), NameType.PROCEDURE);
  let xfix1 = '';
  if (generator.STATEMENT_PREFIX) {
    xfix1 += generator.injectId(generator.STATEMENT_PREFIX, block);
  }
  if (generator.STATEMENT_SUFFIX) {
    xfix1 += generator.injectId(generator.STATEMENT_SUFFIX, block);
  }
  if (xfix1) {
    xfix1 = generator.prefixLines(xfix1, generator.INDENT);
  }
  let loopTrap = '';
  if (generator.INFINITE_LOOP_TRAP) {
    loopTrap = generator.prefixLines(
        generator.injectId(generator.INFINITE_LOOP_TRAP, block),
        generator.INDENT);
  }
  const branch = generator.statementToCode(block, 'STACK');
  let returnValue = generator.valueToCode(block, 'RETURN', Order.NONE) || '';
  let xfix2 = '';
  if (branch && returnValue) {
    // After executing the function body, revisit this block for the return.
    xfix2 = xfix1;
  }
  if (returnValue) {
    returnValue = generator.INDENT + 'return ' + returnValue + ';\n';
  }
  const args = [];
  const variables = block.getVars();
  for (let i = 0; i < variables.length; i++) {
    args[i] = generator.nameDB_.getName(variables[i], NameType.VARIABLE);
  }
  let code = 'function ' + funcName + '(' + args.join(', ') + ') {\n' +
      globalStr + xfix1 + loopTrap + branch + xfix2 + returnValue + '}';
  code = generator.scrub_(block, code);
  // Add % so as not to collide with helper functions in definitions list.
  generator.definitions_['%' + funcName] = code;
  return null;
};

// Defining a procedure without a return value uses the same generator as
// a procedure with a return value.
phpGenerator.forBlock['procedures_defnoreturn'] =
    phpGenerator.forBlock['procedures_defreturn'];

phpGenerator.forBlock['procedures_callreturn'] = function(block, generator) {
  // Call a procedure with a return value.
  const funcName =
      generator.nameDB_.getName(
        block.getFieldValue('NAME'), NameType.PROCEDURE);
  const args = [];
  const variables = block.getVars();
  for (let i = 0; i < variables.length; i++) {
    args[i] = generator.valueToCode(block, 'ARG' + i, Order.NONE) || 'null';
  }
  const code = funcName + '(' + args.join(', ') + ')';
  return [code, Order.FUNCTION_CALL];
};

phpGenerator.forBlock['procedures_callnoreturn'] = function(block, generator) {
  // Call a procedure with no return value.
  // Generated code is for a function call as a statement is the same as a
  // function call as a value, with the addition of line ending.
  const tuple = generator.forBlock['procedures_callreturn'](block, generator);
  return tuple[0] + ';\n';
};

phpGenerator.forBlock['procedures_ifreturn'] = function(block, generator) {
  // Conditionally return value from a procedure.
  const condition =
      generator.valueToCode(block, 'CONDITION', Order.NONE) || 'false';
  let code = 'if (' + condition + ') {\n';
  if (generator.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the return is triggered.
    code +=
        generator.prefixLines(
          generator.injectId(generator.STATEMENT_SUFFIX, block),
          generator.INDENT);
  }
  if (block.hasReturnValue_) {
    const value = generator.valueToCode(block, 'VALUE', Order.NONE) || 'null';
    code += generator.INDENT + 'return ' + value + ';\n';
  } else {
    code += generator.INDENT + 'return;\n';
  }
  code += '}\n';
  return code;
};
