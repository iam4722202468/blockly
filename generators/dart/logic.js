/**
 * @license
 * Copyright 2014 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Dart for logic blocks.
 */

import * as goog from '../../closure/goog/goog.js';
goog.declareModuleId('Blockly.Dart.logic');

import {dartGenerator, Order} from '../dart.js';


dartGenerator.forBlock['controls_if'] = function(block, generator) {
  // If/elseif/else condition.
  let n = 0;
  let code = '', branchCode, conditionCode;
  if (generator.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    code += generator.injectId(generator.STATEMENT_PREFIX, block);
  }
  do {
    conditionCode =
        generator.valueToCode(block, 'IF' + n, Order.NONE) || 'false';
    branchCode = generator.statementToCode(block, 'DO' + n);
    if (generator.STATEMENT_SUFFIX) {
      branchCode =
          generator.prefixLines(
            generator.injectId(
              generator.STATEMENT_SUFFIX, block), generator.INDENT) +
          branchCode;
    }
    code += (n > 0 ? 'else ' : '') + 'if (' + conditionCode + ') {\n' +
        branchCode + '}';
    n++;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE') || generator.STATEMENT_SUFFIX) {
    branchCode = generator.statementToCode(block, 'ELSE');
    if (generator.STATEMENT_SUFFIX) {
      branchCode =
          generator.prefixLines(
            generator.injectId(
              generator.STATEMENT_SUFFIX, block), generator.INDENT) +
          branchCode;
    }
    code += ' else {\n' + branchCode + '}';
  }
  return code + '\n';
};

dartGenerator.forBlock['controls_ifelse'] =
    dartGenerator.forBlock['controls_if'];

dartGenerator.forBlock['logic_compare'] = function(block, generator) {
  // Comparison operator.
  const OPERATORS =
      {'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>='};
  const operator = OPERATORS[block.getFieldValue('OP')];
  const order = (operator === '==' || operator === '!=') ?
      Order.EQUALITY :
      Order.RELATIONAL;
  const argument0 = generator.valueToCode(block, 'A', order) || '0';
  const argument1 = generator.valueToCode(block, 'B', order) || '0';
  const code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

dartGenerator.forBlock['logic_operation'] = function(block, generator) {
  // Operations 'and', 'or'.
  const operator = (block.getFieldValue('OP') === 'AND') ? '&&' : '||';
  const order =
      (operator === '&&') ? Order.LOGICAL_AND : Order.LOGICAL_OR;
  let argument0 = generator.valueToCode(block, 'A', order);
  let argument1 = generator.valueToCode(block, 'B', order);
  if (!argument0 && !argument1) {
    // If there are no arguments, then the return value is false.
    argument0 = 'false';
    argument1 = 'false';
  } else {
    // Single missing arguments have no effect on the return value.
    const defaultArgument = (operator === '&&') ? 'true' : 'false';
    if (!argument0) {
      argument0 = defaultArgument;
    }
    if (!argument1) {
      argument1 = defaultArgument;
    }
  }
  const code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

dartGenerator.forBlock['logic_negate'] = function(block, generator) {
  // Negation.
  const order = Order.UNARY_PREFIX;
  const argument0 = generator.valueToCode(block, 'BOOL', order) || 'true';
  const code = '!' + argument0;
  return [code, order];
};

dartGenerator.forBlock['logic_boolean'] = function(block, generator) {
  // Boolean values true and false.
  const code = (block.getFieldValue('BOOL') === 'TRUE') ? 'true' : 'false';
  return [code, Order.ATOMIC];
};

dartGenerator.forBlock['logic_null'] = function(block, generator) {
  // Null data type.
  return ['null', Order.ATOMIC];
};

dartGenerator.forBlock['logic_ternary'] = function(block, generator) {
  // Ternary operator.
  const value_if =
      generator.valueToCode(block, 'IF', Order.CONDITIONAL) || 'false';
  const value_then =
      generator.valueToCode(block, 'THEN', Order.CONDITIONAL) || 'null';
  const value_else =
      generator.valueToCode(block, 'ELSE', Order.CONDITIONAL) || 'null';
  const code = value_if + ' ? ' + value_then + ' : ' + value_else;
  return [code, Order.CONDITIONAL];
};
