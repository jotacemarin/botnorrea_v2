export const buildExpressions = (object: JSON | Object | any) => {
  const ExpressionAttributeValues: Object = {};
  const UpdateExpression: Array<string> = [];
  const ExpressionAttributeNames: Object = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== null && value !== undefined) {
      const attrValue: string = `:${key}`;
      const attrName: string = `#${key}`;
      ExpressionAttributeValues[attrValue] = value;
      UpdateExpression.push(` ${attrName} = ${attrValue}`);
      ExpressionAttributeNames[`${attrName}`] = `${key}`;
    }
  }

  return {
    ExpressionAttributeValues,
    UpdateExpression: `SET ${UpdateExpression.join(",").trim()}`,
    ExpressionAttributeNames,
  };
};
