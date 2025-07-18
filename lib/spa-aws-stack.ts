import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";

import { CognitoAuth } from "./constructs/auth-construct";

interface SpaAwsStackProps extends cdk.StackProps {
  hostedZone: route53.IHostedZone;
  certificate: acm.ICertificate;
}

export class SpaAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SpaAwsStackProps) {
    super(scope, id, props);
    const siteDomainName = "spa.iskw-poc.click";

    // const auth = new CognitoAuth(this, "CognitoAuth", {
    //   domainName: siteDomainName,
    // });

    // S3 Bucket
    const bucket = new s3.Bucket(this, "SpaAwsBucket", {
      bucketName: "spa-aws-bucket",
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(bucket);

    // iam
    const oidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      "OIDCProvider",
      `arn:aws:iam::${cdk.Stack.of(this).account}:oidc-provider/token.actions.githubusercontent.com`
    );
    const githubRepo = "Taichi-iskw/spa-aws";
    const githubOidcRole = new iam.Role(this, "GitHubActionsOIDCRole", {
      roleName: "GitHubActionsOIDCRole",
      assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          ["token.actions.githubusercontent.com:aud"]: "sts.amazonaws.com",
        },
        StringLike: {
          "token.actions.githubusercontent.com:sub": `repo:${githubRepo}:*`,
        },
      }),
      description: "Role for GitHub Actions to upload to S3 via OIDC",
    });
    // stringLike: { "token.actions.githubusercontent.com:sub": `repo:${githubRepo}:*` },
    bucket.grantPut(githubOidcRole);

    // Create CloudFront distribution with OAC
    const distribution = new cloudfront.Distribution(this, "SpaAwsDistribution", {
      certificate: props.certificate,
      domainNames: [siteDomainName],
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: s3Origin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        // edgeLambdas: [
        //   {
        //     functionVersion: new cloudfront.experimental.EdgeFunction(this, "EdgeFn", {
        //       runtime: lambda.Runtime.NODEJS_20_X,
        //       handler: "index.handler",
        //       code: lambda.Code.fromAsset("lib/lambda/edge-auth/dist"),
        //     }).currentVersion,
        //     eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
        //   },
        // ],
      },
    });

    new route53.ARecord(this, "ARecord", {
      zone: props.hostedZone,
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
      recordName: siteDomainName,
    });

    new cdk.CfnOutput(this, "SpaUrl", {
      value: `https://${siteDomainName}`,
    });
  }
}
