import nock from 'nock';
import { expect } from 'chai'
import request from 'supertest';
import crypto from 'crypto';
import { getUnsignedVC, getUnsignedVCWithStatus, getDataForExchangeSetupPost } from './test-fixtures/vc.js';
import unsignedNock from './test-fixtures/nocks/unprotected_sign.js'
import { getSignedDIDAuth } from './didAuth.js';

import { build } from './app.js';

const port = 4005
const unprotectedTenantName = "UN_PROTECTED_TEST"
const protectedTenantName = "PROTECTED_TEST"
const randomTenantName = "RANDOM_TEST"
let unprotectedTenantToken
let protectedTenantToken
let randomToken

let statusUpdateBody
let app
let server

describe('api', () => {

  before(async () => {
    unprotectedTenantToken = process.env[`TENANT_TOKEN_${unprotectedTenantName}`]
    protectedTenantToken = process.env[`TENANT_TOKEN_${protectedTenantName}`]
    randomToken = process.env[`TENANT_TOKEN_${randomTenantName}`]
    statusUpdateBody = { "credentialId": "urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1", "credentialStatus": [{ "type": "StatusList2021Credential", "status": "revoked" }] }
  });

  after(() => {

  })

  beforeEach(async () => {
    app = await build();
    // server = http.createServer(app).listen(port)
  });

  afterEach(async () => {
    // server.close()
    nock.restore()
  });

  describe('GET /', () => {
    it('GET / => hello', done => {

      nock('http://localhost:4006').get("/").reply(200, 'signing-service server status: ok.')
      nock('http://localhost:4008').get("/").reply(200, 'status-service server status: ok.')

      request(app)
        .get("/")
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(/{"message":"exchange-coordinator, transaction-service, and signing-service all ok. status-service is disabled."}/, done);

    });
  })

  describe('GET /unknown', () => {
    it('unknown endpoint returns 404', done => {
      request(app)
        .get("/unknown")
        .expect(404, done)
    }, 10000);
  })

  describe('POST /exchange/setup', () => {

    it('returns 400 if no body', done => {
      request(app)
        .post("/exchange/setup")
        .set('Authorization', `Bearer ${protectedTenantToken}`)
        .expect('Content-Type', /json/)
        .expect(400, done)
    })

    it('returns 401 if tenant token is missing from auth header', done => {
      request(app)
        .post("/exchange/setup")
        .send(getDataForExchangeSetupPost(protectedTenantName))
        .expect('Content-Type', /json/)
        .expect(401, done)
    })

    it('returns wallet query for UNPROTECTED tenant, without auth header', async () => {
      nock.recorder.rec()
      //walletQueryNock();

      const response = await request(app)
        .post("/exchange/setup")
        .send(getDataForExchangeSetupPost(unprotectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(200);
      expect(response.body)


    })

    it('returns 403 if token is not valid', done => {
      request(app)
        .post("/instance/testing/credentials/issue")
        .set('Authorization', `Bearer badToken`)
        .send(getUnsignedVC())
        .expect('Content-Type', /text/)
        .expect(403, done)
    })

    it('returns 403 when trying to use token for a different tenant', done => {
      request(app)
        .post("/instance/testing/credentials/issue")
        .set('Authorization', `Bearer ${testTenantToken2}`)
        .send(getUnsignedVC())
        .expect('Content-Type', /text/)
        .expect(403, done)
    })

    it('returns 401 if token is not marked as Bearer', done => {
      request(app)
        .post("/instance/testing/credentials/issue")
        .set('Authorization', `${testTenantToken}`)
        .send(getUnsignedVC())
        .expect('Content-Type', /text/)
        .expect(401, done)
    })

    it('returns 404 if no seed for tenant name', done => {
      request(app)
        .post("/instance/wrongTenantName/credentials/issue")
        .set('Authorization', `${testTenantToken}`)
        .send(getUnsignedVC())
        .expect(404, done)
        .expect('Content-Type', /text/)

    })

    it('does the direct exchange', async () => {

      /*
         A test that mocks both the wallet part of the interaction, and the 
         'issuer coordinator app' (i.e, the university specific code that uses the
         exchange coordinator), so that the flow can more easily be
         tested, without needing to redirect into an actual running wallet.
         NOTE: THIS TESTS WITHOUT THE INTERMEIDATE VPR step
         */

      // Step 1. Mimics what the school/uni code would do, which is to setup the 
      // exchange by passing in a VC that is pre-populated with student data.
      // The exchange endpoint stores the data and returns a deeplink (with challenge)
      // to which the student can be redirected, and which will then open the wallet

      const response = await request(app)
        .post("/exchange/setup")
        .send(getDataForExchangeSetupPost(unprotectedTenantName))
      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(200);
      expect(response.body)

      const walletQuery = response.body
      const { url } = walletQuery.find(q => q.type === 'directDeepLink')

      // Step 2. Now that we've got the deeplink, we would redirect to it, which
      // would open the wallet. In this test, we're just assuming that this has already 
      // happened, and that now we are in the wallet

      // Step 3. Mimics what the wallet would do when opened by deeplink
      // which is to parse the deeplink, construct a DIDAuth and call
      // the /exchange/:exchangeId/:transactionId continutation endpoint
      // which it got from the deeplink, posting in the didAuth.
      // The continuation endpoint checks the didAuth, gets the VC from the transaction manager,
      // signs and returns it.

      const parsedDeepLink = new URL(url)
      const requestURI = parsedDeepLink.searchParams.get('vc_request_url'); //should be http://localhost:4004/exchange?challenge=VOclS8ZiMs&auth_type=bearer
      // here we need to pull out just the path
      // since we are calling the endpoint via
      // supertest
      const path = (new URL(requestURI)).pathname
      const challenge = parsedDeepLink.searchParams.get('challenge'); // the challenge that the exchange service generated 
      const didAuth = await getSignedDIDAuth('did:ex:223234', challenge)

      const exchangeResponse = await request(app)
        .post(path)
        .send(didAuth)

      expect(exchangeResponse.header["content-type"]).to.have.string("json");
      expect(exchangeResponse.status).to.eql(200);
      expect(exchangeResponse.body)

      console.log(exchangeResponse.body)
      const signedVC = exchangeResponse.body
      expect(signedVC.proof).to.exist


    });


    it.only('does the vpr exchange', async () => {
      /*
      A test that mocks both the wallet part of the interaction, and the 
      'issuer coordinator app' (i.e, the university specific code that uses the
      exchange coordinator), so that the flow can be
      tested without needing to redirect into an actual running wallet.
      NOTE: this tests with the intermediate VPR step
      */
      // Step 1. Mimics what the school/uni code would do, which is to setup the 
      // exchange by passing in a VC that is pre-populated with student data.
      // The exchange endpoint stores the data and returns a deeplink (with challenge)
      // to which the student can be redirected, and which will then open the wallet

      const setupResponse = await request(app)
        .post("/exchange/setup")
        .send(getDataForExchangeSetupPost(unprotectedTenantName))
      expect(setupResponse.header["content-type"]).to.have.string("json");
      expect(setupResponse.status).to.eql(200);
      expect(setupResponse.body)

      const walletQuery = setupResponse.body

      // The exchange endpoint stores the data and returns a deeplink (with challenge)
      // to which the student can be redirected, and which will then open the wallet
      const { url } = walletQuery.find(q => q.type === 'vprDeepLink')

      // Step 2. mimics what the wallet would do when opened by deeplink
      // which is to parse the deeplink and call the exchange initiation endpoint
      const parsedDeepLink = new URL(url)
      const inititationURI = parsedDeepLink.searchParams.get('vc_request_url');
      // strip out the host because we are using supertest
      const initiationURIPath = (new URL(inititationURI)).pathname

      const initiationResponse = await request(app)
        .post(initiationURIPath)
      expect(initiationResponse.header["content-type"]).to.have.string("json");
      expect(initiationResponse.status).to.eql(200);
      expect(initiationResponse.body)

      const vpr = initiationResponse.body
      console.log(vpr)

      // Step 3. mimics what the wallet does once it's got the VPR
      const challenge = vpr.verifiablePresentationRequest.challenge // the challenge that the exchange service generated
      const continuationURI = vpr.verifiablePresentationRequest.interact.service.find(service => service.type === 'UnmediatedPresentationService2021').serviceEndpoint
      // strip out the host because we are using supertest
      const continuationURIPath = (new URL(continuationURI)).pathname
      const randomId = `did:ex:${crypto.randomUUID()}`
      const didAuth = await getSignedDIDAuth(randomId, challenge)

      const continuationResponse = await request(app)
        .post(continuationURIPath)
        .send(didAuth)

      expect(continuationResponse.header["content-type"]).to.have.string("json");
      expect(continuationResponse.status).to.eql(200);
      expect(continuationResponse.body)

      const signedVC = continuationResponse.body
      console.log(signedVC)
      expect(signedVC.proof).to.exist
      expect(signedVC.credentialSubject.id).to.equal(randomId)

      //const signedVC = await callService(continuationURI, didAuth)
      //return res.json(signedVC)



    })



    it('invokes the signing service', async () => { })

    it('invokes the status service', async () => { })



  })


})