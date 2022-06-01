import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as OpensearchWithGrafana from '../../lib/opensearch-with-grafana-stack';

test('Stack created', () => {
  const app = new cdk.App();
  const stack = new OpensearchWithGrafana.OpensearchWithGrafanaStack(app, 'TestStack',{
    cloudfrontPrefixListId:'prefix',
    ec2KeyPairName:'key'
  });

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Handler: "index.handler",
    Runtime: "nodejs14.x",
  });
  template.hasResourceProperties('AWS::ECS::Cluster',{});
  template.hasResourceProperties('AWS::OpenSearchService::Domain',{});
});