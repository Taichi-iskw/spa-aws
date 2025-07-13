import * as cognito from "aws-cdk-lib/aws-cognito";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface CognitoAuthProps {
  domainName: string;
}

export class CognitoAuth extends Construct {
  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    super(scope, id);

    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "iskw-poc-user-pool",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      // TODO: Remove this when we have a proper way to delete the user pool
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const appClient = userPool.addClient("WebClient", {
      authFlows: { userPassword: true },
      oAuth: {
        flows: { implicitCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID],
        callbackUrls: [`https://${props.domainName}`],
        logoutUrls: [`https://${props.domainName}/logout`],
      },
      generateSecret: true,
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    });

    const domain = userPool.addDomain("PoolDomain", {
      cognitoDomain: { domainPrefix: "iskw-poc-auth" },
    });

    new cdk.CfnOutput(this, "CognitoDomain", {
      value: domain.signInUrl(appClient, { redirectUri: `https://${props.domainName}` }),
    });
  }
}
