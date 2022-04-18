import { CognitoIdentityProviderClient, AddCustomAttributesCommand, AdminInitiateAuthCommand, NotAuthorizedException, AdminRespondToAuthChallengeCommand, AdminRespondToAuthChallengeCommandOutput, AdminRespondToAuthChallengeCommandInput } from "@aws-sdk/client-cognito-identity-provider";
import { Authenticator, AuthenticateOptions, Strategy } from "remix-auth";
import { AppLoadContext, SessionStorage } from "@remix-run/server-runtime";
import { sessionStorage } from "~/services/session.server";
import { getArcConfig } from "~/models/arc.server";

const APP_CLIENT_ID = '3q9fqc6od81a2keffmeaqs1ia0';

export interface CognitoStrategyVerifyParams {
  form: FormData;
  context?: AppLoadContext;
}

export class PasswordChangeException extends Error {
  sessionId: string

  constructor(msg: string, sessionId: string) {
    super(msg);
    this.sessionId = sessionId;
    Object.setPrototypeOf(this, PasswordChangeException.prototype);
  }
}

export class CognitoStrategy<User> extends Strategy<User, CognitoStrategyVerifyParams> {
  name = "form";

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: AuthenticateOptions
  ): Promise<User> {
    let form = await request.formData();
    let user: User;
    try {
      user = await this.verify({ form, context: options.context });
    } catch (error) {
      let message = (error as Error).message;
      return await this.failure(message, request, sessionStorage, options);
    }

    return this.success(user, request, sessionStorage, options);
  }
}

export type User = {};

export let authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(new CognitoStrategy(async ({ form }) => {
  console.log('Fetching Arc Config...');
  let config = await getArcConfig();

  console.log('Snagging username/password from the form...')
  let username = form.get('username')?.toString() || '';
  let password = form.get('password')?.toString() || '';

  console.log('Creating the Cognito Client...');
  let client = new CognitoIdentityProviderClient({
    region: 'us-west-2',
  });

  console.log('Creating the Admin Auth Command...');
  let command = new AdminInitiateAuthCommand({
    AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
    ClientId: APP_CLIENT_ID,
    UserPoolId: config.cognitoPoolId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  console.log('Trying to execute command...');
  let result = await client.send(command);

  if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
    throw new Error(JSON.stringify({
      type: 'password_reset',
      session: result.Session,
      username,
    }));
  }
  console.log(JSON.stringify(result));

  return { };
}), "user-pass");

export const resetPassword = async (username: string, password: string, session: string) => {
  let config = await getArcConfig();

  let client = new CognitoIdentityProviderClient({
    region: 'us-west-2',
  });

  let data = {
    USERNAME: username,
    NEW_PASSWORD: password,
  };

  let commandInput: AdminRespondToAuthChallengeCommandInput = {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    ClientId: APP_CLIENT_ID,
    UserPoolId: config.cognitoPoolId,
    ChallengeResponses: data,
    Session: session,
  };

  let command = new AdminRespondToAuthChallengeCommand(commandInput);

  try {
    let result = await client.send(command);

    console.log(JSON.stringify(result));

    return result;
  } catch (e) {
    console.error(e);
  }
};