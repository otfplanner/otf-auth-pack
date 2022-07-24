import * as coda from "@codahq/packs-sdk";
import { ExecutionContext } from "@codahq/packs-sdk";
import { OtfAuthTokenSchema } from "./schemas";
import { OTFAuthTokens } from "./types";

export const pack = coda.newPack();

const CacheTtlSecs = 300;  // Set cache timeout to be 5 minutes
const LongCacheTtlSecs = 3600;  // Long cache timeout to be 60 minutes

// Allow the Pack to access AWS for auth
pack.addNetworkDomain("cognito-idp.us-east-1.amazonaws.com");

const AwsCognitoAuthUrl = "https://cognito-idp.us-east-1.amazonaws.com/";

// OTF uses AWS Cognito for auth. It'll be a per-user setup, so the credentials
// are private per OTF member who uses this pack.
pack.setUserAuthentication({
  type: coda.AuthenticationType.Custom,
  params: [
    {
        name: "email",
        description: "Email for otlive.orangetheory.com",
    },
    {
        name: "password",
        description: "Password",
    }
  ],
  networkDomain: "cognito-idp.us-east-1.amazonaws.com"
});

const AuthApiClient = {
    fetchTokens: async (context: ExecutionContext): Promise<OTFAuthTokens> => {
        const results = await context.fetcher.fetch({
            url: AwsCognitoAuthUrl,
            headers: {
                "Content-Type": "application/x-amz-json-1.1",
                "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"
            },
            method: "POST",
            body: JSON.stringify({
                "AuthParameters": {
                    "USERNAME": `{{email-${context.invocationToken}}}`,
                    "PASSWORD": `{{password-${context.invocationToken}}}`
                },
                "AuthFlow": "USER_PASSWORD_AUTH",
                "ClientId": "65knvqta6p37efc2l3eh26pl5o"
            }),
            cacheTtlSecs: CacheTtlSecs
        });
    
        return {
            idToken: results.body.AuthenticationResult.IdToken as string,
            accessToken: results.body.AuthenticationResult.AccessToken as string,
        };
    },

    fetchMemberUuid: async (context: ExecutionContext): Promise<string> => {
        const tokens = await AuthApiClient.fetchTokens(context);

        const userInfo = await context.fetcher.fetch({
            url: AwsCognitoAuthUrl,
            headers: {
                "Content-Type": "application/x-amz-json-1.1",
                "X-Amz-Target": "AWSCognitoIdentityProviderService.GetUser"
            },
            method: "POST",
            body: JSON.stringify({
                "AccessToken": tokens.accessToken
            }),
            // @NOTE: Likelihood of memberUuid to change is low.
            cacheTtlSecs: LongCacheTtlSecs
        });

        return userInfo.body.Username;
    },
}

// Fetch tokens required by Orangetheory API endpoints
pack.addFormula({
    name: "GetAuthTokens",
    description: "Get auth tokens to connect to Orangetheory API endpoints",
    parameters: [],
    resultType: coda.ValueType.Object,
    schema: OtfAuthTokenSchema,
    execute: async function ([], context) {
        const tokens = await AuthApiClient.fetchTokens(context);
        const memberUuid = await AuthApiClient.fetchMemberUuid(context);

        return {
            idToken: tokens.idToken,
            memberUuid,
        };
    },
});