import { aws_ec2, aws_iam, aws_opensearchservice, CfnOutput, Duration } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2"
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs"
import { join } from "path";

export interface OpensearchClusterProps {
  vpc: Vpc,
  peerSecurityGroups: aws_ec2.SecurityGroup[]
}

export class OpensearchCluster extends Construct {
  constructor(scope:Construct,id:string,props:OpensearchClusterProps) {
    super(scope,id);

    //Security Gruops
    const lambdaSecurityGroup = new aws_ec2.SecurityGroup(this,'lambda-sg', {
      vpc:props.vpc,
      allowAllOutbound: true,
    });

    const opensearchSecurityGroup = new aws_ec2.SecurityGroup(this,'opensearch-sg', {
      vpc:props.vpc,
      allowAllOutbound: true
    });

    opensearchSecurityGroup.addIngressRule(
      aws_ec2.Peer.securityGroupId(lambdaSecurityGroup.securityGroupId),
      aws_ec2.Port.allTcp()
    );

    props.peerSecurityGroups.forEach((sg:aws_ec2.SecurityGroup) => {
      opensearchSecurityGroup.addIngressRule(
        aws_ec2.Peer.securityGroupId(sg.securityGroupId),
        aws_ec2.Port.allTcp()
      );
    });

    //Opensearch
    const osDomain = new aws_opensearchservice.Domain(this,'Domain', {
      version: aws_opensearchservice.EngineVersion.OPENSEARCH_1_1,
      vpc:props.vpc,
      securityGroups:[opensearchSecurityGroup],
      zoneAwareness: {
        enabled: true
      },
      capacity: {
        dataNodes:2
      },
      accessPolicies: [
        new aws_iam.PolicyStatement({
          actions:["es:*"],
          principals: [
            new aws_iam.AnyPrincipal
          ],
          effect:aws_iam.Effect.ALLOW,
          resources: ['*']
        })
      ]
    });

    new CfnOutput(this, "OpensearchUrl", {
      value: `https://${osDomain.domainEndpoint}`,
    });

    // Lambda
    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [],
      },
      depsLockFilePath: join(__dirname, '../lambdas', 'package-lock.json'),
      environment: {
        OS_DOMAIN_ENDPOINT: osDomain.domainEndpoint,
      },
      timeout: Duration.seconds(10),
      memorySize: 512,
      runtime: Runtime.NODEJS_14_X,
      vpc:props.vpc,
      securityGroups:[lambdaSecurityGroup],
      vpcSubnets:props.vpc.selectSubnets({subnetType: aws_ec2.SubnetType.PRIVATE_WITH_NAT})
    }

    const funkFunction = new NodejsFunction(this, 'funkFunction', {
      entry: join(__dirname, '../lambdas', 'funk.ts'),
      ...nodeJsFunctionProps,
    });
  }
}