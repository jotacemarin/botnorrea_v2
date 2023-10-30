// @ts-nocheck

import { buildExpressions } from './dynamoDbHelper';

describe('buildExpressions', () => {
  it('should build expressions for a valid JSON object', () => {
    const inputObject = {
      name: 'John',
      age: 30,
      city: 'New York',
    };

    const expectedExpressions = {
      ExpressionAttributeValues: {
        ':name': 'John',
        ':age': 30,
        ':city': 'New York',
      },
      UpdateExpression: 'SET #name = :name, #age = :age, #city = :city',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#age': 'age',
        '#city': 'city',
      },
    };

    const result = buildExpressions(inputObject);

    expect(result).toEqual(expectedExpressions);
  });

  it('should handle null and undefined values', () => {
    const inputObject = {
      name: 'John',
      age: null,
      city: undefined,
    };

    const expectedExpressions = {
      ExpressionAttributeValues: {
        ':name': 'John',
      },
      UpdateExpression: 'SET #name = :name',
      ExpressionAttributeNames: {
        '#name': 'name',
      },
    };

    const result = buildExpressions(inputObject);

    expect(result).toEqual(expectedExpressions);
  });

  it('should handle an empty object', () => {
    const inputObject = {};

    const expectedExpressions = {
      ExpressionAttributeValues: {},
      UpdateExpression: 'SET ',
      ExpressionAttributeNames: {},
    };

    const result = buildExpressions(inputObject);

    expect(result).toEqual(expectedExpressions);
  });

  it('should handle special characters in keys', () => {
    const inputObject = {
      'first-name': 'John',
      'last-name': 'Doe',
    };

    const expectedExpressions = {
      ExpressionAttributeValues: {
        ':first-name': 'John',
        ':last-name': 'Doe',
      },
      UpdateExpression: 'SET #first-name = :first-name, #last-name = :last-name',
      ExpressionAttributeNames: {
        '#first-name': 'first-name',
        '#last-name': 'last-name',
      },
    };

    const result = buildExpressions(inputObject);

    expect(result).toEqual(expectedExpressions);
  });
});
