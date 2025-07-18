import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecr from "aws-cdk-lib/aws-ecr";

import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";

interface SpaAwsStackProps extends cdk.StackProps {
  hostedZone: route53.IHostedZone;
  certificate: acm.ICertificate;
}

export class SpaAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SpaAwsStackProps) {
    super(scope, id, props);
    const siteDomainName = "spa.iskw-poc.click";

    // ===== Frontend S3 & CloudFront =====
    const bucket = new s3.Bucket(this, "SpaAwsBucket", {
      bucketName: "spa-aws-bucket",
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(bucket);

    // ===== GitHub OIDC for S3 deploy =====
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
    bucket.grantPut(githubOidcRole);

    // ===== Backend Fargate & ALB =====
    // Create VPC
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      natGateways: 0,
    });

    // ECR Repository
    const repo = new ecr.Repository(this, "FlaskRepository", {
      repositoryName: "sample-flask-repo",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, "EcsCluster", { vpc });

    // Fargate Task Definition
    const taskDef = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu: 256,
      memoryLimitMiB: 512,
    });
    const container = taskDef.addContainer("AppContainer", {
      image: ecs.ContainerImage.fromEcrRepository(repo, "latest"), // path to Dockerfile
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "flask" }),
    });
    container.addPortMappings({ containerPort: 8080 });

    // Fargate Service
    const service = new ecs.FargateService(this, "FargateService", {
      cluster,
      taskDefinition: taskDef,
      assignPublicIp: true,
      minHealthyPercent: 50,
    });

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc,
      internetFacing: true,
    });
    const listener = alb.addListener("Listener", {
      port: 80,
      open: true,
    });
    listener.addTargets("FlaskTargets", {
      port: 8080,
      targets: [service],
      healthCheck: { path: "/api" },
    });

    // ===== CloudFront Distribution =====
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

    // Add /api/* behavior to route to ALB
    distribution.addBehavior(
      "/api/*",
      new origins.LoadBalancerV2Origin(alb, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      }),
      {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      }
    );

    // Route53 A record
    new route53.ARecord(this, "ARecord", {
      zone: props.hostedZone,
      recordName: siteDomainName,
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
    });

    new cdk.CfnOutput(this, "SpaUrl", {
      value: `https://${siteDomainName}`,
    });
  }
}
