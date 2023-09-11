import nock from 'nock';

export default () => {
  
  nock('http://localhost:4004', {"encodedQueryParams":true})
  .post('/exchange', {"tenantName":"UN_PROTECTED_TEST","data":[{"vc":{"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"}}},"retrievalId":"someId"}],"exchangeHost":"http://localhost:4005"})
  .reply(200, [{"retrievalId":"someId","directDeepLink":"https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&challenge=199ea83d-3b8d-44f0-8509-d10ce02f5c7c&vc_request_url=http://localhost:4005/exchange/34913bac-b4d7-4c98-a598-c259e8d2925e/199ea83d-3b8d-44f0-8509-d10ce02f5c7c","vprDeepLink":"https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&vc_request_url=http://localhost:4005/exchange/34913bac-b4d7-4c98-a598-c259e8d2925e","chapiVPR":{"query":{"type":"DIDAuthentication"},"interact":{"service":[{"type":"VerifiableCredentialApiExchangeService","serviceEndpoint":"http://localhost:4005/exchange/34913bac-b4d7-4c98-a598-c259e8d2925e/199ea83d-3b8d-44f0-8509-d10ce02f5c7c"},{"type":"CredentialHandlerService"}]},"challenge":"199ea83d-3b8d-44f0-8509-d10ce02f5c7c","domain":"http://localhost:4005"}}], [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '825',
  'ETag',
  'W/"339-coWpr/fCrb6Y5Q1mgF4pA4vWd0Q"',
  'Date',
  'Mon, 11 Sep 2023 18:45:47 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);


nock('http://localhost:4004', {"encodedQueryParams":true})
  .post('/exchange/34913bac-b4d7-4c98-a598-c259e8d2925e/')
  .reply(200, {"verifiablePresentationRequest":{"query":[{"type":"DIDAuthentication"}],"challenge":"199ea83d-3b8d-44f0-8509-d10ce02f5c7c","domain":"http://localhost:4005","interact":{"service":[{"type":"UnmediatedPresentationService2021","serviceEndpoint":"http://localhost:4005/exchange/34913bac-b4d7-4c98-a598-c259e8d2925e/199ea83d-3b8d-44f0-8509-d10ce02f5c7c"}]}}}, [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '353',
  'ETag',
  'W/"161-osisMr5voW6HS6RDma87y9aLu58"',
  'Date',
  'Mon, 11 Sep 2023 18:45:47 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);

// NOTE: the DIDAuth that we specify in the body of this post uses a regex wildcard (/.+/i)
// for the 'holder', 'created' and 'proofValue' since those vary for each new DIDAuth 
// that we generate as part of the test

nock('http://localhost:4004', {"encodedQueryParams":true})
  .post('/exchange/34913bac-b4d7-4c98-a598-c259e8d2925e/199ea83d-3b8d-44f0-8509-d10ce02f5c7c', {"@context":["https://www.w3.org/2018/credentials/v1","https://w3id.org/security/suites/ed25519-2020/v1"],"type":["VerifiablePresentation"],"holder":/.+/i,"proof":{"type":"Ed25519Signature2020","created":/.+/i,"verificationMethod":"did:key:z6MkvL5yVCgPhYvQwSoSRQou6k6ZGfD5mNM57HKxufEXwfnP#z6MkvL5yVCgPhYvQwSoSRQou6k6ZGfD5mNM57HKxufEXwfnP","proofPurpose":"authentication","challenge":"199ea83d-3b8d-44f0-8509-d10ce02f5c7c","proofValue":/.+/i}})
  .reply(200, {"vc":{"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"}}},"retrievalId":"someId","tenantName":"UN_PROTECTED_TEST","exchangeHost":"http://localhost:4005","transactionId":"199ea83d-3b8d-44f0-8509-d10ce02f5c7c","exchangeId":"34913bac-b4d7-4c98-a598-c259e8d2925e"}, [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '1142',
  'ETag',
  'W/"476-T9T4eF1+tAdkBVe76EusGc5hQPA"',
  'Date',
  'Mon, 11 Sep 2023 18:45:47 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);

// NOTE: the unsigned vc that we specify in the body of this post uses a regex wildcard (/.+/i)
// for the 'id', since that varies for each new DIDAuth that we generate as part of the test

nock('http://localhost:4006', {"encodedQueryParams":true})
  .post('/instance/un_protected_test/credentials/sign', {"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"},"id":/.+/i}})
  .reply(200, {"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1","https://w3id.org/security/suites/ed25519-2020/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"},"id":"did:ex:f2c9d4c6-651d-4f61-9077-7121d123ecbf"},"proof":{"type":"Ed25519Signature2020","created":"2023-09-11T18:45:47Z","verificationMethod":"did:key:z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy#z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy","proofPurpose":"assertionMethod","proofValue":"zvzNLRHjFmd3L1Dv6oNH5apMuAjMjCEp19XgtNRKinfAtVfZa6hwx9d3fvpFN5nT46WFVvJoXrpj27hkZFx6YtX6"}}, [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '1374',
  'ETag',
  'W/"55e-AcEclA2B2QhCBxOMthyaMWer7CM"',
  'Date',
  'Mon, 11 Sep 2023 18:45:47 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);


}