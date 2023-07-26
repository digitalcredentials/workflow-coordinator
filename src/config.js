let CONFIG;
const defaultPort = 4005
const defaultTenantName = "default"
const defaultTenantValue = "UNPROTECTED"
const defaultExchangeHost = "http://localhost:4005"

//const defaultStatusServiceEndpoint = "STATUS-SERVICE:4008"
//const defaultSigningServiceEndpoint = "SIGNING-SERVICE:4006"
//const defaultTransactionServiceEndpoint = "TRANSACTION-SERVICE:4004"

// when developing using locally run, i.e, non-docker instance
const defaultStatusServiceEndpoint = "localhost:4008"
const defaultSigningServiceEndpoint = "localhost:4006"
const defaultTransactionServiceEndpoint = "localhost:4004"

// we set a default tenant
// It will be overwritten by whatever value is set for default in .env
const TENANT_ACCESS_TOKENS = {[defaultTenantName]: defaultTenantValue}

export function initializeConfig() {
  CONFIG = parseConfig();
}

function parseTenantTokens() {
  const allEnvVars = process.env;
  const tenantKeys = Object.getOwnPropertyNames(allEnvVars)
    .filter(key => key.toUpperCase().startsWith('TENANT_TOKEN_')) 
  for(const key of tenantKeys) {
    let value = allEnvVars[key]
    const tenantName = key.slice(13).toLowerCase()
    TENANT_ACCESS_TOKENS[tenantName] = value
  }
}


function parseConfig() {
  const env = process.env
  const config = Object.freeze({
    enableHttpsForDev: env.ENABLE_HTTPS_FOR_DEV?.toLowerCase() === 'true',
    enableAccessLogging: env.ENABLE_ACCESS_LOGGING?.toLowerCase() === 'true',
    enableStatusService: env.ENABLE_STATUS_SERVICE?.toLowerCase() === 'true',
    statusServiceEndpoint: env.STATUS_SERVICE_ENDPOINT ? env.STATUS_SERVICE_ENDPOINT : defaultStatusServiceEndpoint,
    signingServiceEndpoint: env.SIGNING_SERVICE_ENDPOINT ? env.SIGNING_SERVICE_ENDPOINT : defaultSigningServiceEndpoint,
    transactionServiceEndpoint: env.TRANSACTION_SERVICE_ENDPOINT ? env.TRANSACTION_SERVICE_ENDPOINT : defaultTransactionServiceEndpoint,
    exchangeHost: env.PUBLIC_EXCHANGE_HOST ? env.PUBLIC_EXCHANGE_HOST : defaultExchangeHost,
    port: env.PORT ? parseInt(env.PORT) : defaultPort
  });
  return config
}

export function getConfig() {
  if (!CONFIG) {
     initializeConfig()
  }
  return CONFIG;
}

export function resetConfig() {
  CONFIG = null;
}

export function getTenantToken(tenantName) {
  if (! Object.keys(TENANT_ACCESS_TOKENS).length) {
     parseTenantTokens()
  }
  if (TENANT_ACCESS_TOKENS.hasOwnProperty(tenantName)) {
    return TENANT_ACCESS_TOKENS[tenantName];
  } else {
    return null
  }
}

