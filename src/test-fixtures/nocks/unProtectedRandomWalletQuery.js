import nock from 'nock';

export default () => {
    
  nock('http://localhost:4004', {"encodedQueryParams":true})
  .post('/exchange', {"tenantName":"RANDOM_TEST","data":[{"vc":{"@context":["https://www.w3.org/2018/credentials/v1","https://purl.imsglobal.org/spec/ob/v3p0/context.json","https://w3id.org/vc/status-list/2021/v1"],"id":"urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1","type":["VerifiableCredential","OpenBadgeCredential"],"issuer":{"id":"did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC","type":"Profile","name":"University of Wonderful","description":"The most wonderful university","url":"https://wonderful.edu/","image":{"id":"https://user-images.githubusercontent.com/947005/133544904-29d6139d-2e7b-4fe2-b6e9-7d1022bb6a45.png","type":"Image"}},"issuanceDate":"2020-01-01T00:00:00Z","name":"A Simply Wonderful Course","credentialSubject":{"type":"AchievementSubject","achievement":{"id":"http://wonderful.wonderful","type":"Achievement","criteria":{"narrative":"Completion of the Wonderful Course - well done you!"},"description":"Wonderful.","name":"Introduction to Wonderfullness"}}},"retrievalId":"someId"}],"exchangeHost":"http://localhost:4005"})
  .reply(200, [{"retrievalId":"someId","directDeepLink":"https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&challenge=50d08402-87dc-4cf2-a18d-f3804d7e08fb&vc_request_url=http://localhost:4005/exchange/1a18deae-eaf0-4227-8a74-9bd4f47d7bf0/50d08402-87dc-4cf2-a18d-f3804d7e08fb","vprDeepLink":"https://lcw.app/request.html?issuer=issuer.example.com&auth_type=bearer&vc_request_url=http://localhost:4005/exchange/1a18deae-eaf0-4227-8a74-9bd4f47d7bf0","chapiVPR":{"query":{"type":"DIDAuthentication"},"interact":{"service":[{"type":"VerifiableCredentialApiExchangeService","serviceEndpoint":"http://localhost:4005/exchange/1a18deae-eaf0-4227-8a74-9bd4f47d7bf0/50d08402-87dc-4cf2-a18d-f3804d7e08fb"},{"type":"CredentialHandlerService"}]},"challenge":"50d08402-87dc-4cf2-a18d-f3804d7e08fb","domain":"http://localhost:4005"}}], [
  'X-Powered-By',
  'Express',
  'Access-Control-Allow-Origin',
  '*',
  'Content-Type',
  'application/json; charset=utf-8',
  'Content-Length',
  '825',
  'ETag',
  'W/"339-cAV+yWyPqjAlnT5VjNk+pu4GZS8"',
  'Date',
  'Mon, 11 Sep 2023 18:36:43 GMT',
  'Connection',
  'keep-alive',
  'Keep-Alive',
  'timeout=5'
]);

}