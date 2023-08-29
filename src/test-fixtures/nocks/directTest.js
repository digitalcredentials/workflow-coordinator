import nock from 'nock';

export default () => {
  
  nock('http://localhost:4004', {"encodedQueryParams":true})
  .post('/exchange', {"vc":{"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"}}},"tenantName":"UN_PROTECTED_TEST","exchangeHost":"http://localhost:4005"})
  .reply(200, [{"type":"directDeepLink","url":"https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&challenge=3bc9dc5e-c949-4d1d-872e-e96797f49959&vc_request_url=http://localhost:4005/exchange/e8caa01f-3804-4fbf-a25c-3fbf280ca902/3bc9dc5e-c949-4d1d-872e-e96797f49959"},{"type":"vprDeepLink","url":"https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&vc_request_url=http://localhost:4005/exchange/e8caa01f-3804-4fbf-a25c-3fbf280ca902"}], [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '460',
  'ETag',
  'W/"1cc-9UidvhtYjsgEsiXzsmxUsOFpqaE"',
  'Date',
  'Tue, 29 Aug 2023 14:10:25 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);

// NOTE: the DIDAuth that we specify in the body of this post uses a regex wildcard (/.+/i)
// for the 'created' date and the 'proofValue' since those vary for each new DIDAuth 
// that we generate as part of the test
nock('http://localhost:4004', {"encodedQueryParams":true})
  .post('/exchange/e8caa01f-3804-4fbf-a25c-3fbf280ca902/3bc9dc5e-c949-4d1d-872e-e96797f49959', {"@context":["https://www.w3.org/2018/credentials/v1","https://w3id.org/security/suites/ed25519-2020/v1"],"type":["VerifiablePresentation"],"holder":"did:ex:223234","proof":{"type":"Ed25519Signature2020","created":/.+/i,"verificationMethod":"did:key:z6MkvL5yVCgPhYvQwSoSRQou6k6ZGfD5mNM57HKxufEXwfnP#z6MkvL5yVCgPhYvQwSoSRQou6k6ZGfD5mNM57HKxufEXwfnP","proofPurpose":"authentication","challenge":"3bc9dc5e-c949-4d1d-872e-e96797f49959","proofValue":/.+/i}})
  .reply(200, {"vc":{"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"}}},"tenantName":"UN_PROTECTED_TEST","exchangeHost":"http://localhost:4005","transactionId":"3bc9dc5e-c949-4d1d-872e-e96797f49959","exchangeId":"e8caa01f-3804-4fbf-a25c-3fbf280ca902"}, [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '1119',
  'ETag',
  'W/"45f-FWbP1BDA86MBmhdph6RCFJrYa7s"',
  'Date',
  'Tue, 29 Aug 2023 14:10:25 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);

nock('http://localhost:4006', {"encodedQueryParams":true})
  .post('/instance/un_protected_test/credentials/sign', {"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"},"id":"did:ex:223234"}})
  .reply(200, {"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1","https://w3id.org/security/suites/ed25519-2020/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"},"id":"did:ex:223234"},"proof":{"type":"Ed25519Signature2020","created":"2023-08-29T14:10:25Z","verificationMethod":"did:key:z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy#z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy","proofPurpose":"assertionMethod","proofValue":"z3xg7VSk4kuHh16KiUUMn1npokR9KEwG5EjPuSix47RKFU5oBkWLRv5usp4f1CwZJCsPAfHLJKKTfWeN5D4cF2Ljh"}}, [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '1345',
  'ETag',
  'W/"541-iSFsHPno0OO/og+nmXAxvea8Da8"',
  'Date',
  'Tue, 29 Aug 2023 14:10:25 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);


}