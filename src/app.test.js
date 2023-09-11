import nock from 'nock';
import { expect } from 'chai'
import request from 'supertest';
import crypto from 'crypto';
import { getDataForExchangeSetupPost } from './test-fixtures/vc.js';
import directTestNocks from './test-fixtures/nocks/directTest.js'
import unprotectedWalletQueryNock from './test-fixtures/nocks/unprotectedWalletQuery.js'
import protectedWalletQueryNock from './test-fixtures/nocks/protectedWalletQuery.js';
import unProtectedRandomWalletQuery from './test-fixtures/nocks/unProtectedRandomWalletQuery.js';
import vprTestNocks from './test-fixtures/nocks/vprTest.js'

import { getSignedDIDAuth } from './didAuth.js';

import { build } from './app.js';

const exchangeSetupPath = '/exchange/setup'
const unprotectedTenantName = "UN_PROTECTED_TEST"
const protectedTenantName = "PROTECTED_TEST"
const randomTenantName = "RANDOM_TEST"
let unprotectedTenantToken
let protectedTenantToken
let randomToken

let statusUpdateBody
let app

const noMatchHandler = req => {
  if (req.path !== exchangeSetupPath) {
    throw new Error(`Unexpected request was sent to ${req.host}${req.path}`)
  }
}

const checkForUnexpectedCalls = () => {
  nock.emitter.on('no match', noMatchHandler);
}

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
    if (!nock.isActive()) nock.activate()
  });

  afterEach(async () => {
    // we have to clean up nock after each test, otherwise it
    // might disallow calls that it shouldn't; or alternatively
    // intercept calls it shouldn't
    nock.restore()
    nock.emitter.removeListener('no match', noMatchHandler)
  });

  describe('GET /', () => {
    it('GET / => hello', done => {
      
      nock('http://localhost:4006').get("/").reply(200, 'signing-service server status: ok.')
      nock('http://localhost:4008').get("/").reply(200, 'status-service server status: ok.')
      nock('http://localhost:4004').get("/").reply(200, 'transaction-manager-service server status: ok.')
      
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

  describe(`POST ${exchangeSetupPath}`, () => {

    it('returns 400 if no body', done => {
      request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `Bearer ${protectedTenantToken}`)
        .expect('Content-Type', /json/)
        .expect(400, done)
    })

    it('returns 401 if tenant token is missing from auth header', done => {
      request(app)
        .post(exchangeSetupPath)
        .send(getDataForExchangeSetupPost(protectedTenantName))
        .expect('Content-Type', /json/)
        .expect(401, done)
    })

    it('returns wallet query for UNPROTECTED tenant, without auth header', async () => {
      
    unprotectedWalletQueryNock();

      const response = await request(app)
        .post(exchangeSetupPath)
        .send(getDataForExchangeSetupPost(unprotectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(200);
      expect(response.body)
    })

    it('returns wallet query for PROTECTED tenant, with auth header', async () => {
     protectedWalletQueryNock();
      
      const response = await request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `Bearer ${protectedTenantToken}`)
        .send(getDataForExchangeSetupPost(protectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(200);
      expect(response.body)
    })

    it('returns wallet query for random UNPROTECTED tenant, with auth header', async () => {
      unProtectedRandomWalletQuery()
      //nock.recorder.rec()
      const response = await request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `Bearer ${randomToken}`)
        .send(getDataForExchangeSetupPost(randomTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(200);
      expect(response.body)
    })

    it('returns 403 if token is not valid', async () => {

      // no calls to the services should be made
      checkForUnexpectedCalls(exchangeSetupPath)

      const response = await request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `Bearer badbadToken`)
        .send(getDataForExchangeSetupPost(protectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(403);
      expect(response.body)

    })

    it('returns 403 when trying to use token for a different tenant', async () => {

      // no calls to the services should be made
      checkForUnexpectedCalls(exchangeSetupPath)

      const response = await request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `Bearer ${randomToken}`)
        .send(getDataForExchangeSetupPost(protectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(403);
      expect(response.body)


    })

    it('returns 401 if token is not marked as Bearer', async () => {
      
      // no calls to the services should be made
      checkForUnexpectedCalls(exchangeSetupPath)

      const response = await request(app)
        .post(exchangeSetupPath)
        .set('Authorization', `${protectedTenantToken}`)
        .send(getDataForExchangeSetupPost(protectedTenantName))

      expect(response.header["content-type"]).to.have.string("json");
      expect(response.status).to.eql(401);
      expect(response.body)
    })
  })

  describe('POST /exchange', () => {

    it('does the direct exchange', async () => {
    
      directTestNocks()
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

      const walletQuerys = response.body
      const walletQuery = walletQuerys.find(q => q.retrievalId === 'someId')
      const url = walletQuery.directDeepLink

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

      const signedVC = exchangeResponse.body
      expect(signedVC.proof).to.exist

    });


    it('does the vpr exchange', async () => {
      vprTestNocks()
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

      const walletQuerys = setupResponse.body

      // The exchange endpoint stores the data and returns a deeplink (with challenge)
      // to which the student can be redirected, and which will then open the wallet
      const walletQuery = walletQuerys.find(q => q.retrievalId === 'someId')
      const url = walletQuery.vprDeepLink

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

      expect(signedVC.proof).to.exist
      // uncomment this if you are using this test to run through
      // an un-nocked scenario where you want to confirm the signing-service
      // has used the random DID supplied in the DIDAuth
      //expect(signedVC.credentialSubject.id).to.equal(randomId)

    })

  })


})