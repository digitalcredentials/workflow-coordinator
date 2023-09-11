import testVC from './testVC.js';

  // "credentialStatus":
  const credentialStatus =  {
    "id": "https://digitalcredentials.github.io/credential-status-jc-test/XA5AAK1PV4#16",
    "type": "StatusList2021Entry",
    "statusPurpose": "revocation",
    "statusListIndex": 16,
    "statusListCredential": "https://digitalcredentials.github.io/credential-status-jc-test/XA5AAK1PV4"
}


const getUnsignedVC = () => JSON.parse(JSON.stringify(testVC))
const getUnsignedVCWithoutSuiteContext = () => {
    const vcCopy = JSON.parse(JSON.stringify(testVC))
    const index = vcCopy['@context'].indexOf(ed25519_2020suiteContext);
    if (index > -1) { 
      vcCopy['@context'].splice(index, 1); 
    }
    return vcCopy
}
const getCredentialStatus = () => JSON.parse(JSON.stringify(credentialStatus))

const getUnsignedVCWithStatus = () => {
  const unsignedVCWithStatus = getUnsignedVC();
  unsignedVCWithStatus.credentialStatus = getCredentialStatus();
  return unsignedVCWithStatus
}

const getDataForExchangeSetupPost = (tenantName) => {
  const fakeData = {
    tenantName,
    data: [{vc: testVC, retrievalId: 'someId'}]
  }
  return fakeData
}
const ed25519_2020suiteContext = "https://w3id.org/security/suites/ed25519-2020/v1"
const statusListContext = "https://w3id.org/vc/status-list/2021/v1"

export { getUnsignedVC, getUnsignedVCWithoutSuiteContext, getCredentialStatus, getDataForExchangeSetupPost, getUnsignedVCWithStatus, ed25519_2020suiteContext, statusListContext}
