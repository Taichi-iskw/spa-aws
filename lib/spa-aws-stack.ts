import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

import { CognitoAuth } from "./constructs/auth-construct";

interface SpaAwsStackProps extends cdk.StackProps {
  hostedZone: route53.IHostedZone;
  certificate: acm.ICertificate;
}

export class SpaAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SpaAwsStackProps) {
    super(scope, id, props);
    const siteDomainName = "spa.iskw-poc.click";

    const auth = new CognitoAuth(this, "CognitoAuth", {
      domainName: siteDomainName,
    });

    // Create a private S3 bucket for static website hosting
    const bucket = new s3.Bucket(this, "SpaAwsBucket", {
      bucketName: "spa-aws-bucket",
      publicReadAccess: false, // Make bucket private
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block all public access
      // TODO: Remove this when we have a proper way to delete the bucket
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(bucket);

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
