// Documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

const { REGION } = process.env;

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

export interface DynamoDBKey {
  [Key: string]: string;
}

export interface DynamoDBCommand {
  TableName: string;
  Item?: JSON | Object | any;
  Key?: DynamoDBKey;
  UpdateExpression?: string;
  ReturnValues?: string;
  ProjectionExpression?: string;
  ExpressionAttributeNames?: DynamoDBKey | JSON | Object | any;
  KeyConditionExpression?: string;
  ConsistentRead?: boolean;
}

export const scanCommand = async (params: DynamoDBCommand) => {
  const command = new ScanCommand(params);
  return await docClient.send(command);
};

export const queryCommand = async (params: DynamoDBCommand) => {
  const command = new QueryCommand(params as any);
  return await docClient.send(command);
};

export const getCommand = async (params: DynamoDBCommand) => {
  const command = new GetCommand(params as any);
  return await docClient.send(command);
};

export const putCommand = async (params: DynamoDBCommand) => {
  const command = new PutCommand(params as any);
  return await docClient.send(command);
};

export const updateCommand = async (params: DynamoDBCommand) => {
  const command = new UpdateCommand({
    ReturnValues: "ALL_NEW",
    ...params,
  } as any);
  return await docClient.send(command);
};

export const deleteCommand = async (params: DynamoDBCommand) => {
  const command = new DeleteCommand(params as any);
  return await docClient.send(command);
};
