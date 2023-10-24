'use strict';
var AWS = require('aws-sdk');
/**
 * This class is a SLS plugin that attaches the processEndpoint function to the aws:info:displayEndpoints SLS hook.
 * the aws:info:displayEndpoints is executed after the sls deploy command
 */
class StackOutputsPlugin {
  constructor(serverless) {
    this.serverless = serverless;
    this.region = this.serverless.configurationInput.provider.region
    this.commands_table_name = this.serverless.configurationInput.provider.environment['DYNAMODB_TABLE_COMMANDS']
    this.ddb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10', region: this.region});
    this.hooks = {
      'aws:info:displayEndpoints': () => this.processEndpoints(),
    };
    this.params = { RequestItems: {} };
    this.PutRequestList = []
  }

  /* Gets the lambda endpoints from the serverless instance, creates a dynamoDB structure
     and put them in the botnorrea-v2--Commands table. Example:
    | Dynamo Table |
    | command: "POST - https://XXXXX.execute-api.XXXX.amazonaws.com/dev/botnorrea-v2-/users" |
  */
  processEndpoints() {
    console.log(this.serverless)
    let endpoints = this.serverless.serviceOutputs.get("endpoints")
    endpoints.forEach(endpoint => {
      let PutRequestObj = {
        PutRequest: {
          Item: {
            "command" : endpoint
          }
        }
      }
      this.PutRequestList.push(PutRequestObj)
    });
    this.params.RequestItems[`${this.commands_table_name}`] = this.PutRequestList
    this.putCommandsToDynamoDB()
  }

  /**
   * Sends the request to the dynamo API
   */
  putCommandsToDynamoDB() {
    this.ddb.batchWrite(this.params, function(err, data) {
      if (err)  console.log("Error", err);
      else      console.log("Success", data);
    });
  }
}

module.exports = StackOutputsPlugin;
