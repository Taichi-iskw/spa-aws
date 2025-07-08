#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SpaAwsStack } from "../lib/spa-aws-stack";
import { GlobalStack } from "../lib/global-stack";

const app = new cdk.App();

const globalStack = new GlobalStack(app, "GlobalStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" },
});

new SpaAwsStack(app, "SpaAwsStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  hostedZone: globalStack.hostedZone,
  certificate: globalStack.certificate,
  crossRegionReferences: true,
});
