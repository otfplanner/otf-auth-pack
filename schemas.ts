import * as coda from "@codahq/packs-sdk";

export const OtfAuthTokenSchema = coda.makeObjectSchema({
    properties: {
        idToken: {
            type: coda.ValueType.String,
            description: 'API token to access Orangetheory API endpoints',
        },
        memberUuid: {
            type: coda.ValueType.String,
            description: 'Orangetheory Member Unique ID'
        }
    }
});

