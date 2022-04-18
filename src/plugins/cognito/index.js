// let { join } = require('path')
const { join } = require('path');
const { toLogicalID } = require('@architect/utils');
const { paramCase: dashCasify } = require('param-case');

const getPoolLabel = (arc, stage) =>
  arc.app[0].charAt(0).toUpperCase() +
  arc.app[0].substr(1) +
  stage.charAt(0).toUpperCase() +
  stage.substr(1) +
  "-UserPool";

module.exports = {
  deploy: {
    start: async ({ arc, cloudformation: sam, stage }) => {
      if (!arc.cognito) return sam;
      const poolLabel = getPoolLabel(arc, stage);
      const name = toLogicalID(poolLabel);
      let opts = arc.cognito;

      const getOption = (opt) => opts.find((o) => (Array.isArray(o) && o[0] === opt) || (typeof o === "string" && o === opt));

      let pool = {
        Type: "AWS::Cognito::UserPool",
        Properties: {
          UserPoolName: poolLabel,
        },
      };

      const recovery = getOption("RecoveryOptions");
      if (recovery) {
        pool.Properties.AccountRecoverySetting = {
          RecoveryMechanisms: recovery.slice(1).map((m, i) => ({ Name: m, Priority: i + 1 })),
        };
      }
      const adminOnly = getOption("AllowAdminCreateUserOnly");
      if (adminOnly) {
        pool.Properties.AdminCreateUserConfig = {
          AllowAdminCreateUserOnly: Array.isArray(adminOnly) ? adminOnly[1] : true,
        };
      }
      const autoVerifiedAttrs = getOption("AutoVerifiedAttributes");
      if (autoVerifiedAttrs) {
        pool.Properties.AutoVerifiedAttributes = autoVerifiedAttrs.slice(1);
      }
      const sesArn = getOption("SESARN");
      if (sesArn) {
        pool.Properties.EmailConfiguration = {
          EmailSendingAccount: "DEVELOPER",
          SourceArn: sesArn[1],
        };
        const fromEmail = getOption("FromEmail");
        if (fromEmail) {
          pool.Properties.EmailConfiguration.From = fromEmail[1];
        }
      }
      const stdAttrs = getOption("StandardAttributes");
      if (stdAttrs) {
        let attrs = stdAttrs.slice(1);
        if (!pool.Properties.Schema) pool.Properties.Schema = [];
        pool.Properties.Schema = pool.Properties.Schema.concat(
          attrs.map((a) => ({
            Mutable: false,
            Required: true,
            Name: a,
          }))
        );
      }
      const usernameAttrs = getOption("UsernameAttributes");
      if (usernameAttrs) {
        pool.Properties.UsernameAttributes = usernameAttrs.slice(1);
      }
      const usernameCase = getOption("UsernameCaseSensitive");
      if (usernameCase) {
        pool.Properties.UsernameConfiguration = {
          CaseSensitive: Array.isArray(usernameCase) ? usernameCase[1] : true,
        };
      }
      // Custom attribute support requires us to inspect the property keys
      // to see if they start with a particular string
      let customAttrs = opts.filter(
        (k) => Array.isArray(k) && k[0].indexOf("CustomAttribute:") === 0
      );
      if (customAttrs.length) {
        if (!pool.Properties.Schema) pool.Properties.Schema = [];
        pool.Properties.Schema = pool.Properties.Schema.concat(
          customAttrs.map((c) => {
            let Name = c[0].split("CustomAttribute:").join("");
            let attrs = c.slice(1);
            let type = attrs[0];
            // for some reason the string/number constraint parameters, which are all numbers, need to be defined as strings?
            // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cognito-userpool-stringattributeconstraints.html
            // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cognito-userpool-numberattributeconstraints.html
            const min = "" + attrs[1];
            const max = "" + attrs[2];
            let constraint = {
              MinValue: min,
              MaxValue: max,
            };
            if (type === "String") {
              constraint = {
                MinLength: min,
                MaxLength: max,
              };
            }
            let Mutable = attrs[3];
            let attr = {
              AttributeDataType: type,
              Mutable,
              Name,
            };
            let constraintName =
              type === "Number" ? "NumberAttributeConstraints" : "StringAttributeConstraints";
            attr[constraintName] = constraint;
            return attr;
          })
        );
      }
      sam.Resources[name] = pool;
      return sam;
    },
    services: async ({ arc, cloudformation, dryRun, inventory, stage }) => {
      if (!arc.cognito) { return {}; }
      const poolLabel = getPoolLabel(arc, stage);
      const name = toLogicalID(poolLabel);
      const isLocal = stage === 'testing'

      return {
        cognitoPoolId: isLocal ? 'local' : { Ref: name },
        cognitoPoolProviderURL: isLocal ? 'local' : { "Fn::GetAtt": [name, "ProviderURL"] },
      };
    },
  },
}
