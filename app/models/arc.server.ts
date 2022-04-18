import arc from '@architect/functions';

export type Arc = { cognitoPoolId: string, cognitoPoolProviderUrl: string };

export async function getArcConfig(): Promise<Arc> {
  let services = await (arc as any).services();
  let key = !!services.services ? 'services' : 'cognito';
  let { [key]: { cognitoPoolId, cognitoPoolProviderURL: cognitoPoolProviderUrl } } = await (arc as any).services();

  return {
    cognitoPoolId,
    cognitoPoolProviderUrl,
  };
};