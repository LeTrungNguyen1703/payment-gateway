export default () => ({
  payos: {
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  },
});

export const PAYOS_CONFIG_KEY = {
  CLIENT_ID: 'payos.clientId',
  API_KEY: 'payos.apiKey',
  CHECKSUM_KEY: 'payos.checksumKey',
};
