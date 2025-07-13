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
      generateSecret: false,
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    });

    const domain = userPool.addDomain("PoolDomain", {
      cognitoDomain: { domainPrefix: "iskw-poc-auth" },
    });

    // // Cognito Domain
    // new cdk.CfnOutput(this, "CognitoDomain", {
    //   description: "Cognito Domain",
    //   exportName: "CognitoDomain",
    //   value: domain.signInUrl(appClient, { redirectUri: `https://${props.domainName}` }),
    // });
    // new cdk.CfnOutput(this, "CognitoUserPoolId", {
    //   description: "Cognito User Pool ID",
    //   exportName: "CognitoUserPoolId",
    //   value: userPool.userPoolId,
    // });
    // new cdk.CfnOutput(this, "CognitoUserPoolClientId", {
    //   description: "Cognito User Pool Client ID",
    //   exportName: "CognitoUserPoolAppId",
    //   value: appClient.userPoolClientId,
    // });
    // new cdk.CfnOutput(this, "CognitoUserPoolDomain", {
    //   description: "Cognito User Pool Domain",
    //   exportName: "CognitoUserPoolDomain",
    //   value: `${domain.domainName}.auth.${cdk.Stack.of(this).region}.amazoncognito.com`,
    // });
  }
}
