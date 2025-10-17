export default () => ({
  keycloak: {
    baseUrl: process.env.KEYCLOAK_AUTH_SERVER_URL,
    realmName: process.env.KEYCLOAK_REALM,
    clientId: process.env.KEYCLOAK_CLIENT_ID,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
  },
});

export const KEYCLOAK_CONFIG_KEY = {
  BASE_URL: 'keycloak.baseUrl',
  REALM_NAME: 'keycloak.realmName',
  CLIENT_ID: 'keycloak.clientId',
  CLIENT_SECRET: 'keycloak.clientSecret',
};
