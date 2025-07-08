#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SpaAwsStack } from "../lib/spa-aws-stack";

const app = new cdk.App();
new SpaAwsStack(app, "SpaAwsStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
