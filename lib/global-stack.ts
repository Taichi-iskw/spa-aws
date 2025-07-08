import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

export class GlobalStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = "iskw-poc.click";
    const siteDomainName = "spa.iskw-poc.click";
    this.hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", { domainName });

    this.certificate = new acm.Certificate(this, "Certificate", {
      domainName: siteDomainName,
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });
  }
}
