import nock from 'nock';

export default () => {
    
  nock('http://localhost:4004', {"encodedQueryParams":true})
  .post('/exchange', {"vc":{"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"}}},"tenantName":"PROTECTED_TEST","exchangeHost":"http://localhost:4005"})
  .reply(200, [{"type":"directDeepLink","url":"https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&challenge=0383724a-ab56-45a5-8fb5-077346889fc0&vc_request_url=http://localhost:4005/exchange/2a514442-378f-4561-8580-3d797c3c4dc8/0383724a-ab56-45a5-8fb5-077346889fc0"},{"type":"vprDeepLink","url":"https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&vc_request_url=http://localhost:4005/exchange/2a514442-378f-4561-8580-3d797c3c4dc8"}], [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '460',
  'ETag',
  'W/"1cc-MgOJf9gljdy/rhc/KsQ9MFuxP9M"',
  'Date',
  'Tue, 29 Aug 2023 17:00:45 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);

}