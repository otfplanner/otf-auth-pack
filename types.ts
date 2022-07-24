export interface OTFAuthTokens {
    // `idToken` is used to interact with OTF endpoints
    idToken: string;
    // `accessToken` is used to interact with AWS Cognito
    accessToken: string;
}