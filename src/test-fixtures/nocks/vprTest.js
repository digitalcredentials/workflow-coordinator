import nock from 'nock';

export default () => {
  
  nock('http://localhost:4004', {"encodedQueryParams":true})
  .post('/exchange', {"vc":{"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"}}},"tenantName":"UN_PROTECTED_TEST","exchangeHost":"http://localhost:4005"})
  .reply(200, [{"type":"directDeepLink","url":"https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&challenge=920b5a78-67ce-4e57-b46a-e4da5ad043d6&vc_request_url=http://localhost:4005/exchange/254d8e85-6265-4a23-9632-d7e9a6235e5a/920b5a78-67ce-4e57-b46a-e4da5ad043d6"},{"type":"vprDeepLink","url":"https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&vc_request_url=http://localhost:4005/exchange/254d8e85-6265-4a23-9632-d7e9a6235e5a"}], [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '460',
  'ETag',
  'W/"1cc-V3iW3QXAzDuygOtbObVzgTFTBDM"',
  'Date',
  'Tue, 29 Aug 2023 14:59:51 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);




nock('http://localhost:4004', {"encodedQueryParams":true})
  .post('/exchange/254d8e85-6265-4a23-9632-d7e9a6235e5a/')
  .reply(200, {"verifiablePresentationRequest":{"query":[{"type":"DIDAuthentication"}],"challenge":"920b5a78-67ce-4e57-b46a-e4da5ad043d6","domain":"http://localhost:4005","interact":{"service":[{"type":"UnmediatedPresentationService2021","serviceEndpoint":"http://localhost:4005/exchange/254d8e85-6265-4a23-9632-d7e9a6235e5a/920b5a78-67ce-4e57-b46a-e4da5ad043d6"}]}}}, [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '353',
  'ETag',
  'W/"161-ScnsHKIvs5R9Fd5atjLFZJXBrh4"',
  'Date',
  'Tue, 29 Aug 2023 14:59:51 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);



// NOTE: the DIDAuth that we specify in the body of this post uses a regex wildcard (/.+/i)
// for the 'created' date and the 'proofValue' since those vary for each new DIDAuth 
// that we generate as part of the test
nock('http://localhost:4004', {"encodedQueryParams":true})
  .post('/exchange/254d8e85-6265-4a23-9632-d7e9a6235e5a/920b5a78-67ce-4e57-b46a-e4da5ad043d6', {"@context":["https://www.w3.org/2018/credentials/v1","https://w3id.org/security/suites/ed25519-2020/v1"],"type":["VerifiablePresentation"],"holder":/.+/i,"proof":{"type":"Ed25519Signature2020","created":/.+/i,"verificationMethod":"did:key:z6MkvL5yVCgPhYvQwSoSRQou6k6ZGfD5mNM57HKxufEXwfnP#z6MkvL5yVCgPhYvQwSoSRQou6k6ZGfD5mNM57HKxufEXwfnP","proofPurpose":"authentication","challenge":"920b5a78-67ce-4e57-b46a-e4da5ad043d6","proofValue":/.+/i}})
  .reply(200, {"vc":{"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"}}},"tenantName":"UN_PROTECTED_TEST","exchangeHost":"http://localhost:4005","transactionId":"920b5a78-67ce-4e57-b46a-e4da5ad043d6","exchangeId":"254d8e85-6265-4a23-9632-d7e9a6235e5a"}, [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '1119',
  'ETag',
  'W/"45f-i5am5xYKt66i4p4N3MfvGKU1rmM"',
  'Date',
  'Tue, 29 Aug 2023 14:59:51 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);

nock('http://localhost:4006', {"encodedQueryParams":true})
  .post('/instance/un_protected_test/credentials/sign', {"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"},"id":/.+/i}})
  .reply(200, {"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1","https://w3id.org/security/suites/ed25519-2020/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"},"id":"did:ex:a6c38581-5351-41be-a783-d6c30b9d2e22"},"proof":{"type":"Ed25519Signature2020","created":"2023-08-29T14:59:51Z","verificationMethod":"did:key:z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy#z6Mkf2rgv7ef8FmLJ5Py87LMa7nofQgv6AstdkgsXiiCUJEy","proofPurpose":"assertionMethod","proofValue":"z35zWnnwu3oNWcF2oCfLMUQAKFH7aFHw5S3gt1sTqYdbm4CboexEzkcaHrRFxgfwU4j7gY2Hivg5Jp3Ux9vNxJDuT"}}, [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '1375',
  'ETag',
  'W/"55f-WbyDf1QwDh8Jkwdxurf9d0Prkfw"',
  'Date',
  'Tue, 29 Aug 2023 14:59:51 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);


}