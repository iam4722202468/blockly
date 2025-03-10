/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Lua for math blocks.
 */

import * as goog from '../../closure/goog/goog.js';
goog.declareModuleId('Blockly.Lua.math');

import {NameType} from '../../core/names.js';
import {luaGenerator, Order} from '../lua.js';


luaGenerator.forBlock['math_number'] = function(block, generator) {
  // Numeric value.
  const code = Number(block.getFieldValue('NUM'));
  const order = code < 0 ? Order.UNARY : Order.ATOMIC;
  return [code, order];
};

luaGenerator.forBlock['math_arithmetic'] = function(block, generator) {
  // Basic arithmetic operators, and power.
  const OPERATORS = {
    'ADD': [' + ', Order.ADDITIVE],
    'MINUS': [' - ', Order.ADDITIVE],
    'MULTIPLY': [' * ', Order.MULTIPLICATIVE],
    'DIVIDE': [' / ', Order.MULTIPLICATIVE],
    'POWER': [' ^ ', Order.EXPONENTIATION],
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const argument0 = generator.valueToCode(block, 'A', order) || '0';
  const argument1 = generator.valueToCode(block, 'B', order) || '0';
  const code = argument0 + operator + argument1;
  return [code, order];
};

luaGenerator.forBlock['math_single'] = function(block, generator) {
  // Math operators with single operand.
  const operator = block.getFieldValue('OP');
  let arg;
  if (operator === 'NEG') {
    // Negation is a special case given its different operator precedence.
    arg = generator.valueToCode(block, 'NUM', Order.UNARY) || '0';
    return ['-' + arg, Order.UNARY];
  }
  if (operator === 'POW10') {
    arg = generator.valueToCode(block, 'NUM', Order.EXPONENTIATION) || '0';
    return ['10 ^ ' + arg, Order.EXPONENTIATION];
  }
  if (operator === 'ROUND') {
    arg = generator.valueToCode(block, 'NUM', Order.ADDITIVE) || '0';
  } else {
    arg = generator.valueToCode(block, 'NUM', Order.NONE) || '0';
  }

  let code;
  switch (operator) {
    case 'ABS':
      code = 'math.abs(' + arg + ')';
      break;
    case 'ROOT':
      code = 'math.sqrt(' + arg + ')';
      break;
    case 'LN':
      code = 'math.log(' + arg + ')';
      break;
    case 'LOG10':
      code = 'math.log(' + arg + ', 10)';
      break;
    case 'EXP':
      code = 'math.exp(' + arg + ')';
      break;
    case 'ROUND':
      // This rounds up.  Blockly does not specify rounding direction.
      code = 'math.floor(' + arg + ' + .5)';
      break;
    case 'ROUNDUP':
      code = 'math.ceil(' + arg + ')';
      break;
    case 'ROUNDDOWN':
      code = 'math.floor(' + arg + ')';
      break;
    case 'SIN':
      code = 'math.sin(math.rad(' + arg + '))';
      break;
    case 'COS':
      code = 'math.cos(math.rad(' + arg + '))';
      break;
    case 'TAN':
      code = 'math.tan(math.rad(' + arg + '))';
      break;
    case 'ASIN':
      code = 'math.deg(math.asin(' + arg + '))';
      break;
    case 'ACOS':
      code = 'math.deg(math.acos(' + arg + '))';
      break;
    case 'ATAN':
      code = 'math.deg(math.atan(' + arg + '))';
      break;
    default:
      throw Error('Unknown math operator: ' + operator);
  }
  return [code, Order.HIGH];
};

luaGenerator.forBlock['math_constant'] = function(block, generator) {
  // Constants: PI, E, the Golden Ratio, sqrt(2), 1/sqrt(2), INFINITY.
  const CONSTANTS = {
    'PI': ['math.pi', Order.HIGH],
    'E': ['math.exp(1)', Order.HIGH],
    'GOLDEN_RATIO': ['(1 + math.sqrt(5)) / 2', Order.MULTIPLICATIVE],
    'SQRT2': ['math.sqrt(2)', Order.HIGH],
    'SQRT1_2': ['math.sqrt(1 / 2)', Order.HIGH],
    'INFINITY': ['math.huge', Order.HIGH],
  };
  return CONSTANTS[block.getFieldValue('CONSTANT')];
};

luaGenerator.forBlock['math_number_property'] = function(block, generator) {
  // Check if a number is even, odd, prime, whole, positive, or negative
  // or if it is divisible by certain number. Returns true or false.
  const PROPERTIES = {
    'EVEN': [' % 2 == 0', Order.MULTIPLICATIVE, Order.RELATIONAL],
    'ODD': [' % 2 == 1', Order.MULTIPLICATIVE, Order.RELATIONAL],
    'WHOLE': [' % 1 == 0', Order.MULTIPLICATIVE, Order.RELATIONAL],
    'POSITIVE': [' > 0', Order.RELATIONAL, Order.RELATIONAL],
    'NEGATIVE': [' < 0', Order.RELATIONAL, Order.RELATIONAL],
    'DIVISIBLE_BY': [null, Order.MULTIPLICATIVE, Order.RELATIONAL],
    'PRIME': [null, Order.NONE, Order.HIGH],
  };
  const dropdownProperty = block.getFieldValue('PROPERTY');
  const [suffix, inputOrder, outputOrder] = PROPERTIES[dropdownProperty];
  const numberToCheck = generator.valueToCode(block, 'NUMBER_TO_CHECK',
      inputOrder) || '0';
  let code;
  if (dropdownProperty === 'PRIME') {
    // Prime is a special case as it is not a one-liner test.
    const functionName = generator.provideFunction_('math_isPrime', `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(n)
  -- https://en.wikipedia.org/wiki/Primality_test#Naive_methods
  if n == 2 or n == 3 then
    return true
  end
  -- False if n is NaN, negative, is 1, or not whole.
  -- And false if n is divisible by 2 or 3.
  if not(n > 1) or n % 1 ~= 0 or n % 2 == 0 or n % 3 == 0 then
    return false
  end
  -- Check all the numbers of form 6k +/- 1, up to sqrt(n).
  for x = 6, math.sqrt(n) + 1.5, 6 do
    if n % (x - 1) == 0 or n % (x + 1) == 0 then
      return false
    end
  end
  return true
end
`);
    code = functionName + '(' + numberToCheck + ')';
  } else if (dropdownProperty === 'DIVISIBLE_BY') {
    const divisor = generator.valueToCode(block, 'DIVISOR',
        Order.MULTIPLICATIVE) || '0';
    // If 'divisor' is some code that evals to 0, generator will produce a nan.
    // Let's produce nil if we can determine this at compile-time.
    if (divisor === '0') {
      return ['nil', Order.ATOMIC];
    }
    // The normal trick to implement ?: with and/or doesn't work here:
    //   divisor == 0 and nil or number_to_check % divisor == 0
    // because nil is false, so allow a runtime failure. :-(
    code = numberToCheck + ' % ' + divisor + ' == 0';
  } else {
    code = numberToCheck + suffix;
  }
  return [code, outputOrder];
};

luaGenerator.forBlock['math_change'] = function(block, generator) {
  // Add to a variable in place.
  const argument0 =
      generator.valueToCode(block, 'DELTA', Order.ADDITIVE) || '0';
  const varName =
      generator.nameDB_.getName(
        block.getFieldValue('VAR'), NameType.VARIABLE);
  return varName + ' = ' + varName + ' + ' + argument0 + '\n';
};

// Rounding functions have a single operand.
luaGenerator.forBlock['math_round'] = luaGenerator.forBlock['math_single'];
// Trigonometry functions have a single operand.
luaGenerator.forBlock['math_trig'] = luaGenerator.forBlock['math_single'];

luaGenerator.forBlock['math_on_list'] = function(block, generator) {
  // Math functions for lists.
  const func = block.getFieldValue('OP');
  const list = generator.valueToCode(block, 'LIST', Order.NONE) || '{}';
  let functionName;

  // Functions needed in more than one case.
  function provideSum() {
    return generator.provideFunction_('math_sum', `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(t)
  local result = 0
  for _, v in ipairs(t) do
    result = result + v
  end
  return result
end
`);
  }

  switch (func) {
    case 'SUM':
      functionName = provideSum();
      break;

    case 'MIN':
      // Returns 0 for the empty list.
      functionName = generator.provideFunction_('math_min', `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(t)
  if #t == 0 then
    return 0
  end
  local result = math.huge
  for _, v in ipairs(t) do
    if v < result then
      result = v
    end
  end
  return result
end
`);
      break;

    case 'AVERAGE':
      // Returns 0 for the empty list.
      functionName = generator.provideFunction_('math_average', `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(t)
  if #t == 0 then
    return 0
  end
  return ${provideSum()}(t) / #t
end
`);
      break;

    case 'MAX':
      // Returns 0 for the empty list.
      functionName = generator.provideFunction_('math_max', `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(t)
  if #t == 0 then
    return 0
  end
  local result = -math.huge
  for _, v in ipairs(t) do
    if v > result then
      result = v
    end
  end
  return result
end
`);
      break;

    case 'MEDIAN':
      // This operation excludes non-numbers.
      functionName = generator.provideFunction_('math_median', `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(t)
  -- Source: http://lua-users.org/wiki/SimpleStats
  if #t == 0 then
    return 0
  end
  local temp = {}
  for _, v in ipairs(t) do
    if type(v) == 'number' then
      table.insert(temp, v)
    end
  end
  table.sort(temp)
  if #temp % 2 == 0 then
    return (temp[#temp / 2] + temp[(#temp / 2) + 1]) / 2
  else
    return temp[math.ceil(#temp / 2)]
  end
end
`);
      break;

    case 'MODE':
      // As a list of numbers can contain more than one mode,
      // the returned result is provided as an array.
      // The generator version includes non-numbers.
      functionName = generator.provideFunction_('math_modes', `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(t)
  -- Source: http://lua-users.org/wiki/SimpleStats
  local counts = {}
  for _, v in ipairs(t) do
    if counts[v] == nil then
      counts[v] = 1
    else
      counts[v] = counts[v] + 1
    end
  end
  local biggestCount = 0
  for _, v  in pairs(counts) do
    if v > biggestCount then
      biggestCount = v
    end
  end
  local temp = {}
  for k, v in pairs(counts) do
    if v == biggestCount then
      table.insert(temp, k)
    end
  end
  return temp
end
`);
      break;

    case 'STD_DEV':
      functionName = generator.provideFunction_('math_standard_deviation', `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(t)
  local m
  local vm
  local total = 0
  local count = 0
  local result
  m = #t == 0 and 0 or ${provideSum()}(t) / #t
  for _, v in ipairs(t) do
    if type(v) == 'number' then
      vm = v - m
      total = total + (vm * vm)
      count = count + 1
    end
  end
  result = math.sqrt(total / (count-1))
  return result
end
`);
      break;

    case 'RANDOM':
      functionName = generator.provideFunction_('math_random_list', `
function ${generator.FUNCTION_NAME_PLACEHOLDER_}(t)
  if #t == 0 then
    return nil
  end
  return t[math.random(#t)]
end
`);
      break;

    default:
      throw Error('Unknown operator: ' + func);
  }
  return [functionName + '(' + list + ')', Order.HIGH];
};

luaGenerator.forBlock['math_modulo'] = function(block, generator) {
  // Remainder computation.
  const argument0 =
      generator.valueToCode(block, 'DIVIDEND', Order.MULTIPLICATIVE) || '0';
  const argument1 =
      generator.valueToCode(block, 'DIVISOR', Order.MULTIPLICATIVE) || '0';
  const code = argument0 + ' % ' + argument1;
  return [code, Order.MULTIPLICATIVE];
};

luaGenerator.forBlock['math_constrain'] = function(block, generator) {
  // Constrain a number between two limits.
  const argument0 = generator.valueToCode(block, 'VALUE', Order.NONE) || '0';
  const argument1 =
      generator.valueToCode(block, 'LOW', Order.NONE) || '-math.huge';
  const argument2 =
      generator.valueToCode(block, 'HIGH', Order.NONE) || 'math.huge';
  const code = 'math.min(math.max(' + argument0 + ', ' + argument1 + '), ' +
      argument2 + ')';
  return [code, Order.HIGH];
};

luaGenerator.forBlock['math_random_int'] = function(block, generator) {
  // Random integer between [X] and [Y].
  const argument0 = generator.valueToCode(block, 'FROM', Order.NONE) || '0';
  const argument1 = generator.valueToCode(block, 'TO', Order.NONE) || '0';
  const code = 'math.random(' + argument0 + ', ' + argument1 + ')';
  return [code, Order.HIGH];
};

luaGenerator.forBlock['math_random_float'] = function(block, generator) {
  // Random fraction between 0 and 1.
  return ['math.random()', Order.HIGH];
};

luaGenerator.forBlock['math_atan2'] = function(block, generator) {
  // Arctangent of point (X, Y) in degrees from -180 to 180.
  const argument0 = generator.valueToCode(block, 'X', Order.NONE) || '0';
  const argument1 = generator.valueToCode(block, 'Y', Order.NONE) || '0';
  return [
    'math.deg(math.atan2(' + argument1 + ', ' + argument0 + '))', Order.HIGH
  ];
};
